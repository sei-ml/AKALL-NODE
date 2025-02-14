/**
 * src/services/fileWatcherService.js
 *
 * Uses Node’s built-in fs.watch to watch a directory for .tar.gz files
 * and then queues them for processing.
 */

const fs = require('fs');
const path = require('path');
const queueService = require('./queueService');
const { processNd3File } = require('./nd3ProcessingService');

const INCOMING_DIR = process.env.INCOMING_DIR;
console.log('Watching directory:', INCOMING_DIR);

function startWatcher(io) {
  if (!fs.existsSync(INCOMING_DIR)) {
    console.error(`Directory ${INCOMING_DIR} does not exist.`);
    return;
  }

  fs.watch(INCOMING_DIR, (eventType, filename) => {
    if (filename && eventType === 'rename') {
      const filePath = path.join(INCOMING_DIR, filename);
      
      fs.stat(filePath, (err, stats) => {
        if (err) {
          return;
        }
        
        if (stats.isFile() && filePath.endsWith('.tar.gz')) {
          console.log('New file detected:', filePath);
          queueService.addToQueue(async () => {
            await processNd3File(filePath, io);
          });
        } else {
          console.log(`Detected file ${filePath}, but it doesn't match .tar.gz pattern.`);
        }
      });
    }
  });

  console.log(`fs.watch is now monitoring for .tar.gz files in ${INCOMING_DIR}...`);
}

module.exports = {
  startWatcher,
};
