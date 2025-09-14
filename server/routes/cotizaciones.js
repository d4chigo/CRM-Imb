const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const CotizacionesController = require('../controllers/cotizacionesController');

const router = express.Router();

router.get('/', isAuthenticated, CotizacionesController.list);
router.post('/', isAuthenticated, CotizacionesController.validateCreate, CotizacionesController.create);
router.get('/:id', isAuthenticated, CotizacionesController.get);
router.patch('/:id', isAuthenticated, CotizacionesController.validateUpdate, CotizacionesController.update);
router.delete('/:id', isAuthenticated, CotizacionesController.remove);

module.exports = router;
