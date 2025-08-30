// Script para verificar la base de datos
// Carga el .env desde la RAÍZ del monorepo (../..). Si no existe, intenta local.
const path = require('path');
const fs = require('fs');
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else {
  require('dotenv').config();
}
const { executeQuery, testConnection } = require('../config/database');

async function checkDatabase() {
  try {
    console.log('🔍 Verificando estado de la base de datos...');
    
    // Probar conexión
    await testConnection();
    
    // Verificar tablas existentes
    const tables = await executeQuery('SHOW TABLES');
    console.log('\n📋 Tablas existentes:');
    if (tables.length === 0) {
      console.log('❌ No hay tablas en la base de datos');
      console.log('💡 Ejecuta el script SQL de creación de esquema');
    } else {
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`✅ ${tableName}`);
      });
    }
    
    // Verificar usuarios existentes si la tabla existe
    try {
      const users = await executeQuery('SELECT id, nombre_completo, email, rol, activo FROM usuarios LIMIT 5');
      console.log('\n👥 Usuarios existentes:');
      if (users.length === 0) {
        console.log('❌ No hay usuarios en el sistema');
        console.log('💡 Ejecuta: npm run create-admin');
      } else {
        console.table(users);
      }
    } catch (err) {
      console.log('\n❌ Tabla usuarios no existe');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
