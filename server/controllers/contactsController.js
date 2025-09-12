const { body, validationResult } = require('express-validator');
const ContactsService = require('../services/contactsService');

class ContactsController {
  static validateCreate = [
    body('nombre').isString().trim().isLength({ min: 2, max: 120 }),
    body('email').optional({ values: 'falsy' }).isEmail().trim().normalizeEmail(),
    body('telefono').optional().isString().isLength({ max: 40 }),
    body('tipo').optional().isIn(['lead','prospecto','cliente']),
    body('origen').optional().isString().isLength({ max: 80 }),
    body('notas').optional().isString(),
    body('departamento').optional({ values: 'falsy' }).isString().isLength({ max: 80 }),
    body('sexo').optional({ values: 'falsy' }).isIn(['M','F','O']),
    body('fecha_nacimiento').optional({ values: 'falsy' }).isISO8601().toDate(),
    body('etiquetas').optional().custom(v => Array.isArray(v) || typeof v === 'string').withMessage('etiquetas debe ser array o JSON'),
    body('etiqueta_otro').optional({ values: 'falsy' }).isString().isLength({ max: 160 })
  ];

  static validateUpdate = [
    body('nombre').optional().isString().trim().isLength({ min: 2, max: 120 }),
    body('email').optional({ values: 'falsy' }).isEmail().trim().normalizeEmail(),
    body('telefono').optional().isString().isLength({ max: 40 }),
    body('tipo').optional().isIn(['lead','prospecto','cliente']),
    body('origen').optional().isString().isLength({ max: 80 }),
    body('notas').optional().isString(),
    body('departamento').optional({ values: 'falsy' }).isString().isLength({ max: 80 }),
    body('sexo').optional({ values: 'falsy' }).isIn(['M','F','O']),
    body('fecha_nacimiento').optional({ values: 'falsy' }).isISO8601().toDate(),
    body('etiquetas').optional().custom(v => Array.isArray(v) || typeof v === 'string').withMessage('etiquetas debe ser array o JSON'),
    body('etiqueta_otro').optional({ values: 'falsy' }).isString().isLength({ max: 160 })
  ];

  static async list(req, res) {
    try {
      const page = Math.max(parseInt(req.query.page || '1',10), 1);
      const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '20',10), 1), 100);
      const search = (req.query.search || '').toString();
      const type = (req.query.type || '').toString();
      const { rows, total } = await ContactsService.listPaged({ page, pageSize, search, type });
      res.json({ success: true, data: rows, meta: { page, pageSize, total } });
    } catch(e) {
      res.status(500).json({ success:false, message: e.message });
    }
  }

  static async create(req,res){
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ success:false, message:'Datos inválidos', errors: errors.array() });
    try { 
      const c = await ContactsService.create(req.body); 
      res.status(201).json({ success:true, data: c }); 
    } catch(e){ 
      res.status(400).json({ success:false, message: e.message }); 
    }
  }

  static async get(req,res){
    try {
      const c = await ContactsService.get(req.params.id);
      if(!c) return res.status(404).json({ success:false, message:'Contacto no encontrado' });
      res.json({ success:true, data:c });
    } catch(e){
      res.status(500).json({ success:false, message:e.message });
    }
  }
  static async update(req,res){
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ success:false, message:'Datos inválidos', errors: errors.array() });
    try { const c = await ContactsService.update(req.params.id, req.body); res.json({ success:true, data:c }); }
    catch(e){ const status = e.message.includes('no encontrado')?404:400; res.status(status).json({ success:false, message:e.message }); }
  }
  static async remove(req,res){
    try { await ContactsService.remove(req.params.id); res.json({ success:true }); }
    catch(e){ const status = e.message.includes('oportunidades')?409:404; res.status(status).json({ success:false, message:e.message }); }
  }

  // Duplicates discovery by email/phone exact match
  static async duplicates(req,res){
    try {
      const by = (req.query.by || 'email,telefono').toString();
      const groups = await ContactsService.findDuplicates({ by: by.split(',').map(s=>s.trim()).filter(Boolean) });
      res.json({ success:true, data: groups });
    } catch(e){ res.status(500).json({ success:false, message:e.message }); }
  }

  // Merge duplicate into primary; re-link oportunidades
  static validateMerge = [
    body('primaryId').isInt({ min:1 }),
    body('duplicateId').isInt({ min:1 }),
    body('strategy').optional().isIn(['prefer-primary','prefer-filled'])
  ];
  static async merge(req,res){
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ success:false, message:'Datos inválidos', errors: errors.array() });
    try {
      const { primaryId, duplicateId, strategy = 'prefer-filled' } = req.body;
      const merged = await ContactsService.mergeContacts(primaryId, duplicateId, { strategy });
      res.json({ success:true, data: merged });
    } catch(e){ const status = e.message.includes('no encontrado')?404:400; res.status(status).json({ success:false, message:e.message }); }
  }

  // --- Utilidades masivas ---
  static async bulkTag(req,res){
    try {
      const { ids = [], etiqueta, etiqueta_otro = null } = req.body || {};
      const result = await ContactsService.bulkTag({ ids, etiqueta, etiqueta_otro });
      res.json({ success:true, data: result });
    } catch(e){ res.status(400).json({ success:false, message: e.message }); }
  }

  static async bulkMoveToPipeline(req,res){
    try {
      const { ids = [] } = req.body || {};
      const result = await ContactsService.bulkMoveToPipeline({ ids });
      res.json({ success:true, data: result });
    } catch(e){ res.status(400).json({ success:false, message: e.message }); }
  }
}
module.exports = ContactsController;