const { contextBridge, ipcRenderer } = require('electron');

// Main returns { ok, value } or { ok: false, error } (support.wrapIpc).
// Turn failures back into a normal Error with the original message.
const call = async (channel, ...args) => {
  const res = await ipcRenderer.invoke(channel, ...args);
  if (res && res.ok === false) {
    const err = new Error(res.error.message);
    err.code = res.error.code;
    err.channel = channel;
    throw err;
  }
  return res ? res.value : res;
};

contextBridge.exposeInMainWorld('dc', {
  db: {
    all: (sql, params) => call('db:all', sql, params),
    get: (sql, params) => call('db:get', sql, params),
    run: (sql, params) => call('db:run', sql, params),
  },
  files: {
    pick: () => call('files:pick'),
    import: (srcPath) => call('files:import', srcPath),
    open: (storagePath) => call('files:open', storagePath),
    dataUrl: (storagePath) => call('files:dataUrl', storagePath),
  },
  app: {
    info: () => call('app:info'),
    openExternal: (url) => call('app:openExternal', url),
  },
  report: {
    device: () => call('report:device'),
    logs: () => call('report:logs'),
    log: (level, message) => call('report:log', level, message),
    screenshot: () => call('report:screenshot'),
    pickFiles: () => call('report:pickFiles'),
    outbox: {
      put: (report) => call('report:outboxPut', report),
      list: () => call('report:outboxList'),
      remove: (id) => call('report:outboxRemove', id),
    },
  },
});
