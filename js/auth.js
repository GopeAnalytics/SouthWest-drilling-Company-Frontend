class AuthManager {
  constructor() {
    this.token = null;
    this.username = null;
    this.sessionKey = "cms_token";
    this.apiBaseUrl = "http://localhost:5000";
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const loginForm = document.getElementById("loginForm");
    const logoutBtn = document.getElementById("logoutBtn");
    const forgotPasswordForm = document.getElementById("forgotPasswordForm");
    const resetPasswordForm = document.getElementById("resetPasswordForm");
    const showForgotPasswordBtn = document.getElementById("showForgotPassword");
    const backToLoginBtns = document.querySelectorAll(".showLoginFromModal");
    const passwordToggleIcons = document.querySelectorAll(
      ".password-toggle-icon"
    );

    if (loginForm)
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    if (logoutBtn)
      logoutBtn.addEventListener("click", () => this.handleLogout());
    if (forgotPasswordForm)
      forgotPasswordForm.addEventListener("submit", (e) =>
        this.handleForgotPassword(e)
      );
    if (resetPasswordForm)
      resetPasswordForm.addEventListener("submit", (e) =>
        this.handleResetPassword(e)
      );

    if (showForgotPasswordBtn)
      showForgotPasswordBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.hideAllModals();
        this.showForgotPasswordModal();
      });

    backToLoginBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.hideAllModals();
        this.showLoginModal();
      });
    });

    // Event listener for all password toggle icons
    passwordToggleIcons.forEach((icon) => {
      icon.addEventListener("click", () => {
        const passwordInput = icon.previousElementSibling;
        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          icon.classList.remove("fa-eye");
          icon.classList.add("fa-eye-slash");
        } else {
          passwordInput.type = "password";
          icon.classList.remove("fa-eye-slash");
          icon.classList.add("fa-eye");
        }
      });
    });
  }

  // This function is the single point of entry for session checks
  initializeSession() {
    const token = localStorage.getItem(this.sessionKey);
    if (token) {
      this.token = token;
      this.username = localStorage.getItem("cms_username"); // Get username from storage
      this.hideLoginModal();
      // Dispatch the event now that we know other scripts are loaded
      document.dispatchEvent(new CustomEvent("login"));
    } else {
      this.showLoginModal();
    }
  }

  async handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    this.setButtonLoadingState(submitButton, true);

    const usernameInput = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Login failed");

      // Store token AND username
      this.token = data.token;
      this.username = data.username;
      localStorage.setItem(this.sessionKey, data.token);
      localStorage.setItem("cms_username", data.username);

      this.hideLoginModal();
      this.showToast("Login successful!", "success");
      document.dispatchEvent(new CustomEvent("login"));
    } catch (error) {
      this.showError(error.message);
    } finally {
      this.setButtonLoadingState(submitButton, false);
    }
  }

  async handleForgotPassword(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    this.setButtonLoadingState(submitButton, true);

    const username = document.getElementById("forgotUsername").value.trim();
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      this.showToast(data.message, "success");
      this.hideAllModals();
      this.showLoginModal();
    } catch (error) {
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      this.setButtonLoadingState(submitButton, false);
    }
  }

  async handleResetPassword(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    this.setButtonLoadingState(submitButton, true);

    const token = document.getElementById("resetTokenInput").value;
    const password = document.getElementById("resetPassword").value;
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/auth/reset-password`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      this.showToast(data.message, "success");
      window.history.pushState({}, document.title, window.location.pathname);
      this.hideAllModals();
      this.showLoginModal();
    } catch (error) {
      this.showToast(`Error: ${error.message}`, "error");
    } finally {
      this.setButtonLoadingState(submitButton, false);
    }
  }

  handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
      this.token = null;
      this.username = null;
      localStorage.removeItem(this.sessionKey);
      localStorage.removeItem("cms_username"); // Also clear the username
      window.location.reload();
    }
  }

  checkForResetToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      this.hideAllModals();
      document.getElementById("resetTokenInput").value = token;
      this.showResetPasswordModal();
    }
  }

  // --- HELPER AND GETTER METHODS ---

  setButtonLoadingState(button, isLoading) {
    if (isLoading) {
      button.classList.add("loading");
      button.disabled = true;
    } else {
      button.classList.remove("loading");
      button.disabled = false;
    }
  }

  getUsername() {
    return this.username;
  }

  getToken() {
    return this.token;
  }

  isLoggedIn() {
    return !!this.token;
  }

  showLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) modal.style.display = "flex";
  }

  hideLoginModal() {
    const modal = document.getElementById("loginModal");
    if (modal) modal.style.display = "none";
  }

  showForgotPasswordModal() {
    const modal = document.getElementById("forgotPasswordModal");
    if (modal) modal.style.display = "flex";
  }

  showResetPasswordModal() {
    const modal = document.getElementById("resetPasswordModal");
    if (modal) modal.style.display = "flex";
  }

  hideAllModals() {
    document.querySelectorAll(".login-modal-overlay").forEach((modal) => {
      modal.style.display = "none";
    });
  }

  showError(message) {
    const errorDiv = document.getElementById("loginError");
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = "block";
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
}

document.addEventListener("DOMContentLoaded", () => {
  window.authManager = new AuthManager();
});
