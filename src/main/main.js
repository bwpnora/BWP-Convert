const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { runConversion } = require('../converter/index');

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

function registerIpcHandlers() {
  ipcMain.handle('convert-file', async (event, filePath) => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Đường dẫn file không hợp lệ.' };
      }
      if (!fs.existsSync(filePath)) {
        return { success: false, error: `Không tìm thấy file: ${filePath}` };
      }
      const result = await runConversion(filePath);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: err.message || 'Lỗi không xác định khi chuyển đổi.' };
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
