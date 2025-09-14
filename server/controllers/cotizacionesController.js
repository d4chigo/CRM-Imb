const { body, validationResult } = require('express-validator');
const CotizacionesService = require('../services/cotizacionesService');

class CotizacionesController {
  static validateCreate = [
    body('nombre').isString().isLength({ min: 2, max: 80 }),
    body('descripcion').optional().isString().isLength({ max: 2000 }),
    body('precioBase').optional().isFloat({ min: 0 }),
    body('moneda').optional().isString().isLength({ min: 2, max: 8 }),
    body('incluyeIgv').optional().isBoolean(),
    body('igvPorcentaje').optional().isFloat({ min: 0, max: 100 }),
    body('descuentoPorcentaje').optional().isFloat({ min: 0, max: 100 }),
    body('vigenciaDias').optional().isInt({ min: 1, max: 365 }),
    body('condicionesPago').optional().isString().isLength({ max: 2000 }),
    body('notas').optional().isString().isLength({ max: 4000 }),
    body('itemsJson').optional(),
    body('propiedadTipo').optional().isString().isLength({ max: 40 }),
    body('propiedadUbicacion').optional().isString().isLength({ max: 255 }),
    body('areaM2').optional().isFloat({ min: 0 }),
    body('dormitorios').optional().isInt({ min: 0, max: 20 }),
    body('banos').optional().isInt({ min: 0, max: 20 }),
    body('estacionamientos').optional().isInt({ min: 0, max: 20 }),
    body('estado').optional().isString().isLength({ max: 40 }),
    body('mantenimientoMensual').optional().isFloat({ min: 0 }),
    body('fechaEntrega').optional().isISO8601(),
    body('amoblado').optional().isBoolean(),
  ];
  static validateUpdate = [
    body('nombre').optional().isString().isLength({ min: 2, max: 80 }),
    body('descripcion').optional().isString().isLength({ max: 2000 }),
    body('precioBase').optional().isFloat({ min: 0 }),
    body('moneda').optional().isString().isLength({ min: 2, max: 8 }),
    body('incluyeIgv').optional().isBoolean(),
    body('igvPorcentaje').optional().isFloat({ min: 0, max: 100 }),
    body('descuentoPorcentaje').optional().isFloat({ min: 0, max: 100 }),
    body('vigenciaDias').optional().isInt({ min: 1, max: 365 }),
    body('condicionesPago').optional().isString().isLength({ max: 2000 }),
    body('notas').optional().isString().isLength({ max: 4000 }),
    body('itemsJson').optional(),
    body('propiedadTipo').optional().isString().isLength({ max: 40 }),
    body('propiedadUbicacion').optional().isString().isLength({ max: 255 }),
    body('areaM2').optional().isFloat({ min: 0 }),
    body('dormitorios').optional().isInt({ min: 0, max: 20 }),
    body('banos').optional().isInt({ min: 0, max: 20 }),
    body('estacionamientos').optional().isInt({ min: 0, max: 20 }),
    body('estado').optional().isString().isLength({ max: 40 }),
    body('mantenimientoMensual').optional().isFloat({ min: 0 }),
    body('fechaEntrega').optional().isISO8601(),
    body('amoblado').optional().isBoolean(),
  ];

  static async list(req, res) {
    try {
      const rows = await CotizacionesService.list();
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    try {
      const created = await CotizacionesService.create(req.body);
      res.status(201).json({ success: true, data: created });
    } catch (e) {
      const status = e.message.includes('existe') ? 409 : 400;
      res.status(status).json({ success: false, message: e.message });
    }
  }

  static async get(req, res) {
    try {
      const row = await CotizacionesService.get(req.params.id);
      if (!row) return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
      res.json({ success: true, data: row });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    try {
      const updated = await CotizacionesService.update(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (e) {
      const status = e.message.includes('no encontrada') ? 404 : (e.message.includes('existe') ? 409 : 400);
      res.status(status).json({ success: false, message: e.message });
    }
  }

  static async remove(req, res) {
    try {
      await CotizacionesService.remove(req.params.id);
      res.json({ success: true });
    } catch (e) {
      const status = e.message.includes('no se puede eliminar') ? 409 : (e.message.includes('no encontrada') ? 404 : 400);
      res.status(status).json({ success: false, message: e.message });
    }
  }
}

module.exports = CotizacionesController;
