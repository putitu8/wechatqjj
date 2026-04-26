# 古镇文化地图小程序 · 苏东坡杭州专题（首版）设计文档

- **日期**：2026-04-26
- **载体**：微信小程序（企业主体 AppID 已注册）
- **后端**：微信云开发（CloudBase）
- **目标**：正式上线（C 级）
- **首版主题**：苏东坡 · 杭州行旅

---

## 1. 产品定位与范围

可以从地图上索引"古镇 + 历史人物 + 地方农特产"的文化社交平台。**首版**只做"苏东坡杭州专题"垂直场景，验证核心交互；社交（评论、UGC、关注、分享）暂不做，架构上预留扩展点（多城市、多名人路线、多专题）。

### 1.1 四个底部 Tab

| Tab | 功能 |
|---|---|
| **诗路心踪**（首页） | 杭州水墨工笔画地图，地图上以米色宣纸 + 双线回字纹竖排标签飘出苏轼诗句；点诗句弹抽屉 |
| **名人心迹** | "东坡行旅（杭州）—— 中国文物主题游径" 7 个景点列表 + 详情子页 |
| **万物心愈** | 7 道东坡发明 / 关联美食卡片，AI 生成的工笔画图标 |
| **吾生心途** | 手机号注册登录、GPS 打卡、进度展示、完成证书 |

### 1.2 7 个景点（东坡行旅·杭州）

石屋洞题刻、有美堂遗址、六一泉、苏堤、苏轼石像、大麦岭题刻、过溪亭

### 1.3 3 首本期完整收录的诗

- **有美堂遗址** —— 《有美堂暴雨》
- **六一泉** —— 《次韵聪上人见寄》
- **过溪亭** —— "身轻步稳去忘归……"

### 1.4 7 道美食

东坡肉、东坡羹、烤羊脊骨、雪天煨芋、菊羹、烤生蚝、蜜酒

每道菜卡片：菜名 + 工笔画图标 + 1 句典故 + 1 句东坡原话引语。

### 1.5 苏东坡 AI 智能体

- **实现路径**：纯前端本地脚本库（无大模型 API）。约 30 条 Q&A，覆盖：身世 / 杭州治水 / 写诗 / 美食 / 弟弟苏辙 / 王朝云。
- **关键词匹配引擎**：分词 → 跟 Q&A 的 keywords 求交集 → 命中分数最高者返回；零命中走 5 条 persona 兜底。
- **全局入口**：每个 tab 右下角悬浮东坡按钮 + 首页地图抽屉里 "问问东坡先生" 按钮。
- **形态**：全屏新页面，米色宣纸 + 双线回字纹边框书简风。

---

## 2. 技术栈与代码组织

```
wechatapp/
├── miniprogram/                小程序前端
│   ├── app.js / app.json / app.wxss
│   ├── pages/
│   │   ├── shilu/              诗路心踪（含 web-view 地图）
│   │   ├── mingren/            名人心迹（列表 + 详情）
│   │   ├── wanwu/              万物心愈（菜品列表 + 详情）
│   │   ├── wusheng/            吾生心途（登录 / 进度 / 证书）
│   │   └── chat/               与东坡对话
│   ├── components/
│   │   ├── ancient-frame/      古籍装帧标签（双线回字纹 + 竖排）
│   │   ├── floating-su/        全局悬浮东坡按钮
│   │   └── certificate/        完成证书
│   ├── ai/
│   │   ├── script-library.js   30 条 Q&A + 关键词匹配
│   │   └── persona.js          兜底回复
│   ├── data/
│   │   ├── poems.js            3 首完整苏轼诗
│   │   └── dishes.js           7 道菜内容
│   └── assets/                 字体子集、东坡像、tab 图标、AI 工笔画
│
├── webview/                    web-view 地图站（独立 HTML）
│   ├── index.html
│   ├── ink-overlay.svg         西湖、远山、飞鸟皴笔
│   ├── data/
│   │   ├── sites.json          7 景点坐标 + 简介
│   │   └── poems.json          3 首诗
│   └── js/
│       ├── map.js              Leaflet 初始化、青色调色
│       ├── labels.js           诗句宣纸标签渲染
│       └── drawer.js           抽屉 + postMessage 通信
│
├── cloudfunctions/             云函数
│   ├── login/                  getPhoneNumber 解码 + users 落库
│   ├── checkin/                GPS 校验 + checkins 落库
│   └── sync-progress/          拉打卡进度
│
├── docs/superpowers/specs/     设计文档
└── README.md
```

