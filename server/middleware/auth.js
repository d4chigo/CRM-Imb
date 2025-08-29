// Middleware de autenticación JWT para CRM Inmobiliario
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { queryOne } = require('../config/database');

/**
 * Middleware para verificar token JWT en las requests
 * Extrae el token del header Authorization y valida su autenticidad
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extraer token del header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de acceso requerido' 
      });
    }

    // Verificar y decodificar el token JWT
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Verificar que el usuario aún existe y está activo en la BD
    const user = await queryOne(
      'SELECT id, nombre_completo, email, rol, activo FROM usuarios WHERE id = ? AND activo = TRUE',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado o inactivo' 
      });
    }

    // Agregar información del usuario al request para uso en controllers
    req.user = {
      id: user.id,
      nombre: user.nombre_completo,
      email: user.email,
      rol: user.rol
    };

    next();
  } catch (error) {
    console.error('Error en autenticación:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Error interno de autenticación' 
    });
  }
};

/**
 * Middleware para verificar roles específicos
 * Debe usarse después de authenticateToken
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
    }

    const userRole = req.user.rol;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para realizar esta acción',
        requiredRoles: allowedRoles,
        userRole: userRole
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario es administrador
 */
const requireAdmin = requireRole(['admin']);

/**
 * Middleware para verificar que el usuario es supervisor o admin
 */
const requireSupervisor = requireRole(['supervisor', 'admin']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireSupervisor,
};
