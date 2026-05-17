const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let mediamtxProcess;

// مجلد الـ EXE نفسه
function getAppDir() {
  return path.dirname(app.getPath('exe'));
}

function startMediamtx() {
  const appDir = getAppDir();

  // ابحث عن mediamtx.exe بجانب الـ EXE أولاً
  let exePath = path.join(appDir, 'mediamtx.exe');
  if (!fs.existsSync(exePath)) {
    // إذا مش موجود جرب جوا resources
    exePath = path.join(process.resourcesPath, 'mediamtx.exe');
  }

  if (!fs.existsSync(exePath)) {
    console.log('mediamtx.exe not found, skipping...');
    return;
  }

  // mediamtx.yml بجانب الـ EXE
  const ymlPath = path.join(appDir, 'mediamtx.yml');

  // إذا ما فيه yml بجانب EXE، انسخه من resources
  if (!fs.existsSync(ymlPath)) {
    const ymlSrc = path.join(process.resourcesPath, 'mediamtx.yml');
    if (fs.existsSync(ymlSrc)) {
      fs.copyFileSync(ymlSrc, ymlPath);
    }
  }

  mediamtxProcess = spawn(exePath, [ymlPath], {
    cwd: appDir,
    detached: false,
    windowsHide: true,
    stdio: 'ignore'
  });

  mediamtxProcess.on('error', (err) => {
    console.error('mediamtx error:', err);
  });

  console.log('mediamtx started, PID:', mediamtxProcess.pid);
}

function stopMediamtx() {
  if (mediamtxProcess) {
    try { process.kill(mediamtxProcess.pid); } catch (e) {}
    mediamtxProcess = null;
  }
}

function createWindow() {
  const appDir = getAppDir();

  // ابحث عن index.html بجانب الـ EXE أولاً، وإلا جوا app.asar
  let indexPath = path.join(appDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    indexPath = path.join(__dirname, 'index.html');
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'مغسلة الاكسبريس — ERP',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  startMediamtx();
  setTimeout(createWindow, 2000);
});

app.on('window-all-closed', () => {
  stopMediamtx();
  app.quit();
});

app.on('before-quit', () => {
  stopMediamtx();
});
