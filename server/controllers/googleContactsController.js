const { google } = require('googleapis');
const ContactsService = require('../services/contactsService');
const { executeQuery } = require('../config/database');

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
      const oauth2Client = getOAuthClient();
      const scopes = [
        'https://www.googleapis.com/auth/contacts.readonly',
        'https://www.googleapis.com/auth/contacts'
      ];

      // Incluir el id de usuario en state para persistir tokens en callback
      const userId = (req.user && (req.user.id || req.user.userId)) ? (req.user.id || req.user.userId) : null;
      const statePayload = encodeURIComponent(JSON.stringify({ popup: true, uid: userId }));
      const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes, prompt: 'consent', state: statePayload });
  console.log('[googleImport] Generada URL de autorización Google');
      res.json({ success:true, url });
    } catch (e) {
  console.error('[googleImport] Error generando URL:', e.message);
      res.status(500).json({ success:false, message:e.message });
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
            <p>${error === 'access_denied' ? 'No diste permisos o la app no está autorizada.' : 'Error: ' + error}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'google-import-error', error: '${error}', description: ${JSON.stringify(error_description || '')} }, '*');
                setTimeout(()=> window.close(), 1200);
              }
            </script>
          </body></html>`);
        }
        return res.status(400).json({ success:false, error, description: error_description });
      }
      const code = req.query.code;
      const stateRaw = req.query.state; // JSON con { popup, uid }
      let state = { popup: false, uid: null };
      try { if (stateRaw) state = JSON.parse(decodeURIComponent(stateRaw)); } catch(_) {}
      if (!code) return res.status(400).json({ success:false, message:'Código no provisto' });
      const oauth2Client = getOAuthClient();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      savedTokens = tokens; // guardar en memoria para usos posteriores (crear contacto)

      // Persistir tokens por usuario si state.uid válido
      try {
        if (state && state.uid) {
          await executeQuery('UPDATE usuario SET google_access_token = ?, google_refresh_token = COALESCE(?, google_refresh_token), google_scope = ?, google_expiry = ? WHERE id = ?', [
            tokens.access_token || null,
            tokens.refresh_token || null,
            tokens.scope || null,
            tokens.expiry_date || null,
            state.uid
          ]);
          console.log('[googleImport] Tokens persistidos para usuario', state.uid);
        }
      } catch(err) {
        console.warn('[googleImport] No se pudo persistir tokens:', err.message);
      }

  console.log('[googleImport] Tokens recibidos, llamando People API');
      const people = google.people({ version: 'v1', auth: oauth2Client });
      // Obtener contactos (batch inicialmente 1000)
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses,phoneNumbers,organizations,biographies',
        pageSize: 1000,
      });
      const connections = response.data.connections || [];
      const rows = connections.map(p => {
        const nombre = p.names && p.names.length ? (p.names[0].displayName || p.names[0].givenName || 'Sin Nombre') : 'Sin Nombre';
        const email = p.emailAddresses && p.emailAddresses.length ? p.emailAddresses[0].value : null;
        const telefono = p.phoneNumbers && p.phoneNumbers.length ? p.phoneNumbers[0].value : null;
        const notas = p.biographies && p.biographies.length ? p.biographies[0].value : null;
        return { nombre, email, telefono, notas, origen: 'google', tipo: 'lead' };
      }).filter(r => r.email || r.telefono || (r.nombre && r.nombre !== 'Sin Nombre'));
      console.log('[googleImport] Conexiones totales:', connections.length, 'Filtradas útiles:', rows.length);
      const result = await ContactsService.bulkCreate(rows);
  console.log(`[googleImport] Importación finalizada: insertados ${result.inserted}, duplicados ${result.skipped}`);
      if (state === 'popup') {
        // Responder con HTML que manda mensaje a la ventana que abrió el popup
        res.send(`<!doctype html><html><head><title>Importación Google</title></head><body style=\"font-family:sans-serif;text-align:center;padding:20px;\">
          <h3>Importación completada</h3>
          <p>Importados: ${result.inserted} | Duplicados: ${result.skipped}</p>
          <script>
            (function(){
              try { localStorage.setItem('googleImportResult', JSON.stringify({ imported:${result.inserted}, skipped:${result.skipped}, ts: Date.now() })); } catch(e) {}
              let attempts = 0;
              const payload = { type: 'google-import-result', imported: ${result.inserted}, skipped: ${result.skipped} };
              const timer = setInterval(()=>{
                attempts++;
                try { if (window.opener) window.opener.postMessage(payload, '*'); } catch(e){}
                if (attempts >= 5) { clearInterval(timer); setTimeout(()=> window.close(), 500); }
              }, 250);
            })();
          </script>
        </body></html>`);
      } else {
        res.json({ success:true, imported: result.inserted, skipped: result.skipped, items: result.items.slice(0,50) });
      }
    } catch (e) {
      console.error('Error importando contactos Google:', e.message);
      res.status(500).json({ success:false, message:e.message });
    }
  }
}

module.exports = GoogleContactsController;

// Crear contacto en Google con nombre/apellido/email/telefono mínimos
module.exports.createGoogleContact = async function(req, res) {
  try {
    const { nombre, apellido, email, telefono } = req.body || {};
    const userId = (req.user && (req.user.id || req.user.userId)) ? (req.user.id || req.user.userId) : null;
    console.log('[googleSync] createGoogleContact request', { userId, nombre, hasEmail: !!email, hasTelefono: !!telefono });
    // Recuperar tokens del usuario
    let row = null;
    if (userId) {
      const rows = await executeQuery('SELECT google_access_token, google_refresh_token, google_expiry FROM usuario WHERE id = ? LIMIT 1', [userId]);
      row = rows && rows[0] ? rows[0] : null;
    }
    const oauth2Client = getOAuthClient();
    if (row && (row.google_access_token || row.google_refresh_token)) {
      oauth2Client.setCredentials({ access_token: row.google_access_token || undefined, refresh_token: row.google_refresh_token || undefined, expiry_date: row.google_expiry || undefined });
      console.log('[googleSync] Using persisted tokens from DB');
    } else if (savedTokens) {
      oauth2Client.setCredentials(savedTokens);
      console.log('[googleSync] Using in-memory tokens');
    } else {
      console.warn('[googleSync] No tokens available to call Google');
      return res.status(401).json({ success:false, message:'No conectado a Google. Autoriza primero.' });
    }
    const people = google.people({ version: 'v1', auth: oauth2Client });
    const resource = {
      names: [{ givenName: nombre || '', familyName: apellido || '' }],
      emailAddresses: email ? [{ value: email }] : undefined,
      phoneNumbers: telefono ? [{ value: telefono }] : undefined,
    };
    const resp = await people.people.createContact({ requestBody: resource });
    console.log('[googleSync] createContact OK', resp.data && resp.data.resourceName);
    // Si el client refrescó access token, guardar nuevo token/expiry si se encuentran en credenciales
    try {
      const creds = oauth2Client.credentials || {};
      if (userId && (creds.access_token || creds.expiry_date)) {
        await executeQuery('UPDATE usuario SET google_access_token = COALESCE(?, google_access_token), google_expiry = COALESCE(?, google_expiry) WHERE id = ?', [creds.access_token || null, creds.expiry_date || null, userId]);
      }
    } catch(err) { console.warn('[googleSync] Could not persist refreshed token', err && err.message); }
    return res.json({ success:true, data: { resourceName: resp.data.resourceName || null } });
  } catch(e) {
    console.error('[googleSync] createGoogleContact error', e && (e.response?.data || e.message || e));
    const msg = (e && e.response && e.response.data && e.response.data.error && e.response.data.error.message) ? e.response.data.error.message : (e.message || 'Error creando contacto en Google');
    return res.status(400).json({ success:false, message: msg });
  }
}