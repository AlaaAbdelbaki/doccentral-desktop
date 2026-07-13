const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dc', {
  db: {
    all: (sql, params) => ipcRenderer.invoke('db:all', sql, params),
    get: (sql, params) => ipcRenderer.invoke('db:get', sql, params),
    run: (sql, params) => ipcRenderer.invoke('db:run', sql, params),
  },
  files: {
    pick: () => ipcRenderer.invoke('files:pick'),
    import: (srcPath) => ipcRenderer.invoke('files:import', srcPath),
    open: (storagePath) => ipcRenderer.invoke('files:open', storagePath),
    dataUrl: (storagePath) => ipcRenderer.invoke('files:dataUrl', storagePath),
  },
  app: {
    info: () => ipcRenderer.invoke('app:info'),
    openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  },
});
