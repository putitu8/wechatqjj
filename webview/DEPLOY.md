# Deploy webview to CloudBase static hosting

This is a manual deployment step.

## Steps

1. Open WeChat DevTools → 云开发 → 静态网站托管.
2. Click "上传文件夹" and select the `webview/` directory in this repo.
3. After upload completes, copy the assigned domain (looks like `prod-xyz123-1300000000.tcloudbaseapp.com`). Save this as `<CLOUD_STATIC_HOST>` in cloud-setup.md.
4. **Whitelist** the domain in 微信公众平台 → 开发 → 开发管理 → 服务器域名 → 业务域名:
   - Add `https://<CLOUD_STATIC_HOST>`.
   - Download the verify file from the platform.
   - Upload it back to static hosting at root (e.g., `/MP_verify_xxx.txt`).
   - Click "校验" on the platform.
5. Update `miniprogram/pages/shilu/index.js`:
   - Replace `https://<CLOUD_STATIC_HOST>/index.html` with the actual domain from step 3.
6. Commit the URL update:
   ```bash
   git add miniprogram/pages/shilu/index.js
   git commit -m "chore: wire web-view to deployed static host"
   ```

## CDN dependencies

The current `index.html` loads these from public CDNs:
- `https://unpkg.com/leaflet@1.9.4/dist/leaflet.{css,js}` — Leaflet
- `https://fonts.googleapis.com/css2?family=Noto+Serif+SC...` — font
- `https://res.wx.qq.com/open/js/jweixin-1.6.0.js` — WeChat JS SDK

For production reliability, vendor leaflet + Noto Serif SC into `webview/vendor/` and reference relatively. The WeChat SDK must remain at the qq.com URL.

## Smoke test (real device)

1. Build mini program in DevTools → 预览 → scan QR with phone.
2. Tap "诗路心踪" tab.
3. Map should render (warm sepia tone), 7 paper-frame labels visible.
4. Tap a label → drawer rises to half-height with poem + 2 buttons.
5. Tap "问问东坡先生" → mini program navigates to `/pages/chat/index?topic=景点名`.
6. Tap "我已到此一游" → mini program navigates to `/pages/mingren/detail/index?siteId=...&autoCheckin=1`, which auto-triggers the GPS checkin.
