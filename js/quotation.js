// Configuration
const API_BASE_URL = `https://app.southwestsystem.org`;
const API_URL = `${API_BASE_URL}/api/quotations`;
const AUTH_API_URL = `${API_BASE_URL}/api/auth`;

// State
let currentQuotations = [];
let editingQuotationId = null;
let lineItemCounter = 0;

// Authentication Functions
function getAuthToken() {
  const token = localStorage.getItem("token");
  return token && token !== "undefined" && token !== "null" ? token : null;
}

function setAuthToken(token) {
  if (token && token !== "undefined" && token !== "null") {
    localStorage.setItem("token", token);
  }
}

function removeAuthToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("session");
}

// Authentication Functions
function getCurrentUser() {
  try {
    const user = localStorage.getItem("user");

    if (
      !user ||
      user.toLowerCase() === "undefined" ||
      user.toLowerCase() === "null"
    ) {
      localStorage.removeItem("user");
      console.error(
        "Corrupted 'user' value found and removed from localStorage."
      );
      return null;
    }

    const parsedUser = JSON.parse(user);

    // Check if JSON parsing resulted in a null/empty object
    if (!parsedUser || typeof parsedUser !== "object") {
      localStorage.removeItem("user");
      console.error(
        "Parsed 'user' value is not a valid object and was removed."
      );
      return null;
    }

    return parsedUser;
  } catch (error) {
    // This catches malformed JSON (e.g., '{')
    console.error("Error parsing user data, removing item:", error);
    localStorage.removeItem("user");
    return null;
  }
}

// Session Management Functions - FIXED
function setSession() {
  const sessionData = {
    timestamp: new Date().getTime(),
    isActive: true,
  };
  localStorage.setItem("session", JSON.stringify(sessionData));
  console.log(
    "Session set/updated at:",
    new Date(sessionData.timestamp).toLocaleTimeString()
  );
}

function getSession() {
  try {
    const session = localStorage.getItem("session");
    if (!session || session === "undefined" || session === "null") {
      return null;
    }
    return JSON.parse(session);
  } catch (error) {
    console.error("Error parsing session:", error);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem("session");
  console.log("Session cleared");
}

function isSessionValid() {
  const session = getSession();
  const token = getAuthToken();
  const user = getCurrentUser();

  // If no basic auth data, session is invalid
  if (!token || !user) {
    console.log("No token or user - session invalid");
    return false;
  }

  // If no session exists but we have token/user, it's a page refresh - session is valid
  if (!session) {
    console.log(
      "No session found but have credentials - treating as valid (page refresh)"
    );
    return true; // CRITICAL FIX: Return true instead of creating session here
  }

  const currentTime = new Date().getTime();
  const sessionAge = currentTime - session.timestamp;
  const sessionTimeout = 15 * 60 * 1000; // 15 minutes

  const isValid = sessionAge < sessionTimeout;
  console.log(
    `Session age: ${Math.round(sessionAge / 1000)}s / ${Math.round(
      sessionTimeout / 1000
    )}s, Valid: ${isValid}`
  );

  return isValid;
}

function updateSession() {
  const token = getAuthToken();
  const user = getCurrentUser();

  if (token && user) {
    setSession();
    console.log("Session updated");
    return true;
  }
  return false;
}

// Check if should show login - FIXED
function shouldShowLoginModal() {
  const token = getAuthToken();
  const user = getCurrentUser();

  console.log("Login check:", {
    hasToken: !!token,
    hasUser: !!user,
  });

  // If no token or user, show login
  if (!token || !user) {
    console.log("Missing credentials - showing login");
    clearSession(); // Clear any lingering session
    return true;
  }

  // We have credentials - check session validity
  const sessionValid = isSessionValid();

  if (!sessionValid) {
    // Session is invalid or expired
    console.log("Session invalid/expired - clearing and showing login");
    clearSession();
    removeAuthToken();
    return true;
  }

  // Session is valid - ensure it exists and is updated
  console.log("Session valid - user authenticated");
  updateSession(); // Update/create session timestamp
  return false;
}

// Initialize the application - IMPROVED
function initializeApp() {
  console.log("=== Initializing Application ===");

  // Clean up any corrupted data
  ["token", "user", "session"].forEach((key) => {
    const value = localStorage.getItem(key);
    if (value === "undefined" || value === "null") {
      console.log(`Removing corrupted ${key}`);
      localStorage.removeItem(key);
    }
  });

  const token = getAuthToken();
  const user = getCurrentUser();

  console.log("Auth status:", { hasToken: !!token, hasUser: !!user });

  // Check if should show login
  if (shouldShowLoginModal()) {
    console.log("User needs to login");
    showLoginModal();
    return;
  }

  // User is authenticated - session was already updated in shouldShowLoginModal()
  console.log("User authenticated, initializing app");

  // Setup session management
  setupAutoLogout();
  setupPageVisibilityHandler();

  // Show main content
  hideLoginModal();
  updateUserInterface();
  showListView();

  // Load initial data
  fetchQuotations();

  console.log("=== Application Initialized Successfully ===");
}

// Auto-logout after inactivity
function setupAutoLogout() {
  let inactivityTimer;

  function resetTimer() {
    clearTimeout(inactivityTimer);
    if (isLoggedIn()) {
      updateSession(); // Update session on activity
      inactivityTimer = setTimeout(logoutDueToInactivity, 15 * 60 * 1000);
    }
  }

  function logoutDueToInactivity() {
    console.log("Auto-logout due to inactivity");
    showToast(
      "Session expired due to inactivity. Please login again.",
      "error"
    );
    performLogout();
  }

  // Reset timer on user activity
  const events = [
    "mousedown",
    "mousemove",
    "keypress",
    "scroll",
    "touchstart",
    "click",
  ];
  events.forEach((event) => {
    document.addEventListener(event, resetTimer, true);
  });

  resetTimer();
}

// Handle page visibility changes
function setupPageVisibilityHandler() {
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      console.log("Page became visible, checking session");

      const token = getAuthToken();
      const user = getCurrentUser();

      // If we have credentials, validate session
      if (token && user) {
        if (!isSessionValid()) {
          console.log("Session expired while tab was inactive");
          showToast("Session expired. Please login again.", "error");
          performLogout();
        } else {
          updateSession(); // Refresh session
          console.log("Session still valid after tab activation");
        }
      }
    }
  });
}

