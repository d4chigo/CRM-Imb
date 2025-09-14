// Servicio para CRUD de cotizaciones (catálogo de servicios inmobiliarios)
const { executeQuery, queryOne } = require('../config/database');

class CotizacionesService {
  static async list() {
    return await executeQuery(`SELECT id, nombre, descripcion, precio_base AS precioBase, moneda, incluye_igv AS incluyeIgv, igv_porcentaje AS igvPorcentaje, descuento_porcentaje AS descuentoPorcentaje, vigencia_dias AS vigenciaDias, condiciones_pago AS condicionesPago, notas, items_json AS itemsJson, propiedad_tipo AS propiedadTipo, propiedad_ubicacion AS propiedadUbicacion, area_m2 AS areaM2, dormitorios, banos, estacionamientos, estado, mantenimiento_mensual AS mantenimientoMensual, fecha_entrega AS fechaEntrega, amoblado FROM cotizacion ORDER BY nombre ASC`);
  }

  static async get(id) {
    return await queryOne(`SELECT id, nombre, descripcion, precio_base AS precioBase, moneda, incluye_igv AS incluyeIgv, igv_porcentaje AS igvPorcentaje, descuento_porcentaje AS descuentoPorcentaje, vigencia_dias AS vigenciaDias, condiciones_pago AS condicionesPago, notas, items_json AS itemsJson, propiedad_tipo AS propiedadTipo, propiedad_ubicacion AS propiedadUbicacion, area_m2 AS areaM2, dormitorios, banos, estacionamientos, estado, mantenimiento_mensual AS mantenimientoMensual, fecha_entrega AS fechaEntrega, amoblado FROM cotizacion WHERE id = ?`, [id]);
  }

  static async create(data) {
    const { nombre, descripcion, precioBase, moneda = 'USD', incluyeIgv = false, igvPorcentaje = 18.0, descuentoPorcentaje = 0.0, vigenciaDias = 30, condicionesPago, notas, itemsJson, propiedadTipo, propiedadUbicacion, areaM2, dormitorios, banos, estacionamientos, estado, mantenimientoMensual, fechaEntrega, amoblado } = data || {};
    if (!nombre || !nombre.trim()) throw new Error('Nombre es requerido');
    try {
      const res = await executeQuery(
        `INSERT INTO cotizacion (nombre, descripcion, precio_base, moneda, incluye_igv, igv_porcentaje, descuento_porcentaje, vigencia_dias, condiciones_pago, notas, items_json, propiedad_tipo, propiedad_ubicacion, area_m2, dormitorios, banos, estacionamientos, estado, mantenimiento_mensual, fecha_entrega, amoblado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          nombre.trim(),
          descripcion || null,
          precioBase ?? null,
          moneda || 'USD',
          !!incluyeIgv,
          igvPorcentaje ?? 18.0,
          descuentoPorcentaje ?? 0.0,
          vigenciaDias ?? 30,
          condicionesPago || null,
          notas || null,
          itemsJson || null,
          propiedadTipo || null,
          propiedadUbicacion || null,
          areaM2 ?? null,
          dormitorios ?? null,
          banos ?? null,
          estacionamientos ?? null,
          estado || null,
          mantenimientoMensual ?? null,
          fechaEntrega || null,
          amoblado ?? null
        ]
      );
      return await this.get(res.insertId);
    } catch (e) {
      if (e && e.code === 'ER_DUP_ENTRY') {
        throw new Error('Ya existe una cotización con ese nombre');
      }
      throw e;
    }
  }

  static async update(id, patch) {
    const existing = await this.get(id);
    if (!existing) throw new Error('Cotización no encontrada');
    const fields = []; const params = [];
    const mapping = {
      nombre: 'nombre', descripcion: 'descripcion', precioBase: 'precio_base', moneda: 'moneda', incluyeIgv: 'incluye_igv', igvPorcentaje: 'igv_porcentaje', descuentoPorcentaje: 'descuento_porcentaje', vigenciaDias: 'vigencia_dias', condicionesPago: 'condiciones_pago', notas: 'notas', itemsJson: 'items_json', propiedadTipo: 'propiedad_tipo', propiedadUbicacion: 'propiedad_ubicacion', areaM2: 'area_m2', dormitorios: 'dormitorios', banos: 'banos', estacionamientos: 'estacionamientos', estado: 'estado', mantenimientoMensual: 'mantenimiento_mensual', fechaEntrega: 'fecha_entrega', amoblado: 'amoblado'
    };
    Object.entries(mapping).forEach(([k, col]) => {
      if (patch[k] !== undefined) { fields.push(`${col} = ?`); params.push(patch[k]); }
    });
    if (fields.length === 0) return existing;
    try {
      params.push(id);
      await executeQuery(`UPDATE cotizacion SET ${fields.join(', ')} WHERE id = ?`, params);
    } catch (e) {
      if (e && e.code === 'ER_DUP_ENTRY') {
        throw new Error('Ya existe una cotización con ese nombre');
      }
      throw e;
    }
    return await this.get(id);
  }

  static async remove(id) {
    // Verificar referencias en oportunidades
    const ref = await queryOne(`SELECT COUNT(*) AS c FROM oportunidades WHERE servicio_id = ?`, [id]);
    if (ref && ref.c > 0) {
      throw new Error('No se puede eliminar: existen oportunidades vinculadas');
    }
    const res = await executeQuery(`DELETE FROM cotizacion WHERE id = ?`, [id]);
    if (res.affectedRows === 0) throw new Error('Cotización no encontrada');
    return true;
  }
}

module.exports = CotizacionesService;
