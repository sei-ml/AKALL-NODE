export async function loadND3File(createMergedPLYViewerFn) {
  // Use URLSearchParams to parse the query string.
  const urlParams = new URLSearchParams(window.location.search);
  // Get the 'id' parameter; default if not provided.
  const dataId = urlParams.get('nd3') || 'C_LS180_Y0_LO-1739825346971';
  // Construct the meta file URL based on the dataId.
  const metaUrl = `/watch/processed/${dataId}/meta.json`;

  try {
    const response = await fetch(metaUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const meta = await response.json();
    console.log("ND3 Meta Data Loaded:", meta);
    
    // Store meta data globally.
    window.metaData = meta;
  
    const parts = meta.processedPath.split('/');
    const folderName = parts[parts.length - 1];
    const relativePath = `/watch/processed/${folderName}/`;
  
    // Update image sources.
    document.getElementById('img-original').src = relativePath + meta.outputs.originalJPEG;
    document.getElementById('img-blue').src = relativePath + meta.outputs.channels.blue;
    document.getElementById('img-green').src = relativePath + meta.outputs.channels.green;
    document.getElementById('img-red').src = relativePath + meta.outputs.channels.red;
  
    if (meta.outputs.rawConverted?.length) {
      document.getElementById('img-grayscale').src = relativePath + meta.outputs.rawConverted[0];
      document.getElementById('img-grayscale-2').src =
        meta.outputs.rawConverted[1]
          ? relativePath + meta.outputs.rawConverted[1]
          : relativePath + meta.outputs.rawConverted[0];
    } else {
      document.getElementById('img-grayscale').src = relativePath + meta.outputs.originalJPEG;
      document.getElementById('img-grayscale-2').src = relativePath + meta.outputs.originalJPEG;
    }
  
    // Initialize the PLY viewer if ND3 reconstruction data is available.
    if (meta.outputs.nd3Reconstruction?.length) {
      createMergedPLYViewerFn("ply-viewer-merged", relativePath + meta.outputs.nd3Reconstruction[0].ply);
    }
  
    // Update meta info display.
    const metaContent = document.getElementById('meta-content');
    metaContent.innerHTML = `

      <p><strong>Capture Date/strong> ${meta.timestamp.humanReadable} (${meta.timestamp.unix})</p>
      <h3>Color Image Details</h3>
      <p><strong>Original JPEG:</strong> ${meta.outputs.originalJPEG}</p>
      <p><strong>Channels:</strong></p>
      <ul>
        <li><strong>Blue:</strong> ${meta.outputs.channels.blue}</li>
        <li><strong>Green:</strong> ${meta.outputs.channels.green}</li>
        <li><strong>Red:</strong> ${meta.outputs.channels.red}</li>
      </ul>

      <h3>AKALL Capture Command</h3>
      <p><strong>Command:</strong> ${meta.akallCommand}</p>
      <ul>
        <li><strong>FPS:</strong> ${meta.akallDetails.fps}</li>
        <li><strong>Compression:</strong> ${meta.akallDetails.compression}</li>
        <li><strong>Color Resolution:</strong> ${meta.akallDetails.colorResolution}</li>
        <li><strong>Depth Mode:</strong> ${meta.akallDetails.depthMode}</li>
        <li><strong>Resolution:</strong> ${meta.akallDetails.resolution}</li>
        <li><strong>Field of View (FoI):</strong> ${meta.akallDetails.foi}</li>
        <li><strong>Range:</strong> ${meta.akallDetails.range}</li>
        <li><strong>Exposure:</strong> ${meta.akallDetails.exposure}</li>
      </ul>

      <h3>ND3 Reconstruction Outputs</h3>
      <ul>
        ${meta.outputs.nd3Reconstruction.map(recon => `
          <li>${recon.colorImage} → ${recon.ply}</li>
        `).join('')}
      </ul>

      <h3>Raw Converted Files</h3>
      <p>${meta.outputs.rawConverted.join(', ')}</p>
    `;
  
    return meta;
  } catch (err) {
    console.error('Error loading ND3 meta file:', err);
    document.getElementById('meta-content').textContent = 'Error loading meta data.';
  }
}
