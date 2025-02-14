/**
 * src/services/nd3ProcessingService.js
 *
 * Main logic to:
 * - Decompress tar.gz
 * - Run shell commands (which process images and generate ND3 outputs)
 * - Generate meta.json (including links to the processed data)
 * - Store data in MongoDB
 */

const path = require('path');
const fs = require('fs');
const Nd3 = require('../models/nd3Model');
const { decompressTarGz } = require('../utils/tarUtils');
const shellCommandService = require('./shellCommandService');

const PROCESSED_DIR = process.env.PROCESSED_DIR || './watch/processed';

/**
 * Process a single .tar.gz file.
 */
async function processNd3File(filePath, io) {
  console.log(`Processing file: ${filePath}`);

  const baseName = path.basename(filePath, '.tar.gz');
  const uniqueId = Date.now().toString(); // or use uuid
  const outputDir = path.join(PROCESSED_DIR, `${baseName}-${uniqueId}`);

  fs.mkdirSync(outputDir, { recursive: true });

  // Decompress the tar.gz into the output directory.
  await decompressTarGz(filePath, outputDir);
  console.log(`Decompressed to: ${outputDir}`);
  if (io) {
    io.emit('decompressionComplete', { filePath, outputDir });
  }

  // Run all the shell commands (processing images, raw conversions, ND3 reconstruction)
  await shellCommandService.runCommands(outputDir);
  console.log('Shell commands completed');
  if (io) {
    io.emit('shellCommandsDone', { filePath });
  }

  // --- Generate meta.json with links to processed files ---
  let processedFiles;
  try {
    processedFiles = fs.readdirSync(outputDir);
  } catch (err) {
    console.error(`Error reading processed folder ${outputDir}:`, err);
    return;
  }

  // Identify the original JPEG: the one that ends with .jpeg and does NOT start with B_, G_, or R_
  const originalJPEG = processedFiles.find(file =>
    file.toLowerCase().endsWith('.jpeg') &&
    !file.startsWith('B_') &&
    !file.startsWith('G_') &&
    !file.startsWith('R_')
  );

  // Identify channel images:
  const blueImage = processedFiles.find(file => file.startsWith('B_') && file.toLowerCase().endsWith('.jpeg'));
  const greenImage = processedFiles.find(file => file.startsWith('G_') && file.toLowerCase().endsWith('.jpeg'));
  const redImage = processedFiles.find(file => file.startsWith('R_') && file.toLowerCase().endsWith('.jpeg'));

  // Gather ND3 reconstruction outputs: assume these are all .ply files.
  const plyFiles = processedFiles.filter(file => file.toLowerCase().endsWith('.ply'));
  // For each ply file, associate the corresponding color image by replacing .ply with .jpeg.
  const nd3Reconstruction = plyFiles.map(plyFile => {
    return {
      ply: plyFile,
      colorImage: plyFile.replace('.ply', '.jpeg')
    };
  });

  // Gather raw image conversion outputs (PNG files) that likely came from raw files.
  const rawConverted = processedFiles.filter(file => file.toLowerCase().endsWith('.png'));

  // Build the meta data object.
  const meta = {
    originalFileName: baseName,
    processedPath: outputDir,
    timestamp: new Date().toISOString(),
    outputs: {
      originalJPEG: originalJPEG || null,
      channels: {
        blue: blueImage || null,
        green: greenImage || null,
        red: redImage || null
      },
      nd3Reconstruction: nd3Reconstruction,
      rawConverted: rawConverted
    }
  };

  const metaFilePath = path.join(outputDir, 'meta.json');
  try {
    fs.writeFileSync(metaFilePath, JSON.stringify(meta, null, 2));
    console.log('Meta data generated at:', metaFilePath);
  } catch (err) {
    console.error('Error writing meta.json:', err);
  }

  // Save a record in MongoDB.
  const nd3Doc = new Nd3({
    originalFileName: baseName,
    status: 'processed',
    meta
  });
  try {
    await nd3Doc.save();
    console.log(`ND3 record saved to DB with _id: ${nd3Doc._id}`);
    if (io) {
      io.emit('fileProcessed', { _id: nd3Doc._id, filePath });
    }
  } catch (err) {
    console.error('Error saving ND3 record to DB:', err);
  }
}

module.exports = {
  processNd3File,
};
