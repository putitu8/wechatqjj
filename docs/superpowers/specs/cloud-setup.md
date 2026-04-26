# Cloud setup

This is a manual step the project owner does once before cloud features can run end-to-end.

## Prerequisites

- WeChat 公众平台 account with a Mini Program AppID (cloud-development enabled).
- WeChat DevTools installed.

## Steps

1. **Create cloud env**: WeChat DevTools → 云开发 → New Environment. Choose a region (Shanghai recommended). Copy the env ID — it looks like `prod-xyz123`.

2. **Replace placeholders in code:**
   - `miniprogram/app.js` line with `cloudEnv: '<CLOUD_ENV_ID>'` — replace `<CLOUD_ENV_ID>` with the env ID from step 1.

3. **Create the 3 collections** (DevTools → 云开发 → 数据库):
   - `users` — add unique index on `openid`
   - `checkins` — add **compound unique** index on `(openid, siteId)` (de-dupes repeat checkins)
   - `sites` — add unique index on `siteId`

4. **Set permissions:**
   - `users`: 仅创建者可读写其创建的数据
   - `checkins`: 仅创建者可读写其创建的数据
   - `sites`: 所有用户可读，仅管理员可写

5. **Seed the `sites` collection**:
   - Use `cloudfunctions/_seed/sites.json` (created in Task 4.5).
   - DevTools → 云开发 → 数据库 → select `sites` → 导入 → choose the JSON → method: insert.
   - Verify 7 rows after import.

6. **Deploy cloud functions** — for each of `cloudfunctions/{login,checkin,sync-progress}`:
   - DevTools → right-click the folder → 上传并部署：云端安装依赖.

## Status

- Env ID: `<TBD>` — fill in after creation
- Collections created: `[ ]` users `[ ]` checkins `[ ]` sites
- Indexes created: `[ ]` users.openid `[ ]` checkins.(openid,siteId) `[ ]` sites.siteId
- Sites seeded: `[ ]` (date: ___)
- Functions deployed: `[ ]` login `[ ]` checkin `[ ]` sync-progress
