document.addEventListener("DOMContentLoaded", function () {
  initializeServices();

  initializeSmoothScrolling();

  initializeScrollAnimations();
});

function initializeServices() {
  const learnMoreButtons = document.querySelectorAll(".btn-learn-more");

  learnMoreButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const service = this.getAttribute("data-service");
      redirectToServiceDetail(service);
    });
  });
}

function redirectToServiceDetail(service) {
  const servicePages = {
    "borehole-drilling": "borehole-drilling.html",
    "water-surveys": "water-surveys.html",
    "pump-installations": "pump-installations.html",
    maintenance: "maintenance.html",
  };

  if (servicePages[service]) {
    window.location.href = servicePages[service];
  }
}

function initializeSmoothScrolling() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });
}

function initializeScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate-in");
      }
    });
  }, observerOptions);

  const serviceCards = document.querySelectorAll(".service-card");
  serviceCards.forEach((card) => {
    observer.observe(card);
  });

  const processSteps = document.querySelectorAll(".step");
  processSteps.forEach((step) => {
    observer.observe(step);
  });
}

const style = document.createElement("style");
style.textContent = `
    .service-card,
    .step {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
    }
    
    .service-card.animate-in,
    .step.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    .service-card:nth-child(1) { transition-delay: 0.1s; }
    .service-card:nth-child(2) { transition-delay: 0.2s; }
    .service-card:nth-child(3) { transition-delay: 0.3s; }
    .service-card:nth-child(4) { transition-delay: 0.4s; }
    
    .step:nth-child(1) { transition-delay: 0.1s; }
    .step:nth-child(2) { transition-delay: 0.2s; }
    .step:nth-child(3) { transition-delay: 0.3s; }
    .step:nth-child(4) { transition-delay: 0.4s; }
`;
document.head.appendChild(style);

window.addEventListener("resize", function () {
  debounce(handleResize, 250)();
});

function handleResize() {
  console.log("Window resized");
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function addLoadingState(button) {
  const originalText = button.textContent;
  button.textContent = "Loading...";
  button.disabled = true;

  return function removeLoadingState() {
    button.textContent = originalText;
    button.disabled = false;
  };
}

function handleFormSubmission(form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');
    const removeLoading = addLoadingState(submitButton);

    setTimeout(() => {
      removeLoading();
    }, 2000);
  });
}
