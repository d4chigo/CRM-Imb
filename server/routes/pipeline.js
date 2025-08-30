const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const PipelineStagesController = require('../controllers/pipelineStagesController');

const router = express.Router();

// Listar etapas (auth requerida, cualquier rol activo)
router.get('/stages', authenticateToken, PipelineStagesController.list);

// Crear etapa (solo admin)
router.post('/stages', authenticateToken, requireAdmin, PipelineStagesController.validateCreate, PipelineStagesController.create);

// Eliminar etapa (solo admin)
router.delete('/stages/:id', authenticateToken, requireAdmin, PipelineStagesController.remove);

module.exports = router;