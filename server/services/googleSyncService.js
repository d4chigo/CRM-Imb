const { google } = require('googleapis');
const { executeQuery } = require('../config/database');
const { randomUUID } = require('node:crypto');

// Resolver tabla/columnas variables (singular/plural + alias de columnas)
let contactSchema = null;
async function resolveContactsSchema() {
  if (contactSchema) return contactSchema;
  // Detectar tabla
  let table = 'contactos';
  try { await executeQuery('SELECT 1 FROM contacto LIMIT 1'); table = 'contacto'; } catch(_) {}
  // Leer columnas
  const cols = await executeQuery('SHOW COLUMNS FROM ' + table);
  const names = cols.map(c => c.Field);
  const origenCol = names.includes('origen') ? 'origen' : (names.includes('medio_contacto') ? 'medio_contacto' : 'origen');
  const notasCol = names.includes('notas') ? 'notas' : (names.includes('observaciones') ? 'observaciones' : 'notas');
  contactSchema = { table, origenCol, notasCol };
  return contactSchema;
}

class GoogleSyncService {
  static async getAuthClient(userId) {
    const [tokens] = await executeQuery(
      'SELECT * FROM google_tokens WHERE usuario_id = ? AND sync_enabled = TRUE', 
      [userId]
    );
    
    if (!tokens) {
      console.log('[GoogleSync] No tokens found for user:', userId);
      return null;
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('[GoogleSync] Missing Google OAuth credentials in environment');
      throw new Error('Configuración de Google OAuth incompleta');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date
    });

    // Configurar callback para refresh automático de tokens
    oauth2Client.on('tokens', async (newTokens) => {
      console.log('[GoogleSync] Refreshing tokens for user:', userId);
      try {
        await executeQuery(
          `UPDATE google_tokens 
           SET access_token = ?, 
               refresh_token = COALESCE(?, refresh_token), 
               expiry_date = ?, 
               updated_at = NOW()
           WHERE usuario_id = ?`,
          [
            newTokens.access_token,
            newTokens.refresh_token || null,
            newTokens.expiry_date || null,
            userId
          ]
        );
        console.log('[GoogleSync] Tokens updated successfully');
      } catch (error) {
        console.error('[GoogleSync] Error updating tokens:', error);
      }
    });

