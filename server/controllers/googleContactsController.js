const { google } = require('googleapis');
const { executeQuery } = require('../config/database');
const GoogleSyncService = require('../services/googleSyncService');

// Nota: Para una implementación productiva, guarda tokens por usuario en BD.
// Aquí usamos almacenamiento en memoria del proceso como paso intermedio.
let savedTokens = null;

// Variables de entorno esperadas
// GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error('Faltan variables de entorno de Google (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI)');
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

class GoogleContactsController {
  static authUrl(req, res) {
    try {
      console.log('[googleImport] Generating auth URL for user:', req.user?.id);
      const oauth2Client = getOAuthClient();
      const scopes = [
        'https://www.googleapis.com/auth/contacts.readonly',
        'https://www.googleapis.com/auth/contacts',
        'https://www.googleapis.com/auth/userinfo.profile',
        // Para leer "Other Contacts" (sugeridos de Gmail)
        'https://www.googleapis.com/auth/contacts.other.readonly',
        // Calendar events (crear y listar)
        'https://www.googleapis.com/auth/calendar.events'
      ];

      // Incluir el id de usuario en state para persistir tokens en callback
      const userId = (req.user && (req.user.id || req.user.userId)) ? (req.user.id || req.user.userId) : null;
      if (!userId) {
        console.error('[googleImport] No user ID found in request');
        return res.status(401).json({ success: false, message: 'Usuario no identificado' });
      }
      
      const statePayload = encodeURIComponent(JSON.stringify({ popup: true, uid: userId }));
      const url = oauth2Client.generateAuthUrl({ 
        access_type: 'offline', 
        scope: scopes, 
        prompt: 'consent', 
        state: statePayload,
        include_granted_scopes: true
      });
      
      console.log('[googleImport] Generated auth URL for user:', userId);
      res.json({ success: true, url });
    } catch (e) {
      console.error('[googleImport] Error generating URL:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async callback(req, res) {
    try {
      // Manejo de errores que Google devuelve directamente (usuario canceló o app no autorizada)
      if (req.query.error) {
        const { error, error_description } = req.query;
        console.warn('[googleImport] Callback con error de Google:', error, error_description || '');
        const state = req.query.state;
        if (state === 'popup') {
          return res.send(`<!doctype html><html><head><title>Importación cancelada</title></head><body style="font-family:sans-serif;text-align:center;padding:20px;">
            <h3>Importación cancelada</h3>
            <p>${error_description || 'El usuario canceló la autorización'}</p>
            <script>try{ if (window.opener) { window.opener.postMessage({ type: 'google-import-error', error: ${JSON.stringify(error)}, description: ${JSON.stringify(error_description || '')} }, '*'); } }catch(_){} setTimeout(()=>window.close(), 800);</script>
            </body></html>`);
        }
        throw new Error(error_description || `Error de autorización: ${error}`);
      }

      const { code } = req.query;
      const state = JSON.parse(decodeURIComponent(req.query.state || '{}'));
      const userId = state.uid || (req.user && (req.user.id || req.user.userId));
      
      if (!userId) {
        throw new Error('No se pudo identificar al usuario para guardar los tokens');
      }

      const oauth2Client = getOAuthClient();
      const { tokens } = await oauth2Client.getToken(code);
      
      // Guardar tokens en la base de datos
      await executeQuery(
        `INSERT INTO google_tokens 
         (usuario_id, access_token, refresh_token, scope, token_type, expiry_date, sync_enabled, last_sync)
         VALUES (?, ?, ?, ?, ?, ?, TRUE, NULL)
         ON DUPLICATE KEY UPDATE
         access_token = VALUES(access_token),
         refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
         scope = VALUES(scope),
         token_type = VALUES(token_type),
         expiry_date = VALUES(expiry_date),
         sync_enabled = TRUE,
         updated_at = NOW()`,
        [
          userId,
          tokens.access_token,
          tokens.refresh_token || null,
          tokens.scope,
          tokens.token_type,
          tokens.expiry_date || null
        ]
      );

      // Sincronizar contactos automáticamente
      let syncResult = { synced: 0, total: 0 };
      try {
        console.log('[googleImport] Starting automatic sync for user:', userId);
        syncResult = await GoogleSyncService.syncGoogleToCRM(userId);
        console.log(`[googleImport] Automatic sync completed: ${syncResult.synced} of ${syncResult.total} contacts synced`);
      } catch (syncError) {
        console.error('[googleImport] Error in automatic sync:', syncError.message || syncError);
        // Don't fail the callback completely, just log the error
        syncResult = { synced: 0, total: 0, error: syncError.message || 'Error desconocido en sincronización' };
      }

      // Si se abrió en popup, notificar al opener y cerrar
      if (state.popup) {
        const imported = Number(syncResult.synced || 0);
        const skipped = Math.max(0, Number(syncResult.total || 0) - imported);
        return res.send(`<!doctype html><html><head><title>Autorización exitosa</title></head><body style="font-family:sans-serif;text-align:center;padding:20px;">
          <h3>¡Conexión exitosa con Google Contacts!</h3>
          <p>Esta ventana se cerrará automáticamente…</p>
          <script>
            try {
              var payload = { type: 'google-import-result', imported: ${'${imported}'}, skipped: ${'${skipped}'}, ts: Date.now() };
              try { localStorage.setItem('googleImportResult', JSON.stringify(payload)); } catch(_){ }
              if (window.opener) { window.opener.postMessage(payload, '*'); }
            } catch (_e) { /* ignore */ }
            // Cerrar rápido; algunos navegadores requieren un pequeño retardo
            setTimeout(function(){ window.close(); }, 300);
          </script>
          </body></html>`);
      }

      res.json({ success: true, message: 'Autenticación exitosa', data: syncResult });
    } catch (e) {
      console.error('[googleImport] Error en callback:', e);
      res.status(500).send(`<h3>Error</h3><p>${e.message}</p>`);
    }
  }

  static async syncContacts(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }

      const result = await GoogleSyncService.syncGoogleToCRM(req.user.id);
      res.json({ 
        success: true, 
        message: `Sincronización completada: ${result.synced} de ${result.total} contactos actualizados`,
        data: result
      });
    } catch (e) {
      console.error('[googleImport] Error en sincronización manual:', e);
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async getSyncStatus(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }

      const [tokens] = await executeQuery(
        'SELECT sync_enabled, last_sync FROM google_tokens WHERE usuario_id = ?',
        [req.user.id]
      );

      if (!tokens) {
        return res.json({ 
          success: true, 
          data: { 
            connected: false,
            syncEnabled: false,
            lastSync: null
          } 
        });
      }

      res.json({ 
        success: true, 
        data: { 
          connected: true,
          syncEnabled: tokens.sync_enabled,
          lastSync: tokens.last_sync
        } 
      });
    } catch (e) {
      console.error('[googleImport] Error obteniendo estado de sincronización:', e);
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async createGoogleContact(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }

      const contactId = req.params.id;
      const [contact] = await executeQuery('SELECT * FROM contacto WHERE id = ?', [contactId]);
      
      if (!contact) {
        return res.status(404).json({ success: false, message: 'Contacto no encontrado' });
      }

      const result = await GoogleSyncService.syncContactToGoogle(req.user.id, contact);
      res.json({ success: true, data: result });
    } catch (e) {
      console.error('[googleImport] Error creando contacto en Google:', e);
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // Preview: muestra conteos y muestra de contactos de Google antes de persistir
  static async preview(req, res) {
    try {
      if (!req.user) return res.status(401).json({ success:false, message:'No autenticado' });
      const auth = await GoogleSyncService.getAuthClient(req.user.id);
      if (!auth) return res.status(400).json({ success:false, message:'No conectado a Google' });
      const people = google.people({ version: 'v1', auth });
      const [connResp, otherResp] = await Promise.all([
        people.people.connections.list({ resourceName: 'people/me', pageSize: 50, personFields: 'names,emailAddresses,phoneNumbers,organizations,userDefined,biographies,metadata' }),
        people.otherContacts.list({ pageSize: 50, readMask: 'names,emailAddresses,phoneNumbers' })
      ]);
      const connections = connResp.data.connections || [];
      const otherContacts = otherResp.data.otherContacts || [];
      // Solo conteos; no devolver datos de ejemplo
      let dbCount = 0;
      try { const r = await executeQuery("SELECT COUNT(*) AS c FROM contacto WHERE origen='google'"); dbCount = r?.[0]?.c || 0; } catch(_) {
        try { const r2 = await executeQuery("SELECT COUNT(*) AS c FROM contactos WHERE origen='google'"); dbCount = r2?.[0]?.c || 0; } catch(_) {}
      }
      res.json({ success:true, data: { connections: connections.length, otherContacts: otherContacts.length, dbGoogleCount: dbCount } });
    } catch (e) {
      console.error('[googleImport] preview error:', e?.response?.data || e.message || e);
      res.status(500).json({ success:false, message: e.message });
    }
  }
}

module.exports = GoogleContactsController;