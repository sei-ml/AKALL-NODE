// Sample type definitions for lunar materials
const SAMPLE_TYPES = {
  'BP': { name: 'Basalt Porphyry', desc: 'Volcanic lunar rock with large crystals embedded in fine-grained matrix, formed from slow-cooling magma beneath the surface.' },
  'C': { name: 'Core Sample', desc: 'Cylindrical extraction from lunar regolith layers, preserving the stratigraphy and composition history.' },
  'DF': { name: 'Dust Fines', desc: 'Fine-grained lunar regolith particles (<1mm), created by micrometeorite impacts over billions of years.' },
  'LS': { name: 'Lunar Simulant', desc: 'Earth-based material engineered to replicate lunar soil properties for research and testing.' },
  'PD': { name: 'Powder Dried', desc: 'Processed sample with moisture removed under vacuum conditions.' },
  'YL': { name: 'Yellow Luminescence', desc: 'Sample exhibiting characteristic yellow fluorescence under UV illumination.' },
  'HRW': { name: 'High-Res Wide', desc: 'Captured using wide-angle depth sensor mode for maximum field coverage.' },
  'HRN': { name: 'High-Res Narrow', desc: 'Captured using narrow-angle depth sensor for enhanced precision.' },
  'LO': { name: 'Low Resolution', desc: 'Standard resolution capture optimized for faster processing.' }
};

function parseSampleName(fileName) {
  const parts = fileName.split('_');
  const sampleType = parts[0] || 'Unknown';
  const typeInfo = SAMPLE_TYPES[sampleType] || { name: 'Lunar Sample', desc: 'Scientific sample for 3D reconstruction analysis.' };
  
  // Extract additional modifiers
  const modifiers = parts.slice(1).map(p => SAMPLE_TYPES[p]).filter(Boolean);
  
  return {
    type: sampleType,
    typeName: typeInfo.name,
    typeDesc: typeInfo.desc,
    modifiers: modifiers
  };
}

function populateInfoPanel(meta) {
  const infoBody = document.getElementById('info-body');
  const infoTitle = document.getElementById('info-title');
  
  if (!infoBody || !meta) return;
  
  const sampleInfo = parseSampleName(meta.originalFileName || 'Unknown');
  const akallDetails = meta.akallDetails || {};
  const timestamp = meta.timestamp || {};
  
  // Format date nicely
  const captureDate = timestamp.humanReadable 
    ? new Date(timestamp.humanReadable).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: 'numeric' 
      })
    : 'Unknown';
  
  infoTitle.textContent = sampleInfo.typeName.toUpperCase();
  
  infoBody.innerHTML = `
    <div class="info-section">
      <div class="info-sample-name">${meta.originalFileName || 'Unknown Sample'}</div>
      <div class="info-sample-type">${sampleInfo.typeName}</div>
      <div class="info-description">${sampleInfo.typeDesc}</div>
    </div>
    
    <div class="info-section">
      <div class="info-section-title">Capture Details</div>
      <div class="info-grid">
        <div class="info-stat">
          <div class="info-stat-label">Date</div>
          <div class="info-stat-value">${captureDate}</div>
        </div>
        <div class="info-stat">
          <div class="info-stat-label">Frame Rate</div>
          <div class="info-stat-value">${akallDetails.fps || '—'} FPS</div>
        </div>
        <div class="info-stat">
          <div class="info-stat-label">RGB Resolution</div>
          <div class="info-stat-value">${akallDetails.colorResolution || '—'}P</div>
        </div>
        <div class="info-stat">
          <div class="info-stat-label">Depth Mode</div>
          <div class="info-stat-value">${akallDetails.depthMode || '—'}</div>
        </div>
        <div class="info-stat">
          <div class="info-stat-label">Depth Range</div>
          <div class="info-stat-value">${akallDetails.range || '—'}</div>
        </div>
        <div class="info-stat">
          <div class="info-stat-label">Exposure</div>
          <div class="info-stat-value">${akallDetails.exposure || '—'}</div>
        </div>
      </div>
    </div>
    
    <div class="info-section">
      <div class="info-section-title">Data Channels</div>
      <div class="info-channels">
        <div class="info-channel rgb">RGB</div>
        <div class="info-channel depth">Depth</div>
        <div class="info-channel nir">NIR</div>
        <div class="info-channel ply">3D PLY</div>
      </div>
      
      <div class="info-legend">
        <div class="info-legend-item">
          <span class="info-legend-dot original"></span>
          <span>Original — Full-color composite image</span>
        </div>
        <div class="info-legend-item">
          <span class="info-legend-dot blue"></span>
          <span>Blue — 450-495nm wavelength channel</span>
        </div>
        <div class="info-legend-item">
          <span class="info-legend-dot green"></span>
          <span>Green — 495-570nm wavelength channel</span>
        </div>
        <div class="info-legend-item">
          <span class="info-legend-dot red"></span>
          <span>Red — 620-750nm wavelength channel</span>
        </div>
      </div>
    </div>
  `;
  
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
  }
}
