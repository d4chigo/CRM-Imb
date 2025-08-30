// Servicio de autenticación para CRM Inmobiliario
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { executeQuery, queryOne } = require('../config/database');

/**
 * Servicio para manejo de autenticación y usuarios
 */
class AuthService {
  
  /**
   * Crear hash seguro de contraseña usando bcrypt
   * @param {string} password - Contraseña en texto plano
   * @returns {string} Hash de la contraseña
   */
  static async hashPassword(password) {
    const saltRounds = 12; // Mayor número = más seguro pero más lento
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verificar contraseña contra hash almacenado
   * @param {string} password - Contraseña en texto plano
   * @param {string} hash - Hash almacenado en BD
   * @returns {boolean} True si la contraseña es correcta
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generar tokens JWT (access y refresh)
   * @param {object} user - Datos del usuario
   * @returns {object} Objeto con access_token y refresh_token
   */
  static generateTokens(user) {
    // Payload para ambos tokens (información no sensible)
    const payload = {
      userId: user.id,
      email: user.email,
      rol: user.rol
    };

    // Access token (corta duración)
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'crm-inmobiliario',
      audience: 'crm-users'
    });

    // Refresh token (larga duración)
    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'crm-inmobiliario',
      audience: 'crm-users'
    });

    return { accessToken, refreshToken };
  }

  /**
   * Autenticar usuario con email y contraseña
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {object} Datos del usuario y tokens si es exitoso
   */
  static async authenticateUser(email, password) {
    try {
      // Buscar usuario por email
      const user = await queryOne(
        'SELECT id, nombre_completo, email, password_hash, rol, activo FROM usuarios WHERE email = ?',
        [email.toLowerCase().trim()]
      );

      if (!user) {
        throw new Error('Credenciales inválidas');
      }

      if (!user.activo) {
        throw new Error('Usuario inactivo. Contacta al administrador.');
      }

      // Verificar contraseña
      const isValidPassword = await this.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Credenciales inválidas');
      }

      // Generar tokens
      const tokens = this.generateTokens(user);

      // Actualizar último login y guardar refresh token en BD
      await executeQuery(
        'UPDATE usuarios SET ultimo_login = NOW(), refresh_token = ? WHERE id = ?',
        [tokens.refreshToken, user.id]
      );

      // Retornar datos del usuario (sin contraseña) y tokens
      return {
        user: {
          id: user.id,
          nombre: user.nombre_completo,
          email: user.email,
          rol: user.rol
        },
        tokens
      };

    } catch (error) {
      console.error('Error en autenticación:', error.message);
      throw error;
    }
  }

  /**
   * Renovar access token usando refresh token
   * @param {string} refreshToken - Refresh token válido
   * @returns {object} Nuevo access token
   */
  static async refreshAccessToken(refreshToken) {
    try {
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

      // Buscar usuario y verificar que el refresh token coincida
      const user = await queryOne(
        'SELECT id, nombre_completo, email, rol, refresh_token FROM usuarios WHERE id = ? AND activo = TRUE',
        [decoded.userId]
      );

      if (!user || user.refresh_token !== refreshToken) {
        throw new Error('Refresh token inválido');
      }

      // Generar nuevo access token
      const newAccessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          rol: user.rol
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiresIn,
          issuer: 'crm-inmobiliario',
          audience: 'crm-users'
        }
      );

      return { accessToken: newAccessToken };

    } catch (error) {
      console.error('Error renovando token:', error.message);
      throw new Error('Refresh token inválido o expirado');
    }
  }

  /**
   * Cerrar sesión del usuario (invalidar refresh token)
   * @param {number} userId - ID del usuario
   */
  static async logoutUser(userId) {
    try {
      await executeQuery(
        'UPDATE usuarios SET refresh_token = NULL WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Error en logout:', error.message);
      throw error;
    }
  }

  /**
   * Crear nuevo usuario (solo administradores)
   * @param {object} userData - Datos del usuario a crear
   * @returns {object} Datos del usuario creado
   */
  static async createUser(userData) {
    try {
      const { nombre, email, password, rol = 'agente' } = userData;

      // Verificar que el email no esté en uso
      const existingUser = await queryOne(
        'SELECT id FROM usuarios WHERE email = ?',
        [email.toLowerCase().trim()]
      );

      if (existingUser) {
        throw new Error('El email ya está registrado');
      }

      // Hash de la contraseña
      const passwordHash = await this.hashPassword(password);

      // Crear usuario
      const result = await executeQuery(
        'INSERT INTO usuarios (nombre_completo, email, password_hash, rol) VALUES (?, ?, ?, ?)',
        [nombre.trim(), email.toLowerCase().trim(), passwordHash, rol]
      );

      // Retornar datos del usuario creado (sin contraseña)
      return {
        id: result.insertId,
        nombre,
        email: email.toLowerCase().trim(),
        rol
      };

    } catch (error) {
      console.error('Error creando usuario:', error.message);
      throw error;
    }
  }
}

module.exports = AuthService;
