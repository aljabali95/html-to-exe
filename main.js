const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow
let mediamtxProcess

function startMediaMTX() {
  const mtxPath = path.join(__dirname, 'mediamtx.exe')
  const mtxConfig = path.join(__dirname, 'mediamtx.yml')
  try {
    mediamtxProcess = spawn(mtxPath, [mtxConfig], {
      windowsHide: true,
      detached: false,
    })
    console.log('MediaMTX started')
  } catch(e) {
    console.log('MediaMTX skipped:', e.message)
  }
}

function stopMediaMTX() {
  if(mediamtxProcess) {
    try { mediamtxProcess.kill() } catch(e) {}
    mediamtxProcess = null
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'مغسلة الاكسبريس',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    backgroundColor: '#07080E',
    show: false,
  })

  // Try to load from Netlify (online), fallback to local file
  const netUrl = 'https://joyful-croissant-39de65.netlify.app';
  require('net').connect(443, 'joyful-croissant-39de65.netlify.app', function() {
    this.destroy();
    mainWindow.loadURL(netUrl);
  }).on('error', function() {
    mainWindow.loadFile('express-erp-v4.html');
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true) // Allow all permissions including camera and media
  })

  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    return true // Allow all
  })

  // Allow all local requests (for mediamtx HLS/WebRTC)
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders, 'Origin': 'http://localhost' } })
  })
}

app.whenReady().then(() => {
  startMediaMTX()
  setTimeout(createWindow, 2000)
})

app.on('window-all-closed', () => { stopMediaMTX(); app.quit() })
app.on('before-quit', () => stopMediaMTX())
process.on('exit', () => stopMediaMTX())
