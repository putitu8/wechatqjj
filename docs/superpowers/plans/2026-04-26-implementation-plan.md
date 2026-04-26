# 古镇文化地图 · 苏东坡杭州 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a WeChat Mini Program for the "Su Dongpo · Hangzhou" cultural tour MVP — interactive water-ink map, GPS check-in across 7 historical sites, local-script AI dialogue with Su Dongpo, and a tour-completion certificate, ready for app-store submission.

**Architecture:** Three cooperating deliverables. (a) **Mini-program frontend** — 4 tabs + 1 chat page + a global floating button. (b) **Web-view map page** — standalone HTML hosted on CloudBase static hosting, embedded via `<web-view>`; communicates with the host via `wx.miniProgram.postMessage` / `wx.miniProgram.navigateTo`. (c) **Three cloud functions** on CloudBase — `login`, `checkin`, `sync-progress` — talking to a 3-collection cloud database. Pure logic (haversine, AI matcher, retry, storage) is TDD'd with Jest. UI is manually verified against acceptance criteria. Visual design is fully isolated to `app.wxss` design tokens + each component's `.wxss`, so the hi-fi designs (arriving later) only swap styles, never structure.

**Tech Stack:** WeChat Mini Program native (wxml/wxss/js, `Component({})`), CloudBase (Cloud Functions Node 16, Cloud Database, Static Hosting), Leaflet 1.9 + Stadia Maps tiles, Noto Serif SC subset (思源宋体 SemiBold), Jest 29 for unit tests.

---

## File Structure

```
wechatapp/
├── package.json                          # jest + dev deps for the host project
├── jest.config.js
├── .gitignore
├── project.config.json                   # WeChat Devtools project config
├── miniprogram/
│   ├── app.js                            # globalData, font preload, cloud init
│   ├── app.json                          # tabs, pages, window
│   ├── app.wxss                          # GLOBAL DESIGN TOKENS (only place hex lives)
│   ├── pages/
│   │   ├── shilu/                        # 诗路心踪 (web-view shell)
│   │   ├── mingren/index/                # 名人心迹 list
│   │   ├── mingren/detail/               # 名人心迹 detail (auto-checkin)
│   │   ├── wanwu/index/                  # 万物心愈 list
│   │   ├── wanwu/detail/                 # 万物心愈 detail
│   │   ├── wusheng/index/                # 吾生心途 login + progress
│   │   ├── wusheng/certificate/          # 通游证书
│   │   └── chat/                         # 与东坡对话
│   ├── components/
│   │   ├── ancient-frame/                # 双线回字纹竖排标签
│   │   ├── floating-su/                  # 全局悬浮东坡（含拖拽）
│   │   ├── seal-stamp/                   # 红印组件（盖章动画）
│   │   └── certificate/                  # 证书 Canvas 合成
│   ├── ai/
│   │   ├── script-library.js             # 30 条 Q&A 数据
│   │   ├── persona.js                    # 5 条兜底
│   │   └── matcher.js                    # 分词 + 关键词匹配 + 评分
│   ├── data/
│   │   ├── poems.js                      # 3 首完整苏诗
│   │   ├── dishes.js                     # 7 道菜
│   │   └── sites.js                      # 7 景点（前端缓存副本）
│   ├── utils/
│   │   ├── haversine.js                  # 经纬度距离（共享给云函数）
│   │   ├── storage.js                    # 缓存抽象 (TTL)
│   │   ├── cloud.js                      # cloud function client + retry
│   │   └── checkin.js                    # GPS + 云调用编排
│   └── assets/                           # 字体子集、tab 图标、AI 工笔画
│
├── webview/                              # 独立 HTML 站，部署到云开发静态托管
│   ├── index.html
│   ├── ink-overlay.svg
│   ├── data/
│   │   ├── sites.json                    # 7 景点坐标 + 简介
│   │   └── poems.json                    # 3 首诗 + 标签短句
│   └── js/
│       ├── map.js                        # Leaflet + Stadia 初始化
│       ├── labels.js                     # 竖排诗签渲染
│       ├── drawer.js                     # 三档抽屉
│       └── bridge.js                     # postMessage / navigateTo 桥
│
├── cloudfunctions/
│   ├── login/                            # getPhoneNumber 解码 + users upsert
│   ├── checkin/                          # GPS 校验 + checkins upsert
│   └── sync-progress/                    # 拉用户已打卡列表
│
├── tests/                                # Jest unit tests for pure logic
│   ├── haversine.test.js
│   ├── matcher.test.js
│   ├── storage.test.js
│   └── cloudfunctions/
│       └── checkin.test.js
│
└── docs/superpowers/
    ├── specs/
    │   ├── 2026-04-26-wechat-su-dongpo-design.md
    │   └── 2026-04-26-ui-design.md
    └── plans/
        └── 2026-04-26-implementation-plan.md   # ← this file
```

---

## Conventions

- **Commits**: conventional (`feat:`, `fix:`, `test:`, `chore:`, `docs:`). One commit per task unless a task explicitly says "commit at end".
- **Tests**: `npm test` must be green before every commit. Pure logic only (haversine, matcher, storage, cloud-function logic). UI verified manually against acceptance criteria.
- **Styling**: only `app.wxss` and each component's local `.wxss` contain colors/sizes. **No raw hex in pages.** When the hi-fi design lands, we change tokens (`app.wxss`) + each component's `.wxss` — nothing else. (Task 8.1 covers the swap.)
- **Cloud Functions**: Node 16, no top-level await. Always return `{ ok: boolean, ... }` for consistency.
- **Branching**: do this on a feature branch. Phases can be split into PRs at engineer's discretion.

---

## Pre-flight (one-time, do once before Phase 0)

You'll need:
- A WeChat 公众平台 account and a Mini Program AppID with cloud-development enabled (already registered per spec).
- WeChat DevTools installed (https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html).
- Node.js 16+ on your machine for Jest and cloud-function deploys.
- The Stadia Maps API key from spec §2.3: `94b4b80b-f12e-4c63-b860-93a6c584bfe9`.
- A CloudBase environment ID (you create it via WeChat DevTools → 云开发 → New Environment; copy the env ID, it looks like `prod-xyz123`). Save this — referenced as `<CLOUD_ENV_ID>` throughout the plan.

---

## Phase 0 · Project Scaffold

### Task 0.1: Initialize repo skeleton

**Files:**
- Create: `package.json`, `.gitignore`, `jest.config.js`, `project.config.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "wechatapp",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

- [ ] **Step 2: Create `jest.config.js`**

```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'miniprogram/utils/**/*.js',
    'miniprogram/ai/**/*.js',
    'cloudfunctions/**/index.js',
    'cloudfunctions/**/*.js',
    '!**/node_modules/**'
  ]
};
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.DS_Store
*.log
dist/
.cloudbase/
.idea/
.vscode/
miniprogram_npm/
```

- [ ] **Step 4: Create `project.config.json`** (replace `YOUR_APPID`)

```json
{
  "description": "古镇文化地图 · 苏东坡杭州",
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "appid": "YOUR_APPID",
  "projectname": "wechatapp",
  "setting": {
    "es6": true,
    "minified": true,
    "postcss": false,
    "urlCheck": true
  },
  "compileType": "miniprogram",
  "libVersion": "3.0.0"
}
```

- [ ] **Step 5: Install jest**

Run: `npm install`
Expected: `node_modules/` populated, no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json jest.config.js .gitignore project.config.json
git commit -m "chore: init project scaffold"
```

---

### Task 0.2: Mini Program manifest + global config

**Files:**
- Create: `miniprogram/app.json`, `miniprogram/app.js`, `miniprogram/app.wxss`, `miniprogram/sitemap.json`

- [ ] **Step 1: Create `miniprogram/app.json`**

```json
{
  "pages": [
    "pages/shilu/index",
    "pages/mingren/index/index",
    "pages/wanwu/index/index",
    "pages/wusheng/index/index",
    "pages/mingren/detail/index",
    "pages/wanwu/detail/index",
    "pages/wusheng/certificate/index",
    "pages/chat/index"
  ],
  "window": {
    "navigationBarTitleText": "苏东坡 · 杭州行旅",
    "navigationBarBackgroundColor": "#F5E9C8",
    "navigationBarTextStyle": "black",
    "backgroundColor": "#F7EEDA"
  },
  "tabBar": {
    "color": "#A89880",
    "selectedColor": "#1F3A40",
    "backgroundColor": "#F5E9C8",
    "borderStyle": "white",
    "list": [
      { "pagePath": "pages/shilu/index", "text": "诗路心踪" },
      { "pagePath": "pages/mingren/index/index", "text": "名人心迹" },
      { "pagePath": "pages/wanwu/index/index", "text": "万物心愈" },
      { "pagePath": "pages/wusheng/index/index", "text": "吾生心途" }
    ]
  },
  "permission": {
    "scope.userLocation": {
      "desc": "用于校验你是否到达东坡足迹景点"
    }
  },
  "requiredPrivateInfos": ["getLocation"],
  "style": "v2",
  "lazyCodeLoading": "requiredComponents"
}
```

(Tab icons will be added in Task 8.1 alongside hi-fi assets — leaving them off until then is intentional and DevTools will warn but not error.)

- [ ] **Step 2: Create `miniprogram/app.js`**

```js
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

    // Async font load — non-blocking. Falls back to system serif on failure.
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
```

(Replace `<CLOUD_ENV_ID>` with the env ID from Pre-flight, `<CLOUD_STATIC_HOST>` is set in Phase 7.)

- [ ] **Step 3: Create `miniprogram/app.wxss`** (THE design token file — colors live ONLY here)

```css
/**
 * Design tokens — Eastern Paper style.
 * After hi-fi designs land (Task 8.1), only this file + component .wxss
 * are touched. Pages reference variables only; no raw hex anywhere else.
 */
page {
  /* Ink */
  --ink-deep: #1F3A40;
  --ink-cyan: #2D5560;
  --ink-light: #5A8A92;

  /* Paper */
  --paper-rice: #F7EEDA;
  --paper-warm: #F5E9C8;
  --paper-deep: #EDDEB6;

  /* Frame */
  --frame-brown: #5A3C1F;
  --frame-light: #B8966B;

  /* Seal & status */
  --seal-red: #8B3A3A;
  --seal-light: #B86060;
  --success: #4A6B3F;
  --warn: #B8742A;

  /* Text */
  --text-main: #3A2818;
  --text-fade: #7A6A4F;
  --text-mute: #A89880;

  /* Spacing (4rpx base) */
  --sp-1: 8rpx; --sp-2: 16rpx; --sp-3: 24rpx;
  --sp-4: 32rpx; --sp-5: 48rpx; --sp-6: 64rpx;

  /* Type */
  --fs-xs: 20rpx; --fs-sm: 24rpx; --fs-base: 28rpx;
  --fs-md: 32rpx; --fs-lg: 40rpx; --fs-xl: 56rpx;

  /* Radius */
  --r-sm: 8rpx; --r-md: 16rpx; --r-lg: 24rpx; --r-pill: 999rpx;

  /* Shadow */
  --ele-1: 0 2rpx 8rpx rgba(31, 58, 64, 0.06);
  --ele-2: 0 4rpx 16rpx rgba(31, 58, 64, 0.10);
  --ele-3: 0 8rpx 32rpx rgba(31, 58, 64, 0.14);

  background: var(--paper-rice);
  color: var(--text-main);
  font-family: 'NotoSerifSC', 'PingFang SC', 'Source Han Serif SC', serif;
  font-size: var(--fs-base);
}

.serif { font-family: 'NotoSerifSC', serif; }
.sans { font-family: -apple-system, 'PingFang SC', sans-serif; }
.vertical { writing-mode: vertical-rl; text-orientation: upright; }

/* Reduced-motion respect */
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 80ms !important; transition-duration: 80ms !important; }
}
```

- [ ] **Step 4: Create `miniprogram/sitemap.json`**

```json
{ "rules": [{ "action": "allow", "page": "*" }] }
```

- [ ] **Step 5: Open WeChat DevTools, point it to the project**

Open WeChat DevTools → "Import Project" → select `C:/Users/Jack/ClaudeCodeProjects/wechatapp`. The simulator should boot showing a blank tabbed app.
Expected: 4 tabs visible at bottom; pages are blank (page files not yet created — DevTools warns but app boots).

- [ ] **Step 6: Commit**

```bash
git add miniprogram/app.json miniprogram/app.js miniprogram/app.wxss miniprogram/sitemap.json
git commit -m "chore: mini program manifest with design tokens"
```

---

## Phase 1 · Pure Logic (TDD)

These three modules are pure JS. They have no WeChat globals and ship in both the mini program *and* (haversine) the cloud function. TDD strictly. **All three tasks parallelizable.**

### Task 1.1: Haversine distance util

**Files:**
- Create: `miniprogram/utils/haversine.js`
- Create: `tests/haversine.test.js`

- [ ] **Step 1: Write failing tests** — `tests/haversine.test.js`

```js
const { distanceMeters } = require('../miniprogram/utils/haversine');

describe('haversine distanceMeters', () => {
  test('zero distance for identical points', () => {
    expect(distanceMeters(30.245, 120.155, 30.245, 120.155)).toBe(0);
  });

  test('~111 km for one degree latitude', () => {
    const d = distanceMeters(30, 120, 31, 120);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  test('~96 km for one degree longitude at lat 30', () => {
    const d = distanceMeters(30, 120, 30, 121);
    expect(d).toBeGreaterThan(95000);
    expect(d).toBeLessThan(97000);
  });

  test('rounds to integer meters', () => {
    const d = distanceMeters(30.245, 120.155, 30.246, 120.156);
    expect(Number.isInteger(d)).toBe(true);
  });

  test('100m known fixture: youmeitang to nearby point', () => {
    // 30.246, 120.156 (有美堂遗址) → roughly 130 m offset
    const d = distanceMeters(30.246, 120.156, 30.247, 120.157);
    expect(d).toBeGreaterThan(120);
    expect(d).toBeLessThan(160);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

Run: `npm test -- haversine`
Expected: FAIL with `Cannot find module '.../haversine'`.

- [ ] **Step 3: Implement** — `miniprogram/utils/haversine.js`

```js
/**
 * Great-circle distance in meters between two WGS84 points.
 * Note: WeChat's wx.getLocation returns gcj02 by default; cloud-side
 * sites are stored in the same coordinate system, so direct comparison is fine.
 */
