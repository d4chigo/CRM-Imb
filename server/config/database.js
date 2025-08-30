// Configuración de conexión a MySQL para CRM Inmobiliario
const mysql = require('mysql2/promise');
const config = require('./config');

// Pool de conexiones para optimizar el rendimiento
// Uso de pool evita crear/destruir conexiones constantemente
const pool = mysql.createPool(config.database);

// Función para probar la conexión a la base de datos
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión exitosa a la base de datos MySQL');
    connection.release(); // Liberar la conexión de vuelta al pool
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    process.exit(1); // Terminar la aplicación si no hay conexión a BD
  }
}

// Función helper para ejecutar queries con manejo de errores
async function executeQuery(query, params = []) {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Error ejecutando query:', error.message);
    throw error;
  }
}

// Función helper para obtener una sola fila
async function queryOne(query, params = []) {
  const results = await executeQuery(query, params);
  return results[0] || null;
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  queryOne,
};

// Auto-migración ligera para asegurar columnas recientes (tipo, origen, notas en contactos; orden en etapas_pipeline)
async function ensureSchema() {
  try {
    const conn = await pool.getConnection();
    const dbName = config.database.database; // nombre de BD
    // Helper para saber si existe columna
    async function columnExists(table, column) {
      const [rows] = await conn.query(`SELECT 1 FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1`, [dbName, table, column]);
      return rows.length > 0;
    }
    // contactos
    if (!(await columnExists('contactos','tipo'))) {
      await conn.query(`ALTER TABLE contactos ADD COLUMN tipo ENUM('lead','prospecto','cliente') DEFAULT 'lead' AFTER telefono`);
      console.log('🛠️  Columna contactos.tipo añadida');
    }
    if (!(await columnExists('contactos','origen'))) {
      await conn.query(`ALTER TABLE contactos ADD COLUMN origen VARCHAR(80) AFTER tipo`);
      console.log('🛠️  Columna contactos.origen añadida');
    }
    if (!(await columnExists('contactos','notas'))) {
      await conn.query(`ALTER TABLE contactos ADD COLUMN notas TEXT AFTER origen`);
      console.log('🛠️  Columna contactos.notas añadida');
    }
    // etapas_pipeline
    if (!(await columnExists('etapas_pipeline','orden'))) {
      await conn.query(`ALTER TABLE etapas_pipeline ADD COLUMN orden INT NOT NULL DEFAULT 0 AFTER color_hex`);
      console.log('🛠️  Columna etapas_pipeline.orden añadida');
    }
    conn.release();
  } catch (e) {
    console.error('⚠️  Error en ensureSchema:', e.message);
  }
}

module.exports.ensureSchema = ensureSchema;
