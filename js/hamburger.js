document.addEventListener("DOMContentLoaded", function () {
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const navMenu = document.getElementById("navMenu");

  function toggleMobileMenu() {
    navMenu.classList.toggle("active");
    mobileMenuToggle.classList.toggle("active");
    document.body.style.overflow = navMenu.classList.contains("active")
      ? "hidden"
      : "";
  }

  function closeMobileMenu() {
    navMenu.classList.remove("active");
    mobileMenuToggle.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", toggleMobileMenu);
  }

  document.querySelectorAll(".nav-menu a").forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navMenu.classList.contains("active")) {
      closeMobileMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && navMenu.classList.contains("active")) {
      closeMobileMenu();
    }
  });
});