// Handle page refresh/load
window.addEventListener("beforeunload", function () {
  // Update session timestamp before page unload
  if (isLoggedIn()) {
    updateSession();
    console.log("Session updated before page unload");
  }
});

// Consolidated logout function
function performLogout() {
  console.log("Performing logout...");
  removeAuthToken();
  clearSession();
  showLoginModal();
}

// SIMPLIFIED login check
function isLoggedIn() {
  const token = getAuthToken();
  const user = getCurrentUser();
  return !!(token && user);
}
// API Call function - IMPROVED
async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();

  if (!token) {
    console.log("No token for API call - showing login");
    showLoginModal();
    throw new Error("Not authenticated");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      console.log("API returned 401 - session expired");
      performLogout();
      throw new Error("Session expired. Please login again.");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "API request failed");
    }

    // Update session on successful API call
    updateSession();

    return data;
  } catch (error) {
    console.error("API Error:", error);
    if (error.message === "Session expired. Please login again.") {
      performLogout();
    }
    throw error;
  }
}

// Utility Functions
function showLoading(show = true) {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = show ? "flex" : "none";
  }
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (toast) {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// API Functions
async function fetchQuotations(status = null) {
  showLoading(true);
  try {
    let endpoint = "/";
    if (status && status !== "all") {
      endpoint = `/status/${status}`;
    }

    const quotations = await apiCall(endpoint);
    console.log("Fetched quotations:", quotations);
    currentQuotations = quotations;
    renderQuotationsList();
  } catch (error) {
    console.error("Error fetching quotations:", error);
    if (error.message !== "Session expired. Please login again.") {
      showToast("Failed to load quotations: " + error.message, "error");
    }
  } finally {
    showLoading(false);
  }
}

async function saveQuotation(status) {
  const formData = getFormData();
  formData.status = status;

  // Validate required fields
  if (!formData.documentNumber || !formData.date || !formData.clientInfo.name) {
    showToast("Please fill in all required fields", "error");
    return;
  }

  showLoading(true);
  try {
    if (editingQuotationId) {
      await apiCall(`/${editingQuotationId}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      showToast("Quotation updated successfully!", "success");
    } else {
      await apiCall("/", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      showToast("Quotation created successfully!", "success");
    }

    showListView();
    fetchQuotations();
  } catch (error) {
    showToast("Failed to save quotation: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

async function deleteQuotation(id) {
  if (
    !confirm(
      "Are you sure you want to delete this quotation? This action cannot be undone."
    )
  ) {
    return;
  }

  showLoading(true);
  try {
    await apiCall(`/${id}`, { method: "DELETE" });
    showToast("Quotation deleted successfully!", "success");
    fetchQuotations();
  } catch (error) {
    showToast("Failed to delete quotation: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

// View Management
function showListView() {
  document.getElementById("listView").style.display = "block";
  document.getElementById("formView").style.display = "none";
  editingQuotationId = null;
  fetchQuotations();
}

function showFormView(quotation = null) {
  document.getElementById("listView").style.display = "none";
  document.getElementById("formView").style.display = "block";

  if (quotation) {
    editingQuotationId = quotation.id;
    document.getElementById("formTitle").textContent = "Edit Quotation";
    populateForm(quotation);
  } else {
    editingQuotationId = null;
    document.getElementById("formTitle").textContent = "New Quotation";
    resetForm();
  }
}

// Form Functions
function getFormData() {
  const documentType = document.querySelector(
    'input[name="documentType"]:checked'
  ).value;

  return {
    documentType,
    documentNumber: document.getElementById("documentNumber").value,
    date: document.getElementById("date").value,
    reference: document.getElementById("reference").value,
    companyInfo: {
      name: document.getElementById("companyName").value,
      address: document.getElementById("companyAddress").value,
      phone: document.getElementById("companyPhone").value,
      email: document.getElementById("companyEmail").value,
    },
    clientInfo: {
      name: document.getElementById("clientName").value,
      address: document.getElementById("clientAddress").value,
      phone: document.getElementById("clientPhone").value,
      email: document.getElementById("clientEmail").value,
    },
    siteInfo: document.getElementById("siteInfo").value,
    lineItems: getLineItems(),
    taxRate: parseFloat(document.getElementById("taxRate").value) || 16,
    notes: document.getElementById("notes").value,
  };
}

function getLineItems() {
  const lineItems = [];
  const container = document.getElementById("lineItemsContainer");
  const items = container.querySelectorAll(".line-item");

  items.forEach((item) => {
    const id = item.dataset.id;
    const description = item.querySelector(`#description-${id}`).value;
    const quantity =
      parseFloat(item.querySelector(`#quantity-${id}`).value) || 0;
    const unit = item.querySelector(`#unit-${id}`).value;
    const rate = parseFloat(item.querySelector(`#rate-${id}`).value) || 0;
    const amount = quantity * rate;

    if (description) {
      lineItems.push({ id, description, quantity, unit, rate, amount });
    }
  });

  return lineItems;
}

function populateForm(quotation) {
  document.querySelector(
    `input[name="documentType"][value="${quotation.document_type}"]`
  ).checked = true;
  document.getElementById("documentNumber").value = quotation.document_number;
  document.getElementById("date").value = quotation.date.split("T")[0];
  document.getElementById("reference").value = quotation.reference || "";

  // Parse JSON fields from PostgreSQL
  const companyInfo =
    typeof quotation.company_info === "string"
      ? JSON.parse(quotation.company_info)
      : quotation.company_info;
  const clientInfo =
    typeof quotation.client_info === "string"
      ? JSON.parse(quotation.client_info)
      : quotation.client_info;
  const lineItems =
    typeof quotation.line_items === "string"
      ? JSON.parse(quotation.line_items)
      : quotation.line_items;

  document.getElementById("companyName").value = companyInfo.name || "";
  document.getElementById("companyAddress").value = companyInfo.address || "";
  document.getElementById("companyPhone").value = companyInfo.phone || "";
  document.getElementById("companyEmail").value = companyInfo.email || "";

  document.getElementById("clientName").value = clientInfo.name || "";
  document.getElementById("clientAddress").value = clientInfo.address || "";
  document.getElementById("clientPhone").value = clientInfo.phone || "";
  document.getElementById("clientEmail").value = clientInfo.email || "";

  document.getElementById("siteInfo").value = quotation.site_info || "";
  document.getElementById("taxRate").value = quotation.tax_rate;
  document.getElementById("notes").value = quotation.notes || "";

  // Clear existing line items
  document.getElementById("lineItemsContainer").innerHTML = "";
  lineItemCounter = 0;

  // Add line items
  lineItems.forEach((item) => {
    addLineItem(item);
  });

  calculateTotals();
}

function resetForm() {
  document.getElementById("quotationForm").reset();
  document.getElementById("lineItemsContainer").innerHTML = "";
  lineItemCounter = 0;

  // Set today's date
  document.getElementById("date").value = new Date()
    .toISOString()
    .split("T")[0];

  // Add one empty line item
  addLineItem();

  calculateTotals();
}

function addLineItem(item = null) {
  const id = item?.id || `item-${lineItemCounter++}`;
  const container = document.getElementById("lineItemsContainer");

  const lineItemHTML = `
    <div class="line-item" data-id="${id}">
      <div class="line-item-header">
        <h4><i class="fas fa-grip-lines"></i> Item ${
          container.children.length + 1
        }</h4>
        <button type="button" class="btn btn-danger btn-sm" onclick="removeLineItem('${id}')">
          <i class="fas fa-trash"></i> Remove
        </button>
      </div>
      
      <div class="line-item-grid">
        <div class="form-group">
          <label>Select Predefined Item</label>
          <select class="predefined-item-select" onchange="fillPredefinedItem('${id}', this.value)">
            <option value="">-- Select from list --</option>
            <optgroup label="Reports & Permits">
              ${predefinedItems
                .filter((item) => item.category === "Reports & Permits")
                .map(
                  (item) =>
                    `<option value="${item.description}" data-unit="${item.unit}" data-rate="${item.rate}">${item.description}</option>`
                )
                .join("")}
            </optgroup>
            <optgroup label="Mobilization">
              ${predefinedItems
                .filter((item) => item.category === "Mobilization")
                .map(
                  (item) =>
                    `<option value="${item.description}" data-unit="${item.unit}" data-rate="${item.rate}">${item.description}</option>`
                )
                .join("")}
            </optgroup>
            <optgroup label="Drilling Services">
              ${predefinedItems
                .filter((item) => item.category === "Drilling Services")
                .map(
                  (item) =>
                    `<option value="${item.description}" data-unit="${item.unit}" data-rate="${item.rate}">${item.description}</option>`
                )
                .join("")}
            </optgroup>
            <optgroup label="Test Pumping">
              ${predefinedItems
                .filter((item) => item.category === "Test Pumping")
                .map(
                  (item) =>
                    `<option value="${item.description}" data-unit="${item.unit}" data-rate="${item.rate}">${item.description}</option>`
                )
                .join("")}
            </optgroup>
            <option value="other">-- Other (Custom Item) --</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Description *</label>
          <input type="text" id="description-${id}" value="${
    item?.description || ""
  }" placeholder="Item description" onchange="calculateTotals()" required>
        </div>
        
        <div class="form-group">
          <label>Quantity *</label>
          <input type="number" id="quantity-${id}" value="${
    item?.quantity || 1
  }" step="0.01" min="0" onchange="calculateTotals()" required>
        </div>
        
        <div class="form-group">
          <label>Unit</label>
          <input type="text" id="unit-${id}" value="${
    item?.unit || "Units"
  }" placeholder="e.g., Mtrs, Sum" onchange="calculateTotals()">
        </div>
        
        <div class="form-group">
          <label>Rate (KES) *</label>
          <input type="number" id="rate-${id}" value="${
    item?.rate || 0
  }" step="0.01" min="0" onchange="calculateTotals()" required>
        </div>
        
        <div class="form-group">
          <label>Amount</label>
          <div class="line-item-amount" id="amount-${id}">KES 0.00</div>
        </div>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", lineItemHTML);

  // If editing existing item, make sure it's selected in dropdown
  if (item?.description) {
    const select = container.querySelector(
      `.line-item[data-id="${id}"] .predefined-item-select`
    );
    const option = Array.from(select.options).find(
      (opt) => opt.value === item.description
    );
    if (option) {
      select.value = item.description;
    }
  }

  calculateTotals();
}

// Function to fill item details when predefined item is selected
function fillPredefinedItem(lineItemId, description) {
  if (!description) return;

  if (description === "other") {
    // Clear fields for custom item
    document.getElementById(`description-${lineItemId}`).value = "";
    document.getElementById(`unit-${lineItemId}`).value = "Units";
    document.getElementById(`rate-${lineItemId}`).value = 0;
  } else {
    const item = predefinedItems.find(
      (item) => item.description === description
    );
    if (item) {
      document.getElementById(`description-${lineItemId}`).value =
        item.description;
      document.getElementById(`unit-${lineItemId}`).value = item.unit;
      document.getElementById(`rate-${lineItemId}`).value = item.rate;
    }
  }
  calculateTotals();
}

function removeLineItem(id) {
  const item = document.querySelector(`.line-item[data-id="${id}"]`);
  if (item) {
    item.remove();
    calculateTotals();
  }
}

function calculateTotals() {
  const lineItems = getLineItems();
  const taxRate = parseFloat(document.getElementById("taxRate").value) || 16;

  // Update individual line item amounts
  lineItems.forEach((item) => {
    const amountElement = document.getElementById(`amount-${item.id}`);
    if (amountElement) {
      amountElement.textContent = formatCurrency(item.amount);
    }
  });

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const vat = subtotal * (taxRate / 100);
  const total = subtotal + vat;

  // Update displays
  document.getElementById("subtotalDisplay").textContent =
    formatCurrency(subtotal);
  document.getElementById("vatRateDisplay").textContent = taxRate.toFixed(2);
  document.getElementById("vatDisplay").textContent = formatCurrency(vat);
  document.getElementById("totalDisplay").textContent = formatCurrency(total);
}

// Render Functions
function renderQuotationsList() {
  const container = document.getElementById("quotationsList");
  const emptyState = document.getElementById("emptyState");

  if (currentQuotations.length === 0) {
    container.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  container.innerHTML = currentQuotations
    .map((quotation) => {
      const total = calculateQuotationTotal(quotation);

      return `
      <div class="quotation-card">
        <div class="quotation-card-header">
          <div>
            <div class="quotation-number">${quotation.document_number}</div>
            <div class="quotation-type">${quotation.document_type.toUpperCase()}</div>
          </div>
          <span class="quotation-status ${quotation.status}">${
        quotation.status
      }</span>
        </div>
        <div class="quotation-client">
          <strong><i class="fas fa-user"></i> Client:</strong> ${
            quotation.client_info.name || "N/A"
          }
        </div>
        <div class="quotation-details">
          <div class="quotation-date"><i class="fas fa-calendar"></i> ${formatDate(
            quotation.date
          )}</div>
          <div class="quotation-amount">${formatCurrency(total)}</div>
        </div>
        <div class="quotation-actions">
          <button class="btn btn-secondary" onclick='editQuotation("${
            quotation.id
          }")'>
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-success" onclick='downloadPDF("${
            quotation.id
          }")'>
            <i class="fas fa-download"></i> PDF
          </button>
          <button class="btn btn-danger" onclick='deleteQuotation("${
            quotation.id
          }")'>
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

function calculateQuotationTotal(quotation) {
  const lineItems =
    typeof quotation.line_items === "string"
      ? JSON.parse(quotation.line_items)
      : quotation.line_items;
  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const vat = subtotal * (quotation.tax_rate / 100);
  return subtotal + vat;
}

function editQuotation(id) {
  console.log("Editing quotation ID:", id);
  const quotation = currentQuotations.find(
    (q) => q.id.toString() === id.toString()
  );

  if (quotation) {
    console.log("Found quotation:", quotation);
    showFormView(quotation);
  } else {
    console.error("Quotation not found for ID:", id);
    showToast("Quotation not found. Please refresh the page.", "error");
  }
}

// PDF Generation - FIXED to prevent session issues
async function downloadPDF(id) {
  console.log("Starting PDF download for ID:", id);

  // Update session before starting download
  updateSession();

  const quotation = currentQuotations.find(
    (q) => q.id.toString() === id.toString()
  );

  if (!quotation) {
    showToast("Quotation not found. Please refresh the page.", "error");
    return;
  }

  showLoading(true);

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Parse JSON fields
    const companyInfo =
      typeof quotation.company_info === "string"
        ? JSON.parse(quotation.company_info)
        : quotation.company_info;
    const clientInfo =
      typeof quotation.client_info === "string"
        ? JSON.parse(quotation.client_info)
        : quotation.client_info;
    const lineItems =
      typeof quotation.line_items === "string"
        ? JSON.parse(quotation.line_items)
        : quotation.line_items;

    // Set margins and starting position
    const margin = 14;
    let yPos = margin;

    // Add company logo
    try {
      const logoUrl = "./assets/images/logo.webp";
      doc.addImage(logoUrl, "PNG", margin, yPos, 30, 30);
    } catch (error) {
      console.log("Logo not found, continuing without logo");
    }

    // Contact information on top center
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text("0725210022 / 0757841080", 105, yPos + 5, { align: "center" });
    doc.text("Email: Southwestsystems20@gmail.com", 105, yPos + 10, {
      align: "center",
    });

    yPos += 35;

    // Company Header - Centered
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("South West Systems International", 105, yPos, {
      align: "center",
    });

    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("Assured Quality", 105, yPos, { align: "center" });

    yPos += 15;

    // Document Title
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    const docTitle = `BOREHOLE DRILLING QUOTATION - ${
      quotation.site_info || "SITE DETAILS"
    }`;
    doc.text(docTitle, margin, yPos);

    yPos += 10;

    // Client Details Table
    const clientTableData = [
      [
        { content: "CLIENT NAME:", styles: { fontStyle: "bold" } },
        { content: clientInfo.name || "Not Provided", styles: {} },
      ],
      [
        { content: "CLIENT ADDRESS:", styles: { fontStyle: "bold" } },
        { content: clientInfo.address || "Not Provided", styles: {} },
      ],
    ];

    if (clientInfo.phone) {
      clientTableData.push([
        { content: "PHONE:", styles: { fontStyle: "bold" } },
        { content: clientInfo.phone, styles: {} },
      ]);
    }

    if (clientInfo.email) {
      clientTableData.push([
        { content: "EMAIL:", styles: { fontStyle: "bold" } },
        { content: clientInfo.email, styles: {} },
      ]);
    }

    clientTableData.push([
      { content: "DATE:", styles: { fontStyle: "bold" } },
      {
        content: new Date(quotation.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        styles: {},
      },
    ]);

    clientTableData.push([
      { content: "REF:", styles: { fontStyle: "bold" } },
      { content: quotation.document_number, styles: {} },
    ]);

    if (quotation.reference) {
      clientTableData.push([
        { content: "REFERENCE:", styles: { fontStyle: "bold" } },
        { content: quotation.reference, styles: {} },
      ]);
    }

    doc.autoTable({
      startY: yPos,
      body: clientTableData,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 40, halign: "left", fontStyle: "bold" },
        1: { cellWidth: 140, halign: "left" },
      },
      tableLineWidth: 0.1,
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // Site Information
    if (quotation.site_info) {
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("BH SITE:", margin, yPos);
      doc.setFont(undefined, "normal");
      doc.text(quotation.site_info, margin + 20, yPos);
      yPos += 10;
    }

    // Group line items by category
    const categorizedItems = categorizeLineItems(lineItems);

    // Generate tables for each category
    for (const [category, items] of Object.entries(categorizedItems)) {
      if (items.length > 0) {
        if (category !== "Other") {
          doc.setFontSize(10);
          doc.setFont(undefined, "bold");
          doc.text(category.toUpperCase(), margin, yPos);
          yPos += 6;
        }

        const tableData = [];
        items.forEach((item, index) => {
          tableData.push([
            String.fromCharCode(97 + (index % 26)),
            item.description,
            item.quantity.toFixed(2),
            item.unit,
            formatCurrency(item.rate).replace("KES", "").trim(),
            formatCurrency(item.amount).replace("KES", "").trim(),
          ]);
        });

        doc.autoTable({
          startY: yPos,
          head: [
            ["Item", "Description", "Qty", "Unit", "Rate Kes", "Total Kes"],
          ],
          body: tableData,
          theme: "grid",
          headStyles: {
            fillColor: [100, 100, 100],
            textColor: 255,
            fontStyle: "bold",
          },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 12, halign: "center" },
            1: { cellWidth: 80 },
            2: { cellWidth: 15, halign: "right" },
            3: { cellWidth: 20, halign: "center" },
            4: { cellWidth: 25, halign: "right" },
            5: { cellWidth: 25, halign: "right" },
          },
        });

        yPos = doc.lastAutoTable.finalY + 5;
      }
    }

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const vat = subtotal * (quotation.tax_rate / 100);
    const total = subtotal + vat;

    // Totals Section
    const finalY = yPos + 10;
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");

    const drillingSumItem = lineItems.find((item) =>
      item.description.toLowerCase().includes("drilling sum")
    );
    const drillingSum = drillingSumItem ? drillingSumItem.amount : 0;

    if (drillingSum > 0) {
      doc.text("Drilling Sum", 140, finalY);
      doc.text(formatCurrency(drillingSum).replace("KES", ""), 190, finalY, {
        align: "right",
      });
    }

    doc.text("Sub-Total", 140, finalY + 6);
    doc.text(formatCurrency(subtotal).replace("KES", ""), 190, finalY + 6, {
      align: "right",
    });

    doc.text(`Add ${quotation.tax_rate}% VAT`, 140, finalY + 12);
    doc.text(formatCurrency(vat).replace("KES", ""), 190, finalY + 12, {
      align: "right",
    });

    doc.setFontSize(10);
    doc.text("TOTAL", 140, finalY + 18);
    doc.text(formatCurrency(total).replace("KES", ""), 190, finalY + 18, {
      align: "right",
    });

    // Total in words
    try {
      let totalInWords;
      if (typeof window.numberToWords !== "undefined") {
        totalInWords = window.numberToWords.toWords(total);
      } else if (typeof window.numberToWordsConverter !== "undefined") {
        totalInWords = window.numberToWordsConverter.toWords(total);
      } else {
        totalInWords = convertNumberToWords(total);
      }

      totalInWords =
        totalInWords.replace(/\b\w/g, (l) => l.toUpperCase()) +
        " Shillings Only";
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      doc.text(`Total [in words]: ${totalInWords}`, margin, finalY + 25);
    } catch (error) {
      console.log("Number to words conversion failed, using fallback:", error);
      const totalInWords = convertNumberToWords(total);
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      doc.text(`Total [in words]: ${totalInWords}`, margin, finalY + 25);
    }

    // Terms and Conditions
    yPos = finalY + 35;
    doc.setFont(undefined, "bold");
    doc.text("TERMS:", margin, yPos);

    doc.setFont(undefined, "normal");
    const terms = [
      "1. Accessibility and security of the drilling unit to the site is the responsibility of the client",
      "2. Warranty clause south west systems LTD does not give any warranty or guarantee in any way, regarding the quantity and quality of water",
      "3. Waiting charges of Ksh 3000/- per hour will be charged in the event of stoppage/Non-commencement of borehole drilling due to any act, omissions of client",
      "4. Any extra works not charged for the quotation shall be requested in writing and paid for accordingly by the client",
      "5. Applicable taxes will be extra. Additional Notes",
    ];

    let termY = yPos + 5;
    terms.forEach((term) => {
      const splitTerm = doc.splitTextToSize(term, 180);
      doc.text(splitTerm, margin, termY);
      termY += splitTerm.length * 4;
    });

    // Bank Details
    const bankY = termY + 10;
    doc.setFont(undefined, "bold");
    doc.text("BANKS DETAILS", margin, bankY);

    doc.setFont(undefined, "normal");
    doc.text("NAME: SOUTH WEST SYSTEMS INTERNATIONAL LTD", margin, bankY + 5);
    doc.text("ACCOUNT: 2041882703", margin, bankY + 10);
    doc.text("BANK: ABSA", margin, bankY + 15);

    doc.setFont(undefined, "bold");
    doc.text("PAYMENTS TERMS", margin, bankY + 22);
    doc.setFont(undefined, "normal");
    doc.text("75% UPON MOBILIZATION OF DRILLING MACHINE", margin, bankY + 27);
    doc.text("20% BEFORE CASING INSTALLATION", margin, bankY + 32);
    doc.text("5% UPON SUBMISSION OF THE FINAL REPORT", margin, bankY + 37);

    doc.text(
      "For any enquiry, reach out via email at southwestsystems20@gmail.com, call on +254 757841080",
      margin,
      bankY + 45
    );

    // Save PDF - Using setTimeout to ensure it doesn't block session update
    const filename = `${quotation.document_number}.pdf`;

    // Use setTimeout to separate PDF download from session management
    setTimeout(() => {
      doc.save(filename);
      console.log("PDF download initiated:", filename);
    }, 100);

    showToast("PDF downloaded successfully!", "success");

    // CRITICAL: Update session immediately after PDF generation
    updateSession();
    console.log("Session updated after PDF download");
  } catch (error) {
    console.error("Error generating PDF:", error);
    showToast("Failed to generate PDF: " + error.message, "error");
  } finally {
    showLoading(false);
    // One more session update to be safe
    setTimeout(() => {
      if (isLoggedIn()) {
        updateSession();
      }
    }, 500);
  }
}

