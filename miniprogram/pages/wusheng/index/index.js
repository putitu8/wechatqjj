const cloud = require('../../../utils/cloud');
const storage = require('../../../utils/storage');
const sitesData = require('../../../data/sites');

Page({
  data: { user: null, sites: [], completedCount: 0, remainingCount: 7, progressPct: 0, daysSinceJoin: 0 },

  onShow() {
    const user = storage.get('userInfo');
    this.setData({ user });
    if (user) this._refresh();
  },
  onPullDownRefresh() { this._refresh(true).then(() => wx.stopPullDownRefresh()); },

  async _refresh(force) {
    if (force) storage.clear('checkinCache');
    let progress = storage.get('checkinCache');
    if (!progress) {
      try {
        progress = await cloud.call('sync-progress');
        if (progress.ok) storage.set('checkinCache', progress, 5 * 60 * 1000);
      } catch (_) { progress = { checkins: [], completedCount: 0 }; }
    }
    const doneSet = new Set((progress.checkins || []).map(c => c.siteId));
    const sites = sitesData.all.map(s => ({ id: s.id, shortName: s.name.slice(0, 2), done: doneSet.has(s.id) }));
    const completedCount = progress.completedCount || 0;
    const days = this.data.user ? Math.max(1, Math.floor((Date.now() - this.data.user.registeredAt) / 86400000)) : 0;

    this.setData({
      sites,
      completedCount,
      remainingCount: 7 - completedCount,
      progressPct: Math.round(completedCount / 7 * 100),
      daysSinceJoin: days
    });
  },

  async onGetPhone(e) {
    if (!e.detail.code) { wx.showToast({ title: '已取消', icon: 'none' }); return; }
    wx.showLoading({ title: '登录中…' });
    try {
      const r = await cloud.call('login', { code: e.detail.code });
      if (r.ok) {
        storage.set('userInfo', r.user);
        this.setData({ user: r.user });
        await this._refresh(true);
      } else {
        wx.showToast({ title: '登录失败', icon: 'none' });
      }
    } catch (_) {
      wx.showToast({ title: '网络繁忙', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onSkip() { wx.switchTab({ url: '/pages/shilu/index' }); },

  onCert() { wx.navigateTo({ url: '/pages/wusheng/certificate/index' }); }
});
