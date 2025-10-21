document.addEventListener("DOMContentLoaded", function () {
  const contactForm = document.getElementById("contactForm");
  if (!contactForm) return;

  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const messageInput = document.getElementById("message");
  const submitButton = contactForm.querySelector(".btn-primary");
  const btnText = submitButton.querySelector(".btn-text");
  const spinner = submitButton.querySelector(".fa-spinner");
  const formStatus = document.getElementById("formStatus");

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateName = (name) => name.trim().length >= 2;
  const validateMessage = (message) => message.trim().length >= 10;

  const showError = (input, message) => {
    input.classList.add("error");
    const parent = input.parentElement;
    let errorDiv = parent.querySelector(".error-message");
    if (!errorDiv) {
      errorDiv = document.createElement("div");
      errorDiv.className = "error-message";
      parent.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
  };

  const clearError = (input) => {
    input.classList.remove("error");
    const errorDiv = input.parentElement.querySelector(".error-message");
    if (errorDiv) errorDiv.remove();
  };

  const showStatusMessage = (message, type) => {
    formStatus.textContent = message;
    formStatus.className = `form-status ${type}`;
    formStatus.style.display = "block";
  };

  const hideStatusMessage = () => {
    formStatus.style.display = "none";
  };
  contactForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideStatusMessage();
    let isValid = true;

    if (!validateName(nameInput.value)) {
      showError(nameInput, "Name must be at least 2 characters.");
      isValid = false;
    } else {
      clearError(nameInput);
    }

    if (!validateEmail(emailInput.value)) {
      showError(emailInput, "Please enter a valid email address.");
      isValid = false;
    } else {
      clearError(emailInput);
    }

    if (!validateMessage(messageInput.value)) {
      showError(messageInput, "Message must be at least 10 characters.");
      isValid = false;
    } else {
      clearError(messageInput);
    }

    if (!isValid) return;

    btnText.textContent = "Sending...";
    spinner.style.display = "inline-block";
    submitButton.disabled = true;

    try {
      const response = await fetch(
        "https://app.southwestsystem.org/api/contact/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nameInput.value,
            email: emailInput.value,
            message: messageInput.value,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "An unknown error occurred.");
      }

      showStatusMessage(
        "Message sent successfully! We will get back to you shortly.",
        "success"
      );
      contactForm.reset();
    } catch (error) {
      showStatusMessage(`Error: ${error.message}`, "error");
    } finally {
      btnText.textContent = "Send Message";
      spinner.style.display = "none";
      submitButton.disabled = false;
    }
  });
});
