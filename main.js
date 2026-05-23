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

  // تحميل مباشر من Netlify
  mainWindow.loadURL('https://joyful-croissant-39de65.netlify.app')

  mainWindow.webContents.on('did-fail-load', () => {
    // إذا فشل الإنترنت، حمّل الملف المحلي
    const localFile = app.isPackaged
      ? path.join(process.resourcesPath, 'express-erp-v4.html')
      : path.join(__dirname, 'express-erp-v4.html')
    mainWindow.loadFile(localFile)
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
    // مسح الـ cache بعد ما تظهر النافذة
    mainWindow.webContents.session.clearCache().catch(() => {})
  })

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })

  mainWindow.webContents.session.setPermissionCheckHandler(() => true)

  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders, 'Origin': 'http://localhost' } })
  })
}

app.whenReady().then(() => {
  startMediaMTX()
  setTimeout(createWindow, 1500)
})

app.on('window-all-closed', () => { stopMediaMTX(); app.quit() })
app.on('before-quit', () => stopMediaMTX())
process.on('exit', () => stopMediaMTX())
