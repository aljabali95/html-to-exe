const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')
const { spawn } = require('child_process')

let mainWindow
let mediamtxProcess
let localServer

function startLocalServer(htmlPath) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      fs.createReadStream(htmlPath).pipe(res)
    })
    server.listen(3131, '127.0.0.1', () => {
      console.log('Local server on http://127.0.0.1:3131')
      resolve(server)
    })
    server.on('error', () => resolve(null))
  })
}

function startMediaMTX() {
  const base = app.isPackaged ? process.resourcesPath : __dirname
  const mtxPath = path.join(base, 'mediamtx.exe')
  const mtxConfig = path.join(base, 'mediamtx.yml')
  if (!fs.existsSync(mtxPath)) { console.log('mediamtx.exe غير موجود'); return }
  try {
    mediamtxProcess = spawn(mtxPath, [mtxConfig], { windowsHide: true, detached: false, cwd: base })
    mediamtxProcess.on('error', e => console.log('MediaMTX error:', e.message))
  } catch(e) { console.log('MediaMTX skipped:', e.message) }
}

function stopMediaMTX() {
  if(mediamtxProcess) { try { mediamtxProcess.kill() } catch(e) {} mediamtxProcess = null }
}

async function createWindow() {
  const htmlFile = app.isPackaged
    ? path.join(process.resourcesPath, 'index.html')
    : path.join(__dirname, 'index.html')

  localServer = await startLocalServer(htmlFile)

  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    title: 'مغسلة الاكسبريس',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      webSecurity: false, allowRunningInsecureContent: true,
    },
    backgroundColor: '#07080E', show: false,
  })

  // HTTP محلي — يحل مشكلة Mixed Content مع mediamtx
  mainWindow.loadURL('http://127.0.0.1:3131')

  mainWindow.once('ready-to-show', () => { mainWindow.show(); mainWindow.maximize() })

  mainWindow.webContents.session.setPermissionRequestHandler((wc, permission, cb) => cb(true))
  mainWindow.webContents.session.setPermissionCheckHandler(() => true)
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, cb) => {
    cb({ requestHeaders: { ...details.requestHeaders, 'Origin': 'http://localhost' } })
  })
}

app.whenReady().then(() => {
  startMediaMTX()
  setTimeout(createWindow, 1500)
})

app.on('window-all-closed', () => {
  stopMediaMTX()
  if(localServer) localServer.close()
  app.quit()
})
app.on('before-quit', () => { stopMediaMTX(); if(localServer) localServer.close() })
process.on('exit', () => stopMediaMTX())
