const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let mediamtxProcess;

function startMediamtx() {
  const appDir = path.dirname(app.getPath('exe'));
  const exePath = path.join(appDir, 'mediamtx.exe');
  if (!fs.existsSync(exePath)) return;

  const ymlPath = path.join(appDir, 'mediamtx.yml');
  if (!fs.existsSync(ymlPath)) {
    const ymlSrc = path.join(process.resourcesPath, 'mediamtx.yml');
    if (fs.existsSync(ymlSrc)) fs.copyFileSync(ymlSrc, ymlPath);
  }

  mediamtxProcess = spawn(exePath, [ymlPath], {
    cwd: appDir, detached: false, windowsHide: true, stdio: 'ignore'
  });
  mediamtxProcess.on('error', e => console.error(e));
}

function stopMediamtx() {
  if (mediamtxProcess) {
    try { process.kill(mediamtxProcess.pid); } catch(e) {}
    mediamtxProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 800, minHeight: 600,
    title: 'Express Wash ERP',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => { mainWindow.show(); mainWindow.maximize(); });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  startMediamtx();
  setTimeout(createWindow, 2000);
});
app.on('window-all-closed', () => { stopMediamtx(); app.quit(); });
app.on('before-quit', () => { stopMediamtx(); });
