const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

let mainWindow
let mediamtxProcess

function startMediaMTX() {
  const base = app.isPackaged ? process.resourcesPath : __dirname
  const mtxPath = path.join(base, 'mediamtx.exe')
  const mtxConfig = path.join(base, 'mediamtx.yml')

  if (!fs.existsSync(mtxPath)) {
    console.log('mediamtx.exe غير موجود في:', mtxPath)
    return
  }

  try {
    mediamtxProcess = spawn(mtxPath, [mtxConfig], {
      windowsHide: true,
      detached: false,
      cwd: base,
    })
    console.log('MediaMTX started from:', mtxPath)
    mediamtxProcess.on('error', e => console.log('MediaMTX error:', e.message))
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
  // مسح الـ cache حتى يحمّل دائماً آخر نسخة من Netlify
  app.getAppPath()
  const session = require('electron').session
  session.defaultSession.clearCache().catch(() => {})
  session.defaultSession.clearStorageData({ storages: ['serviceworkers'] }).catch(() => {})

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

  const netUrl = 'https://joyful-croissant-39de65.netlify.app'
  const localFile = app.isPackaged
    ? path.join(process.resourcesPath, 'express-erp-v4.html')
    : path.join(__dirname, 'express-erp-v4.html')

  require('net').connect(443, 'joyful-croissant-39de65.netlify.app', function() {
    this.destroy()
    // تحميل مع منع الـ cache
    mainWindow.loadURL(netUrl + '?v=' + Date.now())
  }).on('error', function() {
    mainWindow.loadFile(localFile)
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })

  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    return true
  })

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
