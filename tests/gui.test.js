const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Electron GUI source files exist and adhere to structure requirements', () => {
  const mainPath = path.resolve('src/main/main.js');
  const preloadPath = path.resolve('src/preload/preload.js');
  const htmlPath = path.resolve('src/renderer/index.html');
  const cssPath = path.resolve('src/renderer/styles.css');
  const jsPath = path.resolve('src/renderer/app.js');

  assert.ok(fs.existsSync(mainPath), 'src/main/main.js must exist');
  assert.ok(fs.existsSync(preloadPath), 'src/preload/preload.js must exist');
  assert.ok(fs.existsSync(htmlPath), 'src/renderer/index.html must exist');
  assert.ok(fs.existsSync(cssPath), 'src/renderer/styles.css must exist');
  assert.ok(fs.existsSync(jsPath), 'src/renderer/app.js must exist');

  // Verify Main Process configuration & security
  const mainContent = fs.readFileSync(mainPath, 'utf-8');
  assert.ok(mainContent.includes("contextIsolation: true"), 'Main process must enforce contextIsolation: true');
  assert.ok(mainContent.includes("nodeIntegration: false"), 'Main process must enforce nodeIntegration: false');
  assert.ok(mainContent.includes("preload"), 'Main process must specify preload script');
  assert.ok(mainContent.includes("convert-file"), 'Main process must handle convert-file IPC');
  assert.ok(mainContent.includes("select-file"), 'Main process must handle select-file IPC');
  assert.ok(mainContent.includes("open-folder"), 'Main process must handle open-folder IPC');
  assert.ok(mainContent.includes("runConversion"), 'Main process must call runConversion');

  // Verify Preload Bridge
  const preloadContent = fs.readFileSync(preloadPath, 'utf-8');
  assert.ok(preloadContent.includes("contextBridge.exposeInMainWorld"), 'Preload must use contextBridge');
  assert.ok(preloadContent.includes("convertFile"), 'Preload must expose convertFile');
  assert.ok(preloadContent.includes("selectFile"), 'Preload must expose selectFile');
  assert.ok(preloadContent.includes("openFolder"), 'Preload must expose openFolder');

  // Verify Renderer HTML elements
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  assert.ok(htmlContent.includes('id="dropzone"'), 'HTML must have dropzone');
  assert.ok(htmlContent.includes('id="browse-btn"'), 'HTML must have browse button');
  assert.ok(htmlContent.includes('id="loading-section"'), 'HTML must have loading section');
  assert.ok(htmlContent.includes('id="results-section"'), 'HTML must have results section');
  assert.ok(htmlContent.includes('id="error-section"'), 'HTML must have error section');
  assert.ok(htmlContent.includes('id="open-folder-btn"'), 'HTML must have open folder button');
  assert.ok(htmlContent.includes('id="reset-btn"'), 'HTML must have reset/convert another file button');
  assert.ok(htmlContent.includes('tblt_vn_import'), 'HTML must reference tblt_vn_import template');
  assert.ok(htmlContent.includes('dklt_nc_ngoai'), 'HTML must reference dklt_nc_ngoai template');
  assert.ok(htmlContent.includes('Copyright @ 2026 - Code by IT Leon') || htmlContent.includes('Copyright @ 2026 - Website by IT Leon'), 'HTML must have copyright footer');
  assert.ok(htmlContent.includes('BWP Convert'), 'HTML must have BWP Convert title');
  assert.ok(htmlContent.includes('logo.png'), 'HTML must reference logo.png');
  assert.ok(fs.existsSync(path.resolve('src/images/logo.png')), 'src/images/logo.png must exist');

  // Verify Renderer CSS & JS
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  assert.ok(cssContent.includes('.dropzone'), 'CSS must style dropzone');
  assert.ok(cssContent.includes('.drag-over'), 'CSS must provide visual feedback for drag-over');

  const appJsContent = fs.readFileSync(jsPath, 'utf-8');
  assert.ok(appJsContent.includes('window.api.convertFile'), 'App JS must call window.api.convertFile');
  assert.ok(appJsContent.includes('window.api.selectFile'), 'App JS must call window.api.selectFile');
  assert.ok(appJsContent.includes('dropzone'), 'App JS must manage dropzone');
});

