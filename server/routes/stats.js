const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const StatsController = require('../controllers/statsController');

const router = express.Router();

// Todas las rutas de estadísticas requieren autenticación
router.get('/contacts/by-department', authenticateToken, StatsController.contactsByDepartment);
router.get('/contacts/by-sex', authenticateToken, StatsController.contactsBySex);
router.get('/contacts/by-age', authenticateToken, StatsController.contactsByAgeRanges);

// Admin: inferir sexo por nombre y actualizar registros sin sexo (o con 'O')
router.post('/contacts/infer-sex', authenticateToken, requireAdmin, StatsController.inferSexAndUpdate);

module.exports = router;
