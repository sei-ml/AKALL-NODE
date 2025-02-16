import * as THREE from 'three';

export function createOrientationHelper(mainRenderer, mainCamera, controls, isOrientationHelperEnabled) {
  const helperSize = 100;
  const margin = 10;

  const helperScene = new THREE.Scene();
  const d = 70;
  const helperCamera = new THREE.OrthographicCamera(-d, d, d, -d, 1, 1000);
  helperCamera.position.set(200, 200, 200);
  helperCamera.lookAt(helperScene.position);
  helperScene.add(helperCamera);

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

  const edges = new THREE.EdgesGeometry(cubeGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x888888, linewidth: 2 });
  const cubeEdges = new THREE.LineSegments(edges, lineMaterial);
  cubeEdges.computeLineDistances();
  helperCube.add(cubeEdges);

  const axesHelper = new THREE.AxesHelper(60);
  helperScene.add(axesHelper);
  if (axesHelper.setColors) {
    axesHelper.setColors(new THREE.Color(0xffffff), new THREE.Color(0xffffff), new THREE.Color(0xffffff));
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredFaceIndex = null;

  function onHelperMouseMove(event) {
    if (!isOrientationHelperEnabled()) return;
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
    if (!isOrientationHelperEnabled()) return;
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
  
  mainRenderer.domElement.addEventListener('mousemove', onHelperMouseMove, false);
  mainRenderer.domElement.addEventListener('click', onHelperClick, false);

  function updateHelper() {
    if (!isOrientationHelperEnabled()) return;
    const size = mainRenderer.getSize(new THREE.Vector2());
    const width = size.x;
    const height = size.y;
    mainRenderer.setScissorTest(true);
    mainRenderer.setViewport(width - helperSize - margin, margin, helperSize, helperSize);
    mainRenderer.setScissor(width - helperSize - margin, margin, helperSize, helperSize);
    mainRenderer.clearDepth();
    helperCube.quaternion.copy(mainCamera.quaternion).invert();
    mainRenderer.render(helperScene, helperCamera);
    mainRenderer.setScissorTest(false);
    mainRenderer.setViewport(0, 0, width, height);
  }

  return updateHelper;
}