    return oauth2Client;
  }

  static async syncContactToGoogle(userId, contact) {
    try {
      const auth = await this.getAuthClient(userId);
      if (!auth) return null;

      const people = google.people({ version: 'v1', auth });
      const { nombre, apellido, email, telefono, dni, departamento, notas } = contact;
      
      const contactData = {
        names: [
          {
            givenName: nombre,
            familyName: apellido || '',
            displayName: apellido ? `${nombre} ${apellido}` : nombre
          }
        ],
        emailAddresses: email ? [{ value: email, type: 'work' }] : [],
        phoneNumbers: telefono ? [{ value: telefono, type: 'work' }] : [],
        organizations: departamento ? [{ name: departamento }] : [],
        biographies: notas ? [{ value: notas }] : [],
        userDefined: []
      };

      if (dni) {
        contactData.userDefined.push({
          key: 'DNI',
          value: dni
        });
      }

      let result;
      if (contact.google_resource_name) {
        // Actualizar contacto existente
        result = await people.people.updateContact({
          resourceName: contact.google_resource_name,
          updatePersonFields: 'names,emailAddresses,phoneNumbers,organizations,biographies,userDefined',
          requestBody: contactData
        });
      } else {
        // Crear nuevo contacto
        result = await people.people.createContact({
          requestBody: {
            ...contactData,
            contactId: contact.id.toString(),
            etag: `%E82iL3IxNDgyMDAwMA%3D%3D-${randomUUID()}`
          }
        });
      }

      // Actualizar el contacto con la información de Google (usar binding explícito, no objetos)
      const resourceName = result.data.resourceName || '';
      const s = await resolveContactsSchema();
      await executeQuery(
        `UPDATE ${s.table} SET google_contact_id = ?, google_resource_name = ?, last_synced_with_google = NOW() WHERE id = ?`,
        [resourceName.split('/').pop() || null, resourceName || null, contact.id]
      );

      return result.data;
    } catch (error) {
      console.error('Error syncing contact to Google:', error);
      throw error;
    }
  }

  // Helper: inserta/actualiza un contacto en BD evitando el uso de objetos en execute()
  static async upsertCRMContact(mapped, existingId = null) {
    const s = await resolveContactsSchema();
    const {
      nombre,
      apellido,
      email,
      telefono,
      dni,
      departamento,
      notas,
      google_contact_id,
      google_resource_name
    } = mapped;

    if (existingId) {
      await executeQuery(
        `UPDATE ${s.table} 
         SET nombre = ?, apellido = ?, email = ?, telefono = ?, dni = ?, departamento = ?, ${s.notasCol} = ?, google_contact_id = ?, google_resource_name = ?, last_synced_with_google = NOW()
         WHERE id = ?`,
        [nombre, apellido, email, telefono, dni, departamento, notas, google_contact_id, google_resource_name, existingId]
      );
      return existingId;
    }

    const result = await executeQuery(
      `INSERT INTO ${s.table} (nombre, apellido, email, telefono, dni, departamento, ${s.notasCol}, google_contact_id, google_resource_name, last_synced_with_google, ${s.origenCol}, tipo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'google', 'lead')`,
      [nombre, apellido, email, telefono, dni, departamento, notas, google_contact_id, google_resource_name]
    );
    return result.insertId;
  }

  // Mapear un registro de Google People a nuestro esquema simple
  static mapGooglePerson(p) {
    const name = p.names?.[0] || {};
    const display = name.displayName || '';
    const given = name.givenName || display.split(' ')[0] || 'Sin nombre';
    const family = name.familyName || (display.includes(' ') ? display.split(' ').slice(1).join(' ') : '');
    const email = p.emailAddresses?.find(e=> !!e.value)?.value || null;
    const phone = p.phoneNumbers?.find(ph=> !!ph.value)?.value || null;
    const dni = p.userDefined?.find(f => f.key === 'DNI')?.value || null;
    const departamento = p.organizations?.[0]?.name || null;
    const notas = p.biographies?.[0]?.value || null;
    const resourceName = p.resourceName || null;
    return {
      nombre: given,
      apellido: family,
      email,
      telefono: phone,
      dni,
      departamento,
      notas,
      google_contact_id: resourceName ? resourceName.split('/').pop() : null,
      google_resource_name: resourceName
    }
  }

  static async syncGoogleToCRM(userId) {
    try {
      console.log('[GoogleSync] Starting sync for user:', userId);
      const auth = await this.getAuthClient(userId);
      if (!auth) {
        console.log('[GoogleSync] No auth client available for user:', userId);
        return { synced: 0, total: 0 };
      }

      const people = google.people({ version: 'v1', auth });
      // Incluir "Other contacts" por defecto salvo que se desactive explícitamente
      const includeOther = (() => {
        const raw = String(process.env.GOOGLE_INCLUDE_OTHER_CONTACTS || '').toLowerCase();
        if (raw === 'false' || raw === '0' || raw === 'no') return false;
        return true; // default true para maximizar importación
      })();

      // 1) Mis contactos ("Contacts")
      console.log('[GoogleSync] Fetching Google contacts...');
      let connResp;
      try {
        connResp = await people.people.connections.list({
          resourceName: 'people/me',
          pageSize: 2000,
          personFields: 'names,emailAddresses,phoneNumbers,organizations,userDefined,biographies,metadata'
        });
      } catch (error) {
        console.error('[GoogleSync] Error fetching connections:', error);
        if (error.code === 401 || error.message?.includes('invalid_grant')) {
          throw new Error('Token de Google expirado. Vuelve a autorizar la conexión con Google.');
        }
        if (error.code === 403) {
          throw new Error('Acceso denegado por Google. Verifica que tu cuenta esté autorizada como Test User.');
        }
        throw new Error(`Error de Google API: ${error.message}`);
      }
      
      const connections = (connResp.data.connections || []).filter(p => {
        // Filtrar sólo los realmente eliminados; aceptar aunque falte email/teléfono si hay un nombre
        const deleted = p.metadata?.deleted === true;
        if (deleted) return false;
        const hasEmail = Array.isArray(p.emailAddresses) && p.emailAddresses.some(e=>!!e.value);
        const hasPhone = Array.isArray(p.phoneNumbers) && p.phoneNumbers.some(ph=>!!ph.value);
        const hasName = !!(p.names && p.names[0] && (p.names[0].displayName || p.names[0].givenName));
        if (!(hasEmail || hasPhone || hasName)) {
          console.log('[GoogleSync] Skipping connection sin datos básicos identificables');
          return false;
        }
        return true;
      });
      console.log('[GoogleSync] Found', connections.length, 'valid connections');

      // 2) Otros contactos ("Other contacts") — opcional y filtrado mínimo
      let otherContacts = [];
      if (includeOther) {
        try {
          console.log('[GoogleSync] Fetching other contacts...');
          const otherResp = await people.otherContacts.list({
            pageSize: 1000,
            readMask: 'names,emailAddresses,phoneNumbers',
          });
          otherContacts = (otherResp.data.otherContacts || []).filter(p => {
            const hasEmail = Array.isArray(p.emailAddresses) && p.emailAddresses.some(e=>!!e.value);
            const hasPhone = Array.isArray(p.phoneNumbers) && p.phoneNumbers.some(ph=>!!ph.value);
            const hasName = !!(p.names && p.names[0] && (p.names[0].displayName || p.names[0].givenName));
            if (!(hasEmail || hasPhone || hasName)) return false;
            return true;
          });
          console.log('[GoogleSync] Found', otherContacts.length, 'other contacts');
        } catch (error) {
          console.warn('[GoogleSync] Could not fetch other contacts:', error.message);
        }
      }

      // Unificar y deduplicar por resourceName si existe
      const all = [];
      const seen = new Set();
      for (const p of connections) { if (p.resourceName && !seen.has(p.resourceName)) { seen.add(p.resourceName); all.push(p); } }
      for (const p of otherContacts) { if (p.resourceName && !seen.has(p.resourceName)) { seen.add(p.resourceName); all.push(p); } }

      console.log('[GoogleSync] Processing', all.length, 'total contacts');
      let synced = 0;

      for (const person of all) {
        try {
          const mapped = this.mapGooglePerson(person);
          // Ya permitimos contactos sin email/teléfono, pero aseguramos que al menos tengan nombre
          if (!mapped.nombre) {
            console.log('[GoogleSync] Skipping mapped contact sin nombre identificable');
            continue;
          }

          // Normalizar teléfono para deduplicación
          const phoneDigits = (mapped.telefono || '').toString().replace(/[^\d]/g, '') || null;

          // Buscar por resourceName primero
          let existing = null;
          if (mapped.google_resource_name) {
            const s = await resolveContactsSchema();
            const rows = await executeQuery(`SELECT id FROM ${s.table} WHERE google_resource_name = ? LIMIT 1`, [mapped.google_resource_name]);
            existing = rows && rows[0] ? rows[0] : null;
          }

          // Si no existe por resourceName, deduplicar por email o teléfono (si existen)
          if (!existing && (mapped.email || phoneDigits)) {
            const s = await resolveContactsSchema();
            // Comparar email directo; para teléfono, comparar contra teléfono normalizado de la BD (quitando espacios, símbolos comunes)
            const rows = await executeQuery(
              `SELECT id FROM ${s.table}
               WHERE (email IS NOT NULL AND email = ?)
                  OR (telefono IS NOT NULL AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefono,'-',''),' ',''),'(',''),')',''),'+','') = ?)
               LIMIT 1`,
              [mapped.email || '', phoneDigits || '']
            );
            existing = rows && rows[0] ? rows[0] : null;
          }

          if (existing) {
            await this.upsertCRMContact(mapped, existing.id);
          } else {
            await this.upsertCRMContact(mapped, null);
          }

          synced++;
        } catch (error) {
          console.error('Error syncing individual Google contact:', error?.response?.data || error.message || error);
        }
      }

      // Actualizar última sincronización
      await executeQuery('UPDATE google_tokens SET last_sync = NOW() WHERE usuario_id = ?', [userId]);
      
      console.log(`[GoogleSync] Completed: ${synced} of ${all.length} contacts synced for user ${userId}`);
      return { synced, total: all.length };
    } catch (error) {
      console.error('Error in Google to CRM sync:', error);
      if (error.message && error.message.includes('Token de Google')) {
        throw error; // Re-throw auth errors as-is
      }
      throw new Error(`Error al sincronizar con Google: ${error.message || 'Error desconocido'}`);
    }
  }
}

module.exports = GoogleSyncService;
