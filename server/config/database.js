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