### 2.1 三个独立交付物

1. **小程序前端**（miniprogram/）：4 tab + 1 chat 子页 + 全局悬浮
2. **web-view 地图站**（webview/）：托管在云开发"静态网站托管"，HTTPS 域名加进 web-view 业务域名白名单
3. **云函数**（cloudfunctions/）：登录、打卡、查进度

### 2.2 通信桥

- 小程序 ←→ web-view：`wx.miniProgram.postMessage` / `wx.miniProgram.navigateTo`
- 小程序 ←→ 云函数：`wx.cloud.callFunction`
- 云函数 ←→ 云数据库：`db.collection`

### 2.3 关键技术决策

| 项 | 选 | 不选 | 理由 |
|---|---|---|---|
| 地图视觉 | Stadia Alidade Smooth + SVG 水墨叠层 | 全静态画 / Stamen Watercolor | 保留缩放定位 + 真水墨味 + 可扩展 |
| Stadia API key | `94b4b80b-f12e-4c63-b860-93a6c584bfe9` | — | 用户已提供 |
| 抽屉实现 | 抽屉做在 web-view HTML 内（B 方案） | 原生组件叠加 / 跳新页 | 原生组件无法盖在 web-view 上；这样视觉真"浮在地图上" |
| 字体 | 思源宋体 SemiBold（开源） | 汇文明朝体 / 付费宋刻本 | 开源、CJK 完整 |
| AI | 本地脚本库 30 条 + 兜底 | 大模型 API | 用户选 B（零后端 AI），不需要域名/API 成本 |
| 美术资产 | AI 生成水墨工笔画（景点 7 + 美食 7 + 证书底版 1） | 实拍 / 自绘 | 速度快，风格统一 |
| Tab 图标 | 免费 iconfont 古风系列 | 自绘 | 速度 |
| 苏东坡像 | 公有领域古画（赵孟頫《东坡小像》等） | AI 生成 | 真实历史画作可信度更高 |
| 打卡判定 | GPS 真位置 + 200 m 半径 | 二维码 / 手填 | 用户选 A，真实感最强 |
| 完成展示 | 进度条 + 7 张卡片 + 证书页 | 印章卷轴 / 集邮册 | 用户选 c |

---

## 3. 数据模型

### 3.1 云数据库三张表

**`users`**
```js
{
  _id: <auto>,
  openid: "<wx-openid>",   // 主键
  phone: "138xxxx",
  nickname: "苏小姐",
  avatar: "<url>",
  registeredAt: <ts>
}
```

**`checkins`**
```js
{
  _id: <auto>,
  openid: "<wx-openid>",
  siteId: "youmeitang",
  siteName: "有美堂遗址",
  lat: 30.245,
  lng: 120.155,
  distanceM: 87,
  checkedAt: <ts>
}
// 复合索引: openid + siteId（去重）
```

**`sites`**
```js
{
  siteId: "youmeitang",
  name: "有美堂遗址",
  lat: 30.246, lng: 120.156,
  radius: 200,
  intro: "宋嘉祐二年...",
  poemId: "youmeitang-baoyu",
  imageUrl: "cloud://.../youmeitang.png"
}
```

### 3.2 前端硬编码数据

- `miniprogram/data/poems.js` —— 3 首苏轼完整诗
- `miniprogram/data/dishes.js` —— 7 道菜（菜名 + 典故 + 引语）
- `miniprogram/ai/script-library.js` —— 30 条 Q&A
- `miniprogram/ai/persona.js` —— 5 条兜底

### 3.3 本地缓存

| Key | 内容 | 有效期 |
|---|---|---|
| `userInfo` | 登录后用户对象 | 不过期，登出清 |
| `checkinCache` | 打卡进度副本 | 5 分钟，下拉强刷 |
| `aiHistory` | 与东坡对话最近 50 条 | 不过期 |

