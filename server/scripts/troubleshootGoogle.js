const path = require('path');
const fs = require('fs');

// Cargar variables de entorno
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
}

const { executeQuery } = require('../config/database');

async function testGoogleImport() {
  console.log('=== Google Import Troubleshooting ===\n');

  try {
    // 1. Verificar variables de entorno
    console.log('1. Environment Variables:');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing');
    console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || '✗ Missing');

    // 2. Verificar conexión a BD
    console.log('\n2. Database Connection:');
    await executeQuery('SELECT 1');
    console.log('✓ Database connected');

    // 3. Verificar tabla google_tokens
    console.log('\n3. Google Tokens Table:');
    const tables = await executeQuery("SHOW TABLES LIKE 'google_tokens'");
    if (tables.length > 0) {
      console.log('✓ google_tokens table exists');
      
      const [count] = await executeQuery('SELECT COUNT(*) as count FROM google_tokens');
      console.log(`Records in google_tokens: ${count.count}`);
      
      if (count.count > 0) {
        const tokens = await executeQuery('SELECT usuario_id, sync_enabled, last_sync, created_at FROM google_tokens ORDER BY created_at DESC LIMIT 5');
        console.log('Recent tokens:');
        tokens.forEach(token => {
          console.log(`  User ${token.usuario_id}: enabled=${token.sync_enabled}, last_sync=${token.last_sync || 'never'}`);
        });
      }
    } else {
      console.log('✗ google_tokens table missing - run database schema');
    }

    // 4. Verificar usuarios activos
    console.log('\n4. Active Users:');
    const users = await executeQuery('SELECT id, nombre_completo, email FROM usuario WHERE activo = TRUE LIMIT 5');
    if (users.length > 0) {
      console.log('Active users:');
      users.forEach(user => {
        console.log(`  ID: ${user.id}, Name: ${user.nombre_completo}, Email: ${user.email}`);
      });
    } else {
      console.log('✗ No active users found');
    }

    // 5. Verificar contactos con Google sync
    console.log('\n5. Google Synced Contacts:');
    let contactTable = 'contacto';
    try {
      await executeQuery('SELECT 1 FROM contacto LIMIT 1');
    } catch {
      contactTable = 'contactos';
    }
    
    const [googleContactsCount] = await executeQuery(
      `SELECT COUNT(*) as count FROM ${contactTable} WHERE google_resource_name IS NOT NULL`
    );
    console.log(`Contacts with Google sync: ${googleContactsCount.count}`);

    // 6. Test Google OAuth client creation
    console.log('\n6. Google OAuth Client:');
    const { google } = require('googleapis');
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      console.log('✓ OAuth2 client created successfully');
    } catch (error) {
      console.log('✗ OAuth2 client creation failed:', error.message);
    }

    console.log('\n=== Troubleshooting Results ===');
    console.log('\nCommon Issues:');
    console.log('1. Missing Google credentials in .env file');
    console.log('2. Google Cloud Console OAuth not configured');
    console.log('3. Redirect URI mismatch');
    console.log('4. User not added as Test User in Google Cloud Console');
    console.log('5. Required scopes not granted');
    
    console.log('\nDebugging Steps:');
    console.log('1. Check browser console for JavaScript errors');
    console.log('2. Check server logs during import attempt');
    console.log('3. Verify popup is not blocked by browser');
    console.log('4. Test with different user account');

  } catch (error) {
    console.error('Error during troubleshooting:', error.message);
  }
}

testGoogleImport().then(() => {
  console.log('\n=== Troubleshooting complete ===');
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});