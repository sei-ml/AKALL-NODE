import { createPLYPreview } from './plyPreview.js';

// Toggle the meta overlay on/off.
export function toggleMetaOverlay() {
  const overlay = document.getElementById('meta-overlay');
  overlay.style.display = overlay.style.display === 'block' ? 'none' : 'block';
}
  
// Toggle the display of view3-specific elements.
export function toggleView3Elements(state) {
  const view3menus = document.getElementsByClassName("view3-menu");
  for (let i = 0; i < view3menus.length; i++) {
    view3menus[i].style.display = state ? 'flex' : 'none';
  }
}
  
// Set up global UI event listeners.
export function setupGlobalUIListeners() {
  document.addEventListener('keydown', function (event) {
    if (event.key === '`') {
      toggleMetaOverlay();
    }
  });
  const closeOverlayBtn = document.getElementById('close-overlay');
  if (closeOverlayBtn) {
    closeOverlayBtn.addEventListener('click', function () {
      document.getElementById('meta-overlay').style.display = 'none';
    });
  }
}
  
// Adjust layout based on window size.
export function setupLayoutAdjustment() {
  function adjustLayout() {
    const vh = window.innerHeight;
    const extra = 30;
    const availableHeight = vh - extra;
    const topHeight = availableHeight * 0.7;
    const sceneHeight = availableHeight * 0.3;
    const topSection = document.querySelector('.top-section');
    const sceneSection = document.querySelector('.scene-section');
    if (topSection) topSection.style.height = topHeight + 'px';
    if (sceneSection) sceneSection.style.height = sceneHeight + 'px';
  }
  window.addEventListener('load', adjustLayout);
  window.addEventListener('resize', adjustLayout);
}
  
// Set up view switching logic.
export function setupViewSwitching(createPLYViewerFn, resizePLYViewerFn) {
  let plyViewerInstance = null;
  
  const views = {
    // New multiview (view1) using container with id "multiview" to show PLY previews.
    view1: () => {
      // Hide other containers.
      const gridContainer = document.querySelector(".grid-container");
      if (gridContainer) gridContainer.style.display = "none";
      const topSection = document.querySelector(".top-section");
      if (topSection) topSection.style.display = "none";
      const sceneSection = document.querySelector(".scene-section");
      if (sceneSection) sceneSection.style.display = "none";
      const fullScreenContainer = document.getElementById("fullScreenPLYViewer");
      if (fullScreenContainer) fullScreenContainer.style.display = "none";
      
      // Show the multiview container.
      const multiview = document.getElementById("multiview");
      if (multiview) {
        multiview.style.display = "block";
        populateMultiview();
      } else {
        console.error("No 'multiview' container found in HTML.");
      }
  
      toggleView3Elements(false);
      window.showOrientationHelper = false;
    },
    // Detailed view (view2) – the default.
    view2: () => {
      const gridContainer = document.querySelector(".grid-container");
      if (gridContainer) gridContainer.style.display = "flex";
      const topSection = document.querySelector(".top-section");
      if (topSection) topSection.style.display = "grid";
      const sceneSection = document.querySelector(".scene-section");
      if (sceneSection) sceneSection.style.display = "grid";
      const fullScreenContainer = document.getElementById("fullScreenPLYViewer");
      if (fullScreenContainer) fullScreenContainer.style.display = "none";
      const multiview = document.getElementById("multiview");
      if (multiview) multiview.style.display = "none";
  
      toggleView3Elements(false);
      window.showOrientationHelper = false;
    },
    // Full-screen PLY viewer (view3).
    view3: () => {
      const gridContainer = document.querySelector(".grid-container");
      if (gridContainer) gridContainer.style.display = "none";
      const topSection = document.querySelector(".top-section");
      if (topSection) topSection.style.display = "none";
      const sceneSection = document.querySelector(".scene-section");
      if (sceneSection) sceneSection.style.display = "none";
      const multiview = document.getElementById("multiview");
      if (multiview) multiview.style.display = "none";
      const fullScreenContainer = document.getElementById("fullScreenPLYViewer");
      if (fullScreenContainer) fullScreenContainer.style.display = "block";
  
      toggleView3Elements(true);
      window.showOrientationHelper = true;
  
      if (!plyViewerInstance) {
        console.log("Initializing full-screen Three.js viewer...");
        if (window.metaData) {
          const meta = window.metaData;
          const parts = meta.processedPath.split('/');
          const folderName = parts[parts.length - 1];
          const relativePath = "/watch/processed/" + folderName + "/";
          if (meta.outputs.nd3Reconstruction?.length) {
            plyViewerInstance = createPLYViewerFn("fullScreenPLYViewer", relativePath + meta.outputs.nd3Reconstruction[0].ply);
          }
        } else {
          console.error("Meta data is not loaded yet!");
        }
      } else {
        resizePLYViewerFn();
      }
    }
  };
  
  function switchView(view) {
    Object.keys(views).forEach(v => {
      document.body.classList.remove(v);
    });
    document.body.classList.add(view);
    views[view]();
    document.querySelectorAll(".menu-item").forEach(item => {
      item.classList.remove("selected");
    });
    const selector = `.menu-item[data-view="${view}"]`;
    const selectedItem = document.querySelector(selector);
    if (selectedItem) selectedItem.classList.add("selected");
  }
  
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", function () {
      const view = this.getAttribute("data-view");
      switchView(view);
    });
  });
  
  // Default view is view2.
  switchView("view2");
}
  
