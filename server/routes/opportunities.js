const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const OpportunitiesController = require('../controllers/opportunitiesController');
const router = express.Router();

router.get('/', isAuthenticated, OpportunitiesController.list);
router.post('/', isAuthenticated, OpportunitiesController.validateCreate, OpportunitiesController.create);
router.get('/:id', isAuthenticated, OpportunitiesController.get);
router.patch('/:id', isAuthenticated, OpportunitiesController.validateUpdate, OpportunitiesController.update);
router.delete('/:id', isAuthenticated, OpportunitiesController.remove);

module.exports = router;