// Fallback number to words function
function convertNumberToWords(num) {
  const shillings = Math.floor(num);
  const cents = Math.round((num - shillings) * 100);
  let words = convertIntegerToWords(shillings) + " shillings";
  if (cents > 0) {
    words += " and " + convertIntegerToWords(cents) + " cents";
  }
  return words + " only";
}

function convertIntegerToWords(num) {
  if (num === 0) return "zero";
  const ones = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const scales = ["", "thousand", "million", "billion"];

  let numStr = num.toString();
  while (numStr.length % 3 !== 0) {
    numStr = "0" + numStr;
  }

  const groups = [];
  for (let i = 0; i < numStr.length; i += 3) {
    groups.push(parseInt(numStr.substr(i, 3)));
  }

  let words = "";
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (group === 0) continue;
    const scaleIndex = groups.length - 1 - i;
    const groupWords = convertThreeDigitGroup(group);
    if (groupWords) {
      if (words !== "") words += " ";
      words += groupWords + " " + scales[scaleIndex];
    }
  }

  return words.trim();
}

function convertThreeDigitGroup(num) {
  const ones = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];

  let words = "";
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundreds > 0) {
    words += ones[hundreds] + " hundred";
  }

  if (remainder > 0) {
    if (words !== "") words += " and ";
    if (remainder < 20) {
      words += ones[remainder];
    } else {
      const tensDigit = Math.floor(remainder / 10);
      const onesDigit = remainder % 10;
      words += tens[tensDigit];
      if (onesDigit > 0) {
        words += "-" + ones[onesDigit];
      }
    }
  }

  return words;
}

