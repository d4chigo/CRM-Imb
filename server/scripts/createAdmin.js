// Script para crear usuario administrador inicial en CRM Inmobiliario
// Carga variables desde raíz (../..)
const path = require('path');
const fs = require('fs');
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else {
  require('dotenv').config();
}
const AuthService = require('../services/authService');
const { testConnection } = require('../config/database');

/**
 * Script para crear el primer usuario administrador del sistema
 * Ejecutar con: node scripts/createAdmin.js
 */

async function createAdminUser() {
  try {
    console.log('🚀 Iniciando creación de usuario administrador...');
    
    // Probar conexión a la base de datos
    await testConnection();

    // Datos del administrador por defecto
    const adminData = {
      name: 'Administrador CRM',
      email: 'admin@crm-inmobiliario.com',
      password: 'Admin123!', // Cambiar esta contraseña después del primer login
      role: 'admin'
    };

    console.log(`📧 Creando usuario admin con email: ${adminData.email}`);

    // Crear usuario administrador
    const adminUser = await AuthService.createUser(adminData);

    console.log('✅ Usuario administrador creado exitosamente!');
    console.log('📋 Datos del usuario:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Nombre: ${adminUser.name}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Rol: ${adminUser.role}`);
    console.log('');
    console.log('🔐 Credenciales por defecto:');
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Contraseña: ${adminData.password}`);
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login por seguridad!');
    console.log('');
    console.log('🎉 Ya puedes hacer login en el CRM con estas credenciales.');

  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error.message);
    
    if (error.message.includes('email ya está registrado')) {
      console.log('ℹ️  El usuario administrador ya existe en el sistema.');
      console.log('   Email: admin@crm-inmobiliario.com');
      console.log('   Si olvidaste la contraseña, puedes resetearla desde la base de datos.');
    }
  } finally {
    process.exit(0);
  }
}

// Ejecutar script si es llamado directamente
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };
