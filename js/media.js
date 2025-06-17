document.addEventListener("DOMContentLoaded", function () {
  const dynamicStyles = `
    .service-grid, .video-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 2rem;
    }
    .media-card {
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .media-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.12);
    }
    .media-card-thumbnail {
        width: 100%;
        height: 200px;
        background-color: #f0f0f0;
        position: relative;
    }
    .media-card-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .media-card-thumbnail .play-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 3.5rem;
        color: rgba(255, 255, 255, 0.85);
        text-shadow: 0 0 15px rgba(0,0,0,0.6);
    }
    .media-card-info {
        padding: 1rem;
    }
    .media-card-title {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
        color: #1e3a8a;
        font-weight: 600;
    }
    .media-card-description {
        margin: 0;
        font-size: 0.9rem;
        color: #666;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .empty-state {
        text-align: center;
        padding: 2rem;
        color: #666;
        grid-column: 1 / -1;
    }
    /* Style for the new main project description */
    .project-main-description {
        text-align: center;
        max-width: 800px;
        margin: 0.5rem auto 2rem auto;
        color: #555;
        font-size: 1rem;
        line-height: 1.6;
    }
  `;
  const styleSheet = document.createElement("style");
  styleSheet.innerText = dynamicStyles;
  document.head.appendChild(styleSheet);

  fetchAndRenderPage();
});

async function fetchAndRenderPage() {
  try {
    const [mediaRes, projectsRes] = await Promise.all([
      fetch("http://localhost:5000/api/media"),
      fetch("http://localhost:5000/api/media-projects"),
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
    const mediaSection = document.querySelector(".media-section");
    if (mediaSection) {
      mediaSection.innerHTML =
        '<p class="empty-state" style="color: red;">Could not load gallery content. Please try again later.</p>';
    }
  }
}

/**
 *
 * @param {object} item
 * @returns {string}
 */
function renderMediaCard(item) {
  const thumbnailUrl =
    item.fileType === "video" && item.fileUrl
      ? item.fileUrl.replace(/\.(mp4|mov|avi|wmv)$/, ".jpg")
      : item.fileUrl;

  const clickHandler =
    item.fileType === "video"
      ? `showVideoModal('${item.title}', '${item.description}', '${item.fileUrl}')`
      : `showImageModal('${item.title}', '${item.description}', '${item.fileUrl}')`;

  return `
        <div class="media-card" onclick="${clickHandler}">
            <div class="media-card-thumbnail">
                <img src="${
                  thumbnailUrl || "assets/images/placeholder.webp"
                }" alt="${
    item.title
  }" loading="lazy" onerror="this.onerror=null;this.src='assets/images/placeholder.webp';">
                ${
                  item.fileType === "video"
                    ? '<i class="fas fa-play-circle play-icon"></i>'
                    : ""
                }
            </div>
            <div class="media-card-info">
                <h4 class="media-card-title">${item.title || "Untitled"}</h4>
                <p class="media-card-description">${
                  item.description || "Click to view details."
                }</p>
            </div>
        </div>
    `;
}

/**
 *  "Our Services" section with relevant images.
 */
function renderServicesSection(mediaItems) {
  const serviceCategoryMapping = {
    "Borehole Drilling": ["drilling-rig", "platform"],
    Maintenance: ["team"],
    "Pump Installations": ["equipment"],
  };

  document.querySelectorAll(".service-category").forEach((categoryEl) => {
    const title = categoryEl.querySelector(".service-title")?.textContent;
    const targetCategories = serviceCategoryMapping[title];
    const serviceGrid = categoryEl.querySelector(".service-grid");

    if (targetCategories && serviceGrid) {
      const relevantMedia = mediaItems
        .filter(
          (item) =>
            targetCategories.includes(item.category) &&
            item.fileType === "image"
        )
        .slice(0, 3); // Take up to 3 images per service

      if (relevantMedia.length > 0) {
        serviceGrid.innerHTML = relevantMedia.map(renderMediaCard).join("");
      } else {
        serviceGrid.innerHTML =
          '<p class="empty-state">Media for this service will be uploaded soon.</p>';
      }
    }
  });
}

/**
 *  "Before & After" section with the latest projects.
 */
function renderBeforeAndAfterSection(projects) {
  const container = document.querySelector(".before-after-container");
  if (!container) return;

  const projectsWithFiles = projects
    .filter((p) => p.beforeFileUrl && p.afterFileUrl)
    .slice(0, 2);

  if (projectsWithFiles.length > 0) {
    container.innerHTML = projectsWithFiles
      .map(
        (project) => `
      <div class="before-after-item">
        <h3 class="project-title">${project.title} - ${project.location}</h3>
        <p class="project-main-description">${project.description}</p>
        <div class="comparison-wrapper">
          <div class="before-after-card before">
            <div class="image-label">Before</div>
            ${renderMediaCard({
              fileUrl: project.beforeFileUrl,
              fileType: project.beforeFileType,
              title: "Before: " + project.title,
              description: project.beforeDescription,
            })}
          </div>
          <div class="before-after-card after">
            <div class="image-label">After</div>
             ${renderMediaCard({
               fileUrl: project.afterFileUrl,
               fileType: project.afterFileType,
               title: "After: " + project.title,
               description: project.afterDescription,
             })}
          </div>
        </div>
      </div>
    `
      )
      .join("");
  } else {
    container.innerHTML =
      '<p class="empty-state">Project showcases will be available soon.</p>';
  }
}

/**
 * "Video Gallery" section with all uploaded videos.
 */
function renderVideoGallery(mediaItems) {
  const videoGrid = document.querySelector(".video-grid");
  if (!videoGrid) return;

  const videos = mediaItems.filter((item) => item.fileType === "video");

  if (videos.length > 0) {
    videoGrid.innerHTML = videos.map(renderMediaCard).join("");
  } else {
    videoGrid.innerHTML =
      '<p class="empty-state">No videos have been uploaded yet.</p>';
  }
}

function showImageModal(title, description, imageUrl) {
  destroyExistingModal();
  const modalHTML = `
        <div class="modal dynamic-modal" style="display: flex;">
            <div class="modal-content">
                <span class="close">&times;</span>
                <img src="${imageUrl}" alt="${title}" class="modal-image-dynamic"/>
                <div class="modal-info">
                  <h3 class="modal-title">${title}</h3>
                  <p class="modal-description">${description}</p>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  addModalEventListeners();
}

function showVideoModal(title, description, videoUrl) {
  destroyExistingModal();
  const modalHTML = `
        <div class="modal dynamic-modal" style="display: flex;">
            <div class="modal-content video-modal-content">
                <span class="close">&times;</span>
                <video src="${videoUrl}" class="modal-video-dynamic" controls autoplay></video>
                <div class="modal-info">
                  <h3 class="modal-title">${title}</h3>
                  <p class="modal-description">${description}</p>
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  addModalEventListeners();
}

function destroyExistingModal() {
  const existingModal = document.querySelector(".dynamic-modal");
  if (existingModal) {
    existingModal.remove();
  }
}

function addModalEventListeners() {
  const modal = document.querySelector(".dynamic-modal");
  if (!modal) return;

  modal.querySelector(".close").addEventListener("click", destroyExistingModal);
  modal.addEventListener("click", (e) => {
    if (e.target.classList.contains("dynamic-modal")) {
      destroyExistingModal();
    }
  });
}
