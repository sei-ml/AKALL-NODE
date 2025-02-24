const path = require('path');
const fs = require('fs');
const Nd3 = require('../models/nd3Model');
const { decompressTarGz } = require('../utils/tarUtils');
const shellCommandService = require('./shellCommandService');

const PROCESSED_DIR = process.env.PROCESSED_DIR || './watch/processed';

/**
 * AKALL Depth Mode Lookup Table
 */
const AKALL_DEPTH_MODES = {
    "OFF": { id: "0", mode: "OFF", resolution: "N/A", foi: "N/A", range: "N/A", exposure: "N/A" },
    "NFOV_2x2BINNED": { id: "1", mode: "NFOV 2x2 binned (SW)", resolution: "320x288", foi: "75°x65°", range: "0.5 - 5.46 m", exposure: "12.8 ms" },
    "NFOV_UNBINNED": { id: "2", mode: "NFOV unbinned", resolution: "640x576", foi: "75°x65°", range: "0.5 - 3.86 m", exposure: "12.8 ms" },
    "WFOV_2x2BINNED": { id: "3", mode: "WFOV 2x2 binned", resolution: "512x512", foi: "120°x120°", range: "0.25 - 2.88 m", exposure: "12.8 ms" },
    "WFOV_UNBINNED": { id: "4", mode: "WFOV unbinned", resolution: "1024x1024", foi: "120°x120°", range: "0.25 - 2.21 m", exposure: "20.3 ms" },
    "PASSIVE_IR": { id: "5", mode: "Passive IR", resolution: "1024x1024", foi: "N/A", range: "N/A", exposure: "1.6 ms" }
};

/**
 * Function to extract AKALL parameters from filenames
 */
function parseAkallCommand(jpegFilename, depthFilename) {
    const akallParams = {
        fps: "05", 
        compression: null,
        colorResolution: null,
        depthMode: null,
        resolution: null,
        foi: null,
        range: null,
        exposure: null,
        depthModeId: null
    };

    // Extract compression and color resolution from JPEG filename
    const jpegMatch = jpegFilename.match(/C(\d+)(MJPG|YUY2|NV12)(\d+)P\.jpeg$/);
    if (jpegMatch) {
        akallParams.fps = jpegMatch[1];  
        akallParams.compression = jpegMatch[2]; 
        akallParams.colorResolution = jpegMatch[3]; 
    }

    // Extract depth mode from depth PNG filename
    const depthMatch = depthFilename.match(/D(\d+)(\d+)(WFOV_UNBINNED|NFOV_UNBINNED|WFOV_2x2BINNED|NFOV_2x2BINNED|PASSIVE_IR)\.png$/);
    if (depthMatch) {
        const depthModeKey = depthMatch[3]; 

        if (AKALL_DEPTH_MODES[depthModeKey]) {
            const depthInfo = AKALL_DEPTH_MODES[depthModeKey];
            akallParams.depthMode = depthInfo.mode;
            akallParams.resolution = depthInfo.resolution;
            akallParams.foi = depthInfo.foi;
            akallParams.range = depthInfo.range;
            akallParams.exposure = depthInfo.exposure;
            akallParams.depthModeId = depthInfo.id; 
        }
    }

    if (akallParams.compression && akallParams.colorResolution && akallParams.depthModeId) {
        akallParams.akallCommand = `K${akallParams.fps}${akallParams.compression}${akallParams.colorResolution}${akallParams.depthModeId}`;
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
    const uniqueId = Date.now().toString();
    const outputDir = path.join(PROCESSED_DIR, `${baseName}-${uniqueId}`);

    fs.mkdirSync(outputDir, { recursive: true });

    await decompressTarGz(filePath, outputDir);
    console.log(`Decompressed to: ${outputDir}`);
    if (io) {
        io.emit('decompressionComplete', { filePath, outputDir });
    }

    await shellCommandService.runCommands(outputDir);
    console.log('Shell commands completed');
    if (io) {
        io.emit('shellCommandsDone', { filePath });
    }

    let processedFiles;
    try {
        processedFiles = fs.readdirSync(outputDir);
    } catch (err) {
        console.error(`Error reading processed folder ${outputDir}:`, err);
        return;
    }

    const originalJPEG = processedFiles.find(file => file.toLowerCase().endsWith('.jpeg') && !file.startsWith('B_') && !file.startsWith('G_') && !file.startsWith('R_'));

    const depthImage = processedFiles.find(file => file.toLowerCase().endsWith('.png') && file.includes('D'));
    const nirImage = processedFiles.find(file => file.toLowerCase().endsWith('.png') && file.includes('IR'));

    const plyFiles = processedFiles.filter(file => file.toLowerCase().endsWith('.ply'));

    const nd3Reconstruction = plyFiles.map(plyFile => {
        return {
            ply: plyFile,
            colorImage: plyFile.replace('.ply', '.jpeg')
        };
    });

    const rawConverted = processedFiles.filter(file => file.toLowerCase().endsWith('.png'));

    let timestamp = null;
    if (originalJPEG) {
        const match = originalJPEG.match(/^(\d+)/);
        if (match) {
            timestamp = match[1];
        }
    }

    const humanReadableTimestamp = timestamp ? new Date(parseInt(timestamp) * 1000).toISOString() : null;

    const akallParams = originalJPEG && depthImage ? parseAkallCommand(originalJPEG, depthImage) : {};

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
            nd3Reconstruction: nd3Reconstruction,
            rawConverted: rawConverted,
            channels: {
                blue: nd3Reconstruction[1]?.colorImage || null,
                green: nd3Reconstruction[2]?.colorImage || null,
                red: nd3Reconstruction[3]?.colorImage || null
            },
            depth: depthImage || null,
            nir: nirImage || null
        }
    };

    const metaFilePath = path.join(outputDir, 'meta.json');
    try {
        fs.writeFileSync(metaFilePath, JSON.stringify(meta, null, 2));
        console.log('Meta data generated at:', metaFilePath);
    } catch (err) {
        console.error('Error writing meta.json:', err);
    }

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
