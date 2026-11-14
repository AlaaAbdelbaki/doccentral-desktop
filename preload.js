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
  report: {
    device: () => ipcRenderer.invoke('report:device'),
    logs: () => ipcRenderer.invoke('report:logs'),
    log: (level, message) => ipcRenderer.invoke('report:log', level, message),
    screenshot: () => ipcRenderer.invoke('report:screenshot'),
    pickFiles: () => ipcRenderer.invoke('report:pickFiles'),
    outbox: {
      put: (report) => ipcRenderer.invoke('report:outboxPut', report),
      list: () => ipcRenderer.invoke('report:outboxList'),
      remove: (id) => ipcRenderer.invoke('report:outboxRemove', id),
    },
  },
});
