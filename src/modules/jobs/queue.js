/**
 * Lightweight In-Memory Background Job Queue
 * Implements retries with exponential backoff and failure alerts.
 */

const queue = [];
let isProcessing = false;

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dispatch a job to the background queue.
 * @param {string} jobName Name of the job for logging
 * @param {function} executeFn Async function to execute
 */
function dispatch(jobName, executeFn) {
  queue.push({
    jobName,
    executeFn,
    retries: 0
  });

  if (!isProcessing) {
    processQueue();
  }
}

async function processQueue() {
  if (queue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const job = queue.shift(); // FIFO

  try {
    await job.executeFn();
    console.log(`[JOB SUCCESS] ${job.jobName} completed successfully.`);
  } catch (error) {
    job.retries += 1;

    if (job.retries <= MAX_RETRIES) {
      const backoff = BASE_BACKOFF_MS * Math.pow(2, job.retries - 1);
      console.warn(`[JOB FAILED] ${job.jobName} failed. Retrying (${job.retries}/${MAX_RETRIES}) in ${backoff}ms... Error: ${error.message}`);
      
      // Re-queue the job with a delay
      setTimeout(() => {
        queue.push(job);
        if (!isProcessing) processQueue();
      }, backoff);
    } else {
      // Failure Alert (Requirement: Failure Alert on max retries)
      console.error(`[CRITICAL FAILURE ALERT] Background job ${job.jobName} permanently failed after ${MAX_RETRIES} retries. Error: ${error.message}`);
    }
  }

  // Process next immediately (without blocking the thread, use setImmediate to yield to event loop)
  setImmediate(processQueue);
}

module.exports = { dispatch };
