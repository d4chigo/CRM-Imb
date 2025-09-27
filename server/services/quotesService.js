const { executeQuery, queryOne } = require('../config/database');

class QuotesService {
  static async getByContact(contactoId) {
    const row = await queryOne(
      'SELECT * FROM cotizacion_cliente WHERE contacto_id = ? LIMIT 1',
      [contactoId]
    );
    return row || null;
  }

  static async upsertByContact(contactoId, payload = {}, { keepHistory = true } = {}) {
    const existing = await this.getByContact(contactoId);

    // Inputs
    const cliente_nombre = payload.cliente_nombre?.trim();
    const moneda = (payload.moneda || 'PEN').toUpperCase();
    const tea = Number(payload.tea ?? 18);
    const tem = payload.tem != null ? Number(payload.tem) : (Math.pow(1 + tea / 100, 1 / 12) - 1) * 100; // en %
    const s_desgravamen_pct = Number(payload.s_desgravamen_pct ?? 0);
    const itf_pct = Number(payload.itf_pct ?? 0.005); // 0.5%
    const monto = Number(payload.monto);
    const plazo_meses = Number(payload.plazo_meses);
    const cuota_mensual = Number(payload.cuota_mensual);
    const total_interes = Number(payload.total_interes);
    const total_pagar = Number(payload.total_pagar);

    // amortizacion: array -> JSON string
    let amortizacion_json = payload.amortizacion_json;
    if (!amortizacion_json && Array.isArray(payload.amortizacion)) {
      amortizacion_json = JSON.stringify(payload.amortizacion);
    } else if (typeof amortizacion_json !== 'string') {
      amortizacion_json = JSON.stringify(amortizacion_json || []);
    }

    if (!cliente_nombre || !monto || !plazo_meses) {
      throw new Error('Datos mínimos requeridos: cliente_nombre, monto, plazo_meses');
    }

    // If exists and keepHistory, store snapshot
    if (existing && keepHistory) {
      const snap = JSON.stringify(existing);
      await executeQuery(
        'INSERT INTO cotizacion_cliente_historial (cotizacion_cliente_id, snapshot_json) VALUES (?, ?)',
        [existing.id, snap]
      );
    }

    // Upsert (unique by contacto_id)
    const sql = `INSERT INTO cotizacion_cliente (
      contacto_id, cliente_nombre, moneda, tea, tem, s_desgravamen_pct, itf_pct,
      monto, plazo_meses, cuota_mensual, total_interes, total_pagar, amortizacion_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON))
    ON DUPLICATE KEY UPDATE
      cliente_nombre = VALUES(cliente_nombre),
      moneda = VALUES(moneda),
      tea = VALUES(tea),
      tem = VALUES(tem),
      s_desgravamen_pct = VALUES(s_desgravamen_pct),
      itf_pct = VALUES(itf_pct),
      monto = VALUES(monto),
      plazo_meses = VALUES(plazo_meses),
      cuota_mensual = VALUES(cuota_mensual),
      total_interes = VALUES(total_interes),
      total_pagar = VALUES(total_pagar),
      amortizacion_json = VALUES(amortizacion_json)`;

    await executeQuery(sql, [
      contactoId, cliente_nombre, moneda, tea, tem, s_desgravamen_pct, itf_pct,
      monto, plazo_meses, cuota_mensual, total_interes, total_pagar, amortizacion_json
    ]);

    return await this.getByContact(contactoId);
  }

  static async deleteByContact(contactoId) {
    await executeQuery('DELETE FROM cotizacion_cliente WHERE contacto_id = ? LIMIT 1', [contactoId]);
  }
}

module.exports = QuotesService;
