const storage = require('../../utils/storage');

Component({
  properties: {
    visible:   { type: Boolean, value: true },
    avatarSrc: { type: String, value: '/assets/su-avatar.png' }
  },
  data: {
    posX: 0,
    posY: 0,
    showBubble: true,
    dragging: false,
    _origin: null
  },
  lifetimes: {
    attached() {
      const saved = storage.get('floatingSuPos') || { x: 580, y: 1100 };
      this.setData({ posX: saved.x, posY: saved.y });
    }
  },
  methods: {
    onTap() {
      wx.navigateTo({ url: '/pages/chat/index' });
    },
    onLongPress(e) {
      this.setData({ dragging: true, _origin: { x: e.touches[0].clientX, y: e.touches[0].clientY } });
    },
    onTouchMove(e) {
      if (!this.data.dragging) return;
      const t = e.touches[0];
      const sysInfo = wx.getSystemInfoSync();
      const ratio = 750 / sysInfo.windowWidth;
      this.setData({
        posX: Math.round(t.clientX * ratio - 60),
        posY: Math.round(t.clientY * ratio - 60)
      });
    },
    onTouchEnd() {
      if (!this.data.dragging) return;
      const screenW = 750;
      const finalX = this.data.posX + 60 < screenW / 2 ? 20 : screenW - 140;
      this.setData({ dragging: false, posX: finalX });
      storage.set('floatingSuPos', { x: finalX, y: this.data.posY });
    }
  }
});
