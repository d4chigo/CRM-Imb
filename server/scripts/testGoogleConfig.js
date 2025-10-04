const path = require('path');
const fs = require('fs');

// Cargar variables de entorno desde la raíz
const rootEnv = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else {
  console.error('No .env file found at:', rootEnv);
  process.exit(1);
}

const { google } = require('googleapis');

console.log('=== Google OAuth Configuration Test ===\n');

// Verificar variables de entorno
console.log('Environment Variables:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓ Set' : '✗ Missing');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✓ Set' : '✗ Missing');
console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || '✗ Missing');
console.log('GOOGLE_INCLUDE_OTHER_CONTACTS:', process.env.GOOGLE_INCLUDE_OTHER_CONTACTS || 'false');

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
  console.error('\n❌ Missing required Google OAuth configuration!');
  process.exit(1);
}

// Intentar crear cliente OAuth2
try {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  console.log('\n✅ OAuth2 Client created successfully');

  // Generar URL de test
  const scopes = [
    'https://www.googleapis.com/auth/contacts.readonly',
    'https://www.googleapis.com/auth/contacts'
  ];

  const testUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: encodeURIComponent(JSON.stringify({ test: true }))
  });

  console.log('\n✅ Test authorization URL generated');
  console.log('URL:', testUrl.substring(0, 100) + '...');

  console.log('\n=== Configuration appears to be valid! ===');
  console.log('\nNext steps:');
  console.log('1. Make sure your server is running on port 4000');
  console.log('2. Ensure MySQL is running and the database exists');
  console.log('3. Check that the google_tokens table exists');
  console.log('4. Verify your Google Cloud Console OAuth configuration');

} catch (error) {
  console.error('\n❌ Error creating OAuth2 client:', error.message);
  process.exit(1);
}