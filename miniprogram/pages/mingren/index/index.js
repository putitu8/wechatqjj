const sitesData = require('../../../data/sites');
const cloud = require('../../../utils/cloud');
const storage = require('../../../utils/storage');
const { distanceMeters } = require('../../../utils/haversine');

const GLYPHS = { shiwudong: '⛰', youmeitang: '堂', liuyiquan: '泉', sudi: '堤', sushixiang: '像', damailing: '岭', guoxiting: '亭' };
const CHECKIN_CACHE_KEY = 'checkinCache';
const CHECKIN_CACHE_TTL = 5 * 60 * 1000;

Page({
  data: { sites: [], completedCount: 0 },

  onShow() { this._refresh(); },
  onPullDownRefresh() { this._refresh(true).then(() => wx.stopPullDownRefresh()); },

  async _refresh(force = false) {
    let progress = !force && storage.get(CHECKIN_CACHE_KEY);
    if (!progress) {
      try {
        progress = await cloud.call('sync-progress');
        if (progress.ok) storage.set(CHECKIN_CACHE_KEY, progress, CHECKIN_CACHE_TTL);
      } catch (e) {
        progress = { ok: false, checkins: [], completedCount: 0 };
      }
    }
    const doneSet = new Set((progress.checkins || []).map(c => c.siteId));

    const loc = await new Promise((resolve) => {
      wx.getLocation({ type: 'gcj02', success: ({ latitude, longitude }) => resolve({ lat: latitude, lng: longitude }), fail: () => resolve(null) });
    });

    const sites = sitesData.all.map(s => ({
      ...s,
      glyph: GLYPHS[s.id] || '·',
      done: doneSet.has(s.id),
      distanceLabel: loc ? `${(distanceMeters(loc.lat, loc.lng, s.lat, s.lng) / 1000).toFixed(1)}km` : ''
    }));

    this.setData({ sites, completedCount: progress.completedCount || 0 });
  },

  onTapSite(e) {
    wx.navigateTo({ url: `/pages/mingren/detail/index?siteId=${e.currentTarget.dataset.id}` });
  }
});
