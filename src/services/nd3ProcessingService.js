const path = require('path');
const fs = require('fs');
const Nd3 = require('../models/nd3Model');
const { decompressTarGz } = require('../utils/tarUtils');
const shellCommandService = require('./shellCommandService');

const PROCESSED_DIR = process.env.PROCESSED_DIR || './watch/processed';

/**
 * Function to extract AKALL parameters from filenames
 */
function parseAkallCommand(jpegFilename, depthFilename) {
    const akallParams = {
        fps: null,
        compression: null,
        colorResolution: null,
        depthResolution: null,
        depthMode: null
    };

    // Extract FPS, compression, and color resolution from JPEG filename
    const jpegMatch = jpegFilename.match(/(\d+)(MJPG|YUY2|NV12)(\d+)P\.jpeg$/);
    if (jpegMatch) {
        akallParams.fps = jpegMatch[1];  // FPS
        akallParams.compression = jpegMatch[2]; // Compression type
        akallParams.colorResolution = jpegMatch[3]; // Color resolution height
    }

    // Extract Depth resolution and mode from PNG depth filename
    const depthMatch = depthFilename.match(/D(\d+)(\d+)(WFOV_UNBINNED|WFOV_BINNED|NFOV_UNBINNED|NFOV_BINNED|PASSIVE_IR)\.png$/);
    if (depthMatch) {
        akallParams.fps = depthMatch[1] || akallParams.fps;  // FPS (if present)
        akallParams.depthResolution = depthMatch[2]; // Depth resolution
        akallParams.depthMode = depthMatch[3]; // Depth mode
    }

    // Construct AKALL Command
    if (akallParams.fps && akallParams.compression && akallParams.colorResolution && akallParams.depthResolution && akallParams.depthMode) {
        akallParams.akallCommand = `K${akallParams.fps}${akallParams.compression}${akallParams.colorResolution}${akallParams.depthResolution}${akallParams.depthMode}`;
    } else {
        akallParams.akallCommand = "Unknown";
    }

    return akallParams;
}

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

    // --- Gather Processed Files ---
    let processedFiles;
    try {
        processedFiles = fs.readdirSync(outputDir);
    } catch (err) {
        console.error(`Error reading processed folder ${outputDir}:`, err);
        return;
    }

    // Identify the original JPEG (color image)
    const originalJPEG = processedFiles.find(file =>
        file.toLowerCase().endsWith('.jpeg') &&
        !file.startsWith('B_') &&
        !file.startsWith('G_') &&
        !file.startsWith('R_')
    );

    // Identify channel images
    const blueImage = processedFiles.find(file => file.startsWith('B_') && file.toLowerCase().endsWith('.jpeg'));
    const greenImage = processedFiles.find(file => file.startsWith('G_') && file.toLowerCase().endsWith('.jpeg'));
    const redImage = processedFiles.find(file => file.startsWith('R_') && file.toLowerCase().endsWith('.jpeg'));

    // Identify depth image (PNG format)
    const depthImage = processedFiles.find(file => file.toLowerCase().endsWith('.png') && file.includes('D'));

    // Gather ND3 reconstruction outputs: assume these are all .ply files
    const plyFiles = processedFiles.filter(file => file.toLowerCase().endsWith('.ply'));

    // For each ply file, associate the corresponding color image
    const nd3Reconstruction = plyFiles.map(plyFile => {
        return {
            ply: plyFile,
            colorImage: plyFile.replace('.ply', '.jpeg')
        };
    });

    // Gather raw image conversion outputs (PNG files)
    const rawConverted = processedFiles.filter(file => file.toLowerCase().endsWith('.png'));

    // Extract timestamp from filename
    let timestamp = null;
    if (originalJPEG) {
        const match = originalJPEG.match(/^(\d+)/);
        if (match) {
            timestamp = match[1]; // Unix timestamp
        }
    }

    const humanReadableTimestamp = timestamp ? new Date(parseInt(timestamp) * 1000).toISOString() : null;

    // Extract AKALL command details
    const akallParams = originalJPEG && depthImage ? parseAkallCommand(originalJPEG, depthImage) : {};

    // --- Build the Meta Data Object ---
    const meta = {
        originalFileName: baseName,
        processedPath: outputDir,
        timestamp: {
            unix: timestamp,
            humanReadable: humanReadableTimestamp
        },
        akallCommand: akallParams.akallCommand || "Unknown",
        akallDetails: akallParams,
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

    // Write meta.json
    const metaFilePath = path.join(outputDir, 'meta.json');
    try {
        fs.writeFileSync(metaFilePath, JSON.stringify(meta, null, 2));
        console.log('Meta data generated at:', metaFilePath);
    } catch (err) {
        console.error('Error writing meta.json:', err);
    }

    // Save to MongoDB
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
