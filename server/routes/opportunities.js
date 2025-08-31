const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const OpportunitiesController = require('../controllers/opportunitiesController');
const router = express.Router();

router.get('/', authenticateToken, OpportunitiesController.list);
router.post('/', authenticateToken, OpportunitiesController.validateCreate, OpportunitiesController.create);
router.get('/:id', authenticateToken, OpportunitiesController.get);
router.patch('/:id', authenticateToken, OpportunitiesController.validateUpdate, OpportunitiesController.update);
router.delete('/:id', authenticateToken, OpportunitiesController.remove);

module.exports = router;