---

## 4. 关键交互流（4 条）

### 4.1 流 A — 首页地图点诗 → 抽屉 → 对话页

```
进首页(诗路心踪)
  → web-view 加载地图站
  → Leaflet + 青色 Stadia + SVG 水墨皴笔 + 米色宣纸诗句标签
点诗句标签
  → web-view JS 弹抽屉(HTML/CSS, 在 web-view 内部)
  → 抽屉内容：完整诗 + 景点简介 + "问问东坡先生" 按钮 + "我已到此一游" 按钮
点"问问东坡先生"
  → wx.miniProgram.navigateTo('/pages/chat/chat?topic=youmeitang')
点"我已到此一游"
  → wx.miniProgram.navigateTo('/pages/mingren/detail?siteId=youmeitang&autoCheckin=1')
  → 详情页 onLoad 检 autoCheckin=1 自动触发流 C
进入对话页(全屏书简底纹)
```

### 4.2 流 B — 吾生心途首次进入 → 登录 → 看进度

```
点 tab "吾生心途"
  → 检 storage.userInfo
  ├─ 无 → 登录卡片(button open-type="getPhoneNumber")
  │       → wx.cloud.callFunction('login', {code, encryptedData, iv})
  │       → 云函数解密 → users upsert → 返回 user
  │       → 写本地 storage
  └─ 有 → 进度页
进度页
  → wx.cloud.callFunction('sync-progress')
  → 显示：进度条(3/7) + 7 张古风卡片(去过盖红印, 未去灰色)
  → 满 7 张 → 证书按钮亮 → 点击进证书页可截图分享
```

### 4.3 流 C — GPS 打卡

```
名人心迹景点详情页 / 抽屉里 点"我已到此一游"
  → wx.getLocation({type:'gcj02'})
  ├─ 拒授权 → 引导设置页 wx.openSetting
  └─ 拿到 (lat, lng)
       → wx.cloud.callFunction('checkin', {siteId, lat, lng})
       → 云函数：sites 查中心点 → Haversine 算距离
       ├─ > radius → {ok:false, msg:'离景点还有 1.2km'}
       └─ ≤ radius → checkins upsert → {ok:true, isFirstTime:true}
            → 前端动画：盖印章 + 进度+1
            → 满 7 → 弹完成 + 跳证书页
```

### 4.4 流 D — 与东坡对话

```
从悬浮按钮 / 抽屉 进对话页
  → 全屏书简底纹(米色宣纸 + 双线回字纹)
  → 顶部：东坡画像 + 标题
  → 中间：消息流（东坡气泡左、用户气泡右）
  → 底部：输入框 + 发送
用户输入
  → script-library.js 关键词匹配
  │   - 分词 → 跟 30 条 Q&A 的 keywords 求交集
  │   - 命中分最高 → 返回 answer
  │   - 全部分数 0 → persona.js 兜底
  → 模拟打字效果 60ms/字 流式输出
  → aiHistory 追加 storage（FIFO 50 条）
```

---

## 5. 视觉系统

### 5.1 设计 Token

```css
--ink-deep:    #1f3a40;
--ink-cyan:    #2d5560;
--ink-light:   #5a8a92;
--paper-rice:  #f7eeda;
--paper-warm:  #f5e9c8;
--frame-brown: #5a3c1f;
--seal-red:    #8b3a3a;
--text-main:   #3a2818;
--text-fade:   #7a6a4f;
```

### 5.2 字体

- 标题/诗：思源宋体 SemiBold，子集化 ~1.2 MB，`wx.loadFontFace` 异步加载，CDN 走云开发静态托管
- 正文：系统字体回退（PingFang SC / 思源宋体 Regular）

### 5.3 通用组件 `<ancient-frame>`

属性：`text`（竖排）、`size`（sm/md/lg）、`clickable`（bind:tap）
效果：双线回字纹、米色宣纸底、`writing-mode: vertical-rl`

### 5.4 各页视觉关键

