const fs = require('fs');
const WATCH_DIR = '../watch/incoming';

console.log('Watching directory using fs.watch:', WATCH_DIR);

fs.watch(WATCH_DIR, (eventType, filename) => {
  console.log(`Event: ${eventType} on file: ${filename}`);
});