// Authentication Functions
async function handleLogin(username, password) {
  showLoading(true);
  try {
    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      setAuthToken(data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setSession(); // Create new session

      // Setup session management
      setupAutoLogout();
      setupPageVisibilityHandler();

      console.log("Login successful, session created");
      return { success: true, user: data.user };
    } else {
      return { success: false, message: data.message || "Login failed" };
    }
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: "Network error. Please try again." };
  } finally {
    showLoading(false);
  }
}

function showLoginModal() {
  const loginModal = document.getElementById("loginModal");
  const mainContent = document.getElementById("quotationMainContent");

  if (loginModal) loginModal.style.display = "flex";
  if (mainContent) mainContent.style.display = "none";

  console.log("Login modal shown");
}

function hideLoginModal() {
  const loginModal = document.getElementById("loginModal");
  const mainContent = document.getElementById("quotationMainContent");

  if (loginModal) loginModal.style.display = "none";
  if (mainContent) mainContent.style.display = "block";

  console.log("Login modal hidden, main content shown");
}

function updateUserInterface() {
  const user = getCurrentUser();
  const userEmailElement = document.getElementById("userEmail");

  if (user && userEmailElement) {
    userEmailElement.textContent = user.email || user.username || "User";
  }
}
// Predefined borehole drilling items
const predefinedItems = [
  // Reports & Permits
  {
    description: "Hydrogeological survey report",
    unit: "Sum",
    rate: 50000,
    category: "Reports & Permits",
  },
  {
    description: "NEMA (EIA report) plus Permit",
    unit: "Sum",
    rate: 30000,
    category: "Reports & Permits",
  },
  {
    description: "WARMA Permit",
    unit: "Sum",
    rate: 45000,
    category: "Reports & Permits",
  },
  {
    description: "County Government no objection permit",
    unit: "Sum",
    rate: 30000,
    category: "Reports & Permits",
  },

  // Mobilization
  {
    description: "Mobilization of drilling equipment and personnel to the site",
    unit: "Sum",
    rate: 70000,
    category: "Mobilization",
  },
  {
    description: "Trenching and quarantining of drilling unit",
    unit: "Sum",
    rate: 0,
    category: "Mobilization",
  },

  // Drilling Services
  {
    description: "Drilling 8.5â€ dia Borehole from 0 - 100m depth",
    unit: "Mtrs",
    rate: 4000,
    category: "Drilling Services",
  },
  {
    description:
      "Supply drilling and domestic water for both drilling and field camp",
    unit: "Sum",
    rate: 20000,
    category: "Drilling Services",
  },
  {
    description:
      "Anticipated drilling foam usage for improvement of rock cutting",
    unit: "Sum",
    rate: 3000,
    category: "Drilling Services",
  },
  {
    description: "Installation of Casing and Removal",
    unit: "Sum",
    rate: 0,
    category: "Drilling Services",
  },
  {
    description: "Supply and Filling of Gravel Pack",
    unit: "Sum",
    rate: 0,
    category: "Drilling Services",
  },
  {
    description: "Physical Development through Compressor air injection",
    unit: "Sum",
    rate: 0,
    category: "Drilling Services",
  },

  // Test Pumping
  {
    description: "24Hz Test Pumping",
    unit: "Sum",
    rate: 0,
    category: "Test Pumping",
  },
  {
    description: "Water analysis after test pumping",
    unit: "Sum",
    rate: 0,
    category: "Test Pumping",
  },
  {
    description: "Construction of concrete slab and cap",
    unit: "Sum",
    rate: 0,
    category: "Test Pumping",
  },
  {
    description: "Borehole completion report and water chemical analysis",
    unit: "Sum",
    rate: 0,
    category: "Test Pumping",
  },
  {
    description: "Supply & installation of pump components & solar panels",
    unit: "Sum",
    rate: 0,
    category: "Test Pumping",
  },
  {
    description: "Tank installation (Foundation and Construction)",
    unit: "Sum",
    rate: 0,
    category: "Test Pumping",
  },
  {
    description: "Drilling Sum",
    unit: "Sum",
    rate: 0,
    category: "Drilling Services",
  },
];

