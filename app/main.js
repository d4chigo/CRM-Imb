const { app, BrowserWindow } = require('electron/main')
const { shell } = require('electron')

const path = require('path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#ffffff',
    show: false,
    icon: path.join(__dirname, '..', 'client', 'public', 'imb_logo.png') // icono de la app
  })

  const targetUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

  // Diagnóstico: abrir DevTools en desarrollo
  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  // Limpieza de caché y SW para evitar ChunkLoadError por chunks antiguos en dev
  const ses = win.webContents.session
  try {
    ses.clearCache().catch(()=>{})
    ses.clearStorageData({ storages: ['appcache','serviceworkers','caches'] }).catch(()=>{})
  } catch {}

  // Eventos de diagnóstico
  win.webContents.on('did-finish-load', () => {
    win.show()
  })
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] did-fail-load:', { errorCode, errorDescription, validatedURL })
    // Reintentar una vez tras breve espera
    setTimeout(() => {
      try { win.loadURL(targetUrl) } catch {}
    }, 800)
  })

  try {
    win.loadURL(targetUrl)
  } catch (e) {
    console.error('[Electron] loadURL throw:', e?.message)
  }

  // Abrir enlaces externos (ej. Google Calendar, WhatsApp) en el navegador por defecto
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      // Permitir popups internos para flujos como la importación de Google que inician en about:blank
      if (url === 'about:blank') {
        return { action: 'allow' }
      }
      const isExternal = /^https?:\/\//i.test(url)
      const openExternallyFor = [
        'https://calendar.google.com',
        'https://wa.me',
        'https://meet.google.com',
      ]
      if (isExternal && openExternallyFor.some(prefix => url.startsWith(prefix))) {
        shell.openExternal(url)
        return { action: 'deny' }
      }
      // Por defecto, permitir (p.ej. popups del flujo OAuth de Google)
      return { action: 'allow' }
    } catch {
      return { action: 'allow' }
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})