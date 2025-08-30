const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const GoogleContactsController = require('../controllers/googleContactsController');
const router = express.Router();

// Obtener URL de autorización de Google
router.get('/contacts/auth-url', authenticateToken, GoogleContactsController.authUrl);
// Callback después de autorizar (Google redirige aquí con ?code=...)
router.get('/contacts/callback', authenticateToken, GoogleContactsController.callback);

// Debug: verificar variables de entorno (solo autenticado)
router.get('/contacts/env-check', authenticateToken, (req,res)=>{
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