const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const GoogleAuthService = require('../services/googleAuthService');

// Get Google OAuth URL
router.get('/auth', isAuthenticated, async (req, res) => {
  try {
    const authUrl = await GoogleAuthService.getAuthUrl(req.user.id);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).send('Error al generar la URL de autenticación');
  }
});

// OAuth callback handler
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send('Código de autorización no proporcionado');
    }

    // Parse state to get userId
    let userId;
    try {
      const stateData = JSON.parse(state);
      userId = stateData.userId;
    } catch (e) {
      console.error('Error parsing state:', e);
      return res.status(400).send('Estado de autenticación inválido');
    }

    // Exchange code for tokens
    const tokens = await GoogleAuthService.handleCallback(code);
    
    // Save tokens to database
    await GoogleAuthService.saveTokens(userId, tokens);

    // Close the popup and notify the parent window
    const successHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Autenticación exitosa</title>
          <script>
            window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, window.location.origin);
            window.close();
          </script>
        </head>
        <body>
          <p>Autenticación exitosa. Puedes cerrar esta ventana.</p>
        </body>
      </html>
    `;
    
    res.send(successHtml);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error de autenticación</title>
          <script>
            window.opener.postMessage({ 
              type: 'GOOGLE_AUTH_ERROR', 
              error: '${error.message || 'Error desconocido'}' 
            }, window.location.origin);
          </script>
        </head>
        <body>
          <p>Error al autenticar con Google: ${error.message || 'Error desconocido'}</p>
          <button onclick="window.close()">Cerrar</button>
        </body>
      </html>
    `;
    
    res.status(500).send(errorHtml);
  }
});

// Get connection status
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const tokens = await GoogleAuthService.getTokens(req.user.id);
    
    if (!tokens) {
      return res.json({ connected: false });
    }
    
    // Check which scopes are available
    const scopes = [];
    if (tokens.scope) {
      if (tokens.scope.includes('contacts')) scopes.push('contacts');
      if (tokens.scope.includes('calendar')) scopes.push('calendar');
    }
    
    res.json({
      connected: true,
      scopes,
      email: tokens.email,
      autoSync: tokens.auto_sync !== 0 // Convert to boolean
    });
  } catch (error) {
    console.error('Error checking connection status:', error);
    res.status(500).json({ error: 'Error al verificar el estado de la conexión' });
  }
});

// Update settings
router.post('/settings', isAuthenticated, async (req, res) => {
  try {
    const { syncContacts, syncCalendar, autoSync } = req.body;
    
    // Update the settings in the database
    await GoogleAuthService.updateSettings(req.user.id, {
      sync_contacts: syncContacts,
      sync_calendar: syncCalendar,
      auto_sync: autoSync
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Error al actualizar la configuración' });
  }
});

// Disconnect Google account
router.post('/disconnect', isAuthenticated, async (req, res) => {
  try {
    await GoogleAuthService.disconnect(req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google account:', error);
    res.status(500).json({ error: 'Error al desconectar la cuenta de Google' });
  }
});

module.exports = router;
