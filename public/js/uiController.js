// uiController.js

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
    // Toggle meta overlay when backtick is pressed.
    document.addEventListener('keydown', function (event) {
      if (event.key === '`') {
        toggleMetaOverlay();
      }
    });
  
    // Close overlay when close button is clicked.
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
      view1: () => {
        document.querySelector(".grid-container").style.display = "flex";
        document.querySelector(".top-section").style.display = "grid";
        document.querySelector(".scene-section").style.display = "grid";
        document.getElementById("fullScreenPLYViewer").style.display = "none";
        toggleView3Elements(false);
        window.showOrientationHelper = false;
      },
      view2: () => {
        document.querySelector(".grid-container").style.display = "flex";
        document.querySelector(".top-section").style.display = "grid";
        document.querySelector(".scene-section").style.display = "grid";
        document.getElementById("fullScreenPLYViewer").style.display = "none";
        toggleView3Elements(false);
        window.showOrientationHelper = false;
      },
      view3: () => {
        document.querySelector(".grid-container").style.display = "none";
        document.getElementById("fullScreenPLYViewer").style.display = "block";
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
  
  // Expose a function to resize the PLY viewer.
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
  