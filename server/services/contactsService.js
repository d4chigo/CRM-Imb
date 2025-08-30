const { executeQuery, queryOne } = require('../config/database');

class ContactsService {
  static async list() {
    return await executeQuery('SELECT id, nombre_completo AS nombre, email, telefono, tipo, origen, notas, creado_en FROM contactos ORDER BY creado_en DESC');
  }
  static async create({ nombre, email, telefono, tipo = 'lead', origen, notas }) {
    const result = await executeQuery('INSERT INTO contactos (nombre_completo, email, telefono, tipo, origen, notas) VALUES (?,?,?,?,?,?)', [nombre, email, telefono, tipo, origen, notas]);
    return { id: result.insertId, nombre, email, telefono, tipo, origen, notas };
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