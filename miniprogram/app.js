App({
  globalData: {
    cloudEnv: '<CLOUD_ENV_ID>',
    fontReady: false
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3+ 基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: this.globalData.cloudEnv,
      traceUser: true
    });

    wx.loadFontFace({
      family: 'NotoSerifSC',
      source: 'url("https://<CLOUD_STATIC_HOST>/fonts/NotoSerifSC-SemiBold-subset.woff2")',
      desc: { weight: 'normal', style: 'normal' },
      global: true,
      success: () => { this.globalData.fontReady = true; },
      fail: (err) => { console.warn('font load failed', err); }
    });
  }
});
