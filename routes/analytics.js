const express = require('express');
const router = express.Router();
const VisitorLog = require('../models/VisitorLog');
const UAParser = require('ua-parser-js');

// @desc   Record a manual hit (useful for landing page or specific events)
// @route  POST /api/analytics/hit
// @access Public
router.post('/hit', async (req, res) => {
  try {
    const { event, path } = req.body;
    const ua = new UAParser(req.headers['user-agent']).getResult();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const logData = {
      ip,
      path: path || req.headers.referer || '/',
      method: 'EVENT',
      userAgent: req.headers['user-agent'],
      device: {
        browser: `${ua.browser.name} ${ua.browser.version}`,
        os: `${ua.os.name} ${ua.os.version}`,
        deviceType: ua.device.type || 'desktop'
      },
      timestamp: new Date()
    };

    // Location lookup
    if (ip && ip !== '::1' && ip !== '127.0.0.1') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success') {
          logData.location = {
            city: geoData.city,
            region: geoData.regionName,
            country: geoData.country,
            coordinates: [geoData.lon, geoData.lat]
          };
        }
      } catch (err) {}
    }

    await VisitorLog.create(logData);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
