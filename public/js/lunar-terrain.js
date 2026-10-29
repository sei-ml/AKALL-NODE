(() => {
  const texture = document.getElementById('lunar-texture');
  if (!texture || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let pointerX = 0;
  let pointerY = 0;
  let currentX = 0;
  let currentY = 0;
  let lastPointerAt = 0;

  window.addEventListener('pointermove', (event) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
    lastPointerAt = performance.now();
  }, { passive: true });

  function drift(now) {
    const pointerWeight = Math.max(0, 1 - (now - lastPointerAt) / 4200);
    const ambientX = Math.sin(now * 0.00011) * 1.8;
    const ambientY = Math.cos(now * 0.00009) * 1.4;
    const targetX = ambientX + pointerX * 7 * pointerWeight;
    const targetY = ambientY + pointerY * 5 * pointerWeight;
    currentX += (targetX - currentX) * 0.025;
    currentY += (targetY - currentY) * 0.025;
    texture.style.setProperty('--parallax-x', `${currentX.toFixed(2)}px`);
    texture.style.setProperty('--parallax-y', `${currentY.toFixed(2)}px`);
    requestAnimationFrame(drift);
  }

  requestAnimationFrame(drift);
})();
