const express = require('express');
const router = express.Router();
const QuotesService = require('../services/quotesService');
const { isAuthenticated } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// GET unique quote by contact
router.get('/by-contact/:contactoId', isAuthenticated, async (req, res) => {
  try {
    const contactoId = Number(req.params.contactoId);
    const row = await QuotesService.getByContact(contactoId);
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

const validateUpsert = [
  body('cliente_nombre').isString().isLength({ min: 2, max: 120 }),
  body('moneda').optional().isString().isLength({ min: 3, max: 8 }),
  body('tea').optional().isFloat({ min: 0, max: 100 }),
  body('tem').optional().isFloat({ min: 0, max: 100 }),
  body('s_desgravamen_pct').optional().isFloat({ min: 0, max: 100 }),
  body('itf_pct').optional().isFloat({ min: 0, max: 100 }),
  body('monto').isFloat({ min: 1 }),
  body('plazo_meses').isInt({ min: 1, max: 600 }),
  body('cuota_mensual').isFloat({ min: 0 }),
  body('total_interes').isFloat({ min: 0 }),
  body('total_pagar').isFloat({ min: 0 }),
  body('amortizacion').optional().isArray(),
  body('amortizacion_json').optional(),
];

// PUT upsert unique quote by contact
router.put('/by-contact/:contactoId', isAuthenticated, validateUpsert, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errors.array() });
  try {
    const contactoId = Number(req.params.contactoId);
    const saved = await QuotesService.upsertByContact(contactoId, req.body, { keepHistory: true });
    res.json({ success: true, data: saved });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// DELETE by contact
router.delete('/by-contact/:contactoId', isAuthenticated, async (req, res) => {
  try {
    const contactoId = Number(req.params.contactoId);
    await QuotesService.deleteByContact(contactoId);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

module.exports = router;
