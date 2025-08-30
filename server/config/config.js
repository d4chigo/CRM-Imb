// Configuración del servidor CRM Inmobiliario
// Cargar variables de entorno desde la raíz del monorepo primero (../.env), fallback a local
const path = require('path');
const fs = require('fs');
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else {
  require('dotenv').config();
}

const config = {
  // Configuración del servidor
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Configuración de la base de datos MySQL
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crm_imb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Configuraciones de seguridad para MySQL
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },

  // Configuración de JWT y autenticación
  jwt: {
    secret: process.env.JWT_SECRET || 'jwt_secret_default_cambiar_en_produccion',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh_secret_default_cambiar',
    expiresIn: process.env.JWT_EXPIRE || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  },

  // Configuración de cookies
  cookie: {
    secret: process.env.COOKIE_SECRET || 'cookie_secret_default_cambiar',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
  },

  // URL del frontend para CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

module.exports = config;