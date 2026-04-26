const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: 'no_openid' };

  const db = cloud.database();

  let phone = '';
  if (event.code) {
    try {
      const r = await cloud.openapi.phonenumber.getPhoneNumber({ code: event.code });
      phone = r.phoneInfo.purePhoneNumber || '';
    } catch (e) {
      console.error('phonenumber getPhoneNumber failed', e);
      return { ok: false, error: 'phone_decode_failed' };
    }
  }

  const now = Date.now();
  const existing = await db.collection('users').where({ openid: OPENID }).get();
  if (existing.data.length === 0) {
    await db.collection('users').add({
      data: {
        openid: OPENID,
        phone,
        nickname: event.nickname || '东坡同游',
        avatar: event.avatar || '',
        registeredAt: now
      }
    });
  } else if (phone && existing.data[0].phone !== phone) {
    await db.collection('users').where({ openid: OPENID }).update({ data: { phone } });
  }

  const user = (await db.collection('users').where({ openid: OPENID }).get()).data[0];
  return { ok: true, user };
};
