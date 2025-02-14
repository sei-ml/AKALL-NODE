/**
 * src/services/queueService.js
 *
 * A simple in-memory queue to ensure only one job is processed at a time
 * (or limit concurrency).
 */

let processing = false;
const jobQueue = [];

function addToQueue(jobFn) {
  jobQueue.push(jobFn);
  processNext();
}

async function processNext() {
  if (processing) return;       
  if (jobQueue.length === 0) return; 

  processing = true;
  const jobFn = jobQueue.shift();
  try {
    await jobFn(); 
  } catch (err) {
    console.error('Queue job error:', err);
  } finally {
    processing = false;
    processNext(); 
  }
}

module.exports = {
  addToQueue,
};
