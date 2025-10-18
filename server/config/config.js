// Configuración del servidor CRM Inmobiliario
// Cargar variables de entorno desde la raíz del monorepo primero (../.env), fallback a local
const path = require('path');
const fs = require('fs');
const rootEnv = path.resolve(__dirname, '../../.env');
const localEnv = path.resolve(__dirname, '../.env');

// Cargar primero el .env del root si existe
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
}
// Luego cargar el .env local del servidor para que sobreescriba valores del root
require('dotenv').config({ path: localEnv });

const config = {
  // Configuración del servidor
  port: Number(process.env.PORT) || 4000,
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

if (process.env.NODE_ENV === 'development') {
  console.log('[config] PORT:', config.port, 'DB_HOST:', config.database.host, 'FRONTEND_URL:', config.frontendUrl);
  console.log('[config] GOOGLE vars presentes:', {
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || null
  });
  console.log('[config] AI keys presentes:', {
    OPENAI: !!process.env.OPENAI_API_KEY,
    GEMINI: !!process.env.GEMINI_API_KEY,
    DEEPSEEK: !!process.env.DEEPSEEK_API_KEY,
    VENICE: !!process.env.VENICE_API_KEY,
  });
}