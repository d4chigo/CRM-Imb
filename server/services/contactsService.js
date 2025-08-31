const { executeQuery, queryOne } = require('../config/database');

class ContactsService {
  static async list() {
    return await executeQuery('SELECT id, nombre_completo AS nombre, email, telefono, tipo, origen, notas, creado_en FROM contactos ORDER BY creado_en DESC');
  }
  static async create({ nombre, email, telefono, tipo = 'lead', origen, notas }) {
    const result = await executeQuery('INSERT INTO contactos (nombre_completo, email, telefono, tipo, origen, notas) VALUES (?,?,?,?,?,?)', [nombre, email, telefono, tipo, origen, notas]);
    return { id: result.insertId, nombre, email, telefono, tipo, origen, notas };
  }
  // Inserción masiva con deduplicación simple por email o teléfono
  static async bulkCreate(rows = []) {
    if (!rows.length) return { inserted: 0, skipped: 0, items: [] };
    // Filtrar filas inválidas
    const cleaned = rows.filter(r => r && r.nombre);
    if (!cleaned.length) return { inserted: 0, skipped: rows.length, items: [] };
    // Obtener emails y teléfonos para deduplicar existentes
    const emails = cleaned.map(r => r.email).filter(Boolean);
    const phones = cleaned.map(r => r.telefono).filter(Boolean);
    let existing = [];
    if (emails.length || phones.length) {
      const placeholdersEmail = emails.length ? emails.map(()=>'?').join(',') : null;
      const placeholdersPhone = phones.length ? phones.map(()=>'?').join(',') : null;
      const conditions = [];
      const params = [];
      if (placeholdersEmail) { conditions.push(`email IN (${placeholdersEmail})`); params.push(...emails); }
      if (placeholdersPhone) { conditions.push(`telefono IN (${placeholdersPhone})`); params.push(...phones); }
      if (conditions.length) {
        existing = await executeQuery(`SELECT id, email, telefono FROM contactos WHERE ${conditions.join(' OR ')}`, params);
      }
    }
    const existsByEmail = new Set(existing.filter(e=>e.email).map(e=>e.email));
    const existsByPhone = new Set(existing.filter(e=>e.telefono).map(e=>e.telefono));
    const toInsert = [];
    const skipped = [];
    for (const r of cleaned) {
      if ((r.email && existsByEmail.has(r.email)) || (r.telefono && existsByPhone.has(r.telefono))) {
        skipped.push(r);
        continue;
      }
      toInsert.push([
        r.nombre,
        r.email || null,
        r.telefono || null,
        r.tipo || 'lead',
        r.origen || 'google',
        r.notas || null
      ]);
    }
    const items = [];
    if (toInsert.length) {
      const chunks = []; // dividir en lotes para evitar query demasiado grande
      const size = 100;
      for (let i=0;i<toInsert.length;i+=size) chunks.push(toInsert.slice(i,i+size));
      for (const chunk of chunks) {
        const placeholders = chunk.map(()=>'(?,?,?,?,?,?)').join(',');
        const flat = chunk.flat();
        const result = await executeQuery(`INSERT INTO contactos (nombre_completo, email, telefono, tipo, origen, notas) VALUES ${placeholders}`, flat);
        // No recuperamos cada id exacto (auto inc), opcionalmente podríamos consultar; por simplicidad devolvemos nombres
        items.push(...chunk.map(c=>({ nombre: c[0], email: c[1], telefono: c[2], tipo: c[3], origen: c[4], notas: c[5] })));
      }
    }
    return { inserted: toInsert.length, skipped: skipped.length, items };
  }
  static async get(id) {
    return await queryOne('SELECT id, nombre_completo AS nombre, email, telefono, tipo, origen, notas, creado_en FROM contactos WHERE id = ?', [id]);
  }
  static async update(id, { nombre, email, telefono, tipo, origen, notas }) {
    const existing = await this.get(id);
    if (!existing) throw new Error('Contacto no encontrado');
    const fields = [];
    const params = [];
    if (nombre !== undefined) { fields.push('nombre_completo = ?'); params.push(nombre); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (telefono !== undefined) { fields.push('telefono = ?'); params.push(telefono); }
    if (tipo !== undefined) { fields.push('tipo = ?'); params.push(tipo); }
    if (origen !== undefined) { fields.push('origen = ?'); params.push(origen); }
    if (notas !== undefined) { fields.push('notas = ?'); params.push(notas); }
    if (fields.length) {
      params.push(id);
      await executeQuery(`UPDATE contactos SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    return await this.get(id);
  }
  static async remove(id) {
    const used = await queryOne('SELECT id FROM oportunidades WHERE contacto_id = ? LIMIT 1', [id]);
    if (used) throw new Error('No se puede eliminar: contacto ligado a oportunidades');
    const res = await executeQuery('DELETE FROM contactos WHERE id = ?', [id]);
    if (res.affectedRows === 0) throw new Error('Contacto no encontrado');
    return true;
  }
}
module.exports = ContactsService;