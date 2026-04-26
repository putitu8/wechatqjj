const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: 'no_openid' };

  const db = cloud.database();
  const checkins = await db.collection('checkins')
    .where({ openid: OPENID })
    .orderBy('checkedAt', 'asc')
    .get();

  return {
    ok: true,
    checkins: checkins.data.map(c => ({
      siteId: c.siteId, siteName: c.siteName, checkedAt: c.checkedAt
    })),
    completedCount: checkins.data.length
  };
};
