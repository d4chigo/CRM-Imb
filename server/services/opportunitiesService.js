// Servicio para CRUD de oportunidades
const { executeQuery, queryOne } = require('../config/database');

class OpportunitiesService {
  static async list() {
    return await executeQuery(`SELECT id, contacto_id AS contactoId, agente_id AS agenteId, servicio_id AS servicioId, etapa_id AS etapaId, nombre_cliente AS nombreCliente, valor_usd AS valorUsd, probabilidad, fecha_cierre AS fechaCierre, telefono, email, creado_en, actualizado_en FROM oportunidades ORDER BY creado_en DESC`);
  }
  static async create({ contactoId, agenteId, servicioId, etapaId, nombreCliente, valorUsd = 0, probabilidad = 0, fechaCierre, telefono, email }) {
    const result = await executeQuery(`INSERT INTO oportunidades (contacto_id, agente_id, servicio_id, etapa_id, nombre_cliente, valor_usd, probabilidad, fecha_cierre, telefono, email) VALUES (?,?,?,?,?,?,?,?,?,?)`, [contactoId || null, agenteId || null, servicioId, etapaId, nombreCliente, valorUsd, probabilidad, fechaCierre, telefono, email]);
    return { id: result.insertId, contactoId, agenteId, servicioId, etapaId, nombreCliente, valorUsd, probabilidad, fechaCierre, telefono, email };
  }
  static async get(id) {
    return await queryOne(`SELECT id, contacto_id AS contactoId, agente_id AS agenteId, servicio_id AS servicioId, etapa_id AS etapaId, nombre_cliente AS nombreCliente, valor_usd AS valorUsd, probabilidad, fecha_cierre AS fechaCierre, telefono, email, creado_en, actualizado_en FROM oportunidades WHERE id = ?`, [id]);
  }
  static async update(id, patch) {
    const existing = await this.get(id);
    if (!existing) throw new Error('Oportunidad no encontrada');
    const mapping = { contactoId: 'contacto_id', agenteId: 'agente_id', servicioId: 'servicio_id', etapaId: 'etapa_id', nombreCliente: 'nombre_cliente', valorUsd: 'valor_usd', probabilidad: 'probabilidad', fechaCierre: 'fecha_cierre', telefono: 'telefono', email: 'email' };
    const fields = []; const params = [];
    Object.entries(mapping).forEach(([k, col]) => {
      if (patch[k] !== undefined) { fields.push(`${col} = ?`); params.push(patch[k]); }
    });
    if (fields.length) { params.push(id); await executeQuery(`UPDATE oportunidades SET ${fields.join(', ')} WHERE id = ?`, params); }
    return await this.get(id);
  }
  static async remove(id) {
    const res = await executeQuery('DELETE FROM oportunidades WHERE id = ?', [id]);
    if (res.affectedRows === 0) throw new Error('Oportunidad no encontrada');
    return true;
  }
}

module.exports = OpportunitiesService;