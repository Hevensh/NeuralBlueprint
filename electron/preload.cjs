const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('neuralBlueprintApp', {
  quit: () => ipcRenderer.invoke('app:quit'),
});
