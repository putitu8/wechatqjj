Component({
  properties: {
    text:     { type: String, value: '東坡' },
    size:     { type: String, value: 'sm' },
    stamping: { type: Boolean, value: false }
  },
  methods: {
    play() {
      this.setData({ stamping: false }, () => {
        this.setData({ stamping: true });
        wx.vibrateShort({ type: 'medium' });
        setTimeout(() => this.setData({ stamping: false }), 500);
      });
    }
  }
});
