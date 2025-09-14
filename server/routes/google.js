const express = require('express');
const router = express.Router();
const GoogleContactsController = require('../controllers/googleContactsController');
const { isAuthenticated } = require('../middleware/auth');

// Ruta para obtener URL de autenticación
router.get('/contacts/auth-url', isAuthenticated, GoogleContactsController.authUrl);

// Callback de OAuth2 (maneja redirección desde Google)
router.get('/contacts/callback', GoogleContactsController.callback);

// Sincronizar manualmente contactos de Google al CRM
router.post('/contacts/sync', isAuthenticated, GoogleContactsController.syncContacts);

// Obtener estado de sincronización
router.get('/contacts/sync/status', isAuthenticated, GoogleContactsController.getSyncStatus);

// Crear/actualizar un contacto específico en Google (compatibilidad)
router.post('/contacts/:id/sync', isAuthenticated, GoogleContactsController.createGoogleContact);
// Compat: endpoints usados por el cliente actual para crear/upsert (redirigen al handler por id si aplica)
router.post('/contacts/create', isAuthenticated, GoogleContactsController.createGoogleContact);
router.post('/contacts/upsert', isAuthenticated, GoogleContactsController.createGoogleContact);

// Preview para depurar importación
router.get('/contacts/preview', isAuthenticated, GoogleContactsController.preview);

// Debug: verificar variables de entorno (solo autenticado)
router.get('/contacts/env-check', isAuthenticated, (req,res)=>{
	res.json({
		success:true,
		data:{
			GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
			GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || null
		}
	});
});

module.exports = router;