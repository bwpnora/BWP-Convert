const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');

// Polyfill: electron-builder bundles readable-stream v2 which lacks Symbol.asyncIterator.
// ExcelJS needs it for internal SAX stream parsing. Copy from Node.js built-in stream.
try {
  const { Readable: nativeReadable } = require('stream');
  const rs = require('readable-stream');
  if (rs && rs.Readable && typeof rs.Readable.prototype[Symbol.asyncIterator] !== 'function') {
    rs.Readable.prototype[Symbol.asyncIterator] = nativeReadable.prototype[Symbol.asyncIterator];
  }
} catch (_) {}

// Background worker thread executes runConversion in src/main/worker.js

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../images/logo.png');
  mainWindow = new BrowserWindow({
    title: 'BWP Convert - Chuyển đổi báo cáo lưu trú Opera PMS',
    width: 840,
    height: 680,
    minWidth: 700,
    minHeight: 550,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

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

function registerIpcHandlers() {
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

  ipcMain.handle('select-file', async () => {
    try {
      const window = BrowserWindow.getFocusedWindow() || mainWindow;
      const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        title: 'Chọn file báo cáo lưu trú XML từ Opera PMS',
        properties: ['openFile'],
        filters: [
          { name: 'XML Files', extensions: ['xml', 'XML'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      if (canceled || !filePaths || filePaths.length === 0) {
        return null;
      }
      return filePaths[0];
    } catch (err) {
      console.error('Error selecting file:', err);
      return null;
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

      // Check if parent directory exists
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
}

// App lifecycle
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
