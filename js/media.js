// js/media.js (Corrected)

document.addEventListener("DOMContentLoaded", function () {
  const API_BASE_URL = "https://app.southwestsystem.org/api";
  fetchAndRenderPage(API_BASE_URL);
  setupScrollAnimation();
});

async function fetchAndRenderPage(apiBaseUrl) {
  try {
    const [mediaRes, projectsRes] = await Promise.all([
      fetch(`${apiBaseUrl}/media`),
      fetch(`${apiBaseUrl}/media-projects`),
    ]);

    if (!mediaRes.ok || !projectsRes.ok) {
      throw new Error("Failed to fetch content from the server.");
    }

    const mediaItems = await mediaRes.json();
    const projects = await projectsRes.json();

    renderServicesSection(mediaItems);
    renderBeforeAndAfterSection(projects);
    renderVideoGallery(mediaItems);
  } catch (error) {
    console.error("Error loading page content:", error);
    document.querySelector(".main-content").innerHTML =
      '<p class="empty-state" style="color: red; padding: 5rem 1rem;">Could not load gallery content. An error occurred while rendering the page.</p>';
  }
}

const ITEMS_PER_PAGE = 3;

function renderServicesSection(mediaItems) {
  const serviceCategoryMapping = {
    "Borehole Drilling": ["borehole-drilling", "drilling-rig"],
    "Water Surveys": ["water-surveys", "platform"],
    Maintenance: ["maintenance", "team"],
    "Pump Installations": ["pump-installations", "equipment"],
  };

  document.querySelectorAll(".service-category").forEach((categoryEl) => {
    const title = categoryEl
      .querySelector(".service-title")
      ?.textContent.trim();
    const targetCategories = serviceCategoryMapping[title];
    const serviceGrid = categoryEl.querySelector(".service-grid");

    if (targetCategories && serviceGrid) {
      const relevantMedia = mediaItems.filter((item) =>
        targetCategories.includes(item.category)
      );

      serviceGrid.innerHTML = "";
      if (relevantMedia.length > 0) {
        renderItemsInGrid(serviceGrid, relevantMedia, 0);
      } else {
        serviceGrid.innerHTML =
          '<p class="empty-state">Media for this service will be uploaded soon.</p>';
      }
    }
  });
}

function renderItemsInGrid(grid, items, startIndex) {
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const itemsToRender = items.slice(startIndex, endIndex);

  itemsToRender.forEach((item) => {
    const cardHTML = createMediaCard(item);

    if (cardHTML) {
      grid.insertAdjacentHTML("beforeend", cardHTML);
      const newCard = grid.lastElementChild;

      if (newCard) {
        observer.observe(newCard);
      }
    }
  });

  const loadMoreBtn = grid.parentElement.querySelector(".load-more-btn");
  if (loadMoreBtn) loadMoreBtn.remove();

  if (endIndex < items.length) {
    const button = document.createElement("button");
    button.className = "load-more-btn";
    button.textContent = "Load More";
    button.onclick = () => {
      renderItemsInGrid(grid, items, endIndex);
    };
    grid.parentElement.appendChild(button);
  }
}

function renderBeforeAndAfterSection(projects) {
  const container = document.querySelector(".before-after-container");
  if (!container) return;

  const projectsWithFiles = projects.filter(
    (p) => p.beforeFiles?.length > 0 && p.afterFiles?.length > 0
  );

  if (projectsWithFiles.length > 0) {
    container.innerHTML = projectsWithFiles
      .map(
        (project) => `
      <div class="before-after-item">
        <h3 class="project-title">${project.title} - ${project.location}</h3>
        <p class="project-main-description">${project.description || ""}</p>
        <div class="comparison-wrapper">
          <div class="before-after-card before">
            <div class="image-label">Before</div>
            ${createMediaCard({
              title: `Before: ${project.title}`,
              description: project.beforeDescription,
              files: project.beforeFiles,
            })}
          </div>
          <div class="before-after-card after">
            <div class="image-label">After</div>
            ${createMediaCard({
              title: `After: ${project.title}`,
              description: project.afterDescription,
              files: project.afterFiles,
            })}
          </div>
        </div>
      </div>`
      )
      .join("");

    container
      .querySelectorAll(".before-after-item")
      .forEach((card) => observer.observe(card));
  } else {
    container.innerHTML =
      '<p class="empty-state">Project showcases will be available soon.</p>';
  }
}

