function populateInfoPanel(meta) {
  const infoBody = document.getElementById('info-body');
  const infoTitle = document.getElementById('info-title');

  if (!infoBody || !infoTitle || !meta) return;

  infoTitle.textContent = 'CAPTURE INFO';
  infoBody.replaceChildren();
  infoBody.hidden = false;

  const outputs = meta.outputs || {};
  const details = meta.akallDetails || {};
  const rawConverted = outputs.rawConverted || [];
  const timestamp = meta.timestamp?.humanReadable;
  const captureDate = timestamp
    ? new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

  const sampleName = document.createElement('div');
  sampleName.className = 'info-sample-name';
  sampleName.textContent = meta.originalFileName || 'Unknown capture';
  infoBody.appendChild(sampleName);

  const detailsSection = document.createElement('div');
  detailsSection.className = 'info-section';
  const detailsHeading = document.createElement('div');
  detailsHeading.className = 'info-section-title';
  detailsHeading.textContent = 'Recorded capture parameters';
  detailsSection.appendChild(detailsHeading);

  const detailsGrid = document.createElement('div');
  detailsGrid.className = 'info-grid';
  const addStat = (label, value) => {
    const stat = document.createElement('div');
    stat.className = 'info-stat';
    const statLabel = document.createElement('div');
    statLabel.className = 'info-stat-label';
    statLabel.textContent = label;
    const statValue = document.createElement('div');
    statValue.className = 'info-stat-value';
    statValue.textContent = value || '—';
    stat.append(statLabel, statValue);
    detailsGrid.appendChild(stat);
  };
  addStat('Date', captureDate);
  addStat('Frame rate', details.fps ? `${details.fps} FPS` : '—');
  addStat('RGB resolution', details.colorResolution ? `${details.colorResolution}P` : '—');
  addStat('Depth mode', details.depthMode);
  addStat('Depth range', details.range);
  addStat('Exposure', details.exposure);
  detailsSection.appendChild(detailsGrid);
  infoBody.appendChild(detailsSection);

  const channels = [];
  if (outputs.originalJPEG) channels.push(['RGB', 'rgb']);
  if (outputs.depth || rawConverted.some(file => file.includes('D'))) channels.push(['Depth', 'depth']);
  if (outputs.nir || rawConverted.some(file => file.includes('IR'))) channels.push(['NIR', 'nir']);
  const hasPly = (outputs.nd3Reconstruction || []).some(item => item.ply);
  if (hasPly) channels.push(['3D PLY', 'ply']);

  if (channels.length) {
    const channelSection = document.createElement('div');
    channelSection.className = 'info-section';
    const channelHeading = document.createElement('div');
    channelHeading.className = 'info-section-title';
    channelHeading.textContent = 'Available capture products';
    const channelList = document.createElement('div');
    channelList.className = 'info-channels';
    channels.forEach(([label, type]) => {
      const item = document.createElement('div');
      item.className = `info-channel ${type}`;
      item.textContent = label;
      channelList.appendChild(item);
    });
    channelSection.append(channelHeading, channelList);
    infoBody.appendChild(channelSection);
  }

  // Setup toggle functionality
  setupInfoPanelToggle();
}

function setupInfoPanelToggle() {
  const infoTrigger = document.getElementById('info-trigger');
  const infoPanel = document.getElementById('info-panel');
  
  if (infoTrigger && infoPanel) {
    infoTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      infoPanel.classList.toggle('visible');
      infoTrigger.classList.toggle('active');
    });
    
    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!infoPanel.contains(e.target) && !infoTrigger.contains(e.target)) {
        infoPanel.classList.remove('visible');
        infoTrigger.classList.remove('active');
      }
    });
  }
}

function waitForImageAssets(imageIds) {
  const pending = imageIds.map((id) => {
    const image = document.getElementById(id);
    if (!image || !image.getAttribute('src') || image.complete) return Promise.resolve();
    return new Promise((resolve) => {
      const finish = () => resolve();
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
    });
  });
  return Promise.race([
    Promise.all(pending),
    new Promise((resolve) => window.setTimeout(resolve, 15000)),
  ]);
}

function finishViewerLoading() {
  document.body.classList.remove('viewer-loading');
  document.body.classList.add('viewer-ready');
}

