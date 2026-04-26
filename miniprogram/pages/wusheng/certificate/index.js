const cloud = require('../../../utils/cloud');
const storage = require('../../../utils/storage');

Page({
  data: { nickname: '', completedAt: '', siteNames: [] },

  async onLoad() {
    const user = storage.get('userInfo');
    if (!user) { wx.showToast({ title: '请先登录', icon: 'none' }); return wx.navigateBack(); }
    const progress = await cloud.call('sync-progress');
    if (!progress.ok || progress.completedCount < 7) { wx.showToast({ title: '尚未集齐', icon: 'none' }); return wx.navigateBack(); }
    const lastTs = progress.checkins[progress.checkins.length - 1].checkedAt;
    const d = new Date(lastTs);
    this.setData({
      nickname: user.nickname,
      completedAt: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      siteNames: progress.checkins.map(c => c.siteName)
    });
  },

  onSave() { this.selectComponent('#cert').save(); },
  onShareAppMessage() { return { title: '我已遍访东坡杭州足迹', path: '/pages/shilu/index' }; }
});
