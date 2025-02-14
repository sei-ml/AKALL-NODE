/**
 * src/utils/tarUtils.js
 *
 * Utility for decompressing .tar.gz archives using the 'tar' package.
 */

const tar = require('tar');
const fs = require('fs');

async function decompressTarGz(source, destination) {
  // Make sure destination exists
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  return tar.x({
    file: source,
    cwd: destination,
  });
}

module.exports = {
  decompressTarGz,
};
