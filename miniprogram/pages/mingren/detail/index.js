const sitesData = require('../../../data/sites');
const poemsData = require('../../../data/poems');
const checkinUtil = require('../../../utils/checkin');
const storage = require('../../../utils/storage');

Page({
  data: { site: null, poem: null, checkedIn: false, checkedAtLabel: '', checking: false },

  onLoad(query) {
    const site = sitesData.byId(query.siteId);
    if (!site) { wx.showToast({ title: '景点不存在', icon: 'none' }); return wx.navigateBack(); }
    const poem = site.poemId ? poemsData.byId(site.poemId) : null;
    this.setData({ site, poem });

    const progress = storage.get('checkinCache');
    const hit = progress && progress.checkins && progress.checkins.find(c => c.siteId === site.id);
    if (hit) {
      this.setData({ checkedIn: true, checkedAtLabel: this._fmtDate(hit.checkedAt) });
    }

    if (query.autoCheckin === '1') {
      setTimeout(() => this.onCheckin(), 600);
    }
  },

  async onCheckin() {
    if (this.data.checking) return;
    this.setData({ checking: true });
    try {
      const r = await checkinUtil.attempt(this.data.site.id);
      if (!r.ok && r.message) {
        wx.showToast({ title: r.message, icon: 'none', duration: 2500 });
        return;
      }
      if (!r.ok && r.error) {
        wx.showToast({ title: '打卡失败', icon: 'none' });
        return;
      }
      storage.clear('checkinCache');
      this.setData({ checkedIn: true, checkedAtLabel: this._fmtDate(Date.now()) });
      const seal = this.selectComponent('#seal');
      seal && seal.play();
      wx.showToast({ title: r.isFirstTime ? '盖章成功' : '已是再访', icon: 'success' });
    } catch (e) {
      if (e.errMsg && e.errMsg.includes('auth deny')) {
        wx.showModal({ title: '需要位置权限', content: '我们仅用于校验你是否抵达景点', confirmText: '去设置', success: (m) => m.confirm && wx.openSetting() });
      } else {
        wx.showToast({ title: '定位失败', icon: 'none' });
      }
    } finally {
      this.setData({ checking: false });
    }
  },

  _fmtDate(ts) {
    const d = new Date(ts);
    const pad = (n) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
});