// Function to categorize line items
function categorizeLineItems(lineItems) {
  const categories = {
    "Reports & Permits": [],
    Mobilization: [],
    "Drilling Services": [],
    "Test Pumping": [],
    Other: [],
  };

  lineItems.forEach((item) => {
    const desc = item.description.toLowerCase();
    let categorized = false;

    if (
      desc.includes("survey") ||
      desc.includes("report") ||
      desc.includes("permit") ||
      desc.includes("nema") ||
      desc.includes("warma")
    ) {
      categories["Reports & Permits"].push(item);
      categorized = true;
    }
    if (desc.includes("mobilization") || desc.includes("trenching")) {
      categories["Mobilization"].push(item);
      categorized = true;
    }
    if (
      desc.includes("drilling") ||
      desc.includes("casing") ||
      desc.includes("installation") ||
      desc.includes("gravel") ||
      desc.includes("development") ||
      desc.includes("foam") ||
      desc.includes("water supply")
    ) {
      categories["Drilling Services"].push(item);
      categorized = true;
    }
    if (
      desc.includes("test") ||
      desc.includes("pump") ||
      desc.includes("analysis") ||
      desc.includes("concrete") ||
      desc.includes("completion") ||
      desc.includes("solar") ||
      desc.includes("tank")
    ) {
      categories["Test Pumping"].push(item);
      categorized = true;
    }

    if (!categorized) {
      categories["Other"].push(item);
    }
  });

  return categories;
}

