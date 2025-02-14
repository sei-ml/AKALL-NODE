import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Global flag to control whether the orientation helper is active.
let showOrientationHelper = false;

/**
 * Creates an orientation helper overlay rendered into the main renderer's canvas.
 * Also attaches mouse event listeners to the main canvas for interactivity.
 *
 * @param {THREE.WebGLRenderer} mainRenderer - The main renderer.
 * @param {THREE.Camera} mainCamera - The main camera.
 * @param {OrbitControls} controls - The OrbitControls for the main scene.
 * @returns {Function} An update function to be called every frame.
 */
function createOrientationHelper(mainRenderer, mainCamera, controls) {
  const helperSize = 60; // overlay size in pixels
  const margin = 10;      // margin from the canvas edge

  // --- Create the helper scene and camera ---
  const helperScene = new THREE.Scene();
  const d = 70;
  const helperCamera = new THREE.OrthographicCamera(-d, d, d, -d, 1, 1000);
  helperCamera.position.set(200, 200, 200);
  helperCamera.lookAt(helperScene.position);
  helperScene.add(helperCamera);

  // --- Create the helper cube ---
  const baseColor = 0x000000;
  const hoverColor = 0xffffff;
  const cubeGeometry = new THREE.BoxGeometry(50, 50, 50);
  const cubeMaterials = [
    new THREE.MeshBasicMaterial({ color: baseColor, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: baseColor, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: baseColor, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: baseColor, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: baseColor, side: THREE.DoubleSide }),
    new THREE.MeshBasicMaterial({ color: baseColor, side: THREE.DoubleSide }),
  ];
  const helperCube = new THREE.Mesh(cubeGeometry, cubeMaterials);
  helperScene.add(helperCube);

  // --- Add dotted (dashed) edges to the cube ---
  const edges = new THREE.EdgesGeometry(cubeGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x333333,
    linewidth: 2, // Note: many browsers limit this to 1.
  });

  const cubeEdges = new THREE.LineSegments(edges, lineMaterial);
  cubeEdges.computeLineDistances();
  helperCube.add(cubeEdges);

  // --- Optionally add an AxesHelper ---
  const axesHelper = new THREE.AxesHelper(60);
  //helperScene.add(axesHelper);

  // --- Set up raycaster and variables for interaction ---
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredFaceIndex = null;

  function onHelperMouseMove(event) {
    if (!showOrientationHelper) return;
    const rect = mainRenderer.domElement.getBoundingClientRect();
    const size = mainRenderer.getSize(new THREE.Vector2());
    const canvasWidth = size.x, canvasHeight = size.y;
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const webglY = canvasHeight - localY;
    if (
      localX >= (canvasWidth - helperSize - margin) &&
      localX <= (canvasWidth - margin) &&
      webglY >= margin &&
      webglY <= (helperSize + margin)
    ) {
      const x = ((localX - (canvasWidth - helperSize - margin)) / helperSize) * 2 - 1;
      const y = ((webglY - margin) / helperSize) * 2 - 1;
      mouse.set(x, y);
      raycaster.setFromCamera(mouse, helperCamera);
      const intersects = raycaster.intersectObject(helperCube, true);
      if (intersects.length > 0 && intersects[0].face) {
        const faceIndex = intersects[0].face.materialIndex;
        if (hoveredFaceIndex !== faceIndex) {
          if (hoveredFaceIndex !== null) {
            cubeMaterials[hoveredFaceIndex].color.set(baseColor);
          }
          hoveredFaceIndex = faceIndex;
          cubeMaterials[faceIndex].color.set(hoverColor);
        }
      } else {
        if (hoveredFaceIndex !== null) {
          cubeMaterials[hoveredFaceIndex].color.set(baseColor);
          hoveredFaceIndex = null;
        }
      }
    } else {
      if (hoveredFaceIndex !== null) {
        cubeMaterials[hoveredFaceIndex].color.set(baseColor);
        hoveredFaceIndex = null;
      }
    }
  }
  
  function onHelperClick(event) {
    if (!showOrientationHelper) return;
    const rect = mainRenderer.domElement.getBoundingClientRect();
    const size = mainRenderer.getSize(new THREE.Vector2());
    const canvasWidth = size.x, canvasHeight = size.y;
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const webglY = canvasHeight - localY;
    if (
      localX >= (canvasWidth - helperSize - margin) &&
      localX <= (canvasWidth - margin) &&
      webglY >= margin &&
      webglY <= (helperSize + margin)
    ) {
      const x = ((localX - (canvasWidth - helperSize - margin)) / helperSize) * 2 - 1;
      const y = ((webglY - margin) / helperSize) * 2 - 1;
      mouse.set(x, y);
      raycaster.setFromCamera(mouse, helperCamera);
      const intersects = raycaster.intersectObject(helperCube, true);
      if (intersects.length > 0 && intersects[0].face) {
        const faceIndex = intersects[0].face.materialIndex;
        const distance = 300;
        let newPos;
        switch (faceIndex) {
          case 0: newPos = new THREE.Vector3(distance, 0, 0); break;
          case 1: newPos = new THREE.Vector3(-distance, 0, 0); break;
          case 2: newPos = new THREE.Vector3(0, distance, 0); break;
          case 3: newPos = new THREE.Vector3(0, -distance, 0); break;
          case 4: newPos = new THREE.Vector3(0, 0, distance); break;
          case 5: newPos = new THREE.Vector3(0, 0, -distance); break;
        }
        if (newPos) {
          mainCamera.position.copy(newPos);
          controls.target.set(0, 0, 0);
          controls.update();
        }
      }
    }
  }
  

  // Attach event listeners on the main renderer's canvas.
  mainRenderer.domElement.addEventListener('mousemove', onHelperMouseMove, false);
  mainRenderer.domElement.addEventListener('click', onHelperClick, false);

  // --- The update function: render the helper overlay ---
  function updateHelper() {
    if (!showOrientationHelper) return; // Skip if not in view3.
    const canvas = mainRenderer.domElement;
    const size = mainRenderer.getSize(new THREE.Vector2());
    const width = size.x;
    const height = size.y;
    // Enable scissor test and set viewport in the bottom-right corner.
    mainRenderer.setScissorTest(true);
    mainRenderer.setViewport(width - helperSize - margin, margin, helperSize, helperSize);
    mainRenderer.setScissor(width - helperSize - margin, margin, helperSize, helperSize);
    // Clear the depth buffer in the overlay area.
    mainRenderer.clearDepth();
    // Update helper cube rotation to mirror main camera's orientation.
    helperCube.quaternion.copy(mainCamera.quaternion).invert();
    // Render the helper scene into the overlay region.
    mainRenderer.render(helperScene, helperCamera);
    // Reset scissor test and viewport to full canvas.
    mainRenderer.setScissorTest(false);
    mainRenderer.setViewport(0, 0, width, height);
  }

  return updateHelper;
}

