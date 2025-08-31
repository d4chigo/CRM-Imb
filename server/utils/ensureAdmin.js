const { queryOne, executeQuery } = require('../config/database');
const AuthService = require('../services/authService');

/**
 * Asegura que exista un usuario admin. Si no existe lo crea.
 * Usa variables de entorno ADMIN_EMAIL y ADMIN_PASSWORD si están definidas,
 * de lo contrario valores por defecto.
 */
async function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAIL || 'admin@crm-imb.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const nombre = process.env.ADMIN_NAME || 'Administrador';

  try {
    const existing = await queryOne('SELECT id, rol FROM usuarios WHERE email = ?', [email]);
    if (!existing) {
      // Crear nuevo admin
      const hash = await AuthService.hashPassword(password);
      const res = await executeQuery('INSERT INTO usuarios (nombre_completo, email, password_hash, rol) VALUES (?,?,?,?)', [nombre, email, hash, 'admin']);
      console.log(`[seed] Usuario admin creado (id=${res.insertId}, email=${email})`);
    } else if (existing.rol !== 'admin') {
      await executeQuery('UPDATE usuarios SET rol = ? WHERE id = ?', ['admin', existing.id]);
      console.log(`[seed] Usuario ${email} promovido a admin`);
    } else {
      // Admin ya existe
      console.log('[seed] Usuario admin existente detectado');
    }
  } catch (e) {
    console.error('[seed] Error asegurando usuario admin:', e.message);
  }
}

module.exports = { ensureAdminUser };
