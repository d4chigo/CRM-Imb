// Servidor principal del CRM Inmobiliario con configuración de seguridad
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');

const config = require('./config/config');
const { testConnection, ensureSchema } = require('./config/database');
const {
  corsOptions,
  helmetOptions,
  apiLimiter,
  requestLogger,
  errorHandler
} = require('./middleware/security');

// Importar rutas
const authRoutes = require('./routes/auth');
const pipelineRoutes = require('./routes/pipeline');
const contactsRoutes = require('./routes/contacts');
const opportunitiesRoutes = require('./routes/opportunities');

const app = express();

// Configurar puerto
app.set('port', config.port);

// Probar conexión a la base de datos al inicio
testConnection().then(() => ensureSchema());

/**
 * Middleware de seguridad
 */

// Headers de seguridad con Helmet
app.use(helmet(helmetOptions));

// CORS configurado para el frontend
app.use(cors(corsOptions));

// Rate limiting general para la API
app.use('/api', apiLimiter);

// Logging de requests en desarrollo
app.use(requestLogger);

/**
 * Middleware de parsing
 */

// Parser JSON con límite de tamaño
app.use(express.json({ limit: '10mb' }));

// Parser URL-encoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Parser de cookies para refresh tokens
app.use(cookieParser());

/**
 * Rutas de la API
 */

// Rutas de autenticación
app.use('/api/auth', authRoutes);
// Rutas de pipeline
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/opportunities', opportunitiesRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'CRM Inmobiliario API funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Ruta por defecto para rutas no encontradas
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl
  });
});

/**
 * Middleware de manejo de errores (debe ir al final)
 */
app.use(errorHandler);

module.exports = app;