function renderVideoGallery(mediaItems) {
  const videoGrid = document.querySelector(".video-grid");
  if (!videoGrid) return;

  const videos = mediaItems.filter(
    (item) => item.files && item.files.some((f) => f.fileType === "video")
  );

  if (videos.length > 0) {
    videoGrid.innerHTML = "";
    videos.forEach((item) => {
      const cardHTML = createMediaCard(item);

      if (cardHTML) {
        videoGrid.insertAdjacentHTML("beforeend", cardHTML);
        const newCard = videoGrid.lastElementChild;
        if (newCard) {
          observer.observe(newCard);
        }
      }
    });
  } else {
    videoGrid.innerHTML =
      '<p class="empty-state">No videos have been uploaded yet.</p>';
  }
}

function createMediaCard(item) {
  if (!item.files || item.files.length === 0) return "";

  const firstFile = item.files[0];
  const thumbnailUrl =
    firstFile.fileType === "video"
      ? firstFile.fileUrl.replace(/\.(mp4|mov|avi|wmv)$/, ".jpg")
      : firstFile.fileUrl;

  const isVideo = item.files.some((f) => f.fileType === "video");
  // Storing data as a JSON string
  const itemData = JSON.stringify({
    title: item.title,
    description: item.description,
    files: item.files,
  })
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;");

  return `
    <div class="media-card" onclick='showMediaModal(${itemData})'>
      <div class="media-card-thumbnail" style="background-image: url('${thumbnailUrl}')">
        ${isVideo ? '<i class="fas fa-play-circle play-icon"></i>' : ""}
      </div>
      <div class="media-card-info">
        <h4 class="media-card-title">${item.title || "Untitled"}</h4>
        <p class="media-card-description">${
          item.description || "Click to view details."
        }</p>
      </div>
    </div>`;
}
let observer;
function setupScrollAnimation() {
  observer = new IntersectionObserver(
    (entries, observerInstance) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observerInstance.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px", threshold: 0.1 }
  );
}

function showMediaModal({ title, description, files }) {
  const container = document.getElementById("mediaModalContainer");
  if (!files || files.length === 0) return;

  let currentIndex = 0;

  const getMediaElement = (file) => {
    if (file.fileType === "video") {
      return `<video src="${file.fileUrl}" class="modal-media-item" controls autoplay muted playsinline></video>`;
    }
    return `<img src="${file.fileUrl}" alt="${title}" class="modal-media-item"/>`;
  };

  const modalHTML = `
    <div class="media-modal-overlay">
      <div class="media-modal-content">
        <button class="modal-close-btn">&times;</button>
        <div class="modal-media-area">
          ${
            files.length > 1
              ? '<button class="modal-nav-arrow prev">&lt;</button>'
              : ""
          }
          ${getMediaElement(files[currentIndex])}
          ${
            files.length > 1
              ? '<button class="modal-nav-arrow next">&gt;</button>'
              : ""
          }
        </div>
        <div class="modal-info-area">
          <h3 class="modal-title">${title || ""}</h3>
          <p class="modal-description">${description || ""}</p>
        </div>
      </div>
    </div>
  `;
  container.innerHTML = modalHTML;

  const overlay = container.querySelector(".media-modal-overlay");
  const mediaArea = container.querySelector(".modal-media-area");

  const updateMedia = () => {
    mediaArea.innerHTML = `
        ${
          files.length > 1
            ? '<button class="modal-nav-arrow prev">&lt;</button>'
            : ""
        }
        ${getMediaElement(files[currentIndex])}
        ${
          files.length > 1
            ? '<button class="modal-nav-arrow next">&gt;</button>'
            : ""
        }
    `;
    if (files.length > 1) {
      mediaArea.querySelector(".prev").addEventListener("click", navigatePrev);
      mediaArea.querySelector(".next").addEventListener("click", navigateNext);
    }
  };

  const navigate = (direction) => {
    currentIndex = (currentIndex + direction + files.length) % files.length;
    updateMedia();
  };
  const navigateNext = () => navigate(1);
  const navigatePrev = () => navigate(-1);

  const closeModal = () => {
    const modalContent = overlay.querySelector(".media-modal-content");
    if (modalContent) {
      overlay.style.animation = "fadeOutModal 0.3s forwards";
      modalContent.style.animation = "zoomOutModal 0.3s forwards";
    }
    setTimeout(() => (container.innerHTML = ""), 300);
  };

  if (files.length > 1) {
    mediaArea.querySelector(".prev").addEventListener("click", navigatePrev);
    mediaArea.querySelector(".next").addEventListener("click", navigateNext);
  }
  container
    .querySelector(".modal-close-btn")
    .addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
}

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    @keyframes fadeOutModal { from { opacity: 1; } to { opacity: 0; } }
    @keyframes zoomOutModal { from { transform: scale(1); } to { transform: scale(0.95); } }
`;
document.head.appendChild(styleSheet);