| 页 | 关键视觉 |
|---|---|
| 诗路心踪（首页） | 全屏 web-view 地图 + 右下悬浮东坡 |
| 名人心迹 | 7 张古籍卡片，竖排标题，上下双线 |
| 万物心愈 | 2 列网格，工笔画图标置上 |
| 吾生心途 | 顶部进度条（"东坡行旅 3/7"）+ 7 张卡片，未去灰、去过红印 |
| 对话页 | 米色宣纸底 + 顶部东坡画像 + 古籍框气泡 + "答曰：…" 前缀 |
| 证书页 | 古风证书 PNG 模板（AI 生成）+ 红印 + 用户名 Canvas 合成可保存 |

### 5.5 全局悬浮东坡按钮

- 位置：右下，距 tab bar 50rpx
- 视觉：圆形米色宣纸背景 + 东坡小像 + 旁附气泡"问我"
- 动画：每 8s 微抖
- 不出现在：对话页本身

---

## 6. 错误处理 & 边界

| 场景 | 处理 |
|---|---|
| web-view 加载失败 | 古风插画 + "墨砚未润，请稍后重启" + 重试 |
| 云函数失败 | 三次重试 1s/2s/4s；仍失败 toast + 本地兜底（打卡缓存暂存） |
| GPS 拒授权 | 引导卡片 + "去设置" 跳 wx.openSetting |
| 打卡距离超限 | 温和提示"离 X 还有 X 米" |
| 手机号拒授权 | 允许匿名逛，不能打卡 |
| AI 零命中 | 5 条 persona 兜底；连续 3 次兜底建议"试试问杭州/美食/家人" |
| 字体加载失败 | 回退系统字体不阻塞 |
| 内容安全 | 本期无 UGC，不接 msgSecCheck；后续上线评论时再接 |

---

## 7. 性能预算

- 首屏 LCP < 2s
- 字体异步加载不阻塞渲染
- 14 张图全部走云存储 + CDN，IntersectionObserver 懒加载

---

## 8. 测试策略

### 8.1 单元（jest）
- `script-library.js` 关键词匹配：30 条 Q&A 各 1 样本 + 5 个兜底场景
- Haversine 距离函数
- checkin 云函数逻辑（mock 云数据库）

### 8.2 集成（手动脚本写在 README）
- 4 tab 切换无白屏
- 登录 → 打卡 → 看进度 → 集满证书 全流程
- 地图点诗 → 抽屉 → 对话页 通信流
- 断网 / 弱网 / 拒授权

### 8.3 真机验收
- iOS / Android 各 1 台
- 杭州本地真打卡至少 1 个景点

---

## 9. 不做（YAGNI）

- 用户分享朋友圈 H5 落地页（后期）
- 评论 / 点赞 / UGC
- 多语言（仅中文）
- 杭州外城市（架构留接口本期不做）
- 真大模型 AI（本期本地脚本）

---

## 10. 上线检查清单（部署前）

- [ ] AppID 已绑定云开发环境
- [ ] 云开发静态网站托管已开通，HTTPS 域名加入 web-view 业务域名白名单
- [ ] Stadia Maps 域名加入小程序 request 域名白名单（虽然走 web-view，仍建议加）
- [ ] 云函数 `login` `checkin` `sync-progress` 部署
- [ ] 云数据库 `users` `checkins` `sites` 表创建 + sites 数据导入 + 索引创建
- [ ] 14 张工笔画素材上传云存储
- [ ] 思源宋体子集化文件上传静态托管
- [ ] 真机 iOS / Android 验收通过
- [ ] 提交审核（注意：AI 对话本期是脚本，不涉及 UGC，审核风险低）

---

## 附 A — 苏轼三首完整诗

**《有美堂暴雨》**（有美堂遗址）

> 游人脚底一声雷，满座顽云拨不开。
> 天外黑风吹海立，浙东飞雨过江来。
> 十分潋滟金樽凸，千杖敲铿羯鼓催。
> 唤起谪仙泉洒面，倒倾鲛室泻琼瑰。

**《次韵聪上人见寄》**（六一泉）

> 前身本同社，法乳遍诸方。
> 一钵寄何处，千峰来故乡。
> 云门大不二，铁壁自难忘。
> 但恐他年别，空留六一泉。

**过溪亭**

> 身轻步稳去忘归，四柱亭前野彴微。
> 忽悟过溪还一笑，水禽惊落翠毛衣。
