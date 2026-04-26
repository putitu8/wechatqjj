const cloud = require('./cloud');

async function attempt(siteId) {
  const loc = await new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: ({ latitude, longitude }) => resolve({ lat: latitude, lng: longitude }),
      fail: reject
    });
  });
  return cloud.call('checkin', { siteId, lat: loc.lat, lng: loc.lng });
}

module.exports = { attempt };
