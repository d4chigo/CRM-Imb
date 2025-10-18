const { google } = require('googleapis');
const { executeQuery } = require('../config/database');

class GoogleAuthService {
  static getOAuthClient() {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      throw new Error('Missing Google OAuth2 configuration');
    }
    return new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );
  }

  static async getAuthUrl(userId) {
    const oauth2Client = this.getOAuthClient();
    
    const scopes = [
      // Contacts scopes
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/contacts',
      'https://www.googleapis.com/auth/contacts.other.readonly',
      // Calendar scopes
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      // User info
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const state = JSON.stringify({ userId });
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state,
      include_granted_scopes: true
    });
  }

  static async handleCallback(code) {
    const oauth2Client = this.getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  static async saveTokens(userId, tokens) {
    const { access_token, refresh_token, expiry_date, scope, token_type } = tokens;
    
    await executeQuery(
      `INSERT INTO google_tokens 
       (usuario_id, access_token, refresh_token, expiry_date, scope, token_type, sync_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         access_token = VALUES(access_token),
         refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
         expiry_date = VALUES(expiry_date),
         scope = VALUES(scope),
         token_type = VALUES(token_type),
         sync_enabled = TRUE,
         updated_at = NOW()`,
      [userId, access_token, refresh_token, expiry_date, scope, token_type]
    );
  }

  static async getTokens(userId) {
    const [tokens] = await executeQuery(
      'SELECT * FROM google_tokens WHERE usuario_id = ? AND sync_enabled = TRUE',
      [userId]
    );
    return tokens || null;
  }

  static async getAuthClient(userId) {
    const tokens = await this.getTokens(userId);
    if (!tokens) return null;

    const oauth2Client = this.getOAuthClient();
    
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
    });

    // Auto-refresh token when it expires
    oauth2Client.on('tokens', async (newTokens) => {
      try {
        await this.saveTokens(userId, {
          ...tokens,
          ...newTokens,
          refresh_token: newTokens.refresh_token || tokens.refresh_token
        });
      } catch (error) {
        console.error('Error refreshing token:', error);
      }
    });

    return oauth2Client;
  }

  static async disconnect(userId) {
    await executeQuery(
      'UPDATE google_tokens SET sync_enabled = FALSE, updated_at = NOW() WHERE usuario_id = ?',
      [userId]
    );
  }

  static async isConnected(userId) {
    const tokens = await this.getTokens(userId);
    return !!tokens;
  }
}

module.exports = GoogleAuthService;
