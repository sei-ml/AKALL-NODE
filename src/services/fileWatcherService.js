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
          console.log(`New file detected: ${filePath}, waiting for stability...`);

          // Check file size every second until it stops changing
          let lastSize = 0;
          const checkInterval = setInterval(() => {
            fs.stat(filePath, (err, newStats) => {
              if (err) {
                clearInterval(checkInterval);
                console.error(`Error checking file: ${filePath}`, err);
                return;
              }

              if (newStats.size === lastSize) {
                clearInterval(checkInterval);
                console.log(`File ${filePath} is now stable. Adding to queue...`);

                queueService.addToQueue(async () => {
                  await processNd3File(filePath, io);
                });
              } else {
                lastSize = newStats.size;
              }
            });
          }, 1000); // Check every 1 second
        }
      });
    }
  });

  console.log(`fs.watch is now monitoring for .tar.gz files in ${INCOMING_DIR}...`);
}

module.exports = {
  startWatcher,
};
