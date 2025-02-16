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
      const material = new THREE.PointsMaterial({
        vertexColors: hasColor,
        size: 2,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 0.5;
      camera.position.set(-256, 128, distance);

      camera.lookAt(new THREE.Vector3(0, 0, 0));
      
      updateOrientationHelper = createOrientationHelper(
        renderer, 
        camera, 
        controls, 
        () => window.showOrientationHelper
      );

      controls.target.set(0, 0, 0);
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
