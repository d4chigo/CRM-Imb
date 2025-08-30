const { body, validationResult } = require('express-validator');
const ContactsService = require('../services/contactsService');

class ContactsController {
  static validateCreate = [
    body('nombre').isString().trim().isLength({ min: 2, max: 120 }),
    body('email').optional({ values: 'falsy' }).isEmail().trim().normalizeEmail(),
    body('telefono').optional().isString().isLength({ max: 40 }),
    body('tipo').optional().isIn(['lead','prospecto','cliente']),
    body('origen').optional().isString().isLength({ max: 80 }),
    body('notas').optional().isString()
  ];

  static async list(req, res) {
    try { const rows = await ContactsService.list(); res.json({ success: true, data: rows }); }
    catch(e){ res.status(500).json({ success:false, message: e.message }); }
  }
  static async create(req,res){
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({ success:false, message:'Datos inválidos', errors: errors.array() });
    try { const c = await ContactsService.create(req.body); res.status(201).json({ success:true, data: c }); }
    catch(e){ res.status(400).json({ success:false, message: e.message }); }
  }
  static async remove(req,res){
    try { await ContactsService.remove(req.params.id); res.json({ success:true }); }
    catch(e){ const status = e.message.includes('oportunidades')?409:404; res.status(status).json({ success:false, message:e.message }); }
  }
}
module.exports = ContactsController;