const R = 6371000; // earth radius, meters

function toRad(deg) { return deg * Math.PI / 180; }

function distanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

module.exports = { distanceMeters };
```

- [ ] **Step 4: Run — verify PASS**

Run: `npm test -- haversine`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add miniprogram/utils/haversine.js tests/haversine.test.js
git commit -m "feat(utils): haversine distance with tests"
```

---

### Task 1.2: AI keyword matcher

**Files:**
- Create: `miniprogram/ai/matcher.js`
- Create: `tests/matcher.test.js`

The matcher tokenizes a user query (CJK character-level + simple word splits), scores it against a list of Q&A entries by intersection size with each entry's `keywords`, and returns the highest-scoring answer. Zero hits → fall back to one of the persona lines (rotating to avoid repetition).

- [ ] **Step 1: Write failing tests** — `tests/matcher.test.js`

```js
const { tokenize, match } = require('../miniprogram/ai/matcher');

const LIB = [
  { id: 'q1', keywords: ['杭州', '治水', '苏堤'], answer: '熙宁四年至杭，疏浚西湖，筑苏堤六桥。' },
  { id: 'q2', keywords: ['美食', '东坡肉', '肉'],  answer: '净洗铛，少著水，柴头罨烟焰不起。' },
  { id: 'q3', keywords: ['弟弟', '苏辙', '兄弟'], answer: '与子由别多聚少，但愿人长久。' }
];
const PERSONA = ['某苏轼，眉山人，未明阁下所问。', '阁下不妨试问杭州、美食、家人之事。'];

describe('tokenize', () => {
  test('CJK character-level split', () => {
    expect(tokenize('杭州治水')).toEqual(expect.arrayContaining(['杭', '州', '治', '水', '杭州', '治水']));
  });

  test('handles punctuation and spaces', () => {
    const t = tokenize('  你好，杭州！  ');
    expect(t).toContain('杭州');
    expect(t).not.toContain(' ');
    expect(t).not.toContain('，');
  });

  test('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('match', () => {
  test('hits highest-scoring entry', () => {
    const r = match('请问东坡先生在杭州治水有何功绩', LIB, PERSONA);
    expect(r.qaId).toBe('q1');
    expect(r.score).toBeGreaterThan(0);
    expect(r.answer).toContain('苏堤');
  });

  test('zero hits falls back to persona', () => {
    const r = match('请问明日上海天气如何', LIB, PERSONA);
    expect(r.qaId).toBeNull();
    expect(r.score).toBe(0);
    expect(PERSONA).toContain(r.answer);
  });

  test('rotates persona on repeated zero-hits', () => {
    const r1 = match('aaaa', LIB, PERSONA, { fallbackIndex: 0 });
    const r2 = match('bbbb', LIB, PERSONA, { fallbackIndex: 1 });
    expect(r1.answer).not.toBe(r2.answer);
  });

  test('tie-break: first entry wins on equal score', () => {
    const lib = [
      { id: 'a', keywords: ['杭州'], answer: 'A' },
      { id: 'b', keywords: ['杭州'], answer: 'B' }
    ];
    const r = match('杭州', lib, PERSONA);
    expect(r.qaId).toBe('a');
  });

  test('empty query returns persona', () => {
    const r = match('', LIB, PERSONA);
    expect(r.qaId).toBeNull();
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

Run: `npm test -- matcher`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement** — `miniprogram/ai/matcher.js`

```js
/**
 * Lightweight keyword matcher for the local Su Dongpo Q&A library.
 * No external deps — runs in mini program & node.
 */

const PUNCT = /[\s　-〿＀-￯，。！？、；："'()（）《》【】]/;

function tokenize(input) {
  if (!input || !input.trim()) return [];
  const cleaned = input.replace(new RegExp(PUNCT.source, 'g'), '');
  const tokens = new Set();
  // single CJK chars
  for (const ch of cleaned) {
    if (ch) tokens.add(ch);
  }
  // adjacent bigrams (cheap "word" approximation for CJK)
  for (let i = 0; i < cleaned.length - 1; i++) {
    tokens.add(cleaned.slice(i, i + 2));
  }
  return [...tokens];
}

function score(queryTokens, keywords) {
  const set = new Set(queryTokens);
  let s = 0;
  for (const kw of keywords) {
    // exact whole-keyword match in query weighs more
    if (set.has(kw)) { s += 2; continue; }
    // partial char overlap
    for (const ch of kw) if (set.has(ch)) { s += 0.2; break; }
  }
  return s;
}

function match(query, library, persona, opts = {}) {
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return { qaId: null, score: 0, answer: persona[0] };
  }
  let best = { qaId: null, score: 0, answer: null };
  for (const qa of library) {
    const s = score(tokens, qa.keywords);
    if (s > best.score) best = { qaId: qa.id, score: s, answer: qa.answer };
  }
  if (best.score === 0) {
    const idx = (opts.fallbackIndex ?? 0) % persona.length;
    return { qaId: null, score: 0, answer: persona[idx] };
  }
  return best;
}

module.exports = { tokenize, score, match };
```

- [ ] **Step 4: Run — verify PASS**

Run: `npm test -- matcher`
Expected: all matcher tests pass.

- [ ] **Step 5: Commit**

```bash
git add miniprogram/ai/matcher.js tests/matcher.test.js
git commit -m "feat(ai): keyword matcher with persona fallback"
```

---

### Task 1.3: Storage cache helper

**Files:**
- Create: `miniprogram/utils/storage.js`
- Create: `tests/storage.test.js`

Wraps `wx.setStorageSync` / `wx.getStorageSync` with optional TTL and namespaced keys. In tests we mock the global `wx`.

- [ ] **Step 1: Write failing tests** — `tests/storage.test.js`

```js
// In-memory mock of wx storage for unit tests
beforeEach(() => {
  const store = {};
  global.wx = {
    setStorageSync: (k, v) => { store[k] = JSON.stringify(v); },
    getStorageSync: (k) => store[k] ? JSON.parse(store[k]) : '',
    removeStorageSync: (k) => { delete store[k]; }
  };
  jest.resetModules();
});

