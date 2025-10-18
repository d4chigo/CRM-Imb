const { google } = require('googleapis');
const { executeQuery } = require('../config/database');

class GoogleCalendarService {
  static async getAuthClient(userId) {
    const [tokens] = await executeQuery(
      'SELECT * FROM google_tokens WHERE usuario_id = ? AND sync_enabled = TRUE',
      [userId]
    );
    if (!tokens) return null;

    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      throw new Error('Faltan credenciales de Google (CLIENT_ID/SECRET/REDIRECT_URI)');
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
    });

    // Persist refresh
    oauth2Client.on('tokens', async (t) => {
      try {
        await executeQuery(
          `UPDATE google_tokens SET access_token=?, refresh_token=COALESCE(?, refresh_token), expiry_date=?, updated_at=NOW() WHERE usuario_id=?`,
          [t.access_token || null, t.refresh_token || null, t.expiry_date || null, userId]
        );
      } catch {}
    });

    return oauth2Client;
  }

  static async createEvent(userId, payload) {
    const auth = await this.getAuthClient(userId);
    if (!auth) throw new Error('No conectado a Google');

    const calendar = google.calendar({ version: 'v3', auth });

    const {
      title,
      description,
      start, // ISO string
      end,   // ISO string
      attendees = [], // array of emails
      location,
      meet = true,
      timeZone = 'America/Lima'
    } = payload;

    const event = {
      summary: title || 'Reunión',
      description: description || '',
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
      location: location || undefined,
      attendees: attendees.filter(Boolean).map(e => ({ email: e })),
      reminders: { useDefault: true },
    };

    const params = { calendarId: 'primary', requestBody: event };
    if (meet) {
      params.conferenceDataVersion = 1;
      params.requestBody.conferenceData = {
        createRequest: { requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}` }
      };
    }

    const { data } = await calendar.events.insert(params);
    return data;
  }

  static async listEvents(userId, { timeMin, timeMax, maxResults = 50, calendarId = null }) {
    const auth = await this.getAuthClient(userId);
    if (!auth) throw new Error('No conectado a Google');

    const calendar = google.calendar({ version: 'v3', auth });
    const range = {
      timeMin: timeMin || new Date(Date.now() - 7*24*60*60*1000).toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    }

    // If a specific calendarId is provided, query only that
    if (calendarId) {
      const { data } = await calendar.events.list({
        calendarId,
        ...range,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults,
      });
      return data.items || [];
    }

    // Else: merge events from 'primary' and all visible calendars
    const results = [];
    try {
      // Always include 'primary'
      const primary = await calendar.events.list({
        calendarId: 'primary',
        ...range,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults,
      });
      results.push(...(primary.data.items || []));
    } catch (e) { /* ignore primary failure */ }

    try {
      const list = await calendar.calendarList.list({ maxResults: 250 });
      const cals = (list.data.items || []).filter(c => c.id !== 'primary');
      for (const cal of cals) {
        try {
          const { data } = await calendar.events.list({
            calendarId: cal.id,
            ...range,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults,
          });
          results.push(...(data.items || []).map(ev => ({ ...ev, _calendarId: cal.id })));
        } catch (_) { /* skip this calendar */ }
      }
    } catch (_) { /* ignore calendar list failures */ }

    // De-duplicate by event id + start
    const seen = new Set();
    const merged = [];
    for (const ev of results) {
      const key = `${ev.id || ''}-${ev.start?.dateTime || ev.start?.date || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(ev);
    }
    // Sort by start
    merged.sort((a,b)=>{
      const sa = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
      const sb = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
      return sa - sb;
    });
    return merged;
  }
}

module.exports = GoogleCalendarService;
