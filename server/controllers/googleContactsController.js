const { google } = require('googleapis');
const ContactsService = require('../services/contactsService');

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
      const scopes = ['https://www.googleapis.com/auth/contacts.readonly'];
      // Utilizamos state=popup para saber que debemos devolver HTML que hace postMessage
      const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: scopes, prompt: 'consent', state: 'popup' });
      res.json({ success:true, url });
    } catch (e) {
      res.status(500).json({ success:false, message:e.message });
    }
  }

  static async callback(req, res) {
    try {
      const code = req.query.code;
      const state = req.query.state; // 'popup' si viene de flujo con ventana
      if (!code) return res.status(400).json({ success:false, message:'Código no provisto' });
      const oauth2Client = getOAuthClient();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      const people = google.people({ version: 'v1', auth: oauth2Client });
      // Obtener contactos (batch inicialmente 1000)
      const response = await people.people.connections.list({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses,phoneNumbers,organizations,biographies',
        pageSize: 1000,
      });
      const connections = response.data.connections || [];
      const rows = connections.map(p => {
        const nombre = p.names && p.names.length ? p.names[0].displayName : 'Sin Nombre';
        const email = p.emailAddresses && p.emailAddresses.length ? p.emailAddresses[0].value : null;
        const telefono = p.phoneNumbers && p.phoneNumbers.length ? p.phoneNumbers[0].value : null;
        const notas = p.biographies && p.biographies.length ? p.biographies[0].value : null;
        return { nombre, email, telefono, notas, origen: 'google', tipo: 'lead' };
      });
      const result = await ContactsService.bulkCreate(rows);
      if (state === 'popup') {
        // Responder con HTML que manda mensaje a la ventana que abrió el popup
        res.send(`<!doctype html><html><head><title>Importación Google</title></head><body style="font-family:sans-serif;text-align:center;padding:20px;">
          <h3>Importación completada</h3>
          <p>Importados: ${result.inserted} | Duplicados: ${result.skipped}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'google-import-result', imported: ${result.inserted}, skipped: ${result.skipped} }, '*');
              setTimeout(()=> window.close(), 800);
            }
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