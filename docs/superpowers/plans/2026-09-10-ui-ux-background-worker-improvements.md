# BWP Convert v1.1.0 Implementation Plan: UI/UX, Worker Thread & Documents Storage

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade BWP Convert to v1.1.0: offload heavy XML-to-Excel conversion to a Node.js `worker_threads` background worker to prevent Windows "(Not Responding)" lockups, save all exported files to a dedicated `Documents\BWP Convert` directory, implement intuitive dual buttons ("Mở file" and "Mở thư mục"), add an auto-dismissing 5-second bottom-right Toast notification, fix drag-and-drop edge cases, and update branding to v1.1.0 with `src/images/logo.png`.

**Architecture:**
- **Worker Thread (`src/main/worker.js`)**: Spawns via Node.js `worker_threads` to run XML parsing, address normalization, and ExcelJS workbook writing in an isolated thread. The main process remains 100% responsive at 60 FPS, pumping Windows OS events without freeze.
- **Documents Storage**: Output directory defaults to `path.join(app.getPath('documents'), 'BWP Convert')`, created automatically via `fs.mkdirSync(..., { recursive: true })` with fallback to XML directory on permissions error.
- **Dual Action IPC**: `open-file` calls `shell.openPath` (launches Excel directly), `open-folder` calls `shell.showItemInFolder` (highlights file in Explorer), and `open-output-dir` opens the Documents folder.
- **UI/UX Toast & Dual Buttons**: Modular toast component mounted at bottom-right with 5000ms countdown bar and dismiss `×`. Redesigned file cards with side-by-side "Mở file" (primary) and "Mở thư mục" (outline) buttons.

**Tech Stack:** Node.js (v20+ / native test runner), Electron 34+, worker_threads, ExcelJS, fast-xml-parser.

