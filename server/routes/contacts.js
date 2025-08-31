const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const ContactsController = require('../controllers/contactsController');
const router = express.Router();

router.get('/', authenticateToken, ContactsController.list);
router.post('/', authenticateToken, ContactsController.validateCreate, ContactsController.create);
router.get('/:id', authenticateToken, ContactsController.get);
router.patch('/:id', authenticateToken, ContactsController.validateUpdate, ContactsController.update);
// Simplificado: en entorno mono-usuario se permite eliminar sin rol admin específico
router.delete('/:id', authenticateToken, ContactsController.remove);

module.exports = router;