// Event Listeners
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM Content Loaded");

  // Initialize the application
  initializeApp();

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      performLogout();
      showToast("You have been logged out successfully.", "success");
    });
  }

  // New quotation button
  const newQuotationBtn = document.getElementById("newQuotationBtn");
  if (newQuotationBtn) {
    newQuotationBtn.addEventListener("click", () => {
      showFormView();
    });
  }

  // Create first quotation button
  const createFirstQuotation = document.getElementById("createFirstQuotation");
  if (createFirstQuotation) {
    createFirstQuotation.addEventListener("click", () => {
      showFormView();
    });
  }

  // Back to list button
  const backToListBtn = document.getElementById("backToListBtn");
  if (backToListBtn) {
    backToListBtn.addEventListener("click", () => {
      showListView();
    });
  }

  // Status filter
  const statusFilter = document.getElementById("statusFilter");
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      fetchQuotations(e.target.value);
    });
  }

  // Add line item button
  const addLineItemBtn = document.getElementById("addLineItemBtn");
  if (addLineItemBtn) {
    addLineItemBtn.addEventListener("click", () => {
      addLineItem();
    });
  }

  // Save draft button
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener("click", () => {
      saveQuotation("draft");
    });
  }

  // Save completed button
  const saveCompletedBtn = document.getElementById("saveCompletedBtn");
  if (saveCompletedBtn) {
    saveCompletedBtn.addEventListener("click", () => {
      saveQuotation("completed");
    });
  }

  // Tax rate change
  const taxRateInput = document.getElementById("taxRate");
  if (taxRateInput) {
    taxRateInput.addEventListener("change", () => {
      calculateTotals();
    });
  }

  // Login form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;
      const loginError = document.getElementById("loginError");

      const result = await handleLogin(username, password);
      if (result.success) {
        hideLoginModal();
        updateUserInterface();
        showListView();
        fetchQuotations();
        showToast("Login successful!", "success");
      } else {
        if (loginError) {
          loginError.textContent = result.message;
          loginError.style.display = "block";
        }
      }
    });
  }

  // Password toggle
  document.querySelectorAll(".password-toggle-icon").forEach((icon) => {
    icon.addEventListener("click", function () {
      const passwordInput = this.previousElementSibling;
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);
      this.classList.toggle("fa-eye");
      this.classList.toggle("fa-eye-slash");
    });
  });

  // Auto-calculate on input changes
  document.addEventListener("input", (e) => {
    if (
      (e.target.type === "number" && e.target.id.includes("quantity")) ||
      (e.target.type === "number" && e.target.id.includes("rate"))
    ) {
      calculateTotals();
    }
  });
});

// Make functions globally available
window.editQuotation = editQuotation;
window.deleteQuotation = deleteQuotation;
window.downloadPDF = downloadPDF;
window.removeLineItem = removeLineItem;
window.calculateTotals = calculateTotals;
window.fillPredefinedItem = fillPredefinedItem;
window.categorizeLineItems = categorizeLineItems;