export async function loadND3File(createMergedPLYViewerFn) {
  const urlParams = new URLSearchParams(window.location.search);
  const dataId = urlParams.get('nd3') || 'C_LS180_Y0_LO-1739825346971';
  const metaUrl = `/watch/processed/${dataId}/meta.json`;

  const COLOR_RESOLUTION_MAP = {
    "2160": "3840x2160",
    "1440": "2560x1440",
    "1080": "1920x1080",
    "0720": "1280x720",
    "3072": "4096x3072",
    "1536": "2048x1536"
  };

  try {
    const response = await fetch(metaUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const meta = await response.json();
    console.log("ND3 Meta Data Loaded:", meta);
    const loaderLabel = document.getElementById('capture-loader-label');
    if (loaderLabel) loaderLabel.textContent = `LOADING ${meta.originalFileName || dataId}`.toUpperCase();

    window.metaData = meta;
    
    // Populate the info panel with sample details
    populateInfoPanel(meta);

    const parts = meta.processedPath.split('/');
    const folderName = parts[parts.length - 1];
    const relativePath = `/watch/processed/${folderName}/`;

    const outputs = meta.outputs || {};
    const nd3Reconstruction = outputs.nd3Reconstruction || [];
    const rawConverted = outputs.rawConverted || [];

    const blueImage = nd3Reconstruction.find(img => img.colorImage?.startsWith('B_'))?.colorImage || 'N/A';
    const greenImage = nd3Reconstruction.find(img => img.colorImage?.startsWith('G_'))?.colorImage || 'N/A';
    const redImage = nd3Reconstruction.find(img => img.colorImage?.startsWith('R_'))?.colorImage || 'N/A';

    const depthImage = outputs.depth || rawConverted.find(img => img.includes('D')) || 'N/A';
    const nirImage = outputs.nir || rawConverted.find(img => img.includes('IR')) || 'N/A';

    const createLink = (filename) =>
      filename !== 'N/A' ? `<a href="${relativePath + filename}" target="_blank">${filename}</a>` : 'N/A';

    const createTag = (filename) =>
      filename !== 'N/A' ? `<span style="color:#888;">${filename}</span>` : 'N/A';

    const colorResolutionShort = meta.akallDetails?.colorResolution || 'N/A';
    const fullColorResolution = COLOR_RESOLUTION_MAP[colorResolutionShort] || 'Unknown';

    document.getElementById('img-original').src = relativePath + (outputs.originalJPEG || '');
    document.getElementById('img-blue').src = blueImage !== 'N/A' ? relativePath + blueImage : '';
    document.getElementById('img-green').src = greenImage !== 'N/A' ? relativePath + greenImage : '';
    document.getElementById('img-red').src = redImage !== 'N/A' ? relativePath + redImage : '';
    document.getElementById('img-grayscale').src = depthImage !== 'N/A' ? relativePath + depthImage : relativePath + (outputs.originalJPEG || '');
    document.getElementById('img-grayscale-2').src = nirImage !== 'N/A' ? relativePath + nirImage : document.getElementById('img-grayscale').src;

    document.querySelector("#gray-cell-1 .extra-label").innerHTML = `
      <ul>
        <li>DEPTH MODE: ${meta.akallDetails?.depthMode || 'N/A'}</li>
        <li>RESOLUTION: ${meta.akallDetails?.resolution || 'N/A'}</li>
      </ul>
    `;

    document.querySelector("#gray-cell-2 .extra-label").innerHTML = `
      <ul>
        <li>NIR 850nm</li>
        <li>RESOLUTION: ${meta.akallDetails?.resolution || 'N/A'}</li>
      </ul>
    `;

    const akallDetails = meta.akallDetails || {};

    const nd3Files = nd3Reconstruction.length > 0
      ? nd3Reconstruction.map(recon => `${createTag(recon.colorImage)} >> ${createLink(recon.ply)}`).join(' | ')
      : 'N/A';

    const rawFiles = rawConverted.length > 0
      ? rawConverted.map(file => createLink(file)).join(', ')
      : 'N/A';

    if (nd3Reconstruction.length > 0) {
      createMergedPLYViewerFn("ply-viewer-merged", relativePath + nd3Reconstruction[0].ply);
    }

    await waitForImageAssets([
      'img-original', 'img-blue', 'img-green', 'img-red', 'img-grayscale', 'img-grayscale-2',
    ]);
    finishViewerLoading();

    const metaContent = document.getElementById('meta-content');
    metaContent.innerHTML = `
    <span class="meta-date"><span class="meta-highlight">DATE:</span> ${meta.timestamp?.humanReadable || 'N/A'} <span class="meta-highlight">UNIX:</span> ${meta.timestamp?.unix || 'N/A'} </span></br>
    <span class="meta-success">RGB:</span> ${createLink(outputs.originalJPEG || 'N/A')} </br>
    <span class="meta-blue">B:</span> ${createLink(blueImage)} <span class="meta-green">G:</span> ${createLink(greenImage)} <span class="meta-red">R:</span> ${createLink(redImage)} </br>
    <span class="meta-warning">DEPTH:</span> ${createLink(depthImage)} <span class="meta-warning">NIR:</span> ${createLink(nirImage)} </br>
    <span class="meta-highlight">RAW:</span> ${rawFiles} </br>
    <span class="meta-success">CMD:</span> ${meta.akallCommand || 'N/A'} <span class="meta-highlight">FPS</span> ${akallDetails.fps || 'N/A'} <span class="meta-highlight">COMP:</span> ${akallDetails.compression || 'N/A'} </br>
    <span class="meta-highlight">RGB RESOLUTION:</span> ${fullColorResolution} (${akallDetails.colorResolution}P) <span class="meta-highlight">DEPTH MODE:</span> ${akallDetails.depthMode || 'N/A'} </br>
    <span class="meta-highlight">DEPTH RESOLUTION:</span> ${akallDetails.resolution || 'N/A'} <span class="meta-highlight">FOI:</span> ${akallDetails.foi || 'N/A'} <span class="meta-highlight">RANGE:</span> ${akallDetails.range || 'N/A'} 
    <span class="meta-highlight">EXPOSURE:</span> ${akallDetails.exposure || 'N/A'} </br></br>

    <span class="meta-success">3D RECONSRUCTION [.JPG >> .PLY]</span> ${nd3Files}
    `;

    return meta;
  } catch (err) {
    console.error('Error loading ND3 meta file:', err);
    document.getElementById('meta-content').textContent = 'Error loading meta data.';
    const loaderLabel = document.getElementById('capture-loader-label');
    if (loaderLabel) loaderLabel.textContent = 'CAPTURE COULD NOT BE LOADED';
    window.setTimeout(finishViewerLoading, 500);
  }
}
