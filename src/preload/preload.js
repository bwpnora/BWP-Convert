const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  convertFile: (filePath) => ipcRenderer.invoke('convert-file', filePath),
  selectFile: () => ipcRenderer.invoke('select-file'),
  openFolder: (folderOrFilePath) => ipcRenderer.invoke('open-folder', folderOrFilePath)
});
