const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const ContactsController = require('../controllers/contactsController');
const router = express.Router();

router.get('/', isAuthenticated, ContactsController.list);
router.post('/', isAuthenticated, ContactsController.validateCreate, ContactsController.create);
router.get('/:id', isAuthenticated, ContactsController.get);
router.patch('/:id', isAuthenticated, ContactsController.validateUpdate, ContactsController.update);
// Simplificado: en entorno mono-usuario se permite eliminar sin rol admin específico
router.delete('/:id', isAuthenticated, ContactsController.remove);

// Duplicados y merge
router.get('/utils/duplicates', isAuthenticated, ContactsController.duplicates);
router.post('/utils/merge', isAuthenticated, ContactsController.validateMerge, ContactsController.merge);

// Operaciones masivas
router.post('/utils/bulk-tag', isAuthenticated, ContactsController.bulkTag);
router.post('/utils/bulk-move-pipeline', isAuthenticated, ContactsController.bulkMoveToPipeline);

module.exports = router;