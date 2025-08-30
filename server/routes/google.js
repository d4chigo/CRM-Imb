const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const GoogleContactsController = require('../controllers/googleContactsController');
const router = express.Router();

// Obtener URL de autorización de Google
router.get('/contacts/auth-url', authenticateToken, GoogleContactsController.authUrl);
// Callback después de autorizar (Google redirige aquí con ?code=...)
router.get('/contacts/callback', authenticateToken, GoogleContactsController.callback);

module.exports = router;