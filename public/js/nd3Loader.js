export async function loadND3File(createMergedPLYViewerFn) {
  const urlParams = new URLSearchParams(window.location.search);
  const dataId = urlParams.get('nd3') || 'C_LS180_Y0_LO-1739825346971';
  const metaUrl = `/watch/processed/${dataId}/meta.json`;

  try {
    const response = await fetch(metaUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const meta = await response.json();
    console.log("ND3 Meta Data Loaded:", meta);

    // Store meta data globally
    window.metaData = meta;

    const parts = meta.processedPath.split('/');
    const folderName = parts[parts.length - 1];
    const relativePath = `/watch/processed/${folderName}/`;

    // Extract outputs safely
    const outputs = meta.outputs || {};
    const nd3Reconstruction = outputs.nd3Reconstruction || [];
    const rawConverted = outputs.rawConverted || [];

    // Extract color channels from nd3Reconstruction
    const blueImage = nd3Reconstruction.find(img => img.colorImage?.startsWith('B_'))?.colorImage || 'N/A';
    const greenImage = nd3Reconstruction.find(img => img.colorImage?.startsWith('G_'))?.colorImage || 'N/A';
    const redImage = nd3Reconstruction.find(img => img.colorImage?.startsWith('R_'))?.colorImage || 'N/A';

    // Extract depth & NIR images from rawConverted
    const depthImage = outputs.depth || rawConverted.find(img => img.includes('D')) || 'N/A';
    const nirImage = outputs.nir || rawConverted.find(img => img.includes('IR')) || 'N/A';

    // Update Image Sources in UI
    document.getElementById('img-original').src = relativePath + (outputs.originalJPEG || '');
    document.getElementById('img-blue').src = blueImage !== 'N/A' ? relativePath + blueImage : '';
    document.getElementById('img-green').src = greenImage !== 'N/A' ? relativePath + greenImage : '';
    document.getElementById('img-red').src = redImage !== 'N/A' ? relativePath + redImage : '';
    document.getElementById('img-grayscale').src = depthImage !== 'N/A' ? relativePath + depthImage : relativePath + (outputs.originalJPEG || '');
    document.getElementById('img-grayscale-2').src = nirImage !== 'N/A' ? relativePath + nirImage : document.getElementById('img-grayscale').src;

    // Initialize the PLY viewer only if ND3 reconstruction data exists
    if (nd3Reconstruction.length > 0) {
      createMergedPLYViewerFn("ply-viewer-merged", relativePath + nd3Reconstruction[0].ply);
    }

    // Ensure AKALL command details exist
    const akallDetails = meta.akallDetails || {};

    // Update Meta Information Display with futuristic console-like appearance
    const metaContent = document.getElementById('meta-content');
    metaContent.innerHTML = `
      <span class="meta-highlight">Captured:</span> ${meta.timestamp?.humanReadable || 'N/A'} <br>
      <span class="meta-highlight">Unix Timestamp:</span> ${meta.timestamp?.unix || 'N/A'} <br>

      <span class="meta-success">Original Image:</span> ${outputs.originalJPEG || 'N/A'} <br>
      <span class="meta-highlight">🔵 Blue Channel:</span> ${blueImage} <br>
      <span class="meta-highlight">🟢 Green Channel:</span> ${greenImage} <br>
      <span class="meta-highlight">🔴 Red Channel:</span> ${redImage} <br>

      <span class="meta-warning">Depth Image:</span> ${depthImage} <br>
      <span class="meta-warning">NIR Image:</span> ${nirImage} <br>

      <span class="meta-success">AKALL Command:</span> ${meta.akallCommand || 'N/A'} <br>
      <span class="meta-highlight">FPS:</span> ${akallDetails.fps || 'N/A'} 
      <span class="meta-highlight">Compression:</span> ${akallDetails.compression || 'N/A'} <br>
      <span class="meta-highlight">Color Resolution:</span> ${akallDetails.colorResolution || 'N/A'} <br>
      <span class="meta-highlight">Depth Mode:</span> ${akallDetails.depthMode || 'N/A'} <br>
      <span class="meta-highlight">Resolution:</span> ${akallDetails.resolution || 'N/A'} <br>
      <span class="meta-highlight">FoI:</span> ${akallDetails.foi || 'N/A'} <br>
      <span class="meta-highlight">Range:</span> ${akallDetails.range || 'N/A'} <br>
      <span class="meta-highlight">Exposure:</span> ${akallDetails.exposure || 'N/A'} <br>

      <span class="meta-success">ND3 Files:</span> ${nd3Reconstruction.length > 0 ? nd3Reconstruction.map(recon => `${recon.colorImage} → ${recon.ply}`).join('<br>') : 'N/A'} <br>

      <span class="meta-highlight">Raw Files:</span> ${rawConverted.length > 0 ? rawConverted.join(', ') : 'N/A'}
    `;

    return meta;
  } catch (err) {
    console.error('Error loading ND3 meta file:', err);
    document.getElementById('meta-content').textContent = 'Error loading meta data.';
  }
}
