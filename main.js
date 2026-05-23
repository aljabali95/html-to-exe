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

  // فحص الاتصال بـ Netlify
  const https = require('https')
  https.get(netUrl, (res) => {
    console.log('Netlify status:', res.statusCode)
    if(res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302) {
      mainWindow.loadURL(netUrl)
    } else {
      console.log('Netlify returned:', res.statusCode, '— loading local file')
      mainWindow.loadFile(localFile)
    }
  }).on('error', (e) => {
    console.log('No internet — loading local file:', e.message)
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
