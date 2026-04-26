Component({
  properties: {
    nickname:    { type: String, value: '' },
    completedAt: { type: String, value: '' },
    siteNames:   { type: Array,  value: [] }
  },
  lifetimes: {
    attached() { this._render(); }
  },
  observers: {
    'nickname,completedAt,siteNames': function () { this._render(); }
  },
  methods: {
    _render() {
      const query = this.createSelectorQuery();
      query.select('#certCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width  = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        const W = res[0].width, H = res[0].height;

        ctx.fillStyle = '#F5E9C8';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#5A3C1F';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, W - 40, H - 40);
        ctx.lineWidth = 2;
        ctx.strokeRect(32, 32, W - 64, H - 64);

        ctx.fillStyle = '#1F3A40';
        ctx.font = '700 36px "PingFang SC", serif';
        ctx.textAlign = 'center';
        const title = '東坡杭州行旅 通游证书';
        ctx.fillText(title, W / 2, 100);

        ctx.font = '500 20px "PingFang SC", serif';
        ctx.fillStyle = '#3A2818';
        ctx.fillText(`兹有 ${this.data.nickname || '——'} 同游`, W / 2, 200);
        ctx.fillText(`遍访杭州东坡足迹七处`, W / 2, 240);
        ctx.fillText(`完成于 ${this.data.completedAt || '——'}`, W / 2, 280);

        ctx.font = '400 14px "PingFang SC", serif';
        ctx.fillStyle = '#7A6A4F';
        const cols = 4, cellW = (W - 200) / cols;
        this.data.siteNames.forEach((name, i) => {
          const r = Math.floor(i / cols), c = i % cols;
          ctx.fillText(name, 100 + c * cellW + cellW / 2, 400 + r * 60);
        });

        ctx.fillStyle = '#8B3A3A';
        ctx.fillRect(W - 140, H - 180, 80, 80);
        ctx.fillStyle = '#F5E9C8';
        ctx.font = '700 22px "PingFang SC", serif';
        ctx.fillText('東坡', W - 100, H - 130);
      });
    },

    save() {
      const query = this.createSelectorQuery();
      query.select('#certCanvas').fields({ node: true, size: true }).exec((res) => {
        const canvas = res[0].node;
        wx.canvasToTempFilePath({
          canvas,
          success: ({ tempFilePath }) => {
            wx.saveImageToPhotosAlbum({
              filePath: tempFilePath,
              success: () => wx.showToast({ title: '已存入相册', icon: 'success' }),
              fail: (e) => {
                if (e.errMsg.includes('auth deny')) {
                  wx.showModal({ title: '需要相册权限', content: '请前往设置开启', confirmText: '去设置', success: (r) => r.confirm && wx.openSetting() });
                } else {
                  wx.showToast({ title: '保存失败', icon: 'none' });
                }
              }
            });
          }
        });
      });
    }
  }
});