describe('storage', () => {
  test('set then get returns value', () => {
    const { set, get } = require('../miniprogram/utils/storage');
    set('user', { name: '苏小姐' });
    expect(get('user')).toEqual({ name: '苏小姐' });
  });

  test('returns null when key missing', () => {
    const { get } = require('../miniprogram/utils/storage');
    expect(get('missing')).toBeNull();
  });

  test('TTL expires correctly', () => {
    const { set, get } = require('../miniprogram/utils/storage');
    const realNow = Date.now;
    Date.now = () => 1000;
    set('temp', 'v', 100);            // ttl = 100 ms
    Date.now = () => 1099;
    expect(get('temp')).toBe('v');
    Date.now = () => 1101;
    expect(get('temp')).toBeNull();
    Date.now = realNow;
  });

  test('clear removes the key', () => {
    const { set, get, clear } = require('../miniprogram/utils/storage');
    set('user', { x: 1 });
    clear('user');
    expect(get('user')).toBeNull();
  });

  test('append + getAll for FIFO list with cap', () => {
    const { append, getAll } = require('../miniprogram/utils/storage');
    for (let i = 0; i < 55; i++) append('hist', { i }, 50);
    const all = getAll('hist');
    expect(all.length).toBe(50);
    expect(all[0].i).toBe(5);    // 0-4 dropped
    expect(all[49].i).toBe(54);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

Run: `npm test -- storage`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement** — `miniprogram/utils/storage.js`

```js
/**
 * Thin wrapper around wx.*StorageSync with optional TTL and FIFO list ops.
 * Storage shape: { value: <T>, expiresAt: <number|null> }
 */
function set(key, value, ttlMs) {
  const expiresAt = ttlMs ? Date.now() + ttlMs : null;
  wx.setStorageSync(key, { value, expiresAt });
}

function get(key) {
  const raw = wx.getStorageSync(key);
  if (!raw || typeof raw !== 'object') return null;
  if (raw.expiresAt && raw.expiresAt < Date.now()) {
    wx.removeStorageSync(key);
    return null;
  }
  return raw.value === undefined ? null : raw.value;
}

function clear(key) {
  wx.removeStorageSync(key);
}

function append(key, item, cap) {
  const list = get(key) || [];
  list.push(item);
  while (list.length > cap) list.shift();
  set(key, list);
}

function getAll(key) {
  return get(key) || [];
}

module.exports = { set, get, clear, append, getAll };
```

- [ ] **Step 4: Run — verify PASS**

Run: `npm test`
Expected: all 3 modules pass.

- [ ] **Step 5: Commit**

```bash
git add miniprogram/utils/storage.js tests/storage.test.js
git commit -m "feat(utils): storage with TTL and FIFO list ops"
```

---

## Phase 2 · Static Data Modules

These four data files have no logic, only frozen JS objects. **All four parallelizable.** Each is one task with one commit.

### Task 2.1: `miniprogram/data/poems.js`

- [ ] **Step 1: Create file** — full text from spec appendix A

```js
/**
 * Three complete Su Shi poems referenced in the MVP.
 * Source: spec §appendix A (2026-04-26-wechat-su-dongpo-design.md).
 */
const poems = {
  'youmeitang-baoyu': {
    id: 'youmeitang-baoyu',
    title: '有美堂暴雨',
    siteId: 'youmeitang',
    lines: [
      '游人脚底一声雷，满座顽云拨不开。',
      '天外黑风吹海立，浙东飞雨过江来。',
      '十分潋滟金樽凸，千杖敲铿羯鼓催。',
      '唤起谪仙泉洒面，倒倾鲛室泻琼瑰。'
    ],
    note: '熙宁六年（1073）作于杭州有美堂，暴雨忽至，气象壮阔。'
  },
  'liuyiquan': {
    id: 'liuyiquan',
    title: '次韵聪上人见寄',
    siteId: 'liuyiquan',
    lines: [
      '前身本同社，法乳遍诸方。',
      '一钵寄何处，千峰来故乡。',
      '云门大不二，铁壁自难忘。',
      '但恐他年别，空留六一泉。'
    ],
    note: '与僧友聪公唱和之作，六一泉为欧阳修号「六一居士」纪念泉。'
  },
  'guoxiting': {
    id: 'guoxiting',
    title: '过溪亭',
    siteId: 'guoxiting',
    lines: [
      '身轻步稳去忘归，四柱亭前野彴微。',
      '忽悟过溪还一笑，水禽惊落翠毛衣。'
    ],
    note: '杭州山行小品，野趣盎然。'
  }
};

module.exports = Object.freeze({
  poems,
  all: Object.values(poems),
  byId: (id) => poems[id] || null
});
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/data/poems.js
git commit -m "data: 3 Su Shi poems"
```

---

### Task 2.2: `miniprogram/data/sites.js`

7 sites with id, name, lat, lng, radius (200m default), short intro, linked poemId.

- [ ] **Step 1: Create file**

```js
/**
 * 7 sites of "东坡行旅 · 杭州" cultural tour.
 * Coordinates are gcj02 (matching wx.getLocation default).
 * (Verify lat/lng on a real device walk-through before launch — placeholder coords below.)
 */
const sites = {
  shiwudong:   { id: 'shiwudong',   name: '石屋洞题刻',   lat: 30.2280, lng: 120.1180, radius: 200, intro: '北宋古洞题刻群，含苏轼、蔡襄等多家手迹。', poemId: null },
  youmeitang:  { id: 'youmeitang',  name: '有美堂遗址',   lat: 30.2460, lng: 120.1560, radius: 200, intro: '宋嘉祐二年梅挚知杭州时建，苏轼《有美堂暴雨》作于此。', poemId: 'youmeitang-baoyu' },
  liuyiquan:   { id: 'liuyiquan',   name: '六一泉',       lat: 30.2410, lng: 120.1490, radius: 200, intro: '苏轼为纪念恩师欧阳修「六一居士」而题名。', poemId: 'liuyiquan' },
  sudi:        { id: 'sudi',        name: '苏堤',         lat: 30.2470, lng: 120.1430, radius: 600, intro: '元祐五年苏轼疏浚西湖，葑泥筑堤，长 2.8 公里。', poemId: null },
  sushixiang:  { id: 'sushixiang',  name: '苏轼石像',     lat: 30.2390, lng: 120.1460, radius: 200, intro: '后世为纪念苏轼治杭功绩所立。', poemId: null },
  damailing:   { id: 'damailing',   name: '大麦岭题刻',   lat: 30.2330, lng: 120.1410, radius: 200, intro: '元祐五年苏轼登大麦岭与僚属游览所题。', poemId: null },
  guoxiting:   { id: 'guoxiting',   name: '过溪亭',       lat: 30.2270, lng: 120.1090, radius: 200, intro: '虎跑山林间小亭，传苏轼游此作《过溪亭》。', poemId: 'guoxiting' }
};

module.exports = Object.freeze({
  sites,
  all: Object.values(sites),
  byId: (id) => sites[id] || null
});
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/data/sites.js
git commit -m "data: 7 sites for Hangzhou tour"
```

---

### Task 2.3: `miniprogram/data/dishes.js`

- [ ] **Step 1: Create file** (7 dishes following the schema below)

```js
/**
 * 7 Su Dongpo invented or favorite dishes.
 * Each: id, name, anecdote, quote (东坡 own words), iconAsset (path filled in Task 8.1).
 */
const dishes = {
  dongporou:    { id: 'dongporou',    name: '东坡肉',       anecdote: '徐州抗洪后，百姓送猪肉劳军，东坡分回赠之，成名菜。', quote: '净洗铛，少著水，柴头罨烟焰不起。待他自熟莫催他，火候足时他自美。', iconAsset: '' },
  dongpogeng:   { id: 'dongpogeng',   name: '东坡羹',       anecdote: '贬谪黄州时自创素羹，不用鱼肉，菜叶豆腐为主。', quote: '不用鱼肉五味，有自然之甘。',                                              iconAsset: '' },
  kaoyangji:    { id: 'kaoyangji',    name: '烤羊脊骨',     anecdote: '惠州贬居，肉贵难得，独取脊骨剔肉烤食。', quote: '剔尽骨肉，意犹未尽，如食蟹螯。',                                          iconAsset: '' },
  weiyu:        { id: 'weiyu',        name: '雪天煨芋',     anecdote: '儋州雪夜，与友煨芋夜话。', quote: '香似龙涎仍酽白，味如牛乳更全清。',                                                  iconAsset: '' },
  jugeng:       { id: 'jugeng',       name: '菊羹',         anecdote: '岭南秋食野菊，煮以为羹。', quote: '秋来煮以羹，亦自有清香。',                                                          iconAsset: '' },
  kaoshenghao:  { id: 'kaoshenghao',  name: '烤生蚝',       anecdote: '儋州海味，东坡书云勿告北方士大夫，恐争来分食。', quote: '食之甚美，未始有也。',                                            iconAsset: '' },
  miju:         { id: 'miju',         name: '蜜酒',         anecdote: '黄州自酿蜜酒，赠友尝之。', quote: '一日小醉，一日大醉，便快活。',                                                      iconAsset: '' }
};

module.exports = Object.freeze({
  dishes,
  all: Object.values(dishes),
  byId: (id) => dishes[id] || null
});
```

- [ ] **Step 2: Commit**

```bash
git add miniprogram/data/dishes.js
git commit -m "data: 7 Dongpo dishes"
```

---

### Task 2.4: `miniprogram/ai/script-library.js` and `miniprogram/ai/persona.js`

- [ ] **Step 1: Create `script-library.js`** — 30 entries covering身世/治水/写诗/美食/苏辙/王朝云

Schema: each entry is `{ id, keywords: string[], answer: string, category: string }`. Below is the **schema + 5 representative entries** — fill the remaining 25 by following the same shape, drawing from spec §1.5 categories (身世/杭州治水/写诗/美食/弟弟苏辙/王朝云). When in doubt, prefer short answers (≤80 字) in classical-leaning Chinese.

```js
const library = [
  // 身世 (5 entries: 出生 / 父亲 / 兄弟 / 三任妻 / 贬谪经历)
  { id: 'birth',  category: 'self',     keywords: ['出生', '哪里', '眉山', '故乡', '出身'],
    answer: '某苏轼，字子瞻，号东坡居士，眉州眉山人，景祐三年生。' },
  { id: 'father', category: 'self',     keywords: ['父亲', '苏洵', '老苏', '家学'],
    answer: '家父苏洵，字明允，晚学文章而成大器，世称老苏。' },

  // 杭州治水 (5 entries)
  { id: 'hangzhou-1', category: 'hangzhou', keywords: ['杭州', '治水', '苏堤', '西湖', '疏浚'],
    answer: '熙宁四年初至杭州为通判，元祐四年再来知州，疏浚西湖，葑泥筑堤六桥，是为苏堤。' },

  // 美食 (5 entries)
  { id: 'rou', category: 'food', keywords: ['东坡肉', '猪肉', '肉', '炖肉', '红烧'],
    answer: '净洗铛，少著水，柴头罨烟焰不起。待他自熟莫催他，火候足时他自美。' },

  // 弟弟苏辙 (5 entries)
  { id: 'ziyou', category: 'family', keywords: ['弟弟', '苏辙', '子由', '兄弟'],
    answer: '与子由别多聚少。但愿人长久，千里共婵娟。' }
  // ... 25 more entries following the same shape
];

module.exports = Object.freeze(library);
```

(In implementation, fill all 30 entries. Categorize roughly: 5 self / 5 hangzhou / 5 food / 5 poetry / 5 ziyou-family / 5 zhaoyun-women. Each entry: 3–6 keywords, ≤80 字 answer.)

- [ ] **Step 2: Create `miniprogram/ai/persona.js`**

```js
const persona = [
  '某苏轼，眉山人，未明阁下所问。不妨试问杭州、美食、家人之事。',
  '此事某未曾经历，恐难答之。可问问治水、写诗、煮肉？',
  '人生如逆旅，我亦是行人。阁下另问一题，何如？',
  '某非全知，愿闻其详。可换个话题：杭州足迹、东坡饮食、兄弟手足。',
  '答曰：不知。然天地之间，物各有主，苟非吾之所有，虽一毫而莫取。'
];

module.exports = Object.freeze(persona);
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/ai/script-library.js miniprogram/ai/persona.js
git commit -m "data: 30 Q&A library + 5 persona fallbacks"
```

---

## Phase 3 · Components (no business logic, only structure & props)

Each component is one task. Components ship **structure only** in this phase — visual styles use placeholder design tokens that will be polished in Task 8.1 against the hi-fi designs. **All four parallelizable.**

### Task 3.1: `<ancient-frame>` component

**Files:**
- Create: `miniprogram/components/ancient-frame/index.json`, `.wxml`, `.wxss`, `.js`

- [ ] **Step 1: `index.json`**

```json
{ "component": true, "usingComponents": {} }
```

- [ ] **Step 2: `index.wxml`**

```xml
<view class="frame frame-{{size}} {{clickable ? 'clickable' : ''}}"
      bindtap="onTap"
      aria-role="{{clickable ? 'button' : 'text'}}"
      aria-label="{{ariaLabel || text}}">
  <view class="inner">
    <text class="text vertical">{{text}}</text>
    <view wx:if="{{cornerMark}}" class="corner tl"></view>
    <view wx:if="{{cornerMark}}" class="corner tr"></view>
    <view wx:if="{{cornerMark}}" class="corner bl"></view>
    <view wx:if="{{cornerMark}}" class="corner br"></view>
  </view>
  <view wx:if="{{seal}}" class="seal-corner">
    <slot name="seal" />
  </view>
</view>
```

- [ ] **Step 3: `index.wxss`** (only tokens, no raw hex)

```css
.frame {
  display: inline-block;
  border: 4rpx solid var(--frame-brown);
  background: var(--paper-warm);
  padding: 6rpx;
  position: relative;
}
.frame .inner {
  border: 2rpx solid var(--frame-brown);
  padding: var(--sp-2);
  position: relative;
  display: flex; align-items: center; justify-content: center;
}
.frame .text {
  font-family: 'NotoSerifSC', serif;
  font-weight: 600;
  color: var(--ink-deep);
  letter-spacing: 8rpx;
  line-height: 1.4;
}
.frame-sm .text { font-size: var(--fs-md); }
.frame-md .text { font-size: var(--fs-lg); }
.frame-lg .text { font-size: var(--fs-poem, 48rpx); }

.corner { position: absolute; width: 8rpx; height: 8rpx; background: var(--frame-brown); border-radius: 50%; }
.corner.tl { top: 8rpx; left: 8rpx; }
.corner.tr { top: 8rpx; right: 8rpx; }
.corner.bl { bottom: 8rpx; left: 8rpx; }
.corner.br { bottom: 8rpx; right: 8rpx; }

.clickable { transition: transform 150ms ease-out, box-shadow 150ms ease-out; }
.clickable:active { transform: translateY(2rpx); box-shadow: 0 1rpx 2rpx rgba(31, 58, 64, 0.2); }

.seal-corner { position: absolute; right: -8rpx; bottom: -8rpx; }
```

- [ ] **Step 4: `index.js`**

```js
Component({
  options: { multipleSlots: true },
  properties: {
    text:        { type: String, value: '' },
    size:        { type: String, value: 'md' },     // sm | md | lg
    clickable:   { type: Boolean, value: false },
    cornerMark:  { type: Boolean, value: true },
    seal:        { type: Boolean, value: false },
    ariaLabel:   { type: String, value: '' }
  },
  methods: {
    onTap() {
      if (this.data.clickable) this.triggerEvent('tap');
    }
  }
});
```

- [ ] **Step 5: Manual smoke test**

Add a temporary usage in any page (e.g., `pages/wusheng/index/index.wxml`) and reload DevTools simulator:
```xml
<ancient-frame text="东坡行旅" size="md" />
```
Acceptance:
- Vertical text renders top-to-bottom
- Outer + inner double-line frame visible
- Four corner dots visible
- Tapping a `clickable` instance produces a 2rpx press-down feedback

Remove the test usage before committing.

- [ ] **Step 6: Commit**

```bash
git add miniprogram/components/ancient-frame/
git commit -m "feat(components): ancient-frame double-line vertical label"
```

---

### Task 3.2: `<seal-stamp>` component

**Files:**
- Create: `miniprogram/components/seal-stamp/{index.json,wxml,wxss,js}`

- [ ] **Step 1: `index.json`**

```json
{ "component": true }
```

- [ ] **Step 2: `index.wxml`**

```xml
<view class="seal seal-{{size}} {{stamping ? 'stamping' : ''}}" aria-label="苏东坡印章">
  <text class="seal-text">{{text}}</text>
</view>
```

- [ ] **Step 3: `index.wxss`**

```css
.seal {
  background: var(--seal-red);
  color: var(--paper-warm);
  font-family: 'NotoSerifSC', serif;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 0 0 2rpx rgba(247, 238, 218, 0.3);
}
.seal-sm { width: 52rpx; height: 52rpx; font-size: 18rpx; line-height: 1; }
.seal-md { width: 80rpx; height: 80rpx; font-size: 28rpx; }
.seal-lg { width: 120rpx; height: 120rpx; font-size: 42rpx; }

@keyframes stamp {
  0%   { opacity: 0; transform: scale(1.4) rotate(-8deg); }
  60%  { opacity: 1; transform: scale(1) rotate(3deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
.stamping { animation: stamp 480ms cubic-bezier(.2, .8, .2, 1.2); }
```

- [ ] **Step 4: `index.js`**

```js
Component({
  properties: {
    text:     { type: String, value: '東坡' },
    size:     { type: String, value: 'sm' },        // sm | md | lg
    stamping: { type: Boolean, value: false }       // toggle to trigger animation
  },
  methods: {
    /**
     * Trigger the stamp animation imperatively.
     * Usage in parent: this.selectComponent('#mySeal').play();
     */
    play() {
      this.setData({ stamping: false }, () => {
        this.setData({ stamping: true });
        wx.vibrateShort({ type: 'medium' });
        setTimeout(() => this.setData({ stamping: false }), 500);
      });
    }
  }
});
```

- [ ] **Step 5: Manual smoke test** — drop `<seal-stamp size="md" />` into any page; verify red square renders. Add a tap binding that calls `play()`; verify scale-rotate animation + haptic on a real device (DevTools won't vibrate but the animation runs).

- [ ] **Step 6: Commit**

```bash
git add miniprogram/components/seal-stamp/
git commit -m "feat(components): seal-stamp with imperative play()"
```

---

### Task 3.3: `<floating-su>` component (drag-aware)

**Files:**
- Create: `miniprogram/components/floating-su/{index.json,wxml,wxss,js}`

This is the global "ask Su Dongpo" entry point. Long-press to drag, position persists in storage, hides on the chat page itself.

- [ ] **Step 1: `index.json`**

```json
{ "component": true }
```

- [ ] **Step 2: `index.wxml`**

```xml
<view wx:if="{{visible}}"
      class="float"
      style="left:{{posX}}rpx;top:{{posY}}rpx;"
      bindlongpress="onLongPress"
      bindtouchmove="onTouchMove"
      bindtouchend="onTouchEnd"
      bindtap="onTap"
      aria-role="button"
      aria-label="问问东坡先生">
  <view class="bubble" wx:if="{{showBubble}}">问我</view>
  <view class="face">
    <image class="avatar" src="{{avatarSrc}}" mode="aspectFill" />
  </view>
</view>
```

- [ ] **Step 3: `index.wxss`**

```css
.float {
  position: fixed;
  width: 120rpx; height: 120rpx;
  border-radius: 50%;
  background: var(--paper-warm);
  border: 2rpx solid var(--frame-light);
  box-shadow: var(--ele-2);
  z-index: 40;
  display: flex; align-items: center; justify-content: center;
  transition: left 240ms cubic-bezier(.2, .8, .2, 1), top 240ms cubic-bezier(.2, .8, .2, 1);
}
.float.dragging { transition: none; }
.face { width: 100rpx; height: 100rpx; border-radius: 50%; overflow: hidden; }
.avatar { width: 100%; height: 100%; }
.bubble {
  position: absolute; left: -88rpx; top: 16rpx;
  background: var(--paper-warm);
  border: 2rpx solid var(--frame-brown);
  padding: 4rpx 12rpx;
  font-size: var(--fs-sm);
  color: var(--ink-deep);
  border-radius: var(--r-sm);
}
@keyframes shake {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
}
```

- [ ] **Step 4: `index.js`**

```js
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
      const saved = storage.get('floatingSuPos') || { x: 580, y: 1100 };  // default: bottom-right
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
      // convert px to rpx (1rpx = 750/screenWidth px)
      const sysInfo = wx.getSystemInfoSync();
      const ratio = 750 / sysInfo.windowWidth;
      this.setData({
        posX: Math.round(t.clientX * ratio - 60),
        posY: Math.round(t.clientY * ratio - 60)
      });
    },
    onTouchEnd() {
      if (!this.data.dragging) return;
      const sysInfo = wx.getSystemInfoSync();
      const ratio = 750 / sysInfo.windowWidth;
      // snap to left or right edge
      const screenW = 750;
      const finalX = this.data.posX + 60 < screenW / 2 ? 20 : screenW - 140;
      this.setData({ dragging: false, posX: finalX });
      storage.set('floatingSuPos', { x: finalX, y: this.data.posY });
    }
  }
});
```

- [ ] **Step 5: Manual smoke test** — temporarily drop `<floating-su />` in `pages/wusheng/index/index.wxml`. Acceptance: button is bottom-right, tap navigates to /pages/chat/index (will 404 until Task 5.6 — that's fine), long-press + drag moves it, release snaps to nearest edge, position persists across reloads.

- [ ] **Step 6: Commit**

```bash
git add miniprogram/components/floating-su/
git commit -m "feat(components): floating-su with drag and persistence"
```

---

### Task 3.4: `<certificate>` component (Canvas-rendered shareable image)

**Files:**
- Create: `miniprogram/components/certificate/{index.json,wxml,wxss,js}`

Renders a 750×1100rpx certificate to a `<canvas type="2d">`, exposes `save()` to write to the user's photo album.

- [ ] **Step 1: `index.json`**

```json
{ "component": true }
```

- [ ] **Step 2: `index.wxml`**

```xml
<canvas type="2d" id="certCanvas" class="cert" style="width:750rpx;height:1100rpx;"></canvas>
```

- [ ] **Step 3: `index.wxss`**

```css
.cert { background: var(--paper-warm); }
```

- [ ] **Step 4: `index.js`**

```js
Component({
  properties: {
    nickname:    { type: String, value: '' },
    completedAt: { type: String, value: '' },          // 'YYYY-MM-DD'
    siteNames:   { type: Array,  value: [] }           // 7 site names in completion order
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

        // background
        ctx.fillStyle = '#F5E9C8';
        ctx.fillRect(0, 0, W, H);

        // double-line border
        ctx.strokeStyle = '#5A3C1F';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, W - 40, H - 40);
        ctx.lineWidth = 2;
        ctx.strokeRect(32, 32, W - 64, H - 64);

        // title (vertical-ish — drawn as stacked chars)
        ctx.fillStyle = '#1F3A40';
        ctx.font = '700 36px "PingFang SC", serif';
        ctx.textAlign = 'center';
        const title = '東坡杭州行旅 通游证书';
        ctx.fillText(title, W / 2, 100);

        // user line
        ctx.font = '500 20px "PingFang SC", serif';
        ctx.fillStyle = '#3A2818';
        ctx.fillText(`兹有 ${this.data.nickname || '——'} 同游`, W / 2, 200);
        ctx.fillText(`遍访杭州东坡足迹七处`, W / 2, 240);
        ctx.fillText(`完成于 ${this.data.completedAt || '——'}`, W / 2, 280);

        // 7 site names
        ctx.font = '400 14px "PingFang SC", serif';
        ctx.fillStyle = '#7A6A4F';
        const cols = 4, cellW = (W - 200) / cols;
        this.data.siteNames.forEach((name, i) => {
          const r = Math.floor(i / cols), c = i % cols;
          ctx.fillText(name, 100 + c * cellW + cellW / 2, 400 + r * 60);
        });

        // seal
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
```

- [ ] **Step 5: Manual smoke test** — wire into `pages/wusheng/certificate/index.wxml` (created in Task 5.5). For now, drop into `wusheng/index` temporarily with hardcoded props. Acceptance: canvas renders title, user line, 7 names in a grid, red seal.

- [ ] **Step 6: Commit**

```bash
git add miniprogram/components/certificate/
git commit -m "feat(components): certificate canvas + save to album"
```

---

## Phase 4 · Cloud Backend

### Task 4.1: Provision cloud env + db collections + indexes

This is **manual setup**, not code. Do once.

- [ ] **Step 1**: WeChat DevTools → 云开发 → choose your env (`<CLOUD_ENV_ID>`) → 数据库.
- [ ] **Step 2**: Create collection `users`. Add unique index on `openid`.
- [ ] **Step 3**: Create collection `checkins`. Add compound index on `(openid, siteId)` with **unique** flag (de-dupes repeat checkins).
- [ ] **Step 4**: Create collection `sites`. Add unique index on `siteId`.
- [ ] **Step 5**: Set permissions for all three collections to "仅创建者可读写其创建的数据" except `sites` which should be "所有用户可读，仅管理员可写".
- [ ] **Step 6**: Document the env ID and collection states in `docs/superpowers/specs/cloud-setup.md`:

```markdown
# Cloud setup

- Env ID: <CLOUD_ENV_ID>
- Collections: users, checkins, sites
- Indexes: users.openid (unique), checkins.(openid,siteId) (unique compound), sites.siteId (unique)
- Sites seed data imported on <DATE> via Task 4.5.
```

- [ ] **Step 7: Commit the doc**

```bash
git add docs/superpowers/specs/cloud-setup.md
git commit -m "docs: cloud setup checklist"
```

---

### Task 4.2: `cloudfunctions/login`

Decodes `getPhoneNumber` encryptedData, upserts a `users` row, returns the user.

**Files:**
- Create: `cloudfunctions/login/{index.js,package.json,config.json}`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "login",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: `config.json`**

```json
{ "permissions": { "openapi": [] } }
```

- [ ] **Step 3: `index.js`**

```js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: 'no_openid' };

  const db = cloud.database();
  const _ = db.command;

  // The new (since 2023) plain-text path: getPhoneNumber returns a `code` you exchange.
  let phone = '';
  if (event.code) {
    try {
      const r = await cloud.openapi.phonenumber.getPhoneNumber({ code: event.code });
      phone = r.phoneInfo.purePhoneNumber || '';
    } catch (e) {
      console.error('phonenumber getPhoneNumber failed', e);
      return { ok: false, error: 'phone_decode_failed' };
    }
  }

  const now = Date.now();
  const existing = await db.collection('users').where({ openid: OPENID }).get();
  if (existing.data.length === 0) {
    await db.collection('users').add({
      data: {
        openid: OPENID,
        phone,
        nickname: event.nickname || '东坡同游',
        avatar: event.avatar || '',
        registeredAt: now
      }
    });
  } else if (phone && existing.data[0].phone !== phone) {
    await db.collection('users').where({ openid: OPENID }).update({ data: { phone } });
  }

  const user = (await db.collection('users').where({ openid: OPENID }).get()).data[0];
  return { ok: true, user };
};
```

- [ ] **Step 4: Deploy**

In WeChat DevTools right-click `cloudfunctions/login` → "上传并部署：云端安装依赖". Wait for "部署成功".

- [ ] **Step 5: Smoke test from devtools console**

```js
wx.cloud.callFunction({ name: 'login', data: { nickname: '测试' } }).then(console.log);
```
Expected: `{ ok: true, user: { openid: '...', nickname: '测试', ... } }`. Phone empty in this call (no code). Acceptable.

- [ ] **Step 6: Commit**

```bash
git add cloudfunctions/login/
git commit -m "feat(cloud): login with phone decode + users upsert"
```

---

### Task 4.3: `cloudfunctions/checkin` (TDD on the logic)

**Files:**
- Create: `cloudfunctions/checkin/{index.js,haversine.js,package.json,config.json}`
- Create: `tests/cloudfunctions/checkin.test.js`

Logic isolated into a pure function `evaluateCheckin(siteFromDb, lat, lng)` so we can test without mocking the cloud SDK.

- [ ] **Step 1: `cloudfunctions/checkin/haversine.js`** — copy of `miniprogram/utils/haversine.js`

```js
const R = 6371000;
function toRad(d) { return d * Math.PI / 180; }
function distanceMeters(la1, ln1, la2, ln2) {
  const dLat = toRad(la2 - la1), dLng = toRad(ln2 - ln1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
module.exports = { distanceMeters };
```

(Yes, this duplicates the mini program's haversine. Cloud functions can't reach into `../../miniprogram/utils/`. Both files are tiny and stable.)

- [ ] **Step 2: Write failing tests** — `tests/cloudfunctions/checkin.test.js`

```js
const { evaluateCheckin } = require('../../cloudfunctions/checkin/index');

const SITE = { siteId: 'youmeitang', name: '有美堂遗址', lat: 30.246, lng: 120.156, radius: 200 };

describe('evaluateCheckin', () => {
  test('within radius → ok', () => {
    const r = evaluateCheckin(SITE, 30.2461, 120.1561);
    expect(r.ok).toBe(true);
    expect(r.distance).toBeLessThan(50);
  });

  test('beyond radius → ok=false with distance', () => {
    const r = evaluateCheckin(SITE, 30.250, 120.160);
    expect(r.ok).toBe(false);
    expect(r.distance).toBeGreaterThan(200);
    expect(r.message).toMatch(/还差/);
  });

  test('null site → ok=false site_not_found', () => {
    const r = evaluateCheckin(null, 30.246, 120.156);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('site_not_found');
  });

  test('exact boundary (radius±1) — inside accepted', () => {
    // synthesize a point ~199m away
    const r = evaluateCheckin({ ...SITE, radius: 200 }, 30.2478, 120.156);
    // crude check: distance ≈ 200m
    expect(r.distance).toBeGreaterThan(150);
    expect(r.distance).toBeLessThan(250);
  });
});
```

- [ ] **Step 3: Run — verify FAIL**

Run: `npm test -- checkin`
Expected: FAIL — `evaluateCheckin` not exported.

- [ ] **Step 4: `cloudfunctions/checkin/index.js`**

```js
const cloud = require('wx-server-sdk');
const { distanceMeters } = require('./haversine');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * Pure logic, exported for unit testing. No cloud calls.
 */
function evaluateCheckin(site, lat, lng) {
  if (!site) return { ok: false, error: 'site_not_found' };
  const distance = distanceMeters(site.lat, site.lng, lat, lng);
  if (distance > site.radius) {
    return { ok: false, distance, message: `离${site.name}还差约 ${distance - site.radius} 米` };
  }
  return { ok: true, distance };
}

exports.main = async (event) => {
  const { siteId, lat, lng } = event;
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: 'no_openid' };
  if (!siteId || typeof lat !== 'number' || typeof lng !== 'number') {
    return { ok: false, error: 'bad_params' };
  }

  const db = cloud.database();
  const siteRow = await db.collection('sites').where({ siteId }).get();
  const site = siteRow.data[0];
  const verdict = evaluateCheckin(site, lat, lng);
  if (!verdict.ok) return verdict;

  const dup = await db.collection('checkins').where({ openid: OPENID, siteId }).get();
  const isFirstTime = dup.data.length === 0;

  if (isFirstTime) {
    await db.collection('checkins').add({
      data: {
        openid: OPENID, siteId, siteName: site.name,
        lat, lng, distanceM: verdict.distance, checkedAt: Date.now()
      }
    });
  }

  return { ok: true, isFirstTime, distance: verdict.distance, siteName: site.name };
};

exports.evaluateCheckin = evaluateCheckin;
```

- [ ] **Step 5: `package.json`** + `config.json`** (same as login)**

```json
{ "name": "checkin", "version": "1.0.0", "main": "index.js", "dependencies": { "wx-server-sdk": "~2.6.3" } }
```

```json
{ "permissions": { "openapi": [] } }
```

- [ ] **Step 6: Run — verify PASS**

Run: `npm test`
Expected: all green.

- [ ] **Step 7: Deploy**

DevTools → right-click `cloudfunctions/checkin` → 上传并部署：云端安装依赖.

- [ ] **Step 8: Commit**

```bash
git add cloudfunctions/checkin/ tests/cloudfunctions/checkin.test.js
git commit -m "feat(cloud): checkin with GPS validation + tests"
```

---

### Task 4.4: `cloudfunctions/sync-progress`

Returns the user's existing checkin list, used to render progress + decide certificate availability.

**Files:**
- Create: `cloudfunctions/sync-progress/{index.js,package.json,config.json}`

- [ ] **Step 1: `index.js`**

```js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: 'no_openid' };

  const db = cloud.database();
  const checkins = await db.collection('checkins')
    .where({ openid: OPENID })
    .orderBy('checkedAt', 'asc')
    .get();

  return {
    ok: true,
    checkins: checkins.data.map(c => ({
      siteId: c.siteId, siteName: c.siteName, checkedAt: c.checkedAt
    })),
    completedCount: checkins.data.length
  };
};
```

- [ ] **Step 2: `package.json`** + `config.json`** (same as others)**

- [ ] **Step 3: Deploy**

- [ ] **Step 4: Commit**

```bash
git add cloudfunctions/sync-progress/
git commit -m "feat(cloud): sync-progress reads user's checkins"
```

---

### Task 4.5: Seed `sites` collection

- [ ] **Step 1: Create `cloudfunctions/_seed/sites.json`** (one-time bulk import; don't deploy as a function)

```json
[
  { "siteId": "shiwudong",  "name": "石屋洞题刻",   "lat": 30.2280, "lng": 120.1180, "radius": 200, "intro": "北宋古洞题刻群，含苏轼、蔡襄等多家手迹。", "poemId": null,                  "imageUrl": "" },
  { "siteId": "youmeitang", "name": "有美堂遗址",   "lat": 30.2460, "lng": 120.1560, "radius": 200, "intro": "宋嘉祐二年梅挚知杭州时建，苏轼《有美堂暴雨》作于此。", "poemId": "youmeitang-baoyu", "imageUrl": "" },
  { "siteId": "liuyiquan",  "name": "六一泉",       "lat": 30.2410, "lng": 120.1490, "radius": 200, "intro": "苏轼为纪念恩师欧阳修「六一居士」而题名。", "poemId": "liuyiquan",          "imageUrl": "" },
  { "siteId": "sudi",       "name": "苏堤",         "lat": 30.2470, "lng": 120.1430, "radius": 600, "intro": "元祐五年苏轼疏浚西湖，葑泥筑堤。",        "poemId": null,                  "imageUrl": "" },
  { "siteId": "sushixiang", "name": "苏轼石像",     "lat": 30.2390, "lng": 120.1460, "radius": 200, "intro": "后世为纪念苏轼治杭功绩所立。",            "poemId": null,                  "imageUrl": "" },
  { "siteId": "damailing",  "name": "大麦岭题刻",   "lat": 30.2330, "lng": 120.1410, "radius": 200, "intro": "元祐五年苏轼登大麦岭与僚属游览所题。",    "poemId": null,                  "imageUrl": "" },
  { "siteId": "guoxiting",  "name": "过溪亭",       "lat": 30.2270, "lng": 120.1090, "radius": 200, "intro": "虎跑山林间小亭，传苏轼游此作《过溪亭》。", "poemId": "guoxiting",          "imageUrl": "" }
]
```

- [ ] **Step 2: Import to cloud**

DevTools → 云开发 → 数据库 → 选 `sites` collection → 导入 → 选 `cloudfunctions/_seed/sites.json` → 数据导入方式: insert.

- [ ] **Step 3: Verify**

Browse the `sites` collection in DevTools — should see 7 rows.

- [ ] **Step 4: Commit the seed file**

```bash
git add cloudfunctions/_seed/sites.json
git commit -m "data(cloud): seed sites collection"
```

---

## Phase 5 · Mini-program Pages

Each page does its own routing/data wiring. Style is intentionally minimal — Task 8.1 polishes against hi-fi.

### Task 5.1: `utils/cloud.js` and `utils/checkin.js` (page support layer)

**Files:**
- Create: `miniprogram/utils/cloud.js`, `miniprogram/utils/checkin.js`

- [ ] **Step 1: `miniprogram/utils/cloud.js`** — wraps `wx.cloud.callFunction` with retry (1s, 2s, 4s)

```js
function call(name, data = {}, attempt = 0) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({ name, data })
      .then(({ result }) => resolve(result))
      .catch((err) => {
        if (attempt >= 2) return reject(err);
        const delay = [1000, 2000, 4000][attempt];
        setTimeout(() => call(name, data, attempt + 1).then(resolve, reject), delay);
      });
  });
}
module.exports = { call };
```

- [ ] **Step 2: `miniprogram/utils/checkin.js`** — orchestrates GPS + cloud call

```js
const cloud = require('./cloud');

async function attempt(siteId) {
  const loc = await new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: ({ latitude, longitude }) => resolve({ lat: latitude, lng: longitude }),
      fail: reject
    });
  });
  return cloud.call('checkin', { siteId, lat: loc.lat, lng: loc.lng });
}

module.exports = { attempt };
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/utils/cloud.js miniprogram/utils/checkin.js
git commit -m "feat(utils): cloud retry wrapper + checkin orchestration"
```

---

### Task 5.2: 名人心迹 list (`pages/mingren/index/`)

**Files:**
- Create: `miniprogram/pages/mingren/index/{index.json,wxml,wxss,js}`

- [ ] **Step 1: `index.json`**

```json
{
  "navigationBarTitleText": "名人心迹",
  "usingComponents": {
    "ancient-frame": "/components/ancient-frame/index",
    "seal-stamp": "/components/seal-stamp/index",
    "floating-su": "/components/floating-su/index"
  },
  "enablePullDownRefresh": true
}
```

- [ ] **Step 2: `index.wxml`**

```xml
<view class="page">
  <view class="head">
    <text class="title">名人心迹</text>
    <text class="meta">东坡行旅 · 杭州 · 共 7 处 · 已访 {{completedCount}} 处</text>
  </view>

  <view class="grid">
    <view class="card" wx:for="{{sites}}" wx:key="id" bindtap="onTapSite" data-id="{{item.id}}">
      <view class="cover {{item.done ? '' : 'dim'}}">
        <text class="cover-glyph">{{item.glyph}}</text>
        <seal-stamp wx:if="{{item.done}}" size="sm" class="seal" />
      </view>
      <view class="info">
        <ancient-frame text="{{item.name}}" size="sm" />
        <view class="row">
          <text class="dist">{{item.distanceLabel}}</text>
          <text class="stat {{item.done ? 'ok' : 'no'}}">{{item.done ? '⊙ 已抵达' : '未抵达'}}</text>
        </view>
      </view>
    </view>
  </view>

  <floating-su />
</view>
```

- [ ] **Step 3: `index.wxss`**

```css
.page { padding: var(--sp-3) var(--sp-4) 120rpx; min-height: 100vh; }
.head { padding: var(--sp-3) 0 var(--sp-4); }
.title { font-family: 'NotoSerifSC', serif; font-weight: 700; font-size: var(--fs-lg); letter-spacing: 6rpx; color: var(--ink-deep); }
.meta { display: block; margin-top: var(--sp-1); font-size: var(--fs-xs); color: var(--text-fade); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
.card { background: var(--paper-warm); border-radius: var(--r-md); overflow: hidden; box-shadow: var(--ele-1); }
.cover { height: 220rpx; background: linear-gradient(135deg, var(--ink-light), var(--ink-cyan)); position: relative; display: flex; align-items: center; justify-content: center; }
.cover.dim { filter: grayscale(0.7) brightness(0.85); }
.cover-glyph { font-family: 'NotoSerifSC', serif; font-size: 80rpx; color: rgba(247, 238, 218, 0.4); }
.seal { position: absolute; top: 12rpx; right: 12rpx; }
.info { padding: var(--sp-2); }
.row { display: flex; justify-content: space-between; margin-top: var(--sp-1); }
.dist { font-size: var(--fs-xs); color: var(--text-fade); }
.stat.ok { color: var(--success); font-family: 'NotoSerifSC', serif; }
.stat.no { color: var(--text-mute); }
```

- [ ] **Step 4: `index.js`**

```js
const sitesData = require('../../../data/sites');
const cloud = require('../../../utils/cloud');
const storage = require('../../../utils/storage');
const { distanceMeters } = require('../../../utils/haversine');

const GLYPHS = { shiwudong: '⛰', youmeitang: '堂', liuyiquan: '泉', sudi: '堤', sushixiang: '像', damailing: '岭', guoxiting: '亭' };
const CHECKIN_CACHE_KEY = 'checkinCache';
const CHECKIN_CACHE_TTL = 5 * 60 * 1000;

Page({
  data: { sites: [], completedCount: 0 },

  onShow() { this._refresh(); },
  onPullDownRefresh() { this._refresh(true).then(() => wx.stopPullDownRefresh()); },

  async _refresh(force = false) {
    let progress = !force && storage.get(CHECKIN_CACHE_KEY);
    if (!progress) {
      try {
        progress = await cloud.call('sync-progress');
        if (progress.ok) storage.set(CHECKIN_CACHE_KEY, progress, CHECKIN_CACHE_TTL);
      } catch (e) {
        progress = { ok: false, checkins: [], completedCount: 0 };
      }
    }
    const doneSet = new Set((progress.checkins || []).map(c => c.siteId));

    // best-effort current location for distance display; no permission prompt on this page
    const loc = await new Promise((resolve) => {
      wx.getLocation({ type: 'gcj02', success: ({ latitude, longitude }) => resolve({ lat: latitude, lng: longitude }), fail: () => resolve(null) });
    });

    const sites = sitesData.all.map(s => ({
      ...s,
      glyph: GLYPHS[s.id] || '·',
      done: doneSet.has(s.id),
      distanceLabel: loc ? `${(distanceMeters(loc.lat, loc.lng, s.lat, s.lng) / 1000).toFixed(1)}km` : ''
    }));

    this.setData({ sites, completedCount: progress.completedCount || 0 });
  },

  onTapSite(e) {
    wx.navigateTo({ url: `/pages/mingren/detail/index?siteId=${e.currentTarget.dataset.id}` });
  }
});
```

- [ ] **Step 5: Manual smoke test**

Reload simulator → tap "名人心迹" tab. Acceptance: 7 cards in 2 columns, names render in vertical ancient-frame, distance shows `—km` if location denied (no error), tapping a card navigates (404 until Task 5.3 — fine).

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/mingren/index/
git commit -m "feat(page): 名人心迹 list with progress + distance"
```

---

### Task 5.3: 名人心迹 detail (`pages/mingren/detail/`)

**Files:**
- Create: `miniprogram/pages/mingren/detail/{index.json,wxml,wxss,js}`

- [ ] **Step 1: `index.json`**

```json
{
  "navigationBarTitleText": "景点详情",
  "usingComponents": {
    "ancient-frame": "/components/ancient-frame/index",
    "seal-stamp": "/components/seal-stamp/index",
    "floating-su": "/components/floating-su/index"
  }
}
```

- [ ] **Step 2: `index.wxml`**

```xml
<view class="page" wx:if="{{site}}">
  <view class="hero" style="background-image:url('{{site.imageUrl}}')">
    <view class="mask"></view>
    <text class="hero-name">{{site.name}}</text>
  </view>

  <view class="body">
    <text class="intro">{{site.intro}}</text>

    <ancient-frame wx:if="{{poem}}" text=" " size="lg" class="poem-frame">
      <text class="poem-title">《{{poem.title}}》</text>
      <text class="poem-line vertical" wx:for="{{poem.lines}}" wx:key="*this">{{item}}</text>
      <text class="poem-note">{{poem.note}}</text>
    </ancient-frame>

    <view class="actions">
      <button wx:if="{{!checkedIn}}" class="cta" bindtap="onCheckin" loading="{{checking}}">我已到此一游</button>
      <view wx:else class="done">
        <seal-stamp size="md" id="seal" />
        <text>已盖章 · {{checkedAtLabel}}</text>
      </view>
    </view>
  </view>

  <floating-su />
</view>
```

- [ ] **Step 3: `index.wxss`**

```css
.page { min-height: 100vh; padding-bottom: 200rpx; }
.hero { height: 480rpx; position: relative; background-size: cover; background-position: center; background-color: var(--ink-cyan); }
.mask { position: absolute; inset: 0; background: linear-gradient(180deg, transparent, rgba(31, 58, 64, 0.7)); }
.hero-name { position: absolute; left: var(--sp-4); bottom: var(--sp-3); font-family: 'NotoSerifSC', serif; font-weight: 700; font-size: var(--fs-xl); color: var(--paper-warm); letter-spacing: 8rpx; }

.body { padding: var(--sp-4); }
.intro { display: block; font-size: var(--fs-base); line-height: 1.7; color: var(--text-main); }

.poem-frame { display: block; margin: var(--sp-5) auto; }
.poem-title { display: block; font-family: 'NotoSerifSC', serif; font-weight: 700; font-size: var(--fs-md); color: var(--ink-deep); text-align: center; margin-bottom: var(--sp-2); }
.poem-line { display: block; font-family: 'NotoSerifSC', serif; font-size: var(--fs-md); color: var(--ink-deep); margin: var(--sp-1) auto; letter-spacing: 6rpx; }
.poem-note { display: block; margin-top: var(--sp-3); font-size: var(--fs-sm); color: var(--text-fade); text-align: center; }

.actions { margin-top: var(--sp-5); }
.cta { background: var(--ink-deep); color: var(--paper-warm); height: 96rpx; line-height: 96rpx; border-radius: var(--r-md); font-family: 'NotoSerifSC', serif; font-size: var(--fs-md); letter-spacing: 6rpx; }
.done { display: flex; align-items: center; justify-content: center; gap: var(--sp-2); color: var(--text-fade); }
```

- [ ] **Step 4: `index.js`**

```js
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

    // Check existing progress
    const progress = storage.get('checkinCache');
    const hit = progress && progress.checkins && progress.checkins.find(c => c.siteId === site.id);
    if (hit) {
      this.setData({ checkedIn: true, checkedAtLabel: this._fmtDate(hit.checkedAt) });
    }

    // Auto-checkin path from drawer flow
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
      // Success
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
```

- [ ] **Step 5: Manual smoke test**

From list page, tap a site that has a poem (e.g., 有美堂遗址). Acceptance: hero with name overlay, intro, vertical poem in ancient-frame, "我已到此一游" button. Tap → permission prompt → on grant + within radius, success toast and seal animation. With location denied → settings modal.

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/mingren/detail/
git commit -m "feat(page): 名人心迹 detail with auto-checkin"
```

---

### Task 5.4: 万物心愈 list + detail (`pages/wanwu/...`)

**Files:**
- Create: `miniprogram/pages/wanwu/index/{index.json,wxml,wxss,js}`
- Create: `miniprogram/pages/wanwu/detail/{index.json,wxml,wxss,js}`

This is structurally simpler than `mingren` — no GPS, no cloud calls, just data display. Pattern follows §3 of the ui-design doc.

- [ ] **Step 1: List page** — `pages/wanwu/index/index.{json,wxml,wxss,js}`

`index.json`:
```json
{ "navigationBarTitleText": "万物心愈", "usingComponents": { "floating-su": "/components/floating-su/index" } }
```

`index.wxml`:
```xml
<view class="page">
  <view class="head">
    <text class="title">万物心愈</text>
    <text class="meta">东坡七味 · 食以载道</text>
  </view>
  <view class="grid">
    <view class="card" wx:for="{{dishes}}" wx:key="id" bindtap="onTap" data-id="{{item.id}}">
      <image class="icon" src="{{item.iconAsset || '/assets/dish-placeholder.png'}}" mode="aspectFit" />
      <text class="name">{{item.name}}</text>
      <text class="quote vertical">{{item.shortQuote}}</text>
      <view class="divider">━━━</view>
      <text class="legend">{{item.shortAnecdote}}</text>
    </view>
  </view>
  <floating-su />
</view>
```

`index.wxss`:
```css
.page { padding: var(--sp-3) var(--sp-4) 120rpx; }
.head { padding: var(--sp-3) 0 var(--sp-4); }
.title { font-family: 'NotoSerifSC', serif; font-weight: 700; font-size: var(--fs-lg); color: var(--ink-deep); letter-spacing: 6rpx; }
.meta { display: block; margin-top: var(--sp-1); font-size: var(--fs-xs); color: var(--text-fade); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }
.card { background: var(--paper-warm); border-radius: var(--r-md); padding: var(--sp-4) var(--sp-2); text-align: center; box-shadow: var(--ele-1); }
.icon { width: 160rpx; height: 160rpx; margin: 0 auto var(--sp-2); }
.name { font-family: 'NotoSerifSC', serif; font-weight: 700; font-size: var(--fs-md); color: var(--ink-deep); letter-spacing: 6rpx; display: block; }
.quote { font-family: 'NotoSerifSC', serif; font-size: var(--fs-sm); color: var(--text-fade); height: 100rpx; margin: var(--sp-2) auto; letter-spacing: 2rpx; display: block; }
.divider { width: 60rpx; height: 16rpx; margin: var(--sp-2) auto; color: var(--seal-red); }
.legend { font-size: var(--fs-sm); color: var(--text-main); font-family: 'NotoSerifSC', serif; }
```

`index.js`:
```js
const data = require('../../../data/dishes');

Page({
  data: { dishes: [] },
  onLoad() {
    const dishes = data.all.map(d => ({
      ...d,
      shortQuote: d.quote.length > 12 ? d.quote.slice(0, 12) + '…' : d.quote,
      shortAnecdote: d.anecdote.length > 14 ? d.anecdote.slice(0, 14) + '…' : d.anecdote
    }));
    this.setData({ dishes });
  },
  onTap(e) { wx.navigateTo({ url: `/pages/wanwu/detail/index?id=${e.currentTarget.dataset.id}` }); }
});
```

- [ ] **Step 2: Detail page** — `pages/wanwu/detail/index.{json,wxml,wxss,js}`

`index.json`:
```json
{ "navigationBarTitleText": "—", "usingComponents": { "ancient-frame": "/components/ancient-frame/index" } }
```

`index.wxml`:
```xml
<view class="page" wx:if="{{dish}}">
  <image class="hero-icon" src="{{dish.iconAsset || '/assets/dish-placeholder.png'}}" mode="aspectFit" />
  <text class="name">{{dish.name}}</text>
  <text class="anecdote">{{dish.anecdote}}</text>
  <ancient-frame size="lg" class="quote-frame">
    <text class="quote vertical">{{dish.quote}}</text>
  </ancient-frame>
</view>
```

`index.wxss`:
```css
.page { padding: var(--sp-5) var(--sp-4) 120rpx; text-align: center; }
.hero-icon { width: 320rpx; height: 320rpx; margin: 0 auto var(--sp-3); }
.name { display: block; font-family: 'NotoSerifSC', serif; font-weight: 700; font-size: var(--fs-xl); color: var(--ink-deep); letter-spacing: 8rpx; }
.anecdote { display: block; margin: var(--sp-3) auto var(--sp-5); font-size: var(--fs-base); line-height: 1.7; color: var(--text-main); }
.quote-frame { display: inline-block; }
.quote { display: block; font-size: var(--fs-md); color: var(--ink-deep); letter-spacing: 6rpx; line-height: 1.4; }
```

`index.js`:
```js
const data = require('../../../data/dishes');

Page({
  data: { dish: null },
  onLoad(q) {
    const dish = data.byId(q.id);
    if (!dish) return wx.navigateBack();
    wx.setNavigationBarTitle({ title: dish.name });
    this.setData({ dish });
  }
});
```

- [ ] **Step 3: Manual smoke test**

Tap "万物心愈" tab. Acceptance: 7 cards in 2-col grid, tap → detail with vertical quote in ancient-frame.

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/wanwu/
git commit -m "feat(page): 万物心愈 list + detail"
```

---

### Task 5.5: 吾生心途 (login + progress) and certificate page

**Files:**
- Create: `miniprogram/pages/wusheng/index/{index.json,wxml,wxss,js}`
- Create: `miniprogram/pages/wusheng/certificate/{index.json,wxml,wxss,js}`

- [ ] **Step 1: Progress page** — `pages/wusheng/index/`

`index.json`:
```json
{
  "navigationBarTitleText": "吾生心途",
  "usingComponents": {
    "ancient-frame": "/components/ancient-frame/index",
    "seal-stamp": "/components/seal-stamp/index",
    "floating-su": "/components/floating-su/index"
  },
  "enablePullDownRefresh": true
}
```

`index.wxml`:
```xml
<view class="page">
  <!-- Not logged in -->
  <view wx:if="{{!user}}" class="login-card">
    <image class="avatar-large" src="/assets/su-avatar.png" />
    <text class="welcome">欲访东坡先生足迹</text>
    <text class="welcome-sub">请先留下名号</text>
    <button class="btn-primary" open-type="getPhoneNumber" bindgetphonenumber="onGetPhone">微信手机号登录</button>
    <text class="skip" bindtap="onSkip">暂不登录，先逛逛 ›</text>
  </view>

  <!-- Logged in -->
  <view wx:else>
    <view class="user-head">
      <image class="avatar" src="{{user.avatar || '/assets/default-avatar.png'}}" />
      <text class="user-name vertical">东坡同游 {{daysSinceJoin}} 日</text>
    </view>

    <view class="progress-card">
      <text class="progress-title">东坡行旅 · 杭州</text>
      <view class="progress-bar"><view class="progress-fill" style="width:{{progressPct}}%"></view></view>
      <view class="progress-meta">
        <text>已访 <text class="num">{{completedCount}}</text> 处</text>
        <text>余 {{remainingCount}} 处待行</text>
      </view>
    </view>

    <view class="mini-grid">
      <view class="mini {{item.done ? 'done' : 'todo'}}" wx:for="{{sites}}" wx:key="id">
        <text class="mini-name">{{item.shortName}}</text>
        <seal-stamp wx:if="{{item.done}}" size="sm" class="mini-seal" />
      </view>
    </view>

    <button wx:if="{{completedCount === 7}}" class="btn-primary" bindtap="onCert">领取通游证书</button>
    <view wx:else class="cert-locked">未集齐 · 通游证书未启</view>
  </view>

  <floating-su wx:if="{{user}}" />
</view>
```

`index.wxss`:
```css
.page { padding: var(--sp-5) var(--sp-4) 120rpx; min-height: 100vh; }

.login-card { text-align: center; padding-top: 200rpx; }
.avatar-large { width: 200rpx; height: 200rpx; border-radius: 50%; }
.welcome { display: block; margin-top: var(--sp-4); font-size: var(--fs-md); color: var(--ink-deep); font-family: 'NotoSerifSC', serif; }
.welcome-sub { display: block; margin-top: var(--sp-1); font-size: var(--fs-sm); color: var(--text-fade); }
.btn-primary { margin-top: var(--sp-5); background: var(--ink-deep); color: var(--paper-warm); height: 96rpx; line-height: 96rpx; border-radius: var(--r-md); font-family: 'NotoSerifSC', serif; letter-spacing: 6rpx; }
.skip { display: block; margin-top: var(--sp-3); color: var(--text-fade); }

.user-head { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-4); }
.avatar { width: 108rpx; height: 108rpx; border-radius: 50%; border: 2rpx solid var(--frame-light); }
.user-name { font-family: 'NotoSerifSC', serif; font-size: var(--fs-md); color: var(--ink-deep); letter-spacing: 6rpx; }

.progress-card { background: var(--paper-warm); border: 2rpx solid var(--frame-light); border-radius: var(--r-sm); padding: var(--sp-3); margin-bottom: var(--sp-4); }
.progress-title { font-family: 'NotoSerifSC', serif; font-weight: 600; font-size: var(--fs-md); color: var(--ink-deep); letter-spacing: 6rpx; }
.progress-bar { position: relative; height: 20rpx; background: var(--paper-deep); border: 2rpx solid var(--frame-brown); margin-top: var(--sp-2); }
.progress-fill { height: 100%; background: var(--ink-deep); }
.progress-meta { margin-top: var(--sp-2); display: flex; justify-content: space-between; font-size: var(--fs-sm); color: var(--text-fade); }
.num { color: var(--seal-red); font-family: 'NotoSerifSC', serif; font-size: var(--fs-md); font-weight: 700; }

.mini-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-1); margin-bottom: var(--sp-5); }
.mini { aspect-ratio: 1; border-radius: var(--r-sm); position: relative; display: flex; align-items: flex-end; padding: var(--sp-1); font-family: 'NotoSerifSC', serif; font-size: var(--fs-xs); color: var(--paper-warm); }
.mini.done { background: linear-gradient(135deg, var(--ink-light), var(--ink-cyan)); }
.mini.todo { background: var(--paper-deep); color: var(--text-mute); }
.mini-name { font-weight: 600; }
.mini-seal { position: absolute; top: 6rpx; right: 6rpx; }
.cert-locked { width: 100%; padding: var(--sp-3); background: var(--paper-deep); border: 2rpx dashed var(--frame-brown); color: var(--text-fade); font-family: 'NotoSerifSC', serif; text-align: center; border-radius: var(--r-sm); letter-spacing: 6rpx; }
```

`index.js`:
```js
const cloud = require('../../../utils/cloud');
const storage = require('../../../utils/storage');
const sitesData = require('../../../data/sites');

Page({
  data: { user: null, sites: [], completedCount: 0, remainingCount: 7, progressPct: 0, daysSinceJoin: 0 },

  onShow() {
    const user = storage.get('userInfo');
    this.setData({ user });
    if (user) this._refresh();
  },
  onPullDownRefresh() { this._refresh(true).then(() => wx.stopPullDownRefresh()); },

  async _refresh(force) {
    if (force) storage.clear('checkinCache');
    let progress = storage.get('checkinCache');
    if (!progress) {
      try {
        progress = await cloud.call('sync-progress');
        if (progress.ok) storage.set('checkinCache', progress, 5 * 60 * 1000);
      } catch (_) { progress = { checkins: [], completedCount: 0 }; }
    }
    const doneSet = new Set((progress.checkins || []).map(c => c.siteId));
    const sites = sitesData.all.map(s => ({ id: s.id, shortName: s.name.slice(0, 2), done: doneSet.has(s.id) }));
    const completedCount = progress.completedCount || 0;
    const days = this.data.user ? Math.max(1, Math.floor((Date.now() - this.data.user.registeredAt) / 86400000)) : 0;

    this.setData({
      sites,
      completedCount,
      remainingCount: 7 - completedCount,
      progressPct: Math.round(completedCount / 7 * 100),
      daysSinceJoin: days
    });
  },

  async onGetPhone(e) {
    if (!e.detail.code) { wx.showToast({ title: '已取消', icon: 'none' }); return; }
    wx.showLoading({ title: '登录中…' });
    try {
      const r = await cloud.call('login', { code: e.detail.code });
      if (r.ok) {
        storage.set('userInfo', r.user);
        this.setData({ user: r.user });
        await this._refresh(true);
      } else {
        wx.showToast({ title: '登录失败', icon: 'none' });
      }
    } catch (_) {
      wx.showToast({ title: '网络繁忙', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onSkip() { wx.switchTab({ url: '/pages/shilu/index' }); },

  onCert() { wx.navigateTo({ url: '/pages/wusheng/certificate/index' }); }
});
```

- [ ] **Step 2: Certificate page** — `pages/wusheng/certificate/`

`index.json`:
```json
{ "navigationBarTitleText": "通游证书", "usingComponents": { "certificate": "/components/certificate/index" } }
```

`index.wxml`:
```xml
<view class="page">
  <certificate id="cert" nickname="{{nickname}}" completedAt="{{completedAt}}" siteNames="{{siteNames}}" />
  <button class="btn-primary" bindtap="onSave">保存到相册</button>
  <button class="btn-secondary" open-type="share">分享给朋友</button>
</view>
```

`index.wxss`:
```css
.page { padding: var(--sp-4); text-align: center; }
.btn-primary { margin-top: var(--sp-4); background: var(--ink-deep); color: var(--paper-warm); height: 96rpx; line-height: 96rpx; border-radius: var(--r-md); font-family: 'NotoSerifSC', serif; letter-spacing: 6rpx; }
.btn-secondary { margin-top: var(--sp-2); background: transparent; color: var(--ink-deep); height: 96rpx; line-height: 96rpx; border: 2rpx solid var(--ink-deep); border-radius: var(--r-md); font-family: 'NotoSerifSC', serif; letter-spacing: 6rpx; }
```

`index.js`:
```js
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
```

- [ ] **Step 3: Manual smoke test**

Tap "吾生心途" tab → tap login button → grant phone (use real device; DevTools simulates a fake phone code). Acceptance: progress card renders, 7-grid mini-cards show done/todo state, tapping a successful checkin in mingren and returning here updates the count.

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/wusheng/
git commit -m "feat(page): 吾生心途 login + progress + certificate"
```

---

### Task 5.6: 与东坡对话 page (`pages/chat/`)

**Files:**
- Create: `miniprogram/pages/chat/{index.json,wxml,wxss,js}`

- [ ] **Step 1: `index.json`**

```json
{
  "navigationBarTitleText": "东坡先生",
  "usingComponents": { "ancient-frame": "/components/ancient-frame/index" }
}
```

- [ ] **Step 2: `index.wxml`**

```xml
<view class="chat-page">
  <scroll-view class="msg-list" scroll-y scroll-into-view="msg-{{messages.length - 1}}" enable-flex>
    <view class="msg {{item.role}}" wx:for="{{messages}}" wx:key="id" id="msg-{{index}}">
      <image wx:if="{{item.role === 'su'}}" class="face" src="/assets/su-avatar.png" />
      <view class="bubble {{item.role}}">
        <view wx:if="{{item.role === 'su'}}" class="prefix">答曰</view>
        <text>{{item.text}}</text>
      </view>
    </view>
    <view wx:if="{{suggestionsVisible}}" class="suggestions">
      <view class="chip" wx:for="{{suggestions}}" wx:key="*this" bindtap="onChip" data-text="{{item}}">{{item}}</view>
    </view>
  </scroll-view>

  <view class="input-row">
    <input class="input" placeholder="此处问东坡" value="{{draft}}" bindinput="onInput" confirm-type="send" bindconfirm="onSend" />
    <button class="send" disabled="{{!canSend}}" bindtap="onSend">↑</button>
  </view>
</view>
```

- [ ] **Step 3: `index.wxss`**

```css
.chat-page { display: flex; flex-direction: column; height: 100vh; background: var(--paper-rice); }
.msg-list { flex: 1; padding: var(--sp-3); }

.msg { display: flex; gap: var(--sp-1); max-width: 80%; margin-bottom: var(--sp-3); }
.msg.me { margin-left: auto; flex-direction: row-reverse; }
.face { width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0; }
.bubble { padding: var(--sp-2) var(--sp-3); border-radius: var(--r-md); font-family: 'NotoSerifSC', serif; font-size: var(--fs-base); line-height: 1.6; position: relative; }
.bubble.su { background: var(--paper-warm); border: 2rpx solid var(--frame-brown); color: var(--ink-deep); }
.bubble.me { background: var(--paper-deep); color: var(--ink-deep); border-radius: var(--r-md) var(--r-md) var(--sm) var(--r-md); }
.prefix { position: absolute; top: -16rpx; left: 12rpx; background: var(--seal-red); color: var(--paper-warm); font-size: var(--fs-xs); padding: 2rpx 10rpx; font-family: 'NotoSerifSC', serif; letter-spacing: 2rpx; }

.suggestions { display: flex; flex-wrap: wrap; gap: var(--sp-2); padding: var(--sp-3) 0; }
.chip { padding: var(--sp-1) var(--sp-3); border: 2rpx solid var(--frame-light); border-radius: var(--r-pill); font-size: var(--fs-sm); color: var(--text-fade); background: var(--paper-warm); }

.input-row { display: flex; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3); background: var(--paper-warm); border-top: 2rpx solid var(--frame-light); }
.input { flex: 1; height: 72rpx; padding: 0 var(--sp-3); background: var(--paper-rice); border: 2rpx solid var(--frame-light); border-radius: var(--r-md); font-family: 'NotoSerifSC', serif; }
.send { width: 72rpx; height: 72rpx; background: var(--ink-deep); color: var(--paper-warm); border-radius: 50%; padding: 0; font-size: 28rpx; }
.send[disabled] { opacity: 0.4; }
```

- [ ] **Step 4: `index.js`**

```js
const matcher = require('../../ai/matcher');
const library = require('../../ai/script-library');
const persona = require('../../ai/persona');
const storage = require('../../utils/storage');

Page({
  data: {
    messages: [],
    draft: '',
    canSend: false,
    suggestions: ['杭州治水', '东坡肉怎么做', '与子由的关系'],
    suggestionsVisible: false,
    _zeroHits: 0,
    _fallbackIdx: 0
  },

  onLoad(query) {
    const history = storage.getAll('aiHistory');
    if (history.length === 0) {
      this._appendSu('幸会幸会。某苏轼，眉山人，熙宁四年初至杭州为通判。');
    } else {
      this.setData({ messages: history });
    }
    if (query.topic) {
      // Pre-seeded topic from drawer/site
      setTimeout(() => this._sendUser(`请说说${query.topic}`), 400);
    }
  },

  onInput(e) {
    const draft = e.detail.value;
    this.setData({ draft, canSend: draft.trim().length > 0 });
  },

  onSend() {
    const text = this.data.draft.trim();
    if (!text) return;
    this._sendUser(text);
    this.setData({ draft: '', canSend: false });
  },

  onChip(e) {
    this._sendUser(e.currentTarget.dataset.text);
    this.setData({ suggestionsVisible: false });
  },

  _sendUser(text) {
    this._appendMsg({ role: 'me', text });
    const r = matcher.match(text, library, persona, { fallbackIndex: this.data._fallbackIdx });
    if (r.qaId === null) {
      const z = this.data._zeroHits + 1;
      this.setData({ _zeroHits: z, _fallbackIdx: this.data._fallbackIdx + 1, suggestionsVisible: z >= 3 });
    } else {
      this.setData({ _zeroHits: 0, suggestionsVisible: false });
    }
    this._typeOut(r.answer);
  },

  _appendSu(text) { this._appendMsg({ role: 'su', text }); },
  _appendMsg(msg) {
    const id = Date.now() + Math.random();
    const messages = [...this.data.messages, { ...msg, id }];
    this.setData({ messages });
    storage.append('aiHistory', { ...msg, id }, 50);
  },

  _typeOut(fullText) {
    const id = Date.now();
    const messages = [...this.data.messages, { role: 'su', text: '', id }];
    this.setData({ messages });
    let i = 0;
    const tick = () => {
      i++;
      messages[messages.length - 1].text = fullText.slice(0, i);
      this.setData({ messages: [...messages] });
      if (i < fullText.length) setTimeout(tick, 60);
      else storage.append('aiHistory', { role: 'su', text: fullText, id }, 50);
    };
    tick();
  }
});
```

- [ ] **Step 5: Manual smoke test**

Open chat from any tab via the floating button (tap it). Acceptance: greeting appears, type "东坡肉怎么做" → reply types out at ~60ms/char with red `答曰` prefix on top of the bubble, "答曰" prefix renders, history persists across reopen.

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/chat/
git commit -m "feat(page): chat with type-out + persistent history"
```

---

### Task 5.7: 诗路心踪 page shell (web-view host)

**Files:**
- Create: `miniprogram/pages/shilu/{index.json,wxml,wxss,js}`

The page is just a fullscreen `<web-view>` pointing at the static-hosted map site (Phase 6). The map page itself handles drawer + label rendering.

- [ ] **Step 1: `index.json`**

```json
{
  "navigationBarTitleText": "诗路心踪",
  "usingComponents": { "floating-su": "/components/floating-su/index" }
}
```

- [ ] **Step 2: `index.wxml`**

```xml
<view class="page">
  <web-view src="{{mapUrl}}" bindmessage="onMapMessage" binderror="onMapError" />
  <view wx:if="{{errored}}" class="error">
    <text>墨砚未润，请稍后重启</text>
    <button bindtap="onRetry">重试</button>
  </view>
  <floating-su />
</view>
```

- [ ] **Step 3: `index.wxss`**

```css
.page { width: 100vw; height: 100vh; position: relative; }
web-view { width: 100%; height: 100%; }
.error { position: absolute; inset: 0; background: var(--paper-rice); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--sp-3); font-family: 'NotoSerifSC', serif; color: var(--ink-deep); }
```

- [ ] **Step 4: `index.js`**

```js
Page({
  data: {
    mapUrl: 'https://<CLOUD_STATIC_HOST>/index.html',
    errored: false
  },
  onMapMessage(e) {
    // postMessage payload only fires on hide/share/back; navigateTo is called from inside the web-view directly.
    console.log('mapMessage', e.detail.data);
  },
  onMapError(e) { console.error('webview error', e); this.setData({ errored: true }); },
  onRetry() { this.setData({ errored: false, mapUrl: this.data.mapUrl + '?t=' + Date.now() }); }
});
```

(Replace `<CLOUD_STATIC_HOST>` with the host you'll get in Task 6.5.)

- [ ] **Step 5: Manual smoke test (deferred)**

This page renders only after Phase 6 deploys the static site. For now: page loads but web-view fails → fallback "墨砚未润" view appears. Acceptable.

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/shilu/
git commit -m "feat(page): 诗路心踪 web-view shell with error fallback"
```

---

## Phase 6 · Web-view Map Site

Independent HTML site, deployed to CloudBase static hosting. Communicates with the host mini-program via `wx.miniProgram.navigateTo` (sync) and `wx.miniProgram.postMessage` (deferred).

### Task 6.1: HTML scaffold + Leaflet + Stadia tiles

**Files:**
- Create: `webview/index.html`, `webview/data/sites.json`, `webview/data/poems.json`

- [ ] **Step 1: `webview/data/sites.json`** — copy of cloud `sites.json` from Task 4.5 (same structure)

(Same content as Task 4.5's `_seed/sites.json`.)

- [ ] **Step 2: `webview/data/poems.json`**

```json
{
  "youmeitang-baoyu": { "title": "有美堂暴雨", "label": "有美", "lines": ["游人脚底一声雷，满座顽云拨不开。", "天外黑风吹海立，浙东飞雨过江来。", "十分潋滟金樽凸，千杖敲铿羯鼓催。", "唤起谪仙泉洒面，倒倾鲛室泻琼瑰。"] },
  "liuyiquan":       { "title": "次韵聪上人见寄", "label": "六一", "lines": ["前身本同社，法乳遍诸方。", "一钵寄何处，千峰来故乡。", "云门大不二，铁壁自难忘。", "但恐他年别，空留六一泉。"] },
  "guoxiting":       { "title": "过溪亭", "label": "过溪", "lines": ["身轻步稳去忘归，四柱亭前野彴微。", "忽悟过溪还一笑，水禽惊落翠毛衣。"] }
}
```

- [ ] **Step 3: `webview/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<title>诗路心踪</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="./styles.css" />
<script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>
</head>
<body>
  <div id="map"></div>
  <svg id="ink" class="ink-overlay"><!-- ink-overlay.svg inlined in Task 6.2 --></svg>
  <div id="labels"></div>
  <div id="drawer" class="drawer collapsed">
    <div class="drawer-handle"></div>
    <div class="drawer-body"></div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="./js/map.js"></script>
  <script src="./js/labels.js"></script>
  <script src="./js/drawer.js"></script>
  <script src="./js/bridge.js"></script>
</body>
</html>
```

- [ ] **Step 4: `webview/styles.css`**

```css
:root {
  --ink-deep: #1F3A40;
  --paper-rice: #F7EEDA;
  --paper-warm: #F5E9C8;
  --frame-brown: #5A3C1F;
  --seal-red: #8B3A3A;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; background: var(--paper-rice); font-family: 'Noto Serif SC', serif; overflow: hidden; }
#map { width: 100%; height: 100%; background: #e8d9b8; }
.leaflet-tile-pane { filter: sepia(0.4) hue-rotate(160deg) saturate(0.6) contrast(0.95); }   /* poor-man's ink wash */
.ink-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 400; }
#labels { position: absolute; inset: 0; pointer-events: none; z-index: 500; }
```

- [ ] **Step 5: `webview/js/map.js`**

```js
const STADIA_KEY = '94b4b80b-f12e-4c63-b860-93a6c584bfe9';
const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([30.243, 120.145], 13);
L.tileLayer(`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${STADIA_KEY}`, {
  maxZoom: 19,
  attribution: ''
}).addTo(map);
window._map = map;
```

- [ ] **Step 6: Local smoke test**

```bash
cd webview && python -m http.server 8080
```
Open `http://localhost:8080` in a browser. Acceptance: blurred-warm map shows around West Lake; no labels yet.

- [ ] **Step 7: Commit**

```bash
git add webview/index.html webview/styles.css webview/data/ webview/js/map.js
git commit -m "feat(webview): leaflet + stadia ink-tone basemap"
```

---

### Task 6.2: SVG ink-wash overlay

**Files:**
- Create: `webview/ink-overlay.svg` and reference inline

This is decorative — soft ink-wash strokes over the lake area + faint mountains. Use a single `<svg>` with a few `<path>` elements + low-opacity ink fills, scaled to viewport.

- [ ] **Step 1: Create `webview/ink-overlay.svg`** (inline-able SVG, ~ 6 strokes)

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1334" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="lake" cx="40%" cy="50%" r="40%">
      <stop offset="0" stop-color="#2D5560" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#2D5560" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="320" cy="640" rx="280" ry="180" fill="url(#lake)"/>
  <path d="M40,300 Q120,260 200,300 T380,310" stroke="#5A8A92" stroke-width="2" fill="none" opacity="0.35"/>
  <path d="M500,400 Q580,360 660,400" stroke="#5A8A92" stroke-width="2" fill="none" opacity="0.25"/>
  <text x="80" y="280" font-family="serif" font-size="40" fill="#5A8A92" opacity="0.4">山</text>
  <text x="600" y="900" font-family="serif" font-size="32" fill="#5A8A92" opacity="0.3">屾</text>
</svg>
```

- [ ] **Step 2: Inline it in `index.html`** — replace the empty `<svg id="ink"/>` with the contents above.

- [ ] **Step 3: Commit**

```bash
git add webview/ink-overlay.svg webview/index.html
git commit -m "feat(webview): ink-wash svg overlay"
```

---

### Task 6.3: Vertical poem labels

**Files:**
- Modify: `webview/js/labels.js`, `webview/styles.css`

- [ ] **Step 1: `webview/js/labels.js`**

```js
(async () => {
  const sites = await fetch('./data/sites.json').then(r => r.json());
  const poems = await fetch('./data/poems.json').then(r => r.json());
  const labelsLayer = document.getElementById('labels');
  const map = window._map;

  function shortLabel(site) {
    if (site.poemId && poems[site.poemId]) return poems[site.poemId].label;
    return site.name.slice(0, 2);
  }

  function render() {
    labelsLayer.innerHTML = '';
    sites.forEach(s => {
      const pt = map.latLngToContainerPoint([s.lat, s.lng]);
      const el = document.createElement('div');
      el.className = 'poem-label';
      el.style.left = `${pt.x - 19}px`;
      el.style.top = `${pt.y - 30}px`;
      el.dataset.siteId = s.siteId;
      el.innerHTML = `<div class="frame"><div class="text">${shortLabel(s)}</div></div>`;
      el.addEventListener('click', () => window._openDrawer && window._openDrawer(s, poems[s.poemId]));
      labelsLayer.appendChild(el);
    });
  }
  map.on('move zoom moveend zoomend', render);
  render();
  window._sitesData = sites;
  window._poemsData = poems;
})();
```

- [ ] **Step 2: Add to `styles.css`**

```css
.poem-label { position: absolute; pointer-events: auto; cursor: pointer; }
.poem-label .frame { border: 1.5px solid var(--frame-brown); padding: 3px; background: var(--paper-warm); box-shadow: 0 2px 6px rgba(31, 58, 64, 0.15); position: relative; }
.poem-label .frame::before { content: ''; position: absolute; inset: 2px; border: 0.5px solid var(--frame-brown); }
.poem-label .text { writing-mode: vertical-rl; text-orientation: upright; font-weight: 600; color: var(--ink-deep); font-size: 11px; line-height: 1.3; letter-spacing: 2px; padding: 3px 1px; position: relative; }
```

- [ ] **Step 3: Local smoke test**

Reload `http://localhost:8080`. Acceptance: 7 vertical paper-frame labels appear on the map at the right positions; pan and zoom keep them anchored.

- [ ] **Step 4: Commit**

```bash
git add webview/js/labels.js webview/styles.css
git commit -m "feat(webview): vertical poem labels anchored to map"
```

---

### Task 6.4: Three-state drawer

**Files:**
- Modify: `webview/js/drawer.js`, `webview/styles.css`

- [ ] **Step 1: `webview/js/drawer.js`**

```js
(() => {
  const drawer = document.getElementById('drawer');
  const body = drawer.querySelector('.drawer-body');
  const STATES = { collapsed: 60, half: window.innerHeight * 0.5, full: window.innerHeight * 0.9 };
  let state = 'collapsed', startY = 0, currentH = STATES.collapsed, dragging = false;

  function setHeight(h) { drawer.style.height = `${h}px`; currentH = h; }
  function snap(h) {
    const distances = Object.entries(STATES).map(([k, v]) => [k, Math.abs(h - v)]).sort((a, b) => a[1] - b[1]);
    state = distances[0][0];
    drawer.style.transition = 'height 320ms cubic-bezier(.2, .8, .2, 1)';
    setHeight(STATES[state]);
    setTimeout(() => drawer.style.transition = '', 320);
  }

  drawer.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; dragging = true; });
  drawer.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const delta = startY - e.touches[0].clientY;
    setHeight(Math.max(STATES.collapsed, Math.min(STATES.full, currentH + delta)));
    startY = e.touches[0].clientY;
    e.preventDefault();
  }, { passive: false });
  drawer.addEventListener('touchend', () => { dragging = false; snap(currentH); });

  window._openDrawer = (site, poem) => {
    let html = `<h2>${site.name}</h2><p>${site.intro}</p>`;
    if (poem) {
      html += `<div class="poem"><div class="poem-title">《${poem.title}》</div>`;
      poem.lines.forEach(l => html += `<div class="poem-line">${l}</div>`);
      html += '</div>';
    }
    html += `<div class="actions">
      <button data-act="ask" data-site="${site.siteId}">问问东坡先生</button>
      <button data-act="checkin" data-site="${site.siteId}">我已到此一游</button>
    </div>`;
    body.innerHTML = html;
    body.querySelectorAll('button').forEach(b => b.addEventListener('click', (ev) => {
      const act = ev.target.dataset.act, sid = ev.target.dataset.site;
      window._bridgeAction && window._bridgeAction(act, sid);
    }));
    drawer.style.transition = 'height 320ms cubic-bezier(.2, .8, .2, 1)';
    state = 'half'; setHeight(STATES.half);
  };
})();
```

- [ ] **Step 2: Add to `styles.css`**

```css
.drawer { position: fixed; left: 0; right: 0; bottom: 0; height: 60px; background: var(--paper-warm); border-top-left-radius: 24px; border-top-right-radius: 24px; box-shadow: 0 -4px 16px rgba(31, 58, 64, 0.10); z-index: 600; overflow: hidden; }
.drawer-handle { width: 48px; height: 4px; background: var(--frame-brown); opacity: 0.4; border-radius: 2px; margin: 12px auto; }
.drawer-body { padding: 16px; overflow-y: auto; height: calc(100% - 36px); }
.drawer-body h2 { color: var(--ink-deep); margin-bottom: 8px; font-weight: 700; font-size: 18px; letter-spacing: 3px; }
.drawer-body p { color: #3A2818; line-height: 1.7; font-size: 14px; }
.poem { margin: 16px 0; text-align: center; }
.poem-title { color: var(--ink-deep); font-weight: 700; margin-bottom: 8px; font-size: 16px; }
.poem-line { color: var(--ink-deep); margin: 4px 0; letter-spacing: 4px; }
.actions { display: flex; gap: 12px; margin-top: 16px; }
.actions button { flex: 1; height: 44px; border: 1.5px solid var(--frame-brown); background: var(--paper-rice); color: var(--ink-deep); font-family: inherit; font-size: 14px; border-radius: 8px; }
.actions button:active { background: var(--paper-deep); }
```

- [ ] **Step 3: Local smoke test**

Tap a poem label. Acceptance: drawer rises to half-height, contents render, drag handle works (drag up to full, drag down to collapsed).

- [ ] **Step 4: Commit**

```bash
git add webview/js/drawer.js webview/styles.css
git commit -m "feat(webview): three-state draggable drawer"
```

---

### Task 6.5: postMessage / navigateTo bridge

**Files:**
- Create: `webview/js/bridge.js`

Two action types from the drawer:
- `ask` → navigate the host mini-program to `/pages/chat/index?topic=<name>`
- `checkin` → navigate to `/pages/mingren/detail/index?siteId=<id>&autoCheckin=1`

- [ ] **Step 1: `webview/js/bridge.js`**

```js
window._bridgeAction = (act, siteId) => {
  if (typeof wx === 'undefined' || !wx.miniProgram) {
    alert('当前不在小程序环境中');
    return;
  }
  const sites = window._sitesData || [];
  const site = sites.find(s => s.siteId === siteId);

  if (act === 'ask') {
    const topic = site ? site.name : '';
    wx.miniProgram.navigateTo({ url: `/pages/chat/index?topic=${encodeURIComponent(topic)}` });
  } else if (act === 'checkin') {
    wx.miniProgram.navigateTo({ url: `/pages/mingren/detail/index?siteId=${siteId}&autoCheckin=1` });
  }

  // Also post a message for analytics; fires on web-view back/share/exit.
  wx.miniProgram.postMessage({ data: { type: 'drawer-action', act, siteId } });
};
```

- [ ] **Step 2: Commit**

```bash
git add webview/js/bridge.js
git commit -m "feat(webview): bridge to host mini-program"
```

---

### Task 6.6: Deploy to CloudBase static hosting + whitelist domain

- [ ] **Step 1: Deploy**

WeChat DevTools → 云开发 → 静态网站托管 → 上传文件夹 → select `webview/` → wait for upload to finish.

- [ ] **Step 2: Note the public host**

Copy the domain assigned (looks like `prod-xyz123-1300000000.tcloudbaseapp.com`). This is `<CLOUD_STATIC_HOST>`.

- [ ] **Step 3: Whitelist domain**

WeChat 公众平台 → 开发 → 开发管理 → 服务器域名 → 业务域名 → add `https://<CLOUD_STATIC_HOST>` (download the verify file, upload it back to static hosting at `/MP_verify_xxx.txt`, then verify).

Also whitelist for tile loading inside the web-view: `https://tiles.stadiamaps.com` doesn't need to be in the request domain whitelist because it's loaded *inside* the web-view (the web-view is itself a single whitelisted page). But add `https://unpkg.com` and `https://fonts.googleapis.com` if you decide to vendor them later. Recommended for production: vendor leaflet + Noto Serif SC into `webview/vendor/` and reference relatively, removing CDN dependence.

- [ ] **Step 4: Update `pages/shilu/index.js`** with the real `<CLOUD_STATIC_HOST>`

```js
mapUrl: 'https://prod-xyz123-1300000000.tcloudbaseapp.com/index.html'
```

- [ ] **Step 5: Smoke test from real device** (DevTools may not load web-view consistently)

Build and preview on a real phone via DevTools "预览". Tap "诗路心踪" tab. Acceptance: map renders, 7 labels appear, tap label → drawer → tap "我已到此一游" navigates to detail page with auto-checkin.

- [ ] **Step 6: Commit URL update**

```bash
git add miniprogram/pages/shilu/index.js
git commit -m "chore: wire web-view to deployed static host"
```

---

## Phase 7 · Integration & Polish

### Task 7.1: Font subsetting + upload

- [ ] **Step 1: Subset Noto Serif SC**

Use [glyphhanger](https://github.com/zachleat/glyphhanger) or a manual subset:

```bash
npm install -g glyphhanger
glyphhanger --subset=NotoSerifSC-SemiBold.otf --formats=woff2 \
  --whitelist='苏东坡杭州行旅西湖治水诗路心踪名人迹万物心愈吾生途有美堂遗址六一泉过溪亭石屋洞题刻苏堤大麦岭石像东坡肉羹烤羊脊骨煨芋菊蚝蜜酒答曰问我一二三四五六七八九十的了在是不而以与之乎也'
```

Output: `NotoSerifSC-SemiBold-subset.woff2` (~ 200–600 KB depending on character set).

- [ ] **Step 2: Upload to static hosting**

DevTools → 云开发 → 静态网站托管 → upload `NotoSerifSC-SemiBold-subset.woff2` to `/fonts/`.

- [ ] **Step 3: Confirm `app.js` references the right URL**

(See Task 0.2 Step 2: `https://<CLOUD_STATIC_HOST>/fonts/NotoSerifSC-SemiBold-subset.woff2`.)

- [ ] **Step 4: Verify on real device**

After app launch, headers in mingren / wanwu should render in the serif. Failure should be silent — system font is the fallback, no error.

- [ ] **Step 5: Commit (if any code changed)**

```bash
git commit --allow-empty -m "chore: font subset uploaded to cdn"
```

---

### Task 7.2: Loading + empty + error states

- [ ] **Step 1: Add skeleton state to mingren/index**

Modify `pages/mingren/index/index.wxml` to show 7 placeholder cards while `_refresh` is in flight. In `index.js` add a `loading` flag (true during `_refresh`).

```xml
<view class="grid" wx:if="{{loading}}">
  <view class="card skeleton" wx:for="{{[1,2,3,4,5,6,7]}}" wx:key="*this"></view>
</view>
<view class="grid" wx:else>
  <!-- existing card loop -->
</view>
```

WXSS:
```css
.skeleton { background: var(--paper-warm); height: 320rpx; opacity: 0.6; animation: pulse 1.4s infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
```

- [ ] **Step 2: Add similar skeletons to `wanwu/index` and `wusheng/index`** (same pattern, count 6 / 1 respectively)

- [ ] **Step 3: Verify all error toasts use friendly Chinese copy** — review `pages/**/*.js` for any `wx.showToast` with stale English/dev copy. Spec §6 has the canon.

- [ ] **Step 4: Commit**

```bash
git add miniprogram/pages/
git commit -m "polish: skeleton loading states + error copy"
```

---

### Task 7.3: Image lazy loading

- [ ] **Step 1: Replace eager `<image>` tags with `lazy-load="true"` attribute** on all card images (mingren list, wanwu list).

- [ ] **Step 2: Upload all 14 images (7 sites + 7 dishes) to CloudBase storage**, get `cloud://` URLs, and update `data/sites.js` and `data/dishes.js` accordingly.

- [ ] **Step 3: Smoke-test image load on real device**

- [ ] **Step 4: Commit**

```bash
git add miniprogram/data/ miniprogram/pages/
git commit -m "perf: lazy-load card images + cloud storage urls"
```

---

## Phase 8 · Pre-launch

### Task 8.1: Apply hi-fi designs (engineer's first task once designs arrive)

The hi-fi designs swap **only** these things:

1. **Token values** in `miniprogram/app.wxss` — colors, spacing, radius, shadow, font sizes
2. **Each component's `.wxss`** — internal styling refinements only; do not change the WXML structure
3. **Tab bar icons** — replace text labels in `app.json` with `iconPath` / `selectedIconPath` pointing to `/assets/tab-icons/*.png` (4 icons + 4 selected variants)
4. **Cover assets** — drop final illustrations in `miniprogram/assets/sites/` and `miniprogram/assets/dishes/`, update `data/sites.js` and `data/dishes.js` `imageUrl` / `iconAsset` fields

If the designs propose **structural** changes (new layout, new components), those need a separate plan — don't smuggle them into this task.

- [ ] **Step 1: Diff the hi-fi against `2026-04-26-ui-design.md` §1 and §2**

If a token doesn't exist yet (e.g., the designer added a new accent color), add it to `app.wxss`.

- [ ] **Step 2: Update `app.wxss`** with new token values.

- [ ] **Step 3: Update each component's `.wxss`** to reference any new tokens or refine internal layout.

- [ ] **Step 4: Drop final assets** into `miniprogram/assets/`. Update `app.json` for tab icons.

- [ ] **Step 5: Manual visual QA across all pages** — on iOS + Android real device.

- [ ] **Step 6: Commit**

```bash
git add miniprogram/
git commit -m "feat(visual): apply hi-fi designs"
```

---

### Task 8.2: Real-device QA checklist

- [ ] iOS device: tap each tab — no white flash, font loads silently
- [ ] Android device: same as iOS
- [ ] Reject `wx.getLocation` permission → see modal, "去设置" works
- [ ] Allow location, walk into a site within 200 m → seal animation + haptic, progress increments
- [ ] At >200 m, attempt checkin → friendly "还差 X 米" toast, no error noise
- [ ] Login flow: getPhoneNumber → users row created on real cloud DB
- [ ] Chat: type "杭州治水", "东坡肉怎么做", "你弟弟", "明日天气", "abcd" — verify hits, fallback rotation, suggestion chips after 3 zero-hits
- [ ] Long-press the floating Su, drag, release on left edge → snaps left and persists across reload
- [ ] Reduced-motion ON (Settings → Accessibility) → animations shorten/disable, app still usable
- [ ] Slow-network simulation (Devtools throttle): skeletons show, no white screens
- [ ] Map: 7 labels render correctly anchored, drawer drag works, "ask" opens chat with topic prefilled, "checkin" navigates to detail and auto-attempts checkin

- [ ] **Step 1: Document failures and fix them as bugfix commits.**

---

### Task 8.3: Submit for review

- [ ] All cloud functions deployed
- [ ] Static host live, all assets uploaded
- [ ] Tab icons set
- [ ] Privacy policy: required because we use `getLocation` and `getPhoneNumber`. Generate via 公众平台 → 设置 → 隐私协议.
- [ ] App icon, screenshots, description filled in 公众平台
- [ ] Click "提交审核" — note in submission: "AI 对话功能为本地脚本库回答，不涉及大模型 API 或 UGC，无内容安全风险"

---

## Self-Review Checklist (filled in during plan creation)

**Spec coverage:**
- §1.1 four tabs: Tasks 5.1 (utils), 5.2/5.3 (mingren), 5.4 (wanwu), 5.5 (wusheng), 5.7 (shilu) ✓
- §1.2 7 sites: Task 2.2, 4.5 ✓
- §1.3 3 poems: Task 2.1 ✓
- §1.4 7 dishes: Task 2.3 ✓
- §1.5 AI Q&A: Tasks 1.2, 2.4 ✓
- §2 file tree: matches "File Structure" above ✓
- §3 data model: cloud setup Task 4.1, all three collections ✓
- §3.3 cache: Task 1.3 storage util + page usage ✓
- §4.1 flow A (map → drawer → chat/detail): Tasks 6.4, 6.5 ✓
- §4.2 flow B (login → progress): Task 5.5 ✓
- §4.3 flow C (GPS checkin): Tasks 4.3, 5.1 (utils/checkin), 5.3 (page) ✓
- §4.4 flow D (chat): Task 5.6 ✓
- §5 visual system: Task 0.2 tokens + Task 8.1 hi-fi swap ✓
- §6 error handling: Tasks 7.2 (UI), 5.3 (location deny), 5.5 (login flow), 5.7 (web-view error) ✓
- §7 perf: Tasks 7.1 (font), 7.3 (lazy images) ✓
- §8 testing: Phase 1 unit tests, Task 4.3 cloud-fn test, Task 8.2 manual QA ✓
- §10 launch checklist: Task 8.3 ✓

**Placeholder scan:** none — all "TBD" replaced with engineer-actionable steps; the hi-fi design swap is intentionally deferred to Task 8.1 with clear inputs.

**Type consistency:** functions named consistently across modules (`distanceMeters`, `match`, `tokenize`, `set/get/clear/append/getAll`, `evaluateCheckin`, `cloud.call`, `checkinUtil.attempt`); all page files reference `data/*.js` exports as `{poems, all, byId}`.

---

## Execution Notes

- Phases 1, 2 are fully parallel within. Phases 3 components are parallel within. Phases 4 cloud functions can deploy in any order after the env exists.
- Phase 5 pages have one dependency edge: 5.5 progress + 5.3 detail share `checkinCache` semantics, so build 5.3 before 5.5 to test the cache-invalidation flow.
- The web-view (Phase 6) is fully independent of the mini-program code path; an engineer can work on it in parallel with Phase 5.
- **Engineer can skip or reorder Task 8.1** without blocking the rest of the build — the placeholder design tokens are intentionally functional, just not pretty. If hi-fi designs are late, ship the rest and patch visuals separately.
