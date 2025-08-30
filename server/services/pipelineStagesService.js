// Servicio para gestionar etapas del pipeline (etapas_pipeline)
const { executeQuery, queryOne } = require('../config/database');

class PipelineStagesService {
  static async list() {
    return await executeQuery('SELECT id, titulo AS title, color_hex AS color FROM etapas_pipeline ORDER BY id');
  }

  static async create({ id, title, color }) {
    const existing = await queryOne('SELECT id FROM etapas_pipeline WHERE id = ?', [id]);
    if (existing) throw new Error('La etapa ya existe');
    await executeQuery('INSERT INTO etapas_pipeline (id, titulo, color_hex) VALUES (?, ?, ?)', [id, title, color]);
    return { id, title, color };
  }

  static async update(id, { title, color, order }) {
    const existing = await queryOne('SELECT id FROM etapas_pipeline WHERE id = ?', [id]);
    if (!existing) throw new Error('Etapa no encontrada');
    const fields = [];
    const params = [];
    if (title) { fields.push('titulo = ?'); params.push(title); }
    if (color) { fields.push('color_hex = ?'); params.push(color); }
    if (typeof order === 'number') { fields.push('orden = ?'); params.push(order); }
    if (fields.length === 0) return await queryOne('SELECT id, titulo AS title, color_hex AS color, orden FROM etapas_pipeline WHERE id = ?', [id]);
    params.push(id);
    await executeQuery(`UPDATE etapas_pipeline SET ${fields.join(', ')} WHERE id = ?`, params);
    return await queryOne('SELECT id, titulo AS title, color_hex AS color, orden FROM etapas_pipeline WHERE id = ?', [id]);
  }

  static async remove(id) {
    // Verificar que no existan oportunidades asociadas
    const used = await queryOne('SELECT id FROM oportunidades WHERE etapa_id = ? LIMIT 1', [id]);
    if (used) throw new Error('No se puede eliminar: etapa en uso');
    const result = await executeQuery('DELETE FROM etapas_pipeline WHERE id = ?', [id]);
    if (result.affectedRows === 0) throw new Error('Etapa no encontrada');
    return true;
  }
}

module.exports = PipelineStagesService;