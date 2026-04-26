const BASE_MAP_URL = 'https://<CLOUD_STATIC_HOST>/index.html';

Page({
  data: {
    mapUrl: BASE_MAP_URL,
    errored: false
  },
  onMapMessage(e) {
    console.log('mapMessage', e.detail.data);
  },
  onMapError(e) { console.error('webview error', e); this.setData({ errored: true }); },
  onRetry() { this.setData({ errored: false, mapUrl: `${BASE_MAP_URL}?t=${Date.now()}` }); }
});
