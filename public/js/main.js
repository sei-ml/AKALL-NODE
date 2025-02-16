import { loadND3File } from './nd3Loader.js';
import { createPLYViewer } from './plyViewer.js';
import { 
  setupGlobalUIListeners, 
  setupLayoutAdjustment, 
  setupViewSwitching, 
  setupLogView, 
  resizePLYViewer 
} from './uiController.js';

window.showOrientationHelper = false;

setupGlobalUIListeners();
setupLayoutAdjustment();

document.addEventListener('DOMContentLoaded', () => {
  loadND3File(createPLYViewer);
});

document.addEventListener("DOMContentLoaded", () => {
  setupViewSwitching(createPLYViewer, resizePLYViewer);
});

document.addEventListener("DOMContentLoaded", () => {
  setupLogView();
});