// Set up the log view toggle.
export function setupLogView() {
  const logView = document.getElementById("logview");
  const closeButton = document.getElementById("close-logview");
  if (closeButton) {
    closeButton.addEventListener("click", function () {
      logView.classList.toggle("minimized");
    });
  }
}
  
// Expose a function to resize the full-screen PLY viewer.
export function resizePLYViewer() {
  const plyContainer = document.getElementById("fullScreenPLYViewer");
  if (plyContainer) {
    const canvas = plyContainer.querySelector("canvas");
    if (canvas) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    }
  }
}
  
// Helper function to populate the multiview container with PLY previews.
function populateMultiview() {
  const multiview = document.getElementById("multiview");
  if (!multiview) return;
  
  // Clear previous content.
  multiview.innerHTML = "";
  
  // Create three rows: top, center, and bottom.
  const topDiv = document.createElement("div");
  topDiv.className = "multiview-top";
  topDiv.style.height = "20%";
  topDiv.style.display = "flex";
  topDiv.style.alignItems = "center";
  topDiv.style.justifyContent = "center";
  topDiv.innerText = "Top Text (20% of screen)";
  
  const centerDiv = document.createElement("div");
  centerDiv.className = "multiview-center";
  centerDiv.style.height = "60%";
  centerDiv.style.position = "relative";
  centerDiv.style.overflow = "hidden";
  
  const bottomDiv = document.createElement("div");
  bottomDiv.className = "multiview-bottom";
  bottomDiv.style.height = "20%";
  bottomDiv.style.display = "flex";
  bottomDiv.style.alignItems = "center";
  bottomDiv.style.justifyContent = "center";
  bottomDiv.innerText = "Bottom Text (20% of screen)";
  
  // Create a carousel container inside the center row.
  const carousel = document.createElement("div");
  carousel.className = "film-carousel";
  carousel.style.height = "100%";
  carousel.style.display = "flex";
  carousel.style.overflowX = "auto";
  carousel.style.whiteSpace = "nowrap";
  carousel.style.boxSizing = "border-box";
  carousel.style.padding = "10px";
  
  // Add a wheel event listener: translate vertical scrolling into horizontal scrolling.
  carousel.addEventListener("wheel", (e) => {
    e.preventDefault();
    carousel.scrollLeft += e.deltaY;
  });
  
  const centerRowHeight = window.innerHeight * 0.6;
  const previewSize = centerRowHeight * 0.9;
  
  // Get .ply file URLs from metaData.
  const meta = window.metaData;
  const parts = meta.processedPath.split('/');
  const folderName = parts[parts.length - 1];
  const relativePath = "/watch/processed/" + folderName + "/";
  let plyFiles = [];
  if (meta && meta.outputs && meta.outputs.nd3Reconstruction) {
    plyFiles = meta.outputs.nd3Reconstruction.map(item => relativePath + item.ply);
  }
  
  // For demonstration, ensure at least 5 previews.
  while (plyFiles.length < 5) {
    plyFiles = plyFiles.concat(plyFiles);
  }
  plyFiles = plyFiles.slice(0, 5);
  
  // Create a preview canvas for each .ply file.
  plyFiles.forEach(plyUrl => {
    const previewCanvas = createPLYPreview(plyUrl, previewSize, previewSize);
    previewCanvas.className = "film-thumb";
    previewCanvas.style.marginRight = "10px";
    carousel.appendChild(previewCanvas);
  });
  
  // Append the carousel to the center row.
  centerDiv.appendChild(carousel);
  
  // Append the three rows to the multiview container.
  multiview.appendChild(topDiv);
  multiview.appendChild(centerDiv);
  multiview.appendChild(bottomDiv);
  
  // Create left and right arrow buttons.
  const leftArrow = document.createElement("button");
  leftArrow.innerHTML = "&#9664;";
  leftArrow.className = "carousel-arrow left-arrow";
  leftArrow.style.position = "absolute";
  leftArrow.style.left = "10px";
  leftArrow.style.top = "50%";
  leftArrow.style.transform = "translateY(-50%)";
  leftArrow.style.zIndex = "10";
  leftArrow.addEventListener("click", () => {
    carousel.scrollBy({ left: -previewSize * 1.5, behavior: "smooth" });
  });
  
  const rightArrow = document.createElement("button");
  rightArrow.innerHTML = "&#9654;";
  rightArrow.className = "carousel-arrow right-arrow";
  rightArrow.style.position = "absolute";
  rightArrow.style.right = "10px";
  rightArrow.style.top = "50%";
  rightArrow.style.transform = "translateY(-50%)";
  rightArrow.style.zIndex = "10";
  rightArrow.addEventListener("click", () => {
    carousel.scrollBy({ left: previewSize * 1.5, behavior: "smooth" });
  });
  
  // Append the carousel and arrow buttons to the center row.
  centerDiv.appendChild(carousel);
  centerDiv.appendChild(leftArrow);
  centerDiv.appendChild(rightArrow);
  
  // Append the three rows to the multiview container.
  multiview.appendChild(topDiv);
  multiview.appendChild(centerDiv);
  multiview.appendChild(bottomDiv);
}
