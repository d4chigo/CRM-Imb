const { google } = require('googleapis');
const { executeQuery } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

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
    
    if (!tokens) return null;

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
            etag: `%E82iL3IxNDgyMDAwMA%3D%3D-${uuidv4()}`
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
      const auth = await this.getAuthClient(userId);
      if (!auth) return { synced: 0, total: 0 };

      const people = google.people({ version: 'v1', auth });
      const includeOther = String(process.env.GOOGLE_INCLUDE_OTHER_CONTACTS || '').toLowerCase() === 'true';

      // 1) Mis contactos ("Contacts")
      const connResp = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 2000,
        personFields: 'names,emailAddresses,phoneNumbers,organizations,userDefined,biographies,metadata'
      });
      const connections = (connResp.data.connections || []).filter(p => {
        // Filtrar borrados y sin email/teléfono
        const deleted = p.metadata?.deleted === true;
        const hasEmail = Array.isArray(p.emailAddresses) && p.emailAddresses.some(e=>!!e.value);
        const hasPhone = Array.isArray(p.phoneNumbers) && p.phoneNumbers.some(ph=>!!ph.value);
        return !deleted && (hasEmail || hasPhone);
      });

      // 2) Otros contactos ("Other contacts") — opcional y filtrado mínimo
      let otherContacts = [];
      if (includeOther) {
        const otherResp = await people.otherContacts.list({
          pageSize: 1000,
          readMask: 'names,emailAddresses,phoneNumbers',
        });
        otherContacts = (otherResp.data.otherContacts || []).filter(p => {
          const hasEmail = Array.isArray(p.emailAddresses) && p.emailAddresses.some(e=>!!e.value);
          const hasPhone = Array.isArray(p.phoneNumbers) && p.phoneNumbers.some(ph=>!!ph.value);
          return hasEmail || hasPhone;
        });
      }

      // Unificar y deduplicar por resourceName si existe
      const all = [];
      const seen = new Set();
      for (const p of connections) { if (p.resourceName && !seen.has(p.resourceName)) { seen.add(p.resourceName); all.push(p); } }
      for (const p of otherContacts) { if (p.resourceName && !seen.has(p.resourceName)) { seen.add(p.resourceName); all.push(p); } }

      let synced = 0;

      for (const person of all) {
        try {
          const mapped = this.mapGooglePerson(person);
          // Ignorar entradas sin email y sin teléfono incluso después de mapear
          if (!mapped.email && !mapped.telefono) continue;

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
          console.error('Error syncing Google contact:', error?.response?.data || error.message || error);
        }
      }

      // Actualizar última sincronización
      await executeQuery('UPDATE google_tokens SET last_sync = NOW() WHERE usuario_id = ?', [userId]);

      return { synced, total: all.length };
    } catch (error) {
      console.error('Error in Google to CRM sync:', error);
      throw error;
    }
  }
}

module.exports = GoogleSyncService;
