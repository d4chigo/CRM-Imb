const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

// Cargar variables de entorno
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
}

const { executeQuery } = require('../config/database');
const GoogleSyncService = require('../services/googleSyncService');

async function testGoogleSync() {
  console.log('=== Test de Sincronización de Google Contacts ===\n');

  try {
    // 1. Verificar usuario test
    console.log('1. Buscando usuario de prueba...');
    const [user] = await executeQuery('SELECT id, nombre_completo, email FROM usuario WHERE activo = TRUE LIMIT 1');
    if (!user) {
      console.error('❌ No hay usuarios activos');
      return;
    }
    console.log(`✅ Usuario encontrado: ${user.nombre_completo} (ID: ${user.id})`);

    // 2. Verificar tokens de Google
    console.log('\n2. Verificando tokens de Google...');
    const [tokens] = await executeQuery('SELECT * FROM google_tokens WHERE usuario_id = ?', [user.id]);
    if (!tokens) {
      console.log('❌ No hay tokens de Google para este usuario');
      console.log('💡 El usuario necesita autorizar Google Contacts primero');
      
      // Generar URL de autorización
      console.log('\n3. Generando URL de autorización...');
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      const scopes = [
        'https://www.googleapis.com/auth/contacts.readonly',
        'https://www.googleapis.com/auth/contacts'
      ];
      
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: encodeURIComponent(JSON.stringify({ test: true, uid: user.id }))
      });
      
      console.log('🔗 URL de autorización:');
      console.log(url);
      console.log('\n💡 Abre esta URL en tu navegador para autorizar el acceso');
      return;
    }
    
    console.log('✅ Tokens encontrados');
    console.log(`   - Sync habilitado: ${tokens.sync_enabled ? 'Sí' : 'No'}`);
    console.log(`   - Última sync: ${tokens.last_sync || 'Nunca'}`);
    console.log(`   - Token expira: ${tokens.expiry_date ? new Date(tokens.expiry_date).toLocaleString() : 'No definido'}`);

    // 3. Probar obtener cliente autenticado
    console.log('\n3. Probando autenticación con Google...');
    const authClient = await GoogleSyncService.getAuthClient(user.id);
    if (!authClient) {
      console.error('❌ No se pudo crear cliente autenticado');
      return;
    }
    console.log('✅ Cliente OAuth2 creado exitosamente');

    // 4. Probar acceso a Google People API
    console.log('\n4. Probando acceso a Google People API...');
    try {
      const people = google.people({ version: 'v1', auth: authClient });
      
      // Test de conexión simple
      const testConnection = await people.people.connections.list({
        resourceName: 'people/me',
        pageSize: 1,
        personFields: 'names'
      });
      
      console.log('✅ Conexión a Google People API exitosa');
      console.log(`   - Conexiones disponibles: ${testConnection.data.totalItems || 'Desconocido'}`);
      
    } catch (apiError) {
      console.error('❌ Error en Google People API:', apiError.message);
      if (apiError.code === 401) {
        console.log('💡 Token expirado, intentando refresh...');
        
        // Intentar refresh manual
        try {
          await authClient.getAccessToken();
          console.log('✅ Token refreshed exitosamente');
        } catch (refreshError) {
          console.error('❌ Error al refresh del token:', refreshError.message);
          console.log('💡 El usuario necesita volver a autorizar');
        }
      }
      return;
    }

    // 5. Probar sincronización completa
    console.log('\n5. Probando sincronización completa...');
    try {
      const result = await GoogleSyncService.syncGoogleToCRM(user.id);
      console.log('✅ Sincronización exitosa');
      console.log(`   - Contactos procesados: ${result.total}`);
      console.log(`   - Contactos sincronizados: ${result.synced}`);
      console.log(`   - Duplicados omitidos: ${result.total - result.synced}`);
      
    } catch (syncError) {
      console.error('❌ Error en sincronización:', syncError.message);
      console.error('   Stack:', syncError.stack);
    }

    // 6. Verificar contactos sincronizados
    console.log('\n6. Verificando contactos en base de datos...');
    const [contactCount] = await executeQuery(
      'SELECT COUNT(*) as count FROM contacto WHERE google_resource_name IS NOT NULL'
    );
    console.log(`✅ Contactos con Google sync: ${contactCount.count}`);
    
    if (contactCount.count > 0) {
      const recentContacts = await executeQuery(
        'SELECT nombre, apellido, email, telefono, last_synced_with_google FROM contacto WHERE google_resource_name IS NOT NULL ORDER BY last_synced_with_google DESC LIMIT 5'
      );
      console.log('\n📋 Últimos contactos sincronizados:');
      recentContacts.forEach((contact, i) => {
        console.log(`   ${i+1}. ${contact.nombre} ${contact.apellido || ''} - ${contact.email || contact.telefono || 'Sin contacto'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar test
testGoogleSync().then(() => {
  console.log('\n=== Test completado ===');
  process.exit(0);
}).catch(error => {
  console.error('Error inesperado:', error);
  process.exit(1);
});