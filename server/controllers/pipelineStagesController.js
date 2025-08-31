const { validationResult, body, param } = require('express-validator');
const PipelineStagesService = require('../services/pipelineStagesService');

class PipelineStagesController {
  static validateCreate = [
    // Permitir omitir id o enviarlo vacío: se generará un slug automáticamente
    body('id')
      .optional({ checkFalsy: true })
      .customSanitizer(v => v === '' ? undefined : v)
      .isString().trim().isLength({ min: 2, max: 64 }).matches(/^[a-z0-9_]+$/).withMessage('ID inválido'),
    body('title').isString().trim().isLength({ min: 2, max: 80 }).withMessage('Título inválido'),
    body('color').isString().matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).withMessage('Color hex inválido')
  ];

  static validateUpdate = [
    param('id').isString().trim().isLength({ min: 2, max: 64 }).matches(/^[a-z0-9_]+$/),
    body('title').optional().isString().trim().isLength({ min: 2, max: 80 }),
    body('color').optional().isString().matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/),
    body('order').optional().isInt({ min: 0, max: 1000 }).toInt()
  ];

  static async list(req, res) {
    try {
      const rows = await PipelineStagesService.list();
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }
    try {
      // Generar slug automático si no se provee id
      let { id, title, color } = req.body;
      if (!id) {
        const base = title
          .toString()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // quitar acentos
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 64);
        id = base || `etapa_${Date.now()}`;
      }
      const created = await PipelineStagesService.create({ id, title, color });
      res.status(201).json({ success: true, data: created });
    } catch (e) {
      const status = e.message.includes('existe') ? 409 : 400;
      res.status(status).json({ success: false, message: e.message });
    }
  }

  static async remove(req, res) {
    try {
      await PipelineStagesService.remove(req.params.id);
      res.json({ success: true });
    } catch (e) {
      const status = e.message.includes('uso') ? 409 : 404;
      res.status(status).json({ success: false, message: e.message });
    }
  }

  static async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
    }
    try {
      const updated = await PipelineStagesService.update(req.params.id, { title: req.body.title, color: req.body.color, order: req.body.order });
      res.json({ success: true, data: updated });
    } catch (e) {
      const status = e.message.includes('no encontrada') ? 404 : 400;
      res.status(status).json({ success: false, message: e.message });
    }
  }
}

module.exports = PipelineStagesController;