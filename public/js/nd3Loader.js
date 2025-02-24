export async function loadND3File(createMergedPLYViewerFn) {
  // Use URLSearchParams to parse the query string.
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
    const blueImage = nd3Reconstruction.find(img => img.colorImage?.startsWith('B_'))?.colorImage || null;
    const greenImage = nd3Reconstruction.find(img => img.colorImage?.startsWith('G_'))?.colorImage || null;
    const redImage = nd3Reconstruction.find(img => img.colorImage?.startsWith('R_'))?.colorImage || null;

    // Extract depth & NIR images from rawConverted
    const depthImage = outputs.depth || rawConverted.find(img => img.includes('D')) || null;
    const nirImage = outputs.nir || rawConverted.find(img => img.includes('IR')) || null;

    // Update Image Sources in UI
    document.getElementById('img-original').src = relativePath + (outputs.originalJPEG || '');
    document.getElementById('img-blue').src = blueImage ? relativePath + blueImage : '';
    document.getElementById('img-green').src = greenImage ? relativePath + greenImage : '';
    document.getElementById('img-red').src = redImage ? relativePath + redImage : '';
    document.getElementById('img-grayscale').src = depthImage ? relativePath + depthImage : relativePath + (outputs.originalJPEG || '');
    document.getElementById('img-grayscale-2').src = nirImage ? relativePath + nirImage : document.getElementById('img-grayscale').src;

    // Initialize the PLY viewer only if ND3 reconstruction data exists
    if (nd3Reconstruction.length > 0) {
      createMergedPLYViewerFn("ply-viewer-merged", relativePath + nd3Reconstruction[0].ply);
    }

    // Ensure AKALL command details exist
    const akallDetails = meta.akallDetails || {};

    // Update Meta Information Display
    const metaContent = document.getElementById('meta-content');
    metaContent.innerHTML = `
      <h3>Timestamp</h3>
      <p><strong>Captured on:</strong> ${meta.timestamp?.humanReadable || 'N/A'} (${meta.timestamp?.unix || 'N/A'})</p>

      <h3>Color Image Details</h3>
      <p><strong>Original JPEG:</strong> ${outputs.originalJPEG || 'N/A'}</p>
      <p><strong>Channels:</strong></p>
      <ul>
        <li><strong>Blue:</strong> ${blueImage || 'N/A'}</li>
        <li><strong>Green:</strong> ${greenImage || 'N/A'}</li>
        <li><strong>Red:</strong> ${redImage || 'N/A'}</li>
      </ul>

      <h3>Depth & NIR Data</h3>
      <ul>
        <li><strong>Depth Image:</strong> ${depthImage || 'N/A'}</li>
        <li><strong>NIR Image:</strong> ${nirImage || 'N/A'}</li>
      </ul>

      <h3>AKALL Capture Command</h3>
      <p><strong>Command:</strong> ${meta.akallCommand || 'N/A'}</p>
      <ul>
        <li><strong>FPS:</strong> ${akallDetails.fps || 'N/A'}</li>
        <li><strong>Compression:</strong> ${akallDetails.compression || 'N/A'}</li>
        <li><strong>Color Resolution:</strong> ${akallDetails.colorResolution || 'N/A'}</li>
        <li><strong>Depth Mode:</strong> ${akallDetails.depthMode || 'N/A'}</li>
        <li><strong>Resolution:</strong> ${akallDetails.resolution || 'N/A'}</li>
        <li><strong>Field of View (FoI):</strong> ${akallDetails.foi || 'N/A'}</li>
        <li><strong>Range:</strong> ${akallDetails.range || 'N/A'}</li>
        <li><strong>Exposure:</strong> ${akallDetails.exposure || 'N/A'}</li>
      </ul>

      <h3>ND3 Reconstruction Outputs</h3>
      <ul>
        ${nd3Reconstruction.length > 0 
          ? nd3Reconstruction.map(recon => `<li>${recon.colorImage || 'N/A'} → ${recon.ply || 'N/A'}</li>`).join('')
          : '<li>N/A</li>'
        }
      </ul>

      <h3>Raw Converted Files</h3>
      <p>${rawConverted.length > 0 ? rawConverted.join(', ') : 'N/A'}</p>
    `;

    return meta;
  } catch (err) {
    console.error('Error loading ND3 meta file:', err);
    document.getElementById('meta-content').textContent = 'Error loading meta data.';
  }
}
