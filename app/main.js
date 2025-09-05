const { app, BrowserWindow } = require('electron/main')
const { shell } = require('electron')

const path = require('path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: path.join(__dirname, '..', 'client', 'public', 'imb_logo.png') // icono de la app
  })

  win.loadURL('http://localhost:3000')

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