**Spec:** [`docs/superpowers/specs/2026-09-10-ui-ux-background-worker-improvements-design.md`](file:///c:/Code/nora-convert/docs/superpowers/specs/2026-09-10-ui-ux-background-worker-improvements-design.md)

## Global Constraints
- Do not alter the 19-column schema of `tblt_vn_import.xlsx`.
- Excel cell formatting must remain Calibri 11pt non-italic.
- All address resolution must remain 100% offline without external network or API dependencies.
- Output directory must be `Documents\BWP Convert`.
- Toast notification must stay visible for exactly 5 seconds, auto-dismiss, and be dismissible via `×`.
- All tests must pass with `pnpm test` (`node --test tests/**/*.test.js`).

---

### Task 1: Version 1.1.0 & Logo Branding Configuration

**Files:**
- Modify: `package.json:1-12`
- Modify: `src/renderer/index.html:10-25`
- Test: `tests/gui.test.js:1-65`

**Interfaces:**
- Consumes: Existing package configuration & HTML header
- Produces: Version `1.1.0` in `package.json` and `v1.1.0` in `index.html`

- [ ] **Step 1: Write test verifying version 1.1.0 and logo in GUI test suite**

In `tests/gui.test.js`, add:
```javascript
test('application metadata reflects version 1.1.0 and logo branding', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
  assert.strictEqual(pkg.version, '1.1.0', 'package.json version must be 1.1.0');

  const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
  assert.ok(html.includes('v1.1.0'), 'index.html must display v1.1.0 badge');
  assert.ok(html.includes('src/images/logo.png') || html.includes('../images/logo.png'), 'index.html must reference logo.png');
  assert.ok(fs.existsSync(path.resolve('src/images/logo.png')), 'src/images/logo.png must exist');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gui.test.js`
Expected: FAIL (assertion error: package.json version is 1.0.1, expected 1.1.0)

- [ ] **Step 3: Update `package.json` and `src/renderer/index.html`**

In `package.json`:
```json
  "name": "bwp-convert",
  "version": "1.1.0",
```

In `src/renderer/index.html`:
```html
      <div class="version-badge">v1.1.0</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json src/renderer/index.html tests/gui.test.js
git commit -m "chore: bump version to 1.1.0 and update UI version badge"
```

---

### Task 2: Background Worker Thread & Dedicated Documents Storage

**Files:**
- Create: `src/main/worker.js`
- Modify: `src/main/main.js`
- Test: `tests/gui.test.js`

**Interfaces:**
- Consumes: `worker_threads.Worker`, `worker_threads.parentPort`, `worker_threads.workerData`, `src/converter/index.js`
- Produces: Non-blocking conversion execution in background thread saving to `Documents\BWP Convert`

- [ ] **Step 1: Write tests for Worker module and Documents path resolution**

In `tests/gui.test.js`, add:
```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gui.test.js`
Expected: FAIL (assertion error: src/main/worker.js does not exist)

- [ ] **Step 3: Implement `src/main/worker.js` and update `src/main/main.js`**

Create `src/main/worker.js`:
```javascript
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
```

In `src/main/main.js`:
- Import `{ Worker }` from `'worker_threads'`.
- Define `getDocumentsOutputDir()`:
```javascript
function getDocumentsOutputDir() {
  try {
    const docsDir = app.getPath('documents');
    const bwpDir = path.join(docsDir, 'BWP Convert');
    if (!fs.existsSync(bwpDir)) {
      fs.mkdirSync(bwpDir, { recursive: true });
    }
    return bwpDir;
  } catch (err) {
    console.error('Failed to create Documents/BWP Convert dir, falling back to temp:', err);
    return null;
  }
}
```
- Update `ipcMain.handle('convert-file', ...)` to instantiate a Worker thread:
```javascript
  ipcMain.handle('convert-file', async (event, filePath) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Đường dẫn file không hợp lệ.' };
      }
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `Không tìm thấy file: ${filePath}` };
      }

      const outputDir = getDocumentsOutputDir() || path.dirname(filePath);

      return new Promise((resolve) => {
        const worker = new Worker(path.join(__dirname, 'worker.js'), {
          workerData: {
            xmlPath: filePath,
            options: { outputDir }
          }
        });

        worker.on('message', (message) => {
          resolve(message);
        });

        worker.on('error', (err) => {
          resolve({
            success: false,
            error: `Lỗi worker: ${err.message}`
          });
        });

        worker.on('exit', (code) => {
          if (code !== 0) {
            resolve({
              success: false,
              error: `Worker tiến trình nền kết thúc bất thường với mã: ${code}`
            });
          }
        });
      });
    } catch (err) {
      console.error('Conversion setup error:', err);
      return { success: false, error: `${err.message}` };
    }
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/worker.js src/main/main.js tests/gui.test.js
git commit -m "feat: run conversion in worker thread and target Documents/BWP Convert"
```

---

### Task 3: Dual Action IPC Handlers (Open File & Open Folder)

**Files:**
- Modify: `src/main/main.js`
- Modify: `src/preload/preload.js`
- Test: `tests/gui.test.js`

**Interfaces:**
- Consumes: Electron `shell.openPath` and `shell.showItemInFolder`
- Produces: `window.api.openFile(filePath)`, `window.api.openFolder(filePath)`, `window.api.openOutputDir()`

- [ ] **Step 1: Write test for IPC contracts in `tests/gui.test.js`**

Add to `tests/gui.test.js`:
```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gui.test.js`
Expected: FAIL (assertion error: Preload must expose openFile)

- [ ] **Step 3: Update `src/main/main.js` and `src/preload/preload.js`**

In `src/main/main.js`:
```javascript
  ipcMain.handle('open-file', async (event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { success: false, error: 'Tệp không tồn tại.' };
      }
      const err = await shell.openPath(filePath);
      if (err) return { success: false, error: err };
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('open-folder', async (event, folderOrFilePath) => {
    try {
      if (!folderOrFilePath) {
        return { success: false, error: 'Đường dẫn không hợp lệ.' };
      }
      if (fs.existsSync(folderOrFilePath)) {
        const stat = fs.statSync(folderOrFilePath);
        if (stat.isDirectory()) {
          const err = await shell.openPath(folderOrFilePath);
          if (err) return { success: false, error: err };
        } else {
          shell.showItemInFolder(folderOrFilePath);
        }
        return { success: true };
      }
      const parentDir = path.dirname(folderOrFilePath);
      if (fs.existsSync(parentDir)) {
        const err = await shell.openPath(parentDir);
        if (err) return { success: false, error: err };
        return { success: true };
      }
      return { success: false, error: 'Thư mục hoặc tệp không tồn tại.' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('open-output-dir', async () => {
    const dir = getDocumentsOutputDir();
    if (dir && fs.existsSync(dir)) {
      const err = await shell.openPath(dir);
      if (err) return { success: false, error: err };
      return { success: true, path: dir };
    }
    return { success: false, error: 'Thư mục chưa được khởi tạo.' };
  });
```

In `src/preload/preload.js`:
```javascript
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  convertFile: (filePath) => ipcRenderer.invoke('convert-file', filePath),
  selectFile: () => ipcRenderer.invoke('select-file'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  openFolder: (folderOrFilePath) => ipcRenderer.invoke('open-folder', folderOrFilePath),
  openOutputDir: () => ipcRenderer.invoke('open-output-dir'),
  getPathForFile: (file) => (webUtils && typeof webUtils.getPathForFile === 'function' ? webUtils.getPathForFile(file) : (file ? file.path : ''))
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/main.js src/preload/preload.js tests/gui.test.js
git commit -m "feat: add open-file, open-folder, and open-output-dir IPC handlers and preload bridge"
```

---

### Task 4: UI Redesign: Dual Action Buttons & Window-Wide Drag-and-Drop

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/styles.css`
- Modify: `src/renderer/app.js`
- Test: `tests/gui.test.js`

**Interfaces:**
- Consumes: `window.api.openFile`, `window.api.openFolder`, `window.api.openOutputDir`, `window.api.getPathForFile`
- Produces: Dual buttons on VN/Foreign file cards, "Mở thư mục BWP Convert" bottom action, robust drag-and-drop

- [ ] **Step 1: Write test for dual action button DOM elements**

Add to `tests/gui.test.js`:
```javascript
test('HTML results section includes dual action buttons for both file cards and output directory button', () => {
  const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
  assert.ok(html.includes('id="open-vn-file-btn"'), 'Must have open-vn-file-btn');
  assert.ok(html.includes('id="open-vn-folder-btn"'), 'Must have open-vn-folder-btn');
  assert.ok(html.includes('id="open-foreign-file-btn"'), 'Must have open-foreign-file-btn');
  assert.ok(html.includes('id="open-foreign-folder-btn"'), 'Must have open-foreign-folder-btn');
  assert.ok(html.includes('id="open-output-dir-btn"'), 'Must have open-output-dir-btn');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gui.test.js`
Expected: FAIL (assertion error: Must have open-vn-file-btn)

- [ ] **Step 3: Update `src/renderer/index.html`, `src/renderer/styles.css`, and `src/renderer/app.js`**

In `src/renderer/index.html`:
Replace the single button in each file item with dual button group:
```html
<div class="file-item">
  <div class="file-icon xlsx-icon">...</div>
  <div class="file-info">
    <div class="file-tag vn-tag">C06 - Dịch vụ công</div>
    <div id="vn-file-name" class="file-name">tblt_vn_import_*.xlsx</div>
    <div id="vn-file-path" class="file-path"></div>
  </div>
  <div class="file-actions">
    <button type="button" id="open-vn-file-btn" class="btn btn-sm btn-primary">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
      Mở file
    </button>
    <button type="button" id="open-vn-folder-btn" class="btn btn-sm btn-outline">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      Mở thư mục
    </button>
  </div>
</div>
```
(Apply the same pattern to foreign card: `open-foreign-file-btn`, `open-foreign-folder-btn`).

In the bottom actions group:
```html
<div class="results-actions">
  <button type="button" id="open-output-dir-btn" class="btn btn-secondary">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
    Mở thư mục BWP Convert
  </button>
  <button type="button" id="reset-btn" class="btn btn-primary">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="1 4 1 10 7 10"></polyline>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </svg>
    Chuyển đổi tệp khác
  </button>
</div>
```

In `src/renderer/styles.css`:
Add styles for `.file-actions` (flex row, gap: 8px, align-items: center), adjust button sizes and icons.

In `src/renderer/app.js`:
- Wire click listeners for `open-vn-file-btn`, `open-vn-folder-btn`, `open-foreign-file-btn`, `open-foreign-folder-btn`, and `open-output-dir-btn`.
- Enhance window-wide drag-and-drop:
  - Add `dragenter` / `dragover` / `dragleave` / `drop` to `window` and `dropzone`.
  - When dragging anywhere over the window, show `drag-over` state on `dropzone`.
  - On `drop`, extract file using `window.api.getPathForFile(file)`. If dropped onto window, route to `processFile(path)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/index.html src/renderer/styles.css src/renderer/app.js tests/gui.test.js
git commit -m "feat: add dual open file and open folder buttons and enhance drag-and-drop handling"
```

---

### Task 5: 5-Second Auto-Dismissing Toast Notification

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/styles.css`
- Modify: `src/renderer/app.js`
- Test: `tests/gui.test.js`

**Interfaces:**
- Consumes: Conversion completion event in `app.js`
- Produces: Floating bottom-right toast with 5s countdown progress bar and auto-dismiss

- [ ] **Step 1: Write test for Toast markup and logic in `tests/gui.test.js`**

Add to `tests/gui.test.js`:
```javascript
test('HTML and app logic contain Toast notification component', () => {
  const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
  assert.ok(html.includes('id="toast-container"'), 'HTML must have toast-container');
  assert.ok(html.includes('id="toast-close-btn"'), 'HTML must have toast-close-btn');
  assert.ok(html.includes('id="toast-progress"'), 'HTML must have toast-progress');

  const css = fs.readFileSync(path.resolve('src/renderer/styles.css'), 'utf-8');
  assert.ok(css.includes('.toast-container'), 'CSS must style toast-container');
  assert.ok(css.includes('.toast-progress'), 'CSS must style toast progress bar');

  const js = fs.readFileSync(path.resolve('src/renderer/app.js'), 'utf-8');
  assert.ok(js.includes('showToast'), 'app.js must implement showToast function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/gui.test.js`
Expected: FAIL (assertion error: HTML must have toast-container)

- [ ] **Step 3: Implement Toast in HTML, CSS, and JS**

In `src/renderer/index.html`, right before `</body>`:
```html
  <!-- Toast Notification Container -->
  <div id="toast-container" class="toast-container hidden" role="alert" aria-live="assertive">
    <div class="toast-card">
      <div class="toast-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="toast-body">
        <div class="toast-title">Chuyển đổi hoàn tất thành công!</div>
        <div class="toast-desc">Đã lưu các tệp Excel vào thư mục Documents\BWP Convert</div>
      </div>
      <button type="button" id="toast-close-btn" class="toast-close" aria-label="Đóng thông báo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div id="toast-progress" class="toast-progress"></div>
    </div>
  </div>
```

In `src/renderer/styles.css`:
```css
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-container.hidden {
  display: none;
  opacity: 0;
  transform: translateY(16px);
}

.toast-container.show {
  display: block;
  opacity: 1;
  transform: translateY(0);
  animation: toastSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes toastSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toast-card {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  border: 1px solid #10b981;
  border-radius: 10px;
  padding: 14px 18px 18px 16px;
  box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  min-width: 320px;
  max-width: 420px;
}

.toast-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-body {
  flex: 1;
}

.toast-title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
}

.toast-desc {
  font-size: 12.5px;
  color: #64748b;
  margin-top: 2px;
}

.toast-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.toast-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: #10b981;
  width: 100%;
}

.toast-progress.running {
  animation: toastProgress 5s linear forwards;
}

@keyframes toastProgress {
  from { width: 100%; }
  to { width: 0%; }
}
```

In `src/renderer/app.js`:
Add `showToast()` function:
- Manages an active `toastTimeout` and `requestAnimationFrame` or CSS animation reset.
- Removes `.hidden`, adds `.show`, triggers `.running` on `#toast-progress`.
- Sets timeout for 5000ms to hide toast.
- Clicking `#toast-close-btn` clears the timer and hides toast immediately.
- In `processFile()`, call `showToast()` upon successful conversion.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/gui.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/index.html src/renderer/styles.css src/renderer/app.js tests/gui.test.js
git commit -m "feat: add 5-second auto-dismissing toast notification upon conversion completion"
```

---

### Task 6: Comprehensive Verification & Test Suite Pass

**Files:**
- Test: All tests in `tests/**/*.test.js`

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: All 35+ tests pass with 0 failures.

- [ ] **Step 2: Verify end-to-end conversion output path**

Run node verification test verifying converted output files exist in `Documents/BWP Convert`.

- [ ] **Step 3: Commit any final cleanup adjustments**

```bash
git add .
git commit -m "chore: final verification for BWP Convert v1.1.0"
```
