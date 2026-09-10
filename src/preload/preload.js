const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  convertFile: (filePath) => ipcRenderer.invoke('convert-file', filePath),
  selectFile: () => ipcRenderer.invoke('select-file'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  openFolder: (folderOrFilePath) => ipcRenderer.invoke('open-folder', folderOrFilePath),
  openOutputDir: () => ipcRenderer.invoke('open-output-dir'),
  getPathForFile: (file) => (webUtils && typeof webUtils.getPathForFile === 'function' ? webUtils.getPathForFile(file) : (file ? file.path : ''))
});


