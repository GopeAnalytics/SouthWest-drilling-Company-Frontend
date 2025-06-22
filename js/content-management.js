class ContentManager {
  constructor() {
    this.pageProjects = [];
    this.mediaProjects = [];
    this.media = [];
    this.apiBaseUrl = "http://localhost:5000";
    this.eventsBound = false;
  }

  async init() {
    await this.loadAllData();
    if (!this.eventsBound) {
      this.bindEvents();
      this.eventsBound = true;
    }
    this.renderAllSections();
  }

  getAuthHeader() {
    const token = window.authManager?.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async loadAllData() {
    if (!window.authManager?.isLoggedIn()) return;
    try {
      const [pageProjectsRes, mediaProjectsRes, mediaRes] = await Promise.all([
        fetch(`${this.apiBaseUrl}/api/page-projects`, {
          headers: this.getAuthHeader(),
        }),
        fetch(`${this.apiBaseUrl}/api/media-projects`, {
          headers: this.getAuthHeader(),
        }),
        fetch(`${this.apiBaseUrl}/api/media`, {
          headers: this.getAuthHeader(),
        }),
      ]);
      if (!pageProjectsRes.ok || !mediaProjectsRes.ok || !mediaRes.ok) {
        throw new Error("Failed to fetch all data from the server.");
      }
      this.pageProjects = await pageProjectsRes.json();
      this.mediaProjects = await mediaProjectsRes.json();
      this.media = await mediaRes.json();
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }

  renderAllSections() {
    this.renderPageProjects();
    this.renderMediaProjects();
    this.renderMedia();
  }

  // ===================================================
  // ===== PROJECTS PAGE MANAGEMENT (/projects) =====
  // ===================================================

  async handlePageProjectUpload(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    this.setLoadingState(submitBtn, true, "Uploading...");

    try {
      const res = await fetch(`${this.apiBaseUrl}/api/page-projects`, {
        method: "POST",
        headers: this.getAuthHeader(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      this.pageProjects.unshift(data);
      this.renderPageProjects();
      this.hideModal("pageProjectUploadModal");
      this.showToast("Project created successfully!", "success");
      form.reset();
    } catch (error) {
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      this.setLoadingState(submitBtn, false, "Upload Project");
    }
  }

  async handlePageProjectUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const projectId = formData.get("id");
    const submitBtn = form.querySelector('button[type="submit"]');
    this.setLoadingState(submitBtn, true, "Updating...");

    try {
      // Note: This simplified update only sends text fields.
      // A full update would require more complex backend logic for file replacements.
      const res = await fetch(
        `${this.apiBaseUrl}/api/page-projects/${projectId}`,
        {
          method: "PUT",
          headers: {
            ...this.getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(Object.fromEntries(formData)),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      const index = this.pageProjects.findIndex((p) => p._id === projectId);
      if (index > -1) this.pageProjects[index] = data;

      this.renderPageProjects();
      this.hideModal("pageProjectEditModal");
      this.showToast("Project updated successfully!", "success");
    } catch (error) {
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      this.setLoadingState(submitBtn, false, "Update Project");
    }
  }

  async deletePageProject(id) {
    if (
      !confirm(
        "Are you sure you want to delete this project and all its gallery files?"
      )
    )
      return;
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/page-projects/${id}`, {
        method: "DELETE",
        headers: this.getAuthHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      this.pageProjects = this.pageProjects.filter((p) => p._id !== id);
      this.renderPageProjects();
      this.showToast(data.message, "success");
    } catch (error) {
      this.showToast(`Error: ${error.message}`, "error");
    }
  }

  handlePageProjectSelection(id, action) {
    this.hideModal("selectionModal");
    if (action === "update") this.editPageProject(id);
    else if (action === "delete") this.deletePageProject(id);
  }

  editPageProject(id) {
    const project = this.pageProjects.find((p) => p._id === id);
    if (!project) return;
    const form = document.getElementById("pageProjectEditForm");
    form.querySelector('[name="id"]').value = project._id;
    form.querySelector('[name="title"]').value = project.title;
    form.querySelector('[name="type"]').value = project.type;
    form.querySelector('[name="location"]').value = project.location;
    form.querySelector('[name="description"]').value = project.description;
    form.querySelector('[name="startDate"]').value = new Date(project.startDate)
      .toISOString()
      .split("T")[0];
    const endDateInput = form.querySelector('[name="endDate"]');
    const ongoingCheckbox = form.querySelector('[name="ongoing"]');

    ongoingCheckbox.checked = project.ongoing;
    endDateInput.disabled = project.ongoing;
    endDateInput.value =
      project.endDate && !project.ongoing
        ? new Date(project.endDate).toISOString().split("T")[0]
        : "";

    this.showModal("pageProjectEditModal");
  }

  renderPageProjects() {
    const container = document.getElementById("pageProjectsList");
    if (!container) return;
    container.innerHTML = this.pageProjects.length
      ? this.pageProjects
          .map(
            (p) =>
              `<div class="project-item">
                <span>${this.escapeHtml(p.title)}</span>
                <span class="project-meta">${p.type}</span>
               </div>`
          )
          .join("")
      : `<div class="empty-state"><p>No projects.</p></div>`;
  }

  // =================================================================
  // ===== MEDIA PAGE MANAGEMENT ("Before & After" Projects) =====
  // =================================================================

  async handleMediaProjectUpload(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    if (form.querySelector('[name="ongoing"]').checked) {
      formData.delete("endDate");
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    this.setLoadingState(submitBtn, true, "Uploading...");
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/media-projects`, {
        method: "POST",
        headers: this.getAuthHeader(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      this.mediaProjects.unshift(data);
      this.renderMediaProjects();
      this.hideModal("mediaProjectUploadModal");
      this.showToast("Before & After Project created!", "success");
      form.reset();
    } catch (error) {
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      this.setLoadingState(submitBtn, false, "Upload Project");
    }
  }

  async handleMediaProjectUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const projectId = formData.get("id");
    const submitBtn = form.querySelector('button[type="submit"]');
    this.setLoadingState(submitBtn, true, "Updating...");

    try {
      const res = await fetch(
        `${this.apiBaseUrl}/api/media-projects/${projectId}`,
        {
          method: "PUT",
          headers: {
            ...this.getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(Object.fromEntries(formData)),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      const index = this.mediaProjects.findIndex((p) => p._id === projectId);
      if (index > -1) this.mediaProjects[index] = data;

      this.renderMediaProjects();
      this.hideModal("mediaProjectEditModal");
      this.showToast("Project updated successfully!", "success");
    } catch (error) {
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      this.setLoadingState(submitBtn, false, "Save Changes");
    }
  }
  async deleteMediaProject(id) {
    if (
      !confirm('Are you sure you want to delete this "Before & After" project?')
    )
      return;
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/media-projects/${id}`, {
        method: "DELETE",
        headers: this.getAuthHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      this.mediaProjects = this.mediaProjects.filter((p) => p._id !== id);
      this.renderMediaProjects();
      this.showToast("Project deleted!", "success");
    } catch (error) {
      this.showToast(`Error: ${error.message}`, "error");
    }
  }

  handleMediaProjectSelection(id, action) {
    this.hideModal("selectionModal");
    if (action === "update") {
      this.editMediaProject(id);
    } else if (action === "delete") {
      this.deleteMediaProject(id);
    }
  }

  editMediaProject(id) {
    const project = this.mediaProjects.find((p) => p._id === id);
    if (!project) return;

    const form = document.getElementById("mediaProjectEditForm");
    form.querySelector('[name="id"]').value = project._id;
    form.querySelector('[name="title"]').value = project.title;
    form.querySelector('[name="type"]').value = project.type;
    form.querySelector('[name="year"]').value = project.year;
    form.querySelector('[name="location"]').value = project.location;
    form.querySelector('[name="description"]').value = project.description;
    form.querySelector('[name="startDate"]').value = new Date(project.startDate)
      .toISOString()
      .split("T")[0];

    const endDateInput = form.querySelector('[name="endDate"]');
    const ongoingCheckbox = form.querySelector('[name="ongoing"]');
    ongoingCheckbox.checked = project.ongoing;
    endDateInput.disabled = project.ongoing;
    endDateInput.value =
      project.endDate && !project.ongoing
        ? new Date(project.endDate).toISOString().split("T")[0]
        : "";

    // Use Optional Chaining (?.) to safely access nested properties
    // and provide a fallback to an empty string ('') if the data is missing.
    form.querySelector('[name="beforeDescription"]').value =
      project.before?.description || "";
    form.querySelector('[name="afterDescription"]').value =
      project.after?.description || "";

    this.showModal("mediaProjectEditModal");
  }
  renderMediaProjects() {
    const container = document.getElementById("mediaProjectsList");
    if (!container) return;
    container.innerHTML = this.mediaProjects.length
      ? this.mediaProjects
          .map(
            (p) =>
              `<div class="project-item">
                <span>${this.escapeHtml(p.title)}</span>
               </div>`
          )
          .join("")
      : `<div class="empty-state"><p>No "Before & After" projects.</p></div>`;
  }

  // =================================================================
  // ===== MEDIA GALLERY MANAGEMENT (Individual Images/Videos) =====
  // =================================================================

  async handleMediaUpload(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    this.setLoadingState(submitBtn, true, "Uploading...");
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/media`, {
        method: "POST",
        headers: this.getAuthHeader(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      this.media.unshift(data);
      this.renderMedia();
      this.hideModal("mediaUploadModal");
      this.showToast("Media item created!", "success");
      form.reset();
    } catch (error) {
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      this.setLoadingState(submitBtn, false, "Upload Media");
    }
  }

  async handleMediaUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const mediaId = formData.get("id");
    const submitBtn = form.querySelector('button[type="submit"]');
    this.setLoadingState(submitBtn, true, "Updating...");
    try {
      // CORRECTED: Sending as JSON, which is appropriate for text-only updates
      const res = await fetch(`${this.apiBaseUrl}/api/media/${mediaId}`, {
        method: "PUT",
        headers: {
          ...this.getAuthHeader(),
          "Content-Type": "application/json", // Set content type to JSON
        },
        body: JSON.stringify(Object.fromEntries(formData)), // Convert form data to JSON
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const index = this.media.findIndex((m) => m._id === mediaId);
      if (index > -1) this.media[index] = data;
      this.renderMedia();
      this.hideModal("mediaEditModal");
      this.showToast("Media item updated!", "success");
    } catch (error) {
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      this.setLoadingState(submitBtn, false, "Save Changes"); // Changed text to match button
    }
  }
  async deleteMedia(id) {
    if (!confirm("Are you sure you want to delete this media item?")) return;
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/media/${id}`, {
        method: "DELETE",
        headers: this.getAuthHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      this.media = this.media.filter((m) => m._id !== id);
      this.renderMedia();
      this.showToast("Media item deleted!", "success");
    } catch (error) {
      this.showToast(`Error: ${error.message}`, "error");
    }
  }

  handleMediaSelection(id, action) {
    this.hideModal("selectionModal");
    if (action === "update") this.editMedia(id);
    else if (action === "delete") this.deleteMedia(id);
  }

  editMedia(id) {
    const mediaItem = this.media.find((m) => m._id === id);
    if (!mediaItem) return;
    const form = document.getElementById("mediaEditForm");
    form.querySelector('[name="id"]').value = mediaItem._id;
    form.querySelector('[name="title"]').value = mediaItem.title;
    form.querySelector('[name="category"]').value = mediaItem.category;
    form.querySelector('[name="description"]').value = mediaItem.description;
    this.showModal("mediaEditModal");
  }

  renderMedia() {
    const container = document.getElementById("mediaGallery");
    if (!container) return;

    // Updated to handle the new `files` array structure.
    container.innerHTML = this.media.length
      ? this.media
          .map((item) => {
            // Default thumbnail in case there are no files
            let thumbnailUrl = "";
            // Check if the files array exists and is not empty
            if (item.files && item.files.length > 0) {
              const firstFile = item.files[0];
              thumbnailUrl =
                firstFile.fileType === "video"
                  ? firstFile.fileUrl.replace(/\.(mp4|mov|avi|wmv)$/, ".jpg")
                  : firstFile.fileUrl;
            }

            return `
              <div class="media-item" style="background-image: url('${thumbnailUrl}')">
                  <div class="media-item-title">${this.escapeHtml(
                    item.title
                  )}</div>
              </div>`;
          })
          .join("")
      : `<div class="empty-state"><p>No media items found.</p></div>`;
  }
  // =============================================
  // ===== NEW GENERIC SELECTION MODAL LOGIC =====
  // =============================================

  showSelectionModal(action, itemType) {
    const modal = document.getElementById("selectionModal");
    const titleEl = document.getElementById("selectionModalTitle");
    const listEl = document.getElementById("selectionModalList");
    let items = [];
    let handlerName = "";

    switch (itemType) {
      case "pageProject":
        items = this.pageProjects;
        titleEl.textContent = `Select Project to ${action}`;
        handlerName = "handlePageProjectSelection";
        break;
      case "mediaProject":
        items = this.mediaProjects;
        titleEl.textContent = `Select "Before & After" to ${action}`;
        handlerName = "handleMediaProjectSelection";
        break;
      case "media":
        items = this.media;
        titleEl.textContent = `Select Media Item to ${action}`;
        handlerName = "handleMediaSelection";
        break;
    }

    if (items.length === 0) {
      listEl.innerHTML = `<div class="empty-selection">No items to ${action}.</div>`;
    } else {
      listEl.innerHTML = items
        .map(
          (item) => `
                <div class="selection-item" onclick="window.contentManager.${handlerName}('${
            item._id
          }', '${action}')">
                    <span>${this.escapeHtml(item.title)}</span>
                    <button class="btn btn-${action} btn-small">${action}</button>
                </div>`
        )
        .join("");
    }

    this.showModal("selectionModal");
  }

  // =============================================
  // ===== UI HELPERS & EVENT BINDING =====
  // =============================================

  bindEvents() {
    document.querySelectorAll(".cms-nav-link").forEach((navLink) => {
      navLink.addEventListener("click", (e) => {
        const targetViewId = e.currentTarget.dataset.view;

        // Update active state on nav links
        document
          .querySelectorAll(".cms-nav-link")
          .forEach((item) => item.classList.remove("active"));
        e.currentTarget.classList.add("active");

        // Show the target view and hide others
        document.querySelectorAll(".content-view").forEach((view) => {
          view.classList.remove("active-view");
          if (view.id === targetViewId) {
            view.classList.add("active-view");
          }
        });
      });
    });

    // Logout button in hero
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      window.authManager?.logout();
    });

    // Projects Page buttons
    document
      .getElementById("uploadPageProjectBtn")
      ?.addEventListener("click", () =>
        this.showModal("pageProjectUploadModal")
      );
    document
      .getElementById("updatePageProjectBtn")
      ?.addEventListener("click", () =>
        this.showSelectionModal("update", "pageProject")
      );
    document
      .getElementById("deletePageProjectBtn")
      ?.addEventListener("click", () =>
        this.showSelectionModal("delete", "pageProject")
      );
    document
      .getElementById("pageProjectUploadForm")
      ?.addEventListener("submit", (e) => this.handlePageProjectUpload(e));

    // Media Page: Before & After buttons
    document
      .getElementById("uploadMediaProjectBtn")
      ?.addEventListener("click", () =>
        this.showModal("mediaProjectUploadModal")
      );
    document
      .getElementById("updateMediaProjectBtn")
      ?.addEventListener("click", () =>
        this.showSelectionModal("update", "mediaProject")
      );
    document
      .getElementById("deleteMediaProjectBtn")
      ?.addEventListener("click", () =>
        this.showSelectionModal("delete", "mediaProject")
      );
    document
      .getElementById("mediaProjectUploadForm")
      ?.addEventListener("submit", (e) => this.handleMediaProjectUpload(e));
    // Event listener for the new "Before & After" edit form
    document
      .getElementById("mediaProjectEditForm")
      ?.addEventListener("submit", (e) => this.handleMediaProjectUpdate(e));

    // Media Gallery buttons
    document
      .getElementById("uploadMediaBtn")
      ?.addEventListener("click", () => this.showModal("mediaUploadModal"));
    document
      .getElementById("updateMediaBtn")
      ?.addEventListener("click", () =>
        this.showSelectionModal("update", "media")
      );
    document
      .getElementById("deleteMediaBtn")
      ?.addEventListener("click", () =>
        this.showSelectionModal("delete", "media")
      );
    document
      .getElementById("mediaUploadForm")
      ?.addEventListener("submit", (e) => this.handleMediaUpload(e));

    // event listeners for the new edit forms
    document
      .getElementById("pageProjectEditForm")
      ?.addEventListener("submit", (e) => this.handlePageProjectUpdate(e));

    document
      .getElementById("mediaEditForm")
      ?.addEventListener("submit", (e) => this.handleMediaUpdate(e));

    // Universal modal close buttons
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.hideModal(e.currentTarget.closest(".modal-overlay").id)
      );
    });

    // Handle form "Cancel" buttons
    document.querySelectorAll(".modal-form .btn-secondary").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const modalId = e.currentTarget.closest(".modal-overlay").id;
        if (modalId) {
          this.hideModal(modalId);
        }
      });
    });

    // Handle the cancel button in the new selection modal
    document
      .querySelector("#selectionModal .modal-cancel")
      .addEventListener("click", () => {
        this.hideModal("selectionModal");
      });

    // Checkbox logic for "ongoing" projects
    document.querySelectorAll('input[name="ongoing"]').forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const form = e.target.closest("form");
        const endDateInput = form.querySelector('input[name="endDate"]');
        if (endDateInput) {
          endDateInput.disabled = e.target.checked;
          if (e.target.checked) endDateInput.value = "";
        }
      });
    });
  }

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "flex";
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "none";
  }

  setLoadingState(button, isLoading, loadingText = "Loading...") {
    if (!button) return;
    const originalText = button.dataset.originalText || button.textContent;
    if (isLoading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }
      button.disabled = true;
      button.innerHTML = `<span class="spinner-sm"></span> ${loadingText}`;
    } else {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }

  showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    if (toast && toastMessage) {
      toastMessage.textContent = message;
      toast.className = `toast show ${type}`;
      setTimeout(() => {
        toast.className = toast.className.replace("show", "");
      }, 4000);
    }
  }

  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener("login", () => {
  if (!window.contentManager) {
    window.contentManager = new ContentManager();
  }
  // Initialize or re-initialize the content
  window.contentManager.init();

  // Update UI
  const cmsMainContent = document.getElementById("cmsMainContent");
  if (cmsMainContent) cmsMainContent.style.display = "flex";

  const loginModal = document.getElementById("loginModal");
  if (loginModal) loginModal.style.display = "none";

  const username = window.authManager?.getUsername();
  const adminUsernameEl = document.getElementById("adminUsername");
  if (username && adminUsernameEl) {
    adminUsernameEl.textContent = username;
  }
});

// This new block triggers the session check after all scripts are loaded, fixing the race condition.
document.addEventListener("DOMContentLoaded", () => {
  // This ensures that auth.js has created window.authManager before we try to use it.
  if (window.authManager) {
    window.authManager.initializeSession();
  }
});
