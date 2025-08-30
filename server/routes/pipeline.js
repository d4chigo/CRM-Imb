const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const PipelineStagesController = require('../controllers/pipelineStagesController');

const router = express.Router();

// Listar etapas (auth requerida, cualquier rol activo)
router.get('/stages', authenticateToken, PipelineStagesController.list);

// Crear etapa (cualquier usuario autenticado)
router.post('/stages', authenticateToken, PipelineStagesController.validateCreate, PipelineStagesController.create);

// Eliminar etapa (cualquier usuario autenticado)
router.delete('/stages/:id', authenticateToken, PipelineStagesController.remove);

// Actualizar etapa (cualquier usuario autenticado)
router.patch('/stages/:id', authenticateToken, PipelineStagesController.validateUpdate, PipelineStagesController.update);

module.exports = router;