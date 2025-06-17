//////////////////////////////////////////////////////////
const searchButton = document.querySelector(".search");
searchButton.addEventListener("click", () => {
  document.querySelector("#searchBoxContainer").classList.add("searchActive");
  document.body.style.overflow = "hidden";
});

const closeSearchButton = document.querySelector(".close");
closeSearchButton.addEventListener("click", () => {
  document
    .querySelector("#searchBoxContainer")
    .classList.remove("searchActive");
  document.body.style.overflow = "";
});

const ms = document.querySelector(".learn-more");
const navContainer = document.querySelector("#logoAndNavigationContainer");

let isClickEventActive = false;

//////////////////////////////////////////////////////////
ms.addEventListener("click", (event) => {
  event.preventDefault();
  isClickEventActive = true; // Disable scroll event temporarily

  const target = document.querySelector("main");
  const navHeight = navContainer.offsetHeight;
  const targetPosition = target.getBoundingClientRect().top + window.scrollY;

  window.scrollTo({
    top: targetPosition - navHeight,
  });
  const heroBottom = header.getBoundingClientRect().bottom;
  const measure = header.offsetHeight - navContainer.offsetHeight;

  if (navContainer.offsetHeight >= heroBottom && window.scrollY >= measure) {
    navContainer.style.backgroundColor = "";
    navContainer.querySelector("#logo").style.marginLeft = "";
    navContainer.querySelector("#logo").style.transform = "";
    navContainer.querySelector("#logo").style.transition =
      "all .2s ease-in-out";
  } else {
    navContainer.style.backgroundColor = "#054855";
    navContainer.querySelector("#logo").style.marginLeft = "10px";
    navContainer.querySelector("#logo").style.transform = "scale(.9)";
    navContainer.querySelector("#logo").style.transition =
      "all .2s ease-in-out";
  }
  setTimeout(() => {
    isClickEventActive = false;
  }, 1000);
});

//////////////////////////////////////////
window.addEventListener("scroll", () => {
  if (isClickEventActive) return; // Skip scroll event if click event is active

  const heroBottom = header.getBoundingClientRect().bottom;
  const measure = header.offsetHeight - navContainer.offsetHeight;

  if (navContainer.offsetHeight >= heroBottom && window.scrollY >= measure) {
    navContainer.style.backgroundColor = "#054855";
    navContainer.querySelector("#logo").style.marginLeft = "10px";
    navContainer.querySelector("#logo").style.transform = "scale(.9)";
    navContainer.querySelector("#logo").style.transition =
      "marginLeft transform .5s ease-in-out";
  } else {
    navContainer.style.backgroundColor = "";
    navContainer.querySelector("#logo").style.marginLeft = "";
    navContainer.querySelector("#logo").style.transform = "";
    navContainer.querySelector("#logo").style.transition =
      "all .5s ease-in-out";
  }
});

//////////////////////////////////////////////////
const heroText = document.querySelector(".heroText");
const logoCont = document.querySelector("#logoAndNavigationContainer");
const main = document.querySelector(".main");
const learnMore = document.querySelector(".learn-more");
window.addEventListener("scroll", () => {
  const rect = heroText.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const heroBottom = header.getBoundingClientRect().bottom;
  const measure = header.offsetHeight - navContainer.offsetHeight;

  // Get how far the element is from the middle of the screen
  const distanceFromCenter = Math.abs(
    rect.top + rect.height / 2 - windowHeight / 2
  );

  //   // Max distance before it's fully invisible
  const maxDistance = windowHeight / 3 + rect.height / 2;

  //   // Calculate opacity: 1 when centered, 0 when far away
  let opacity = 1 - distanceFromCenter / maxDistance;
  // opacity = Math.max(0, Math.min(1, opacity));
  heroText.style.opacity = opacity;
  learnMore.style.opacity = opacity;
  learnMore.style.animation = "none";

  if (navContainer.offsetHeight >= heroBottom && window.scrollY >= measure) {
    heroText.style.display = "none";
    learnMore.style.display = "none";
  } else {
    heroText.style.display = "block";
    learnMore.style.display = "";
  }

  if (window.scrollY === 0) {
    heroText.style.opacity = 1;
    learnMore.style.opacity = 1;
  }
});

const lastModifiedContainer = document.createElement("p"),
  lastModified = new Date(document.lastModified);

lastModifiedContainer.innerHTML = `<strong>Last Modified: </strong>${lastModified}`;
document.querySelector(".copyright").append(lastModifiedContainer);
