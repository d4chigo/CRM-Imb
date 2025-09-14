// Rutas de autenticación para CRM Inmobiliario
const express = require('express');
const AuthController = require('../controllers/authController');
const { isAuthenticated, requireAdmin } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/security');

const router = express.Router();

/**
 * Rutas públicas de autenticación
 */

// Login de usuario
// POST /api/auth/login
router.post('/login', 
  loginLimiter, // Rate limiting para prevenir ataques de fuerza bruta
  AuthController.loginValidation, // Validación de datos
  AuthController.login
);

// Renovar access token usando refresh token
// POST /api/auth/refresh
router.post('/refresh', AuthController.refresh);

/**
 * Rutas protegidas (requieren autenticación)
 */

// Logout del usuario actual
// POST /api/auth/logout
router.post('/logout', 
  isAuthenticated, // Verificar token válido
  AuthController.logout
);

// Obtener información del usuario actual
// GET /api/auth/me
router.get('/me', 
  isAuthenticated, // Verificar token válido
  AuthController.me
);

/**
 * Rutas de administrador (requieren rol admin)
 */

// Registrar nuevo usuario (solo administradores)
// POST /api/auth/register
router.post('/register',
  isAuthenticated, // Verificar token válido
  requireAdmin, // Solo administradores pueden crear usuarios
  AuthController.registerValidation, // Validación de datos
  AuthController.register
);

module.exports = router;
