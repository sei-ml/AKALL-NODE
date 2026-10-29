import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

const CACHE_NAME = 'akall-ply-preview-cache';
const CACHE_STORE = 'renders';
const CACHE_VERSION = 1;

let databasePromise;

function openPreviewCache() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve) => {
    const request = indexedDB.open(CACHE_NAME, CACHE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(CACHE_STORE)) {
        request.result.createObjectStore(CACHE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return databasePromise;
}

async function readPreview(key) {
  const database = await openPreviewCache();
  if (!database) return null;
  return new Promise((resolve) => {
    try {
      const request = database.transaction(CACHE_STORE, 'readonly').objectStore(CACHE_STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writePreview(key, blob) {
  if (!blob) return;
  const database = await openPreviewCache();
  if (!database) return;
  try {
    database.transaction(CACHE_STORE, 'readwrite').objectStore(CACHE_STORE).put(blob, key);
  } catch {
    // Rendering still works when browser storage is unavailable or full.
  }
}

function drawCachedImage(canvas, blob, onReady) {
  const image = new Image();
  const objectUrl = URL.createObjectURL(blob);
  image.onload = () => {
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl);
    onReady();
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    onReady();
  };
  image.src = objectUrl;
}

export function createPLYPreview(plyUrl, width = 200, height = 200) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  let started = false;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    canvas.classList.remove('preview-loading');
    resolveReady();
  };

  async function load() {
    if (started) return ready;
    started = true;
    canvas.classList.add('preview-loading');
    const cacheKey = `v${CACHE_VERSION}:${plyUrl}:${canvas.width}x${canvas.height}`;

    const cached = await readPreview(cacheKey);
    if (cached) {
      drawCachedImage(canvas, cached, finish);
      return ready;
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(canvas.width, canvas.height, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    new PLYLoader().load(plyUrl, (geometry) => {
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox;
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      bounds.getCenter(center);
      bounds.getSize(size);
      geometry.translate(-center.x, -center.y, -center.z);

      const hasColors = geometry.attributes.color !== undefined;
      const points = new THREE.Points(geometry, new THREE.PointsMaterial({
        size: 1,
        vertexColors: hasColors,
        color: 0xaaaaaa,
        sizeAttenuation: true,
      }));
      scene.add(points);

      const maxExtent = Math.max(size.x, size.z, 1);
      const halfExtent = maxExtent / 2;
      const camera = new THREE.OrthographicCamera(
        -halfExtent, halfExtent, halfExtent, -halfExtent, 0.1, maxExtent * 4,
      );
      camera.position.set(0, maxExtent * 2, 0);
      camera.up.set(0, 0, -1);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);

      canvas.toBlob((blob) => {
        if (blob) void writePreview(cacheKey, blob);
        renderer.dispose();
        geometry.dispose();
        points.material.dispose();
        finish();
      }, 'image/webp', 0.88);
    }, undefined, (error) => {
      console.error('Error loading PLY preview:', error);
      renderer.dispose();
      finish();
    });

    return ready;
  }

  return { canvas, load, ready };
}
