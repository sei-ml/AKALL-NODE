import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

export function createPLYPreview(plyUrl, width = 200, height = 200) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const scene = new THREE.Scene();

  let camera;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(1, 1, 1);
  scene.add(dirLight);

  const loader = new PLYLoader();
  loader.load(plyUrl, (geometry) => {
    const hasColors = geometry.attributes.color !== undefined;

    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const material = new THREE.PointsMaterial({
      size: 1.0, 
      vertexColors: hasColors,
      color: 0xAAAAAA 
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const sizeVec = new THREE.Vector3();
    bbox.getSize(sizeVec);
    const maxExtent = Math.max(sizeVec.x, sizeVec.z);

    const halfExtent = maxExtent / 2;
    camera = new THREE.OrthographicCamera(
      -halfExtent, halfExtent,
      halfExtent, -halfExtent,
      0.1, maxExtent * 4
    );
    
    camera.position.set(0, maxExtent * 2, 0);
    camera.up.set(0, 0, -1); 
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
  }, undefined, (error) => {
    console.error("Error loading PLY preview:", error);
  });

  return canvas;
}
