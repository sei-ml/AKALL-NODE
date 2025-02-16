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

document.addEventListener('DOMContentLoaded', () => {
  loadND3File(createPLYViewer);
  setupViewSwitching(createPLYViewer, resizePLYViewer);
  setupLogView();
  setupGlobalUIListeners();
  setupLayoutAdjustment();
});

