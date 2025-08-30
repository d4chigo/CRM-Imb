const { body, validationResult } = require('express-validator');
const OpportunitiesService = require('../services/opportunitiesService');

class OpportunitiesController {
  static validateCreate = [
    body('servicioId').isInt({ min:1 }),
    body('etapaId').isString().isLength({ min:2, max:64 }),
    body('nombreCliente').isString().isLength({ min:2, max:120 }),
    body('valorUsd').optional().isFloat({ min:0 }),
    body('probabilidad').optional().isInt({ min:0, max:100 }),
    body('fechaCierre').optional().isISO8601(),
    body('telefono').optional().isString().isLength({ max:40 }),
    body('email').optional().isEmail(),
  ];
  static validateUpdate = [
    body('servicioId').optional().isInt({ min:1 }),
    body('etapaId').optional().isString().isLength({ min:2, max:64 }),
    body('nombreCliente').optional().isString().isLength({ min:2, max:120 }),
    body('valorUsd').optional().isFloat({ min:0 }),
    body('probabilidad').optional().isInt({ min:0, max:100 }),
    body('fechaCierre').optional().isISO8601(),
    body('telefono').optional().isString().isLength({ max:40 }),
    body('email').optional().isEmail(),
  ];
  static async list(req,res){ try { const rows = await OpportunitiesService.list(); res.json({ success:true, data: rows }); } catch(e){ res.status(500).json({ success:false, message:e.message }); } }
  static async create(req,res){ const errors = validationResult(req); if(!errors.isEmpty()) return res.status(400).json({ success:false, message:'Datos inválidos', errors: errors.array() }); try { const o = await OpportunitiesService.create(req.body); res.status(201).json({ success:true, data:o }); } catch(e){ res.status(400).json({ success:false, message:e.message }); } }
  static async get(req,res){ try { const o = await OpportunitiesService.get(req.params.id); if(!o) return res.status(404).json({ success:false, message:'Oportunidad no encontrada' }); res.json({ success:true, data:o }); } catch(e){ res.status(500).json({ success:false, message:e.message }); } }
  static async update(req,res){ const errors = validationResult(req); if(!errors.isEmpty()) return res.status(400).json({ success:false, message:'Datos inválidos', errors: errors.array() }); try { const o = await OpportunitiesService.update(req.params.id, req.body); res.json({ success:true, data:o }); } catch(e){ const status = e.message.includes('no encontrada')?404:400; res.status(status).json({ success:false, message:e.message }); } }
  static async remove(req,res){ try { await OpportunitiesService.remove(req.params.id); res.json({ success:true }); } catch(e){ const status = e.message.includes('no encontrada')?404:400; res.status(status).json({ success:false, message:e.message }); } }
}

module.exports = OpportunitiesController;