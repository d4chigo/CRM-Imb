const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const ContactsController = require('../controllers/contactsController');
const router = express.Router();

router.get('/', authenticateToken, ContactsController.list);
router.post('/', authenticateToken, ContactsController.validateCreate, ContactsController.create);
router.get('/:id', authenticateToken, ContactsController.get);
router.patch('/:id', authenticateToken, ContactsController.validateUpdate, ContactsController.update);
router.delete('/:id', authenticateToken, requireAdmin, ContactsController.remove);

module.exports = router;