function createMergedPLYViewer(containerId, plyFileUrl) {
  const container = document.getElementById(containerId);
  
  if (container.dataset.initialized === "true") {
    console.log("Viewer already exists. Skipping initialization.");
    return; 
  }
  container.dataset.initialized = "true"; 

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Create main scene, camera, and renderer.
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 5000);
  camera.position.set(0, 0, 300);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0x000);
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Set up OrbitControls.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 10;
  controls.maxDistance = 4000;
  controls.zoomSpeed = 2;

  // Add lighting.
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(100, 100, 100).normalize();
  scene.add(dirLight);

  const gridHelper = new THREE.GridHelper(3000, 90);
  gridHelper.position.set(0, -150, 0);
  gridHelper.material.opacity = 0.4;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  // Load the PLY file.
  const loader = new PLYLoader();
  let updateOrientationHelper = null;
  loader.load(plyFileUrl, function (geometry) {
    console.log('PLY model loaded:', geometry);

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    console.log("Bounding Box Center:", center);
    console.log("Bounding Box Size:", size);

    // Flip and center the geometry.
    geometry.applyMatrix4(new THREE.Matrix4().makeScale(-1, -1, -1));
    geometry.translate(center.x, center.y, center.z);

    const hasColor = !!geometry.attributes.color;
    const material = new THREE.PointsMaterial({
      vertexColors: hasColor,
      size: 2, 
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Adjust the camera based on the model's bounding box.
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 0.5;  
    camera.position.set(0, 0, distance);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Create the orientation helper overlay.
    updateOrientationHelper = createOrientationHelper(renderer, camera, controls);
    
    controls.target.set(0, 0, 0);
    controls.update();
  }, undefined, function (error) {
    console.error('Error loading PLY file:', error);
  });

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    if (updateOrientationHelper) {
      updateOrientationHelper();
    }
  }
  animate();
}

function loadMetaData() {
  fetch('/watch/processed/C_LS180_Y0_LO-1739322269902/meta.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return response.json();
    })
    .then(meta => {
      console.log("Meta Data Loaded:", meta);
  
      const parts = meta.processedPath.split('/');
      const folderName = parts[parts.length - 1];
      const relativePath = "/watch/processed/" + folderName + "/";
  
      document.getElementById('img-original').src = relativePath + meta.outputs.originalJPEG;
      document.getElementById('img-blue').src = relativePath + meta.outputs.channels.blue;
      document.getElementById('img-green').src = relativePath + meta.outputs.channels.green;
      document.getElementById('img-red').src = relativePath + meta.outputs.channels.red;
  
      if (meta.outputs.rawConverted?.length) {
        document.getElementById('img-grayscale').src = relativePath + meta.outputs.rawConverted[0];
        document.getElementById('img-grayscale-2').src = meta.outputs.rawConverted[1]
          ? relativePath + meta.outputs.rawConverted[1]
          : relativePath + meta.outputs.rawConverted[0];
      } else {
        document.getElementById('img-grayscale').src = relativePath + meta.outputs.originalJPEG;
        document.getElementById('img-grayscale-2').src = relativePath + meta.outputs.originalJPEG;
      }
  
      if (meta.outputs.nd3Reconstruction?.length) {
        createMergedPLYViewer("ply-viewer-merged", relativePath + meta.outputs.nd3Reconstruction[0].ply);
      }
  
      // Updated innerHTML in a simple block style.
      const metaContent = document.getElementById('meta-content');
      metaContent.innerHTML = `
        <p><strong>Timestamp:</strong> ${meta.timestamp}</p>
        <p><strong>Original JPEG:</strong> ${meta.outputs.originalJPEG}</p>
        <p><strong>Channels:</strong> Blue: ${meta.outputs.channels.blue}, Green: ${meta.outputs.channels.green}, Red: ${meta.outputs.channels.red}</p>
        <p><strong>ND3 Reconstruction Outputs:</strong> ${meta.outputs.nd3Reconstruction.map(recon => `${recon.colorImage} → ${recon.ply}`).join(' | ')}</p>
        <p><strong>Raw Converted Files:</strong> ${meta.outputs.rawConverted.join(', ')}</p>
      `;
    })
    .catch(err => {
      console.error('Error loading meta.json:', err);
      document.getElementById('meta-content').textContent = 'Error loading meta data.';
    });
}

  
function toggleMetaOverlay() {
//  const overlay = document.getElementById('meta-overlay');
//  overlay.style.display = overlay.style.display === 'block' ? 'none' : 'block';
}

function toggleView3Elements(state) {
  const view3menus = document.getElementsByClassName("view3-menu");
  for (let i = 0; i < view3menus.length; i++) {
    view3menus[i].style.display = state ? 'flex' : 'none';
  }
}

// Toggle meta console on backtick key press.
document.addEventListener('keydown', function (event) {
  if (event.key === '`') {
    toggleMetaOverlay();
  }
});

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

/*document.getElementById('close-overlay').addEventListener('click', function () {
  document.getElementById('meta-overlay').style.display = 'none';
});*/
  
window.addEventListener('DOMContentLoaded', loadMetaData);

document.addEventListener("DOMContentLoaded", function () {
  let plyViewerInstance = null;

  const views = {
    view1: () => {
      document.querySelector(".grid-container").style.display = "flex";
      document.querySelector(".top-section").style.display = "grid";
      document.querySelector(".scene-section").style.display = "grid";
      document.getElementById("fullScreenPLYViewer").style.display = "none";
      toggleView3Elements(false);
      showOrientationHelper = false;
    },
    view2: () => {
      document.querySelector(".grid-container").style.display = "flex";
      document.querySelector(".top-section").style.display = "grid";
      document.querySelector(".scene-section").style.display = "grid";
      document.getElementById("fullScreenPLYViewer").style.display = "none";
      toggleView3Elements(false);
      showOrientationHelper = false;
    },
    view3: () => {
      document.querySelector(".grid-container").style.display = "none";
      document.getElementById("fullScreenPLYViewer").style.display = "block";
      toggleView3Elements(true);
      showOrientationHelper = true;
      if (!plyViewerInstance) {
        console.log("Initializing full-screen Three.js viewer...");
        fetch('/watch/processed/C_LS180_Y0_LO-1739322269902/meta.json')
          .then(response => response.json())
          .then(meta => {
            const parts = meta.processedPath.split('/');
            const folderName = parts[parts.length - 1];
            const relativePath = "/watch/processed/" + folderName + "/";
            if (meta.outputs.nd3Reconstruction?.length) {
              plyViewerInstance = createMergedPLYViewer("fullScreenPLYViewer", relativePath + meta.outputs.nd3Reconstruction[0].ply);
            }
          })
          .catch(err => console.error('Error loading meta.json:', err));
      } else {
        resizePLYViewer();
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
    document.querySelector(`.menu-item[data-view="${view}"]`).classList.add("selected");
  }

  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", function () {
      const view = this.getAttribute("data-view");
      switchView(view);
    });
  });

  // Set default view on load.
  switchView("view2");
});

// Ensure the Three.js canvas resizes properly in view3.
function resizePLYViewer() {
  const plyContainer = document.getElementById("fullScreenPLYViewer");
  if (plyContainer) {
    const canvas = plyContainer.querySelector("canvas");
    if (canvas) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    }
  }
}
