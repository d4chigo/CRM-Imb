// Middleware de seguridad general para CRM Inmobiliario
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const config = require('../config/config');

/**
 * Rate limiting para prevenir ataques de fuerza bruta en login
 * Limita a 5 intentos por IP cada 15 minutos
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos por ventana de tiempo
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intenta nuevamente en 15 minutos.',
    retryAfter: 15 * 60 // En segundos
  },
  standardHeaders: true, // Incluir rate limit info en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilitar headers `X-RateLimit-*`
  // Solo aplicar a requests de login
  skip: (req) => req.path !== '/auth/login',
});

/**
 * Rate limiting general para la API
 * Limita a 100 requests por IP cada 15 minutos
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests por ventana de tiempo
  message: {
    success: false,
    message: 'Demasiadas requests. Intenta nuevamente más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Configuración de CORS para permitir requests del frontend
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (aplicaciones móviles, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Lista de dominios permitidos
    const allowedOrigins = [
      config.frontendUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      // Agregar más dominios en producción si es necesario
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por política CORS'));
    }
  },
  credentials: true, // Permitir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

/**
 * Configuración de Helmet para headers de seguridad
 */
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Deshabilitar para desarrollo
};

/**
 * Middleware para logging de requests en desarrollo
 */
const requestLogger = (req, res, next) => {
  if (config.nodeEnv === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  }
  next();
};

/**
 * Middleware para manejo de errores globales
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error global:', err.stack);

  // Error de CORS
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'Acceso no permitido por política CORS'
    });
  }

  // Error de validación de Express Validator
  if (err.type === 'validation') {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: err.errors
    });
  }

  // Error por defecto
  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'development' ? err.message : 'Error interno del servidor'
  });
};

module.exports = {
  loginLimiter,
  apiLimiter,
  corsOptions,
  helmetOptions,
  requestLogger,
  errorHandler,
};
