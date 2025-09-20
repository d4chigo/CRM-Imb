// Controlador de autenticación para CRM Inmobiliario
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/authService');

/**
 * Controlador para manejo de autenticación
 */
class AuthController {

  /**
   * Validaciones para login
   */
  static loginValidation = [
    body('email')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail()
      .trim(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('La contraseña debe tener al menos 6 caracteres')
      .trim()
  ];

  /**
   * Validaciones para registro de usuario
   */
  static registerValidation = [
    body('nombre')
      .isLength({ min: 2, max: 120 })
      .withMessage('El nombre debe tener entre 2 y 120 caracteres')
      .trim(),
    body('email')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail()
      .trim(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
    body('rol')
      .optional()
      .isIn(['agente', 'supervisor', 'admin'])
      .withMessage('Rol inválido')
  ];

  /**
   * Login de usuario
   * POST /api/auth/login
   */
  static async login(req, res) {
    try {
      // Verificar errores de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Autenticar usuario
      const authResult = await AuthService.authenticateUser(email, password);

      // Configurar cookie segura con refresh token
      res.cookie('refreshToken', authResult.tokens.refreshToken, {
        httpOnly: true, // No accesible desde JavaScript (seguridad XSS)
        secure: process.env.NODE_ENV === 'production', // HTTPS en producción
        // En desarrollo permitimos LAX para requests cross-origin (frontend en 192.168.x.x:3000 / localhost:3000)
        // En producción mantenemos 'strict' para mayor protección CSRF
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      });

      // Respuesta exitosa
      const isElectron = (req.headers['x-client'] === 'electron');
      const isDev = process.env.NODE_ENV !== 'production';
      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: authResult.user,
          accessToken: authResult.tokens.accessToken,
          // En desarrollo o cliente Electron, exponemos refreshToken para apps sin cookies (ej: Electron)
          ...(isDev || isElectron ? { refreshToken: authResult.tokens.refreshToken } : {})
        }
      });

    } catch (error) {
      console.error('Error en login:', error.message);
      
      // No revelar información específica sobre el error por seguridad
      res.status(401).json({
        success: false,
        message: error.message === 'Credenciales inválidas' || error.message.includes('inactivo') 
          ? error.message 
          : 'Error de autenticación'
      });
    }
  }

  /**
   * Renovar access token
   * POST /api/auth/refresh
   */
  static async refresh(req, res) {
    try {
      // Intentar obtener refresh token desde cookie o headers (para clientes sin cookies como Electron)
      let refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        const auth = req.headers['authorization'];
        if (auth && auth.toLowerCase().startsWith('bearer ')) {
          refreshToken = auth.slice(7);
        } else if (req.headers['x-refresh-token']) {
          refreshToken = req.headers['x-refresh-token'];
        }
      }

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token requerido'
        });
      }

      // Renovar access token
      const result = await AuthService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        message: 'Token renovado exitosamente',
        data: {
          accessToken: result.accessToken
        }
      });

    } catch (error) {
      console.error('Error renovando token:', error.message);
      
      // Limpiar cookie si el refresh token es inválido
      res.clearCookie('refreshToken');
      
      res.status(401).json({
        success: false,
        message: 'Refresh token inválido o expirado'
      });
    }
  }

  /**
   * Logout de usuario
   * POST /api/auth/logout
   */
  static async logout(req, res) {
    try {
      const userId = req.user?.id;

      if (userId) {
        // Invalidar refresh token en la base de datos
        await AuthService.logoutUser(userId);
      }

      // Limpiar cookie
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logout exitoso'
      });

    } catch (error) {
      console.error('Error en logout:', error.message);
      
      // Aún así limpiar la cookie
      res.clearCookie('refreshToken');
      
      res.status(500).json({
        success: false,
        message: 'Error en logout'
      });
    }
  }

  /**
   * Obtener información del usuario actual
   * GET /api/auth/me
   */
  static async me(req, res) {
    try {
      // La información del usuario viene del middleware de autenticación
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });

    } catch (error) {
      console.error('Error obteniendo perfil:', error.message);
      
      res.status(500).json({
        success: false,
        message: 'Error obteniendo información del usuario'
      });
    }
  }

  /**
   * Registrar nuevo usuario (solo administradores)
   * POST /api/auth/register
   */
  static async register(req, res) {
    try {
      // Verificar errores de validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos inválidos',
          errors: errors.array()
        });
      }

      const { nombre, email, password, rol } = req.body;

      // Crear usuario
      const user = await AuthService.createUser({
        nombre,
        email,
        password,
        rol
      });

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: {
          user
        }
      });

    } catch (error) {
      console.error('Error creando usuario:', error.message);
      
      const statusCode = error.message.includes('email ya está registrado') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error creando usuario'
      });
    }
  }
}

module.exports = AuthController;
