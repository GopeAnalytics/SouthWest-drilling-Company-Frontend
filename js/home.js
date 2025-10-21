const images = ["./LodwarProject2.jpg", "./waterislife.jpg"];
const randomIndex = Math.floor(Math.random() * images.length);
const style = document.createElement("style");
const heroSection = document.querySelector(".home-hero");
style.innerHTML = `
  .home-hero::before {
    background-image: url('${images[randomIndex]}');
  }
`;
document.head.appendChild(style);

const cards = document.querySelectorAll(".project-card");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.1,
  }
);

cards.forEach((card) => observer.observe(card));
