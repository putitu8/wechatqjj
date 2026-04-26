const R = 6371000;
function toRad(d) { return d * Math.PI / 180; }
function distanceMeters(la1, ln1, la2, ln2) {
  const dLat = toRad(la2 - la1), dLng = toRad(ln2 - ln1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
module.exports = { distanceMeters };
