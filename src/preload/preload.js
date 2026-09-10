const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  convertFile: (filePath) => ipcRenderer.invoke('convert-file', filePath),
  selectFile: () => ipcRenderer.invoke('select-file'),
  openFolder: (folderOrFilePath) => ipcRenderer.invoke('open-folder', folderOrFilePath),
  getPathForFile: (file) => (webUtils && typeof webUtils.getPathForFile === 'function' ? webUtils.getPathForFile(file) : (file ? file.path : ''))
});

