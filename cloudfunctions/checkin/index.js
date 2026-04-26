const cloud = require('wx-server-sdk');
const { distanceMeters } = require('./haversine');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * Pure logic, exported for unit testing. No cloud calls.
 */
function evaluateCheckin(site, lat, lng) {
  if (!site) return { ok: false, error: 'site_not_found' };
  const distance = distanceMeters(site.lat, site.lng, lat, lng);
  if (distance > site.radius) {
    return { ok: false, distance, message: `离${site.name}还差约 ${distance - site.radius} 米` };
  }
  return { ok: true, distance };
}

exports.main = async (event) => {
  const { siteId, lat, lng } = event;
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: 'no_openid' };
  if (!siteId || typeof lat !== 'number' || typeof lng !== 'number') {
    return { ok: false, error: 'bad_params' };
  }

  const db = cloud.database();
  const siteRow = await db.collection('sites').where({ siteId }).get();
  const site = siteRow.data[0];
  const verdict = evaluateCheckin(site, lat, lng);
  if (!verdict.ok) return verdict;

  const dup = await db.collection('checkins').where({ openid: OPENID, siteId }).get();
  const isFirstTime = dup.data.length === 0;

  if (isFirstTime) {
    await db.collection('checkins').add({
      data: {
        openid: OPENID, siteId, siteName: site.name,
        lat, lng, distanceM: verdict.distance, checkedAt: Date.now()
      }
    });
  }

  return { ok: true, isFirstTime, distance: verdict.distance, siteName: site.name };
};

exports.evaluateCheckin = evaluateCheckin;
