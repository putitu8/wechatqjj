# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WeChat Mini Program: **古镇文化地图 · 苏东坡杭州** — a cultural-tour app with an interactive water-ink map of 7 historical Su Dongpo sites in Hangzhou, GPS check-in, a local-script "talk to Su Dongpo" dialogue, and a completion certificate. MVP scope, ready for app-store submission.

## Three deliverables (one repo)

```
miniprogram/      WeChat Mini Program frontend  (4 tabs + chat + global float)
webview/          Standalone HTML map site      (Leaflet + Stadia + ink overlay)
cloudfunctions/   CloudBase functions           (login / checkin / sync-progress)
```

They communicate via:
- Mini program ↔ web-view: `wx.miniProgram.navigateTo` (sync; used inside `webview/js/bridge.js`) and `wx.miniProgram.postMessage` (deferred; fires on hide/back/share).
- Mini program ↔ cloud functions: **always** through `miniprogram/utils/cloud.js` (`cloud.call(name, data)`), never `wx.cloud.callFunction` directly. The wrapper does 1s/2s/4s retries.
- Cloud functions ↔ DB: `cloud.database()` against 3 collections (`users`, `checkins`, `sites`).

## Commands

```bash
npm test                           # full unit suite (haversine + matcher + storage + checkin)
npm test -- haversine              # single suite by name fragment
npm run test:watch                 # TDD loop
```

Tests cover the **pure-logic** modules only. UI components and pages have no automated tests by design — verify in WeChat DevTools simulator + real device.

There is no build step. WeChat DevTools loads `miniprogram/` directly. To run: open WeChat DevTools → "Import Project" → point at this repo root → AppID is in `project.config.json` (currently `YOUR_APPID` placeholder).

## Architecture conventions (cross-cutting — read before editing)

1. **Design tokens are sacred.** All colors / spacing / radius / shadow / type sizes live as CSS custom properties in `miniprogram/app.wxss`. Pages and components reference `var(--*)` only. Three exceptions are intentional and allowed:
   - Canvas drawing calls (`components/certificate/index.js`) — context only accepts color strings.
   - Alpha-modified `rgba(31, 58, 64, X)` overlays where a token can't carry the alpha.
   - `webview/styles.css` — separate site, has its own `:root` redeclaration of the same tokens.
   When the hi-fi designs land, only `app.wxss` and component `.wxss` change. Never touch wxml/js to "make the design fit."

2. **Data shape**: every static-data file (`miniprogram/data/{poems,sites,dishes}.js`, `webview/data/*.json`) exports the same shape — a frozen map keyed by `id` plus `.all` and `.byId(id)`. Don't introduce a new shape.

3. **Storage**: never call `wx.setStorageSync` / `wx.getStorageSync` from a page. Always go through `miniprogram/utils/storage.js` (TTL-aware, FIFO list ops). Cache keys in use across pages: `userInfo`, `checkinCache` (TTL 5 min), `aiHistory` (FIFO 50), `floatingSuPos`. Adding a new key? Document it here.

4. **`checkinCache` invalidation**: `mingren/detail` clears it on a successful check-in; `wusheng/index` clears it on pull-to-refresh. `mingren/index` and `wusheng/index` consume it on `onShow`. If you add a place that mutates check-in state, it must clear this key.

5. **Haversine is duplicated** between `miniprogram/utils/haversine.js` and `cloudfunctions/checkin/haversine.js`. Intentional — cloud-fn deploy bundle can't `require('../../miniprogram/...')`. Keep both in sync if you change the formula. Tests only target the miniprogram copy; cloud-fn copy has no test of its own (covered transitively by `cloudfunctions/checkin/index.js`'s `evaluateCheckin`, which is the testable export).

6. **Cloud-function I/O contract**: every function returns `{ ok: boolean, ... }`. `ok: false` may include `error` (machine-readable code) and/or `message` (user-friendly Chinese for direct toast display).

7. **Floating Su button** is a per-page component, not a global overlay. Each page that should show it includes `<floating-su />` in its wxml. The chat page intentionally omits it. Position is persisted in storage and survives reloads.

## Deferred placeholders (intentional, NOT typos)

These two strings appear in source and are **only** filled at deploy time:
- `<CLOUD_ENV_ID>` in `miniprogram/app.js` — the CloudBase env id, replaced after env creation per `docs/superpowers/specs/cloud-setup.md`.
- `<CLOUD_STATIC_HOST>` in `miniprogram/app.js` (font URL) and `miniprogram/pages/shilu/index.js` (web-view src) — the CloudBase static-hosting domain, set after `webview/` is uploaded per `webview/DEPLOY.md`.

Don't substitute hardcoded test values; instead update the deploy docs if the wiring changes.

## Reference docs (read these before non-trivial changes)

- `docs/superpowers/specs/2026-04-26-wechat-su-dongpo-design.md` — product design (4 tabs, 7 sites, 7 dishes, 30 Q&A, 4 user flows, data model, error handling, launch checklist)
- `docs/superpowers/specs/2026-04-26-ui-design.md` — visual system, component anatomy, page-level layouts, accessibility checklist
- `docs/superpowers/plans/2026-04-26-implementation-plan.md` — task-by-task implementation plan (the source of how each file got its current shape)
- `docs/superpowers/specs/cloud-setup.md` — manual cloud env + DB + functions deploy steps
- `webview/DEPLOY.md` — manual static-hosting upload + domain whitelist + URL wire-up

## Git remote

Origin is `git@github.com:putitu8/wechatqjj.git`. The repo's `core.sshCommand` is set locally to use `~/.ssh/id_ed25519` (the key tied to the `putitu8` GitHub account); the global `~/.ssh/config` points github.com at a different key, so this local override is what makes pushes work. Don't unset it.
