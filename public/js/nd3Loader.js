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

    // Function to create hyperlink
    const createLink = (filename) =>
      filename !== 'N/A' ? `<a href="${relativePath + filename}" target="_blank">${filename}</a>` : 'N/A';

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

    // Format ND3 Reconstruction and Raw Files into inline text with links
    const nd3Files = nd3Reconstruction.length > 0
      ? nd3Reconstruction.map(recon => `${createLink(recon.colorImage)} → ${createLink(recon.ply)}`).join(' | ')
      : 'N/A';

    const rawFiles = rawConverted.length > 0
      ? rawConverted.map(file => createLink(file)).join(', ')
      : 'N/A';

    // Update Meta Information Display with hyperlinks
    const metaContent = document.getElementById('meta-content');
    metaContent.innerHTML = `
    <span class="meta-highlight">DATE</span> ${meta.timestamp?.humanReadable || 'N/A'} <span class="meta-highlight">UNIX </span> ${meta.timestamp?.unix || 'N/A'} </br>
    <span class="meta-success">COLOR IMAGE</span> ${createLink(outputs.originalJPEG || 'N/A')} </br>
    <span class="meta-blue" style="color:lightblue;">B CH</span> ${createLink(blueImage)} <span class="meta-green" style="color:green;">G CH</span> ${createLink(greenImage)} <span class="meta-red" style="color:red;">R CH</span> ${createLink(redImage)} </br>
    <span class="meta-warning">DEPTH</span> ${createLink(depthImage)} <span class="meta-warning">NIR</span> ${createLink(nirImage)} </br>
    <span class="meta-highlight">RAW</span> ${rawFiles} </br>
    <span class="meta-success">AKALL CMD</span> ${meta.akallCommand || 'N/A'} <span class="meta-highlight">FPS</span> ${akallDetails.fps || 'N/A'} <span class="meta-highlight">COMP</span> ${akallDetails.compression || 'N/A'} </br>
    <span class="meta-highlight">COLOR RES</span> ${akallDetails.colorResolution || 'N/A'} <span class="meta-highlight">DEPTH MODE</span> ${akallDetails.depthMode || 'N/A'} </br>
    <span class="meta-highlight">DEPTH RES:</span> ${akallDetails.resolution || 'N/A'} <span class="meta-highlight">FOI:</span> ${akallDetails.foi || 'N/A'} <span class="meta-highlight">RANGE</span> ${akallDetails.range || 'N/A'} 
    <span class="meta-highlight">EXPOSURE</span> ${akallDetails.exposure || 'N/A'} </br>
    <span>-----------------------------------------------------------------------</span> </br>
    <span class="meta-success">3D RECONSRUCTION (.JPG, .PLY)</span> ${nd3Files}
    `;

    return meta;
  } catch (err) {
    console.error('Error loading ND3 meta file:', err);
    document.getElementById('meta-content').textContent = 'Error loading meta data.';
  }
}