test('preload script exposes getPathForFile API contract', () => {
  const preloadPath = path.resolve('src/preload/preload.js');
  const preloadContent = fs.readFileSync(preloadPath, 'utf-8');
  assert.ok(preloadContent.includes('getPathForFile'), 'Preload must expose getPathForFile');
  assert.ok(preloadContent.includes('webUtils'), 'Preload must require webUtils from electron');
});

test('HTML template, styles, and app logic contain address preview section', () => {
  const html = fs.readFileSync('src/renderer/index.html', 'utf-8');
  assert.ok(html.includes('address-preview-section'), 'Must contain address-preview-section');
  assert.ok(html.includes('address-preview-table'), 'Must render preview table');
  assert.ok(html.includes('address-preview-tbody'), 'Must render preview tbody');

  const css = fs.readFileSync('src/renderer/styles.css', 'utf-8');
  assert.ok(css.includes('.badge-exact'), 'CSS must style badge-exact');
  assert.ok(css.includes('.badge-district'), 'CSS must style badge-district');

  const js = fs.readFileSync('src/renderer/app.js', 'utf-8');
  assert.ok(js.includes('renderAddressPreview'), 'app.js must implement renderAddressPreview');
});

test('application metadata reflects version 1.1.0 and logo branding', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
  assert.strictEqual(pkg.version, '1.1.0', 'package.json version must be 1.1.0');

  const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
  assert.ok(html.includes('v1.1.0'), 'index.html must display v1.1.0 badge');
  assert.ok(html.includes('src/images/logo.png') || html.includes('../images/logo.png'), 'index.html must reference logo.png');
  assert.ok(fs.existsSync(path.resolve('src/images/logo.png')), 'src/images/logo.png must exist');
});

test('worker script exists and defines background conversion runner', () => {
  const workerPath = path.resolve('src/main/worker.js');
  assert.ok(fs.existsSync(workerPath), 'src/main/worker.js must exist');
  const content = fs.readFileSync(workerPath, 'utf-8');
  assert.ok(content.includes('worker_threads'), 'Worker must use worker_threads');
  assert.ok(content.includes('runConversion'), 'Worker must invoke runConversion');
  assert.ok(content.includes('parentPort.postMessage'), 'Worker must post results via parentPort');
});

test('main process configures Worker execution and Documents/BWP Convert directory', () => {
  const mainContent = fs.readFileSync(path.resolve('src/main/main.js'), 'utf-8');
  assert.ok(mainContent.includes('worker_threads'), 'main.js must import worker_threads');
  assert.ok(mainContent.includes('BWP Convert'), 'main.js must reference BWP Convert folder');
  assert.ok(mainContent.includes("getPath('documents')"), 'main.js must resolve documents path');
});

test('preload and main process expose openFile, openFolder, and openOutputDir contracts', () => {
  const preloadContent = fs.readFileSync(path.resolve('src/preload/preload.js'), 'utf-8');
  assert.ok(preloadContent.includes('openFile'), 'Preload must expose openFile');
  assert.ok(preloadContent.includes('openFolder'), 'Preload must expose openFolder');
  assert.ok(preloadContent.includes('openOutputDir'), 'Preload must expose openOutputDir');

  const mainContent = fs.readFileSync(path.resolve('src/main/main.js'), 'utf-8');
  assert.ok(mainContent.includes("'open-file'"), 'Main must handle open-file IPC');
  assert.ok(mainContent.includes("'open-folder'"), 'Main must handle open-folder IPC');
  assert.ok(mainContent.includes("'open-output-dir'"), 'Main must handle open-output-dir IPC');
});



