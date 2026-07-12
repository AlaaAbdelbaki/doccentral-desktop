const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#F7F9FC',
    title: 'DocCentral',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Headless self-check: DOC_SCREENSHOT=<path> captures the page and quits.
  const shot = process.env.DOC_SCREENSHOT;
  if (shot) {
    win.webContents.once('did-finish-load', async () => {
      await new Promise((r) => setTimeout(r, 1500));
      const img = await win.webContents.capturePage();
      fs.writeFileSync(shot, img.toPNG());
      app.quit();
    });
  }
};

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
