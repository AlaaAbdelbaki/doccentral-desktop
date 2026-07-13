const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('./db');

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.bmp': 'image/bmp', '.pdf': 'application/pdf',
};

const attachmentsDir = () => {
  const dir = path.join(app.getPath('userData'), 'attachments');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

function registerIpc(win) {
  ipcMain.handle('db:all', (_e, sql, params) => db.all(sql, params || []));
  ipcMain.handle('db:get', (_e, sql, params) => db.get(sql, params || []));
  ipcMain.handle('db:run', (_e, sql, params) => db.run(sql, params || []));

  ipcMain.handle('files:pick', async () => {
    const res = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [
        { name: 'Images & PDF', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'pdf'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (res.canceled || !res.filePaths.length) return null;
    const p = res.filePaths[0];
    const stat = fs.statSync(p);
    return { path: p, name: path.basename(p), size: stat.size };
  });

  ipcMain.handle('files:import', (_e, srcPath) => {
    const name = path.basename(srcPath);
    const dest = path.join(attachmentsDir(), `${crypto.randomUUID()}-${name}`);
    fs.copyFileSync(srcPath, dest);
    return { storagePath: dest, size: fs.statSync(dest).size, name };
  });

  ipcMain.handle('files:open', (_e, storagePath) => shell.openPath(storagePath));

  ipcMain.handle('files:dataUrl', (_e, storagePath) => {
    try {
      const ext = path.extname(storagePath).toLowerCase();
      const mime = MIME[ext];
      if (!mime || !mime.startsWith('image/')) return null;
      const buf = fs.readFileSync(storagePath);
      if (buf.length > 15 * 1024 * 1024) return null;
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  });

  ipcMain.handle('app:info', () => ({
    devAutologin: !!process.env.DOC_DEV_AUTOLOGIN,
    testLogin: process.env.DOC_TEST_LOGIN || null,
    initialPage: process.env.DOC_PAGE || null,
    userData: app.getPath('userData'),
  }));
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#F7F9FC',
    title: 'DocCentral',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  registerIpc(win);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Headless self-check hooks:
  //   DOC_CONSOLE_LOG=<file>  append renderer console messages
  //   DOC_SCRIPT=<file.js>    run a DOM script after load (drives the UI)
  //   DOC_SCREENSHOT=<file>   capture the page and quit
  if (process.env.DOC_CONSOLE_LOG) {
    win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      fs.appendFileSync(process.env.DOC_CONSOLE_LOG, `[${level}] ${message} (${sourceId}:${line})\n`);
    });
  }
  const shot = process.env.DOC_SCREENSHOT;
  if (shot) {
    win.webContents.once('did-finish-load', async () => {
      await new Promise((r) => setTimeout(r, Number(process.env.DOC_SCREENSHOT_DELAY || 2500)));
      if (process.env.DOC_SCRIPT) {
        let result;
        try {
          result = await win.webContents.executeJavaScript(fs.readFileSync(process.env.DOC_SCRIPT, 'utf8'));
        } catch (err) {
          result = 'SCRIPT ERROR: ' + (err && err.message ? err.message : err);
        }
        fs.writeFileSync(`${shot}.result.txt`, String(result));
      }
      const img = await win.webContents.capturePage();
      fs.writeFileSync(shot, img.toPNG());
      db.save();
      app.quit();
    });
  }
};

app.whenReady().then(async () => {
  const dataDir = process.env.DOC_DATA_DIR || app.getPath('userData');
  fs.mkdirSync(dataDir, { recursive: true });
  if (process.env.DOC_DATA_DIR) app.setPath('userData', dataDir);
  await db.open(dataDir);
  createWindow();
});

app.on('before-quit', () => db.save());
app.on('window-all-closed', () => app.quit());
