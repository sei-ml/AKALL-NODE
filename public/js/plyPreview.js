import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

export function createPLYPreview(plyUrl, width = 200, height = 200) {
  // Create a canvas element for the preview.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // Create a small Three.js scene.
  const scene = new THREE.Scene();

  // We'll compute the orthographic camera frustum later based on the geometry.
  let camera;

  // Create a renderer using the canvas.
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000);

  // Add basic lighting.
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(1, 1, 1);
  scene.add(dirLight);

  // Load the PLY file.
  const loader = new PLYLoader();
  loader.load(plyUrl, (geometry) => {
    // Assume the geometry is a point cloud.
    const hasColors = geometry.attributes.color !== undefined;

    // Compute bounding box and center the geometry.
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    // Translate geometry so its center is at the origin.
    geometry.translate(-center.x, -center.y, -center.z);

    // If you need to flip the geometry, you could apply a scale:
    // geometry.applyMatrix4(new THREE.Matrix4().makeScale(-1, -1, -1));
    // (Commented out unless flipping is required.)

    // Create a Points object using PointsMaterial.
    const material = new THREE.PointsMaterial({
      size: 1.0, // Adjust size as needed for your thumbnail.
      vertexColors: hasColors,
      color: 0xAAAAAA // Fallback color.
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Compute size of geometry in the XZ plane (we assume Y is up).
    const sizeVec = new THREE.Vector3();
    bbox.getSize(sizeVec);
    const maxExtent = Math.max(sizeVec.x, sizeVec.z);
    
    // Create an orthographic camera with a square frustum based on the extent.
    // For orthographic cameras, the parameters are (left, right, top, bottom, near, far).
    const halfExtent = maxExtent / 2;
    camera = new THREE.OrthographicCamera(
      -halfExtent, halfExtent,
      halfExtent, -halfExtent,
      0.1, maxExtent * 4
    );
    // Place the camera above the model.
    // For a top-down view, position the camera at (0, someHeight, 0) and look at (0, 0, 0).
    // Here, we choose a height that is, for example, twice the maxExtent.
    camera.position.set(0, maxExtent * 2, 0);
    camera.up.set(0, 0, -1); // So that the top of the view is aligned with -Z.
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.updateProjectionMatrix();

    // Render the scene once.
    renderer.render(scene, camera);
  }, undefined, (error) => {
    console.error("Error loading PLY preview:", error);
  });

  return canvas;
}
