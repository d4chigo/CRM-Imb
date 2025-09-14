const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const PipelineStagesController = require('../controllers/pipelineStagesController');

const router = express.Router();

// Listar etapas (auth requerida, cualquier rol activo)
router.get('/stages', isAuthenticated, PipelineStagesController.list);

// Crear etapa (cualquier usuario autenticado)
router.post('/stages', isAuthenticated, PipelineStagesController.validateCreate, PipelineStagesController.create);

// Eliminar etapa (cualquier usuario autenticado)
router.delete('/stages/:id', isAuthenticated, PipelineStagesController.remove);

// Actualizar etapa (cualquier usuario autenticado)
router.patch('/stages/:id', isAuthenticated, PipelineStagesController.validateUpdate, PipelineStagesController.update);

module.exports = router;