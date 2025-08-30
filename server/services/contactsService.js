const { executeQuery, queryOne } = require('../config/database');

class ContactsService {
  static async list() {
    return await executeQuery('SELECT id, nombre_completo AS nombre, email, telefono, tipo, origen, notas, creado_en FROM contactos ORDER BY creado_en DESC');
  }
  static async create({ nombre, email, telefono, tipo = 'lead', origen, notas }) {
    const result = await executeQuery('INSERT INTO contactos (nombre_completo, email, telefono, tipo, origen, notas) VALUES (?,?,?,?,?,?)', [nombre, email, telefono, tipo, origen, notas]);
    return { id: result.insertId, nombre, email, telefono, tipo, origen, notas };
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