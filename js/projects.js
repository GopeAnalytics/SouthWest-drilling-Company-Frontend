document.addEventListener("DOMContentLoaded", () => {
  window.projectsApp = new ProjectsApp();
});

class ProjectsApp {
  constructor() {
    this.allProjects = [];
    this.filteredProjects = [];
    this.isFilterActive = false;
    this.currentPage = 1;
    this.itemsPerPage = 3;
    this.slideshowIntervals = [];
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadProjects();
    this.renderProjects();
  }

  bindEvents() {
    document
      .getElementById("loadMoreBtn")
      ?.addEventListener("click", () => this.loadMore());
    document
      .querySelector(".details-modal-close")
      ?.addEventListener("click", () => this.closeDetailsModal());
    document
      .getElementById("projectDetailsModal")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "projectDetailsModal") {
          this.closeDetailsModal();
        }
      });

    // Bind filter events
    document
      .getElementById("applyFilters")
      ?.addEventListener("click", () => this.applyFilters());
    document
      .getElementById("resetFilters")
      ?.addEventListener("click", () => this.resetFilters());
  }

  async loadProjects() {
    const loadingEl = document.getElementById("loadingContainer");
    loadingEl.style.display = "flex";
    try {
      const response = await fetch("http://localhost:5000/api/page-projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      this.allProjects = await response.json();
    } catch (error) {
      console.error("Error fetching projects:", error);
      document.getElementById("projectsGrid").innerHTML =
        '<p class="empty-state">Could not load projects. Please try again later.</p>';
    } finally {
      loadingEl.style.display = "none";
    }
  }

  applyFilters() {
    const yearFilter = document.getElementById("yearFilter").value;
    const typeFilter = document.getElementById("typeFilter").value;

    this.isFilterActive = true;
    let tempProjects = [...this.allProjects];

    // Filter by year
    if (yearFilter) {
      tempProjects = tempProjects.filter((project) => {
        const projectYear = new Date(project.startDate).getFullYear();
        return projectYear.toString() === yearFilter;
      });
    }

    // Filter by type
    if (typeFilter) {
      tempProjects = tempProjects.filter(
        (project) => project.type === typeFilter
      );
    }

    this.filteredProjects = tempProjects;
    this.currentPage = 1;
    this.renderProjects();
  }

  resetFilters() {
    document.getElementById("yearFilter").value = "";
    document.getElementById("typeFilter").value = "";
    this.isFilterActive = false;
    this.filteredProjects = [];
    this.currentPage = 1;
    this.renderProjects();
  }

  renderProjects() {
    const grid = document.getElementById("projectsGrid");
    const emptyState = document.querySelector(".empty-state-message");
    if (emptyState) emptyState.remove();

    const sourceData = this.isFilterActive
      ? this.filteredProjects
      : this.allProjects;

    const projectsToDisplay = sourceData.slice(
      0,
      this.currentPage * this.itemsPerPage
    );

    this.slideshowIntervals.forEach(clearInterval);
    this.slideshowIntervals = [];

    if (projectsToDisplay.length === 0) {
      grid.innerHTML =
        '<p class="empty-state-message">No projects found matching your criteria.</p>';
    } else {
      grid.innerHTML = projectsToDisplay
        .map((project) => this.createProjectCard(project))
        .join("");
    }

    this.updateLoadMoreButton();
    this.initializeCardSlideshows();
  }

  createProjectCard(project) {
    const {
      _id,
      title,
      type,
      location,
      description,
      startDate,
      endDate,
      ongoing,
      gallery,
    } = project;

    // thumbnail from the first gallery item
    const thumbnail = gallery[0];
    const thumbnailUrl =
      thumbnail.fileType === "video"
        ? thumbnail.url.replace(/\.mp4$/, ".jpg")
        : thumbnail.url;

    return `
      <div class="project-card" data-project-id="${_id}">
          <div class="project-thumbnail">
              <img class="project-thumbnail-img" src="${thumbnailUrl}" alt="${title}">
              <div class="project-category category-${type}">${type.replace(
      "-",
      " "
    )}</div>
          </div>
          <div class="project-content">
              <h4 class="project-name">${title}</h4>
              <p class="project-description">${description.substring(
                0,
                100
              )}...</p>
              <div class="project-meta">
                  <div class="meta-item"><i class="fas fa-map-marker-alt"></i><span>${location}</span></div>
                  <div class="meta-item"><i class="fas fa-calendar-alt"></i><span>${this.formatDateRange(
                    startDate,
                    endDate,
                    ongoing
                  )}</span></div>
              </div>
              <div class="project-actions">
                  <button class="btn-outline" onclick="window.projectsApp.showDetails('${_id}')">View Details</button>
              </div>
          </div>
      </div>
    `;
  }

  initializeCardSlideshows() {
    document.querySelectorAll(".project-card").forEach((card) => {
      const projectId = card.dataset.projectId;
      const project = this.allProjects.find((p) => p._id === projectId);
      if (!project || project.gallery.length <= 1) return;

      const thumbnailImg = card.querySelector(".project-thumbnail-img");
      let currentIndex = 0;

      const intervalId = setInterval(() => {
        currentIndex = (currentIndex + 1) % project.gallery.length;
        const nextFile = project.gallery[currentIndex];
        const nextUrl =
          nextFile.fileType === "video"
            ? nextFile.url.replace(/\.mp4$/, ".jpg")
            : nextFile.url;
        thumbnailImg.src = nextUrl;
      }, 3500);

      this.slideshowIntervals.push(intervalId);
    });
  }

  showDetails(projectId) {
    const project = this.allProjects.find((p) => p._id === projectId);
    if (!project) return;

    const modal = document.getElementById("projectDetailsModal");
    const modalContent = modal.querySelector(".details-modal-content");

    // slideshow for the modal gallery
    const slides = project.gallery
      .map((file) => {
        if (file.fileType === "video") {
          return `<div class="slide"><video src="${file.url}" controls muted loop playsinline></video></div>`;
        }
        return `<div class="slide"><img src="${file.url}" alt="${project.title}"></div>`;
      })
      .join("");

    modalContent.innerHTML = `
      <div class="details-gallery-container project-slideshow">
          <div class="slideshow-inner">${slides}</div>
          <button class="slideshow-nav prev-slide"><i class="fas fa-chevron-left"></i></button>
          <button class="slideshow-nav next-slide"><i class="fas fa-chevron-right"></i></button>
      </div>
      <div class="details-info-container">
        <h2>${project.title}</h2>
        <div class="meta-item"><i class="fas fa-map-marker-alt"></i><span>${
          project.location
        }</span></div>
        <div class="meta-item"><i class="fas fa-calendar-alt"></i><span>${this.formatDateRange(
          project.startDate,
          project.endDate,
          project.ongoing
        )}</span></div>
        <hr>
        <p>${project.description.replace(/\n/g, "<br>")}</p>
      </div>
    `;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    this.initializeModalSlideshow();
  }

  initializeModalSlideshow() {
    const slideshow = document.querySelector(
      "#projectDetailsModal .project-slideshow"
    );
    if (!slideshow) return;

    const inner = slideshow.querySelector(".slideshow-inner");
    const slides = slideshow.querySelectorAll(".slide");
    const prevBtn = slideshow.querySelector(".prev-slide");
    const nextBtn = slideshow.querySelector(".next-slide");
    let currentIndex = 0;

    if (slides.length <= 1) {
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
      return;
    }

    const showSlide = (index) => {
      inner.style.transform = `translateX(-${index * 100}%)`;
    };

    prevBtn.addEventListener("click", () => {
      currentIndex = currentIndex > 0 ? currentIndex - 1 : slides.length - 1;
      showSlide(currentIndex);
    });

    nextBtn.addEventListener("click", () => {
      currentIndex = currentIndex < slides.length - 1 ? currentIndex + 1 : 0;
      showSlide(currentIndex);
    });
  }

  closeDetailsModal() {
    const modal = document.getElementById("projectDetailsModal");
    modal.style.display = "none";
    document.body.style.overflow = "auto";
    const video = modal.querySelector("video");
    if (video) {
      video.pause();
    }
  }

  loadMore() {
    this.currentPage++;
    this.renderProjects();
  }

  updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    const sourceData = this.isFilterActive
      ? this.filteredProjects
      : this.allProjects;
    const hasMore = sourceData.length > this.currentPage * this.itemsPerPage;
    loadMoreBtn.style.display = hasMore ? "inline-block" : "none";
  }

  formatDateRange(start, end, ongoing) {
    const startDate = new Date(start);
    const options = { year: "numeric", month: "short" };
    let dateString = startDate.toLocaleDateString("en-US", options);

    if (ongoing) {
      dateString += " - Present";
    } else if (end) {
      const endDate = new Date(end);
      dateString += ` - ${endDate.toLocaleDateString("en-US", options)}`;
    }
    return dateString;
  }
}
