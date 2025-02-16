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
        // Turn off orientation helper.
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
          fetch('/watch/processed/C_LS180_Y0_LO-1739322269902/meta.json')
            .then(response => response.json())
            .then(meta => {
              const parts = meta.processedPath.split('/');
              const folderName = parts[parts.length - 1];
              const relativePath = "/watch/processed/" + folderName + "/";
              if (meta.outputs.nd3Reconstruction?.length) {
                // Use the passed-in viewer creation function.
                plyViewerInstance = createPLYViewerFn("fullScreenPLYViewer", relativePath + meta.outputs.nd3Reconstruction[0].ply);
              }
            })
            .catch(err => console.error('Error loading meta.json:', err));
        } else {
          resizePLYViewerFn();
        }
      }
    };
  
    function switchView(view) {
      // Remove existing view classes from body.
      Object.keys(views).forEach(v => {
        document.body.classList.remove(v);
      });
      document.body.classList.add(view);
      // Execute the view's configuration.
      views[view]();
      // Update menu-item selection.
      document.querySelectorAll(".menu-item").forEach(item => {
        item.classList.remove("selected");
      });
      const selector = `.menu-item[data-view="${view}"]`;
      const selectedItem = document.querySelector(selector);
      if (selectedItem) selectedItem.classList.add("selected");
    }
  
    // Set up click listeners on all menu items.
    document.querySelectorAll(".menu-item").forEach(item => {
      item.addEventListener("click", function () {
        const view = this.getAttribute("data-view");
        switchView(view);
      });
    });
  
    // Set default view on load.
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
  