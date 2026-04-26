/**
 * Great-circle distance in meters between two WGS84 points.
 * Note: WeChat's wx.getLocation returns gcj02 by default; cloud-side
 * sites are stored in the same coordinate system, so direct comparison is fine.
 */
const R = 6371000; // earth radius, meters

function toRad(deg) { return deg * Math.PI / 180; }

function distanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

module.exports = { distanceMeters };
