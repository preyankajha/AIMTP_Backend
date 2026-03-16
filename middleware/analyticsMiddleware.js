const UAParser = require('ua-parser-js');
const VisitorLog = require('../models/VisitorLog');

const analyticsMiddleware = async (req, res, next) => {
  // Skip for static files or common noise
  if (req.path.includes('.') || req.path.includes('/api/analytics')) {
    return next();
  }

  try {
    const ua = new UAParser(req.headers['user-agent']).getResult();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Default log data
    const logData = {
      user: req.user ? req.user.id : null,
      ip: ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      device: {
        browser: `${ua.browser.name} ${ua.browser.version}`,
        os: `${ua.os.name} ${ua.os.version}`,
        deviceType: ua.device.type || 'desktop'
      }
    };

    // Try to get location (only for some requests to avoid rate limits/lag)
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
      } catch (geoErr) {
        console.warn('Analytics: Location lookup failed', geoErr.message);
      }
    }

    // Save log asynchronously
    VisitorLog.create(logData).catch(err => console.error('Analytics Save Error:', err));

  } catch (error) {
    console.error('Analytics Middleware Error:', error);
  }

  next();
};

module.exports = analyticsMiddleware;
