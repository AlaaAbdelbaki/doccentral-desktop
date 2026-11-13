// Render an SVG icon to a square PNG with a transparent background, using
// the project's own Electron (no extra image tooling needed).
//
//   npx electron scripts/render-icon.js build/icon.svg build/icon.png [size]
//
// electron-builder turns build/icon.png into the Windows .ico (installer,
// shortcuts, taskbar). Use 1024 so every generated size stays sharp.
//
// The SVG is drawn onto a <canvas> and exported with toDataURL rather than
// screen-captured: exact pixel size and real transparency regardless of the
// display's DPI scaling or GPU compositor.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// argv: [electron, <this script>, src, out, size?]
const args = process.argv.slice(process.argv.findIndex((a) => a.endsWith('render-icon.js')) + 1);
const [src, out, sizeArg] = args;
const size = Number(sizeArg) || 1024;

app.whenReady().then(async () => {
  try {
    if (!src || !out) throw new Error('usage: electron scripts/render-icon.js <in.svg> <out.png> [size]');
    const svgDataUrl = `data:image/svg+xml;base64,${fs.readFileSync(path.resolve(src)).toString('base64')}`;
    const win = new BrowserWindow({ show: false });
    await win.loadURL('data:text/html,<html><body></body></html>');
    const pngDataUrl = await win.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = c.height = ${size};
          c.getContext('2d').drawImage(img, 0, 0, ${size}, ${size});
          resolve(c.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('SVG failed to load'));
        img.src = ${JSON.stringify(svgDataUrl)};
      })`);
    fs.writeFileSync(path.resolve(out), Buffer.from(pngDataUrl.split(',')[1], 'base64'));
    console.log(`wrote ${out} (${size}x${size})`);
    app.exit(0);
  } catch (e) {
    console.error(e);
    app.exit(1);
  }
});
