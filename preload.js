const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electruss', {
  app: {
    getMetadata: () => ipcRenderer.invoke('app:get-metadata'),
  },
});
