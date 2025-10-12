const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const GoogleCalendarService = require('../services/googleCalendarService');

// Crear evento de calendario
router.post('/events', isAuthenticated, async (req, res) => {
  try {
    const data = await GoogleCalendarService.createEvent(req.user.id, req.body || {});
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message || 'No se pudo crear el evento' });
  }
});

// Listar eventos por rango
router.get('/events', isAuthenticated, async (req, res) => {
  try {
    const { timeMin, timeMax, maxResults } = req.query;
    const items = await GoogleCalendarService.listEvents(req.user.id, { timeMin, timeMax, maxResults: Number(maxResults||50) });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message || 'No se pudieron listar eventos' });
  }
});

module.exports = router;
