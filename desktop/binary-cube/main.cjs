'use strict';

const path = require('node:path');
const { app, BrowserWindow, shell } = require('electron');

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 920,
    minHeight: 720,
    backgroundColor: '#0e1219',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.removeMenu();
  window.once('ready-to-show', () => window.show());
  window.loadFile(path.join(__dirname, 'app', 'index.html'));

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file:')) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
