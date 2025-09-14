const express = require('express');
const { isAuthenticated, requireAdmin } = require('../middleware/auth');
const StatsController = require('../controllers/statsController');

const router = express.Router();

// Todas las rutas de estadísticas requieren autenticación
router.get('/contacts/by-department', isAuthenticated, StatsController.contactsByDepartment);
router.get('/contacts/by-sex', isAuthenticated, StatsController.contactsBySex);
router.get('/contacts/by-age', isAuthenticated, StatsController.contactsByAgeRanges);

// Admin: inferir sexo por nombre y actualizar registros sin sexo (o con 'O')
router.post('/contacts/infer-sex', isAuthenticated, requireAdmin, StatsController.inferSexAndUpdate);

module.exports = router;
