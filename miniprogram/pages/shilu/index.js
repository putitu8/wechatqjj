Page({
  data: {
    mapUrl: 'https://<CLOUD_STATIC_HOST>/index.html',
    errored: false
  },
  onMapMessage(e) {
    console.log('mapMessage', e.detail.data);
  },
  onMapError(e) { console.error('webview error', e); this.setData({ errored: true }); },
  onRetry() { this.setData({ errored: false, mapUrl: this.data.mapUrl + '?t=' + Date.now() }); }
});
