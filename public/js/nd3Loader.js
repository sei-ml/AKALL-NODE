// nd3Loader.js
export async function loadND3File(createMergedPLYViewerFn) {
    try {
      const response = await fetch('/watch/processed/C_LS180_Y0_LO-1739322269902/meta.json');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const meta = await response.json();
      console.log("ND3 Meta Data Loaded:", meta);
  
      const parts = meta.processedPath.split('/');
      const folderName = parts[parts.length - 1];
      const relativePath = "/watch/processed/" + folderName + "/";
  
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
        // Use the passed-in function.
        createMergedPLYViewerFn("ply-viewer-merged", relativePath + meta.outputs.nd3Reconstruction[0].ply);
      }
  
      // Update meta info display.
      const metaContent = document.getElementById('meta-content');
      metaContent.innerHTML = `
        <p><strong>Timestamp:</strong> ${meta.timestamp}</p>
        <p><strong>Original JPEG:</strong> ${meta.outputs.originalJPEG}</p>
        <p><strong>Channels:</strong> Blue: ${meta.outputs.channels.blue}, Green: ${meta.outputs.channels.green}, Red: ${meta.outputs.channels.red}</p>
        <p><strong>ND3 Reconstruction Outputs:</strong> 
          ${meta.outputs.nd3Reconstruction.length > 0 ?
            `${meta.outputs.nd3Reconstruction[0].colorImage} → ${meta.outputs.nd3Reconstruction[0].ply}` : ''}
        </p>
        <p><strong>Raw Converted Files:</strong> ${meta.outputs.rawConverted.join(', ')}</p>
      `;
  
      return meta;
    } catch (err) {
      console.error('Error loading ND3 meta file:', err);
      document.getElementById('meta-content').textContent = 'Error loading meta data.';
    }
  }
  