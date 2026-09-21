const DeviceSession = require('../models/DeviceSession');

const parseUserAgent = (ua = '') => {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let deviceName = 'Unknown Device';

  // Detect browser
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Google Chrome';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'Internet Explorer';

  // Detect OS
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux') && ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Detect device type
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    deviceName = `📱 ${os} Mobile`;
  } else if (ua.includes('Tablet') || ua.includes('iPad')) {
    deviceName = `📱 ${os} Tablet`;
  } else {
    deviceName = `💻 ${os} Desktop`;
  }

  return { browser, os, deviceName };
};

const trackDevice = async (req, res, next) => {
  if (req.user) {
    try {
      const ua = req.headers['user-agent'] || '';
      const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const { browser, os, deviceName } = parseUserAgent(ua);
      const sessionKey = `${req.user._id}_${browser}_${os}`;

      await DeviceSession.findOneAndUpdate(
        { userId: req.user._id, browser, os },
        { userId: req.user._id, deviceName, browser, os, ip, userAgent: ua, isActive: true, lastSeen: new Date() },
        { upsert: true, new: true }
      );
    } catch (e) { /* silent */ }
  }
  next();
};

module.exports = { trackDevice, parseUserAgent };
