const path = require('path');
const fs = require('fs');
const express = require('express');

// Cargar variables de entorno
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
}

const GoogleContactsController = require('../controllers/googleContactsController');
const { executeQuery } = require('../config/database');

async function testAPIEndpoints() {
  console.log('=== Test de Endpoints de Google Contacts API ===\n');

  // Mock de request y response para testing
  function createMockReq(userId = 1) {
    return {
      user: { id: userId },
      query: {},
      params: {}
    };
  }

  function createMockRes() {
    const res = {
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { this.data = data; console.log(`Response ${this.statusCode || 200}:`, JSON.stringify(data, null, 2)); },
      send: function(data) { this.data = data; console.log(`Response ${this.statusCode || 200}:`, data); }
    };
    return res;
  }

  try {
    // 1. Test del endpoint de estado de sincronización
    console.log('1. Probando endpoint GET /api/google/contacts/sync/status');
    const req1 = createMockReq();
    const res1 = createMockRes();
    
    await GoogleContactsController.getSyncStatus(req1, res1);
    
    // 2. Test del endpoint de sincronización manual
    console.log('\n2. Probando endpoint POST /api/google/contacts/sync');
    const req2 = createMockReq();
    const res2 = createMockRes();
    
    await GoogleContactsController.syncContacts(req2, res2);
    
    // 3. Test del endpoint de URL de autorización
    console.log('\n3. Probando endpoint GET /api/google/contacts/auth-url');
    const req3 = createMockReq();
    const res3 = createMockRes();
    
    await GoogleContactsController.authUrl(req3, res3);
    
    // 4. Verificar datos en la base de datos
    console.log('\n4. Verificando datos actuales en BD...');
    
    const [tokenInfo] = await executeQuery(
      'SELECT usuario_id, sync_enabled, last_sync, created_at FROM google_tokens WHERE usuario_id = 1'
    );
    
    if (tokenInfo) {
      console.log('📊 Información de tokens:');
      console.log(`   - Usuario: ${tokenInfo.usuario_id}`);
      console.log(`   - Sync habilitado: ${tokenInfo.sync_enabled ? 'Sí' : 'No'}`);
      console.log(`   - Última sync: ${tokenInfo.last_sync}`);
      console.log(`   - Token creado: ${tokenInfo.created_at}`);
    }
    
    const [contactStats] = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN google_resource_name IS NOT NULL THEN 1 END) as with_google,
        COUNT(CASE WHEN origen = 'google' THEN 1 END) as from_google
      FROM contacto
    `);
    
    console.log('\n📊 Estadísticas de contactos:');
    console.log(`   - Total contactos: ${contactStats.total}`);
    console.log(`   - Con Google sync: ${contactStats.with_google}`);
    console.log(`   - Origen Google: ${contactStats.from_google}`);

  } catch (error) {
    console.error('❌ Error en test de endpoints:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar test
testAPIEndpoints().then(() => {
  console.log('\n=== Test de endpoints completado ===');
  process.exit(0);
}).catch(error => {
  console.error('Error inesperado:', error);
  process.exit(1);
});