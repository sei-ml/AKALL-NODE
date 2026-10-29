import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createOrientationHelper } from './orientationHelper.js';

export function createPLYViewer(containerId, plyFileUrl) {
  const container = document.getElementById(containerId);
  
  if (container.dataset.initialized === "true") {
    console.log("Viewer already exists. Skipping initialization.");
    return; 
  }
  container.dataset.initialized = "true"; 

  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 5000);
  camera.position.set(0, 0, 300);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0x000);
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 10;
  controls.maxDistance = 4000;
  controls.zoomSpeed = 2;

  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(100, 100, 100).normalize();
  scene.add(dirLight);

  const gridHelper = new THREE.GridHelper(3000, 90);
  gridHelper.position.set(0, -150, 0);
  gridHelper.material.opacity = 0.4;
  gridHelper.material.transparent = true;
  scene.add(gridHelper);

  let pointMaterial = null;
  let pointCloud = null;
  let pointThreshold = 2;
  let activeTool = window.plyActiveTool || 'navigate';
  let measureStart = null;
  let markerCount = 0;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerDown = null;
  const toolReadout = document.createElement('div');
  toolReadout.className = 'ply-tool-readout';
  container.appendChild(toolReadout);

  function setToolCursor() {
    renderer.domElement.classList.toggle('ply-tool-active', activeTool !== 'navigate');
  }
  function setPointSize(size) {
    window.plyPointSize = Number(size);
    if (pointMaterial) pointMaterial.size = window.plyPointSize;
  }
  function setGridVisible(visible) {
    window.plyGridEnabled = Boolean(visible);
    gridHelper.visible = window.plyGridEnabled;
  }
  function setActiveTool(tool) {
    activeTool = tool;
    window.plyActiveTool = tool;
    if (tool !== 'measure') measureStart = null;
    setToolCursor();
    if (tool === 'navigate') toolReadout.textContent = '';
    else toolReadout.textContent = tool === 'measure' ? 'MEASURE · select first point' : 'MARKER · select a point';
  }
  window.plyViewerControls = { setPointSize, setGridVisible, setActiveTool };
  setPointSize(window.plyPointSize ?? 2);
  setGridVisible(window.plyGridEnabled ?? true);
  setToolCursor();

  function addPin(position, label, color = 0xffffff) {
    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(pointThreshold * 2.5, 1.5), 12, 12),
      new THREE.MeshBasicMaterial({ color, depthTest: false })
    );
    pin.position.copy(position);
    pin.renderOrder = 10;
    scene.add(pin);
    return pin;
  }

  function handleToolClick(event) {
    if (activeTool === 'navigate' || !pointCloud) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.params.Points.threshold = pointThreshold;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(pointCloud, false)[0];
    if (!hit) {
      toolReadout.textContent = 'No surface point here · try closer to the scan';
      return;
    }
    if (activeTool === 'marker') {
      markerCount += 1;
      addPin(hit.point, `M${markerCount}`, 0xffffff);
      toolReadout.textContent = `MARKER M${markerCount} · ${hit.point.distanceTo(new THREE.Vector3()).toFixed(2)} units from origin`;
      return;
    }
    if (!measureStart) {
      measureStart = hit.point.clone();
      addPin(hit.point, 'A', 0xffffff);
      toolReadout.textContent = 'MEASURE · first point set, select second point';
    } else {
      addPin(hit.point, 'B', 0xffffff);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([measureStart, hit.point]),
        new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false })
      );
      line.renderOrder = 9;
      scene.add(line);
      toolReadout.textContent = `DISTANCE · ${measureStart.distanceTo(hit.point).toFixed(2)} units`;
      measureStart = null;
    }
  }
  renderer.domElement.addEventListener('pointerdown', event => { pointerDown = { x: event.clientX, y: event.clientY }; });
  renderer.domElement.addEventListener('pointerup', event => {
    if (!pointerDown) return;
    const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    pointerDown = null;
    if (moved < 5) handleToolClick(event);
  });

  const loader = new PLYLoader();
  let updateOrientationHelper = null;

  loader.load(
    plyFileUrl,
    function (geometry) {
      console.log('PLY model loaded:', geometry);
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;
      const center = new THREE.Vector3();
      bbox.getCenter(center);
      const size = new THREE.Vector3();
      bbox.getSize(size);

      console.log("Bounding Box Center:", center);
      console.log("Bounding Box Size:", size);

      geometry.applyMatrix4(new THREE.Matrix4().makeScale(-1, -1, -1));
      geometry.translate(center.x + 128, center.y, center.z);

      const hasColor = !!geometry.attributes.color;
      pointMaterial = new THREE.PointsMaterial({
        vertexColors: hasColor,
        size: window.plyPointSize ?? 2,
        sizeAttenuation: true,
      });

      pointCloud = new THREE.Points(geometry, pointMaterial);
      scene.add(pointCloud);

      const maxDim = Math.max(size.x, size.y, size.z);
      pointThreshold = Math.max(maxDim * 0.006, 0.5);
      // The model is translated +128 on X above. Aim at its actual center
      // from above the grid so the first view reads as terrain, not a side wall.
      const viewTarget = new THREE.Vector3(128, 0, 0);
      const distance = Math.max(maxDim * 0.66, 140);
      camera.position.set(viewTarget.x, viewTarget.y + distance * 0.04, viewTarget.z + distance);
      camera.lookAt(viewTarget);
      
      updateOrientationHelper = createOrientationHelper(
        renderer, 
        camera, 
        controls, 
        () => window.showOrientationHelper
      );

      controls.target.copy(viewTarget);
      controls.update();
    },
    undefined,
    function (error) {
      console.error('Error loading PLY file:', error);
    }
  );

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
