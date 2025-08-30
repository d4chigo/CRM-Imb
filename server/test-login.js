const AuthService = require('./services/authService');

console.log('🔐 Probando autenticación...');
AuthService.authenticateUser('admin@crm-inmobiliario.com', 'Admin123!')
  .then(result => {
    console.log('✅ Login exitoso!');
    console.log('Usuario:', result.user);
    console.log('Tokens generados:', result.tokens ? 'Sí' : 'No');
  })
  .catch(error => {
    console.log('❌ Error:', error.message);
  });
