/**
 * src/services/shellCommandService.js
 *
 * Processes a decompressed folder:
 *   1. Splits the single JPEG file into 3 channel images (Red, Green, Blue).
 *   2. Converts raw images (IR and Depth) to PNG using the appropriate resolution.
 *   3. Runs ND3 reconstruction on every JPEG file in the folder using the same raw depth file.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromisified = util.promisify(exec);

function getResolutionFromFilename(filename) {
  const upper = filename.toUpperCase();
  if (upper.includes("NFOV_2X2BINNED") || upper.includes("NFOV2X2BINNED")) {
    return "320x288";
  } else if (upper.includes("NFOV_UNBINNED")) {
    return "640x576";
  } else if (upper.includes("WFOV_2X2BINNED") || upper.includes("WFOV2X2BINNED")) {
    return "512x512";
  } else if (upper.includes("WFOV_UNBINNED")) {
    return "1024x1024";
  } else {
    return null;
  }
}

/**
 * Processes the images in a given folder:
 * Finds the single JPEG file and converts it into 3 channel images.
 * Finds raw image files (files with no extension) and converts each to PNG with the proper resolution.
 */
async function processImagesInFolder(folderPath) {
  let files;
  try {
    files = fs.readdirSync(folderPath);
  } catch (err) {
    console.error(`Error reading folder ${folderPath}:`, err);
    return;
  }

  const jpegFiles = files.filter(file => file.toLowerCase().endsWith('.jpeg'));
  if (jpegFiles.length !== 1) {
    console.error(`Expected exactly one original JPEG file in ${folderPath} initially, found ${jpegFiles.length}`);
  } else {
    const jpegFile = jpegFiles[0];
    const jpegFilePath = path.join(folderPath, jpegFile);
    const baseName = path.basename(jpegFile, '.jpeg');
    console.log(`Found original JPEG file: ${jpegFilePath}`);

    const channelCommands = [
      `convert "${jpegFilePath}" -colorspace RGB -channel B -separate -auto-level "${folderPath}/B_${baseName}.jpeg"`,
      `convert "${jpegFilePath}" -colorspace RGB -channel G -separate -auto-level "${folderPath}/G_${baseName}.jpeg"`,
      `convert "${jpegFilePath}" -colorspace RGB -channel R -separate -auto-level "${folderPath}/R_${baseName}.jpeg"`
    ];

    for (const cmd of channelCommands) {
      console.log('Running command:', cmd);
      try {
        const { stdout, stderr } = await execPromisified(cmd);
        if (stdout) console.log('stdout:', stdout);
        if (stderr) console.error('stderr:', stderr);
      } catch (err) {
        console.error('Error executing command:', err);
      }
    }
  }

  const rawFiles = files.filter(file => {
    return !file.toLowerCase().endsWith('.jpeg') && !file.includes('.');
  });

  for (const rawFile of rawFiles) {
    const rawFilePath = path.join(folderPath, rawFile);
    const resolution = getResolutionFromFilename(rawFile);
    if (!resolution) {
      console.warn(`Could not determine resolution for raw file: ${rawFile}`);
      continue;
    }

    const outputFile = rawFile + '.png';
    const outputFilePath = path.join(folderPath, outputFile);
    
    const cmd = `convert -size ${resolution} -depth 16 -endian LSB gray:"${rawFilePath}" -normalize "${outputFilePath}"`;
    console.log('Running command:', cmd);
    try {
      const { stdout, stderr } = await execPromisified(cmd);
      if (stdout) console.log('stdout:', stdout);
      if (stderr) console.error('stderr:', stderr);
    } catch (err) {
      console.error('Error executing raw image conversion:', err);
    }
  }

  console.log('Image processing complete in folder:', folderPath);
}

/**
 * Runs ND3 reconstruction on the processed folder for every JPEG image.
 * The output .ply file is named based on the color image's base name.
 */
async function runND3Reconstruction(folderPath) {
  const nd3Binary = process.env.ND3_BINARY; 
  const calibrationFile = process.env.CALIBRATION;
  if (!nd3Binary || !calibrationFile) {
    console.error("ND3_BINARY or CALIBRATION not defined in environment variables.");
    return;
  }

  let files;
  try {
    files = fs.readdirSync(folderPath);
  } catch (err) {
    console.error(`Error reading folder ${folderPath}:`, err);
    return;
  }
  
  const rawDepthFiles = files.filter(file => {
    return !file.includes('.') && /^\d+D/.test(file);
  });
  if (rawDepthFiles.length === 0) {
    console.error(`No raw depth file found in ${folderPath}`);
    return;
  }
  const rawDepthFile = path.join(folderPath, rawDepthFiles[0]);

  const jpegFiles = files.filter(file => file.toLowerCase().endsWith('.jpeg'));
  if (jpegFiles.length === 0) {
    console.error(`No JPEG files found in ${folderPath} for ND3 reconstruction.`);
    return;
  }

  for (const jpg of jpegFiles) {
    const colorImage = path.join(folderPath, jpg);
    const outputPly = path.join(folderPath, path.basename(jpg, '.jpeg') + ".ply");

    // <ND3_BINARY> <CALIBRATION> <colorImage> <rawDepthFile> <outputPly>
    const cmd = `"${nd3Binary}" "${calibrationFile}" "${colorImage}" "${rawDepthFile}" "${outputPly}"`;
    console.log('Running ND3 reconstruction command for', colorImage, ':', cmd);
    try {
      const { stdout, stderr } = await execPromisified(cmd);
      if (stdout) console.log('ND3 stdout:', stdout);
      if (stderr) console.error('ND3 stderr:', stderr);
    } catch (err) {
      console.error('Error executing ND3 reconstruction command for', colorImage, ':', err);
    }
  }
}

/**
 * The main function to run all commands in sequence:
 *  1. Process images (JPEG splitting and raw conversions)
 *  2. Run ND3 reconstruction on every JPEG file (color image) in the folder using the same raw depth file.
 *
 * @param {string} outputDir - The folder containing the decompressed data.
 */
async function runCommands(outputDir) {
  console.log(`Starting image processing in folder: ${outputDir}`);
  await processImagesInFolder(outputDir);
  console.log(`Starting ND3 reconstruction in folder: ${outputDir}`);
  await runND3Reconstruction(outputDir);
}

module.exports = {
  runCommands,
};
