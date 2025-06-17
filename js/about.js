function includeHTML(selector, url) {
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.text();
    })
    .then((data) => {
      document.querySelector(selector).innerHTML = data;
      setActiveNavLink(selector);
    })
    .catch((error) => {
      console.error("Error including HTML:", error);
    });
}

function setActiveNavLink(containerSelector) {
  setTimeout(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const links = container.querySelectorAll(".nav-link");
    const currentPath = window.location.pathname || "index.html";
    links.forEach((link) => {
      link.classList.remove("active");

      const href = link.getAttribute("href");
      if (currentPath.includes(href)) {
        link.classList.add("active");
      }

      if (
        (currentPath === "index.html" || currentPath === "") &&
        (href === "/" || href === "#")
      ) {
        link.classList.add("active");
      }
    });
  }, 0);
}

(function watchHeaderInclude() {
  const tryIncludeHeader = () => {
    const header = document.querySelector(".header-include");
    if (header && !header.dataset.loaded) {
      includeHTML(".header-include", "/__header.html");
      header.dataset.loaded = "true";
      return true;
    }
    return false;
  };
  if (!tryIncludeHeader()) {
    const observer = new MutationObserver(() => {
      if (tryIncludeHeader()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();

new WOW().init();
