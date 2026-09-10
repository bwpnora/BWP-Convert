const { parentPort, workerData } = require('worker_threads');
const { runConversion } = require('../converter/index');

async function execute() {
  try {
    const { xmlPath, options } = workerData;
    const result = await runConversion(xmlPath, options);
    parentPort.postMessage({ success: true, ...result });
  } catch (err) {
    parentPort.postMessage({
      success: false,
      error: `${err.message}${err.stack ? '\n\n' + err.stack : ''}`
    });
  }
}

execute();
