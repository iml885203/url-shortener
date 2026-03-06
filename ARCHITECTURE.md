# URL Shortener — 技術架構文件

## 概述

個人用短網址/長網址服務，支援自訂 OG meta、圖片上傳、點擊追蹤、後台管理。全部部署在 Cloudflare 免費方案上，零成本。

## 兩種模式

### 短網址
```
go.logan.tw/abc
```
- 自訂 slug（如 `abc`、`blog`、`gh`）
- 存 DB，可修改目標 URL

### 長網址（logan 編碼）
```
go.logan.tw/loogan       ← ID 0（最短，2 個 o）
go.logan.tw/loοgan       ← ID 1
go.logan.tw/loοoogan     ← ID 16
go.logan.tw/loοоᴏοgan   ← ID 某數
```
- 格式：`l` + base-4 編碼的 o（至少 2 個）+ `gan`
- 4 種 Unicode `o` 做 base-4 digits：
  - `o` (U+006F) = 0
  - `ο` (U+03BF 希臘) = 1
  - `о` (U+043E 西里爾) = 2
  - `ᴏ` (U+1D0F 小型大寫) = 3
- 肉眼看全是 `loooogan`，實際每個 o 帶不同資訊
- 中間 o 的 base-4 值 = DB 中的 ID
- 最少 2 個 o（不足 2 位時前面補 0）
- 存 DB，可修改目標 URL

### 兩者共用
- 同一張 DB 表
- 都支援自訂 OG meta + 圖片
- 都追蹤點擊

## 架構圖

```
                         ┌─────────────────────┐
                         │   Cloudflare DNS     │
                         │   go.logan.tw        │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   Cloudflare Worker  │
                         │   (API + Redirect)   │
                         └──┬───┬───┬───┬──────┘
                            │   │   │   │
                   ┌────────▼┐ ┌▼──┐│  ┌▼───────────┐
                   │ KV Store│ │D1 ││  │ Pages (SPA) │
                   │ (快取)  │ │   ││  │ (後台 UI)   │
                   └─────────┘ └───┘│  └─────────────┘
                                    │
                              ┌─────▼─────┐
                              │  R2 Bucket │
                              │ (OG 圖片)  │
                              └───────────┘
```

## 元件職責

### 1. Cloudflare Worker（核心）

#### Redirect 路徑 `GET /:slug`

1. 判斷 slug 類型：
   - 符合 `/^l[oοоᴏ]{2,}gan$/` → 長網址，解碼 base-4 得到 ID → 查 DB
   - 其他 → 短網址，slug 直接查 KV（快取）→ miss 時查 DB
2. 檢查 User-Agent：
   - 爬蟲（LINE/FB/Discord/Twitter）→ 回 HTML with `<meta og:*>`
   - 一般人 → `302 Found` redirect
3. `waitUntil()` → 非同步寫 click log 到 D1

#### Admin API `/api/*`

- `GET    /api/links` — 列出所有短網址（含 click 統計）
- `POST   /api/links` — 新增（type: short/long）
- `PUT    /api/links/:id` — 編輯（URL、OG meta）
- `DELETE /api/links/:id` — 刪除
- `GET    /api/links/:id/stats` — 點擊統計
- `POST   /api/upload` — 上傳 OG 圖片到 R2
- 驗證：API key（環境變數）

### 2. KV Store（快取層）

- **用途**：短網址 redirect 的熱路徑快取
- **結構**：`key = slug`, `value = JSON { url, ogTitle, ogDesc, ogImage }`
- **寫入**：Admin API 新增/編輯/刪除時同步更新
- **長網址不走 KV**（量少，直接查 D1 即可）

### 3. D1 Database

```sql
-- 連結主表
CREATE TABLE links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  type        TEXT NOT NULL CHECK(type IN ('short', 'long')),  -- short / long
  slug        TEXT UNIQUE,                                      -- 短網址用，長網址為 NULL
  url         TEXT NOT NULL,
  og_title    TEXT,
  og_desc     TEXT,
  og_image    TEXT,                                             -- R2 圖片 URL
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 點擊記錄
CREATE TABLE clicks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id     INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at  TEXT NOT NULL DEFAULT (datetime('now')),
  referrer    TEXT,
  country     TEXT,          -- 從 CF-IPCountry header 取得
  user_agent  TEXT,
  ip_hash     TEXT           -- hash 保護隱私
);

CREATE INDEX idx_clicks_link_id ON clicks(link_id);
CREATE INDEX idx_clicks_link_time ON clicks(link_id, clicked_at);
```

#### 長網址查詢流程
1. 解碼 slug → 得到 ID
2. `SELECT * FROM links WHERE id = ? AND type = 'long'`

#### 短網址查詢流程
1. 先查 KV（快取）
2. Miss → `SELECT * FROM links WHERE slug = ? AND type = 'short'`

### 4. R2 Bucket（OG 圖片儲存）

- **免費額度**：10 GB 儲存、1,000 萬 reads/月、100 萬 writes/月
- **上傳流程**：後台選圖 → Worker API 接收 → 存到 R2 → 回傳 public URL
- **OG image URL**：`https://r2.go.logan.tw/{id}/{filename}`（透過 custom domain 或 worker 代理）

### 5. Pages SPA（後台 UI）

- **功能**：
  - 連結列表（短/長分類，含 click 數量）
  - 新增連結（選短/長模式）
    - 短：輸入 slug + 目標 URL
    - 長：只輸入目標 URL → 自動生成 `loogan` 格式
  - 編輯連結（URL、OG title/desc/image）
  - 上傳 OG 圖片
  - 點擊統計（按天/referrer/國家）
- **驗證**：輸入 API key
- **框架**：待定

## 爬蟲偵測

```javascript
const CRAWLERS = /facebookexternalhit|Twitterbot|LinkedInBot|Discordbot|LINE|Slackbot|Googlebot|bingbot/i;
```

回傳 HTML：
```html
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:image" content="{image}" />
  <meta property="og:url" content="{短/長網址}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url={目標 URL}" />
</head>
<body></body>
</html>
```

## Logan 編碼規則

```
編碼：ID → base-4 字串 → padStart(2, '0') → 替換為 Unicode o → 包上 l...gan
解碼：去掉 l 和 gan → 每個 o 轉 0-3 → 組成 base-4 字串 → parseInt(str, 4) → ID

字元對照：
  o  (U+006F) = 0
  ο  (U+03BF) = 1
  о  (U+043E) = 2
  ᴏ  (U+1D0F) = 3

範例：
  ID 0  → base4 "00" → "oo"       → "loogan"
  ID 1  → base4 "01" → "oο"       → "loοgan"
  ID 5  → base4 "11" → "οο"       → "lοοgan"
  ID 15 → base4 "33" → "ᴏᴏ"       → "lᴏᴏgan"
  ID 16 → base4 "100"→ "οoo"      → "lοoogan"
  ID 255→ base4 "3333"→ "ᴏᴏᴏᴏ"   → "lᴏᴏᴏᴏgan"
```

## 免費額度

| 資源 | 免費上限 | 每次 click | 日承載量 |
|---|---|---|---|
| Workers 請求 | 100,000/天 | 1 | 100,000 |
| KV 讀取 | 100,000/天 | 1（短網址）| 100,000 |
| D1 讀取 | 5,000,000/天 | 1（長網址）| 5,000,000 |
| D1 寫入 | 100,000/天 | 1（click log）| 100,000 |
| D1 儲存 | 500 MB | ~200 bytes/click | ~250 萬筆 |
| R2 儲存 | 10 GB | — | — |
| R2 讀取 | 10,000,000/月 | 1（OG image）| — |
| Pages | 無限部署 | — | — |

## 專案結構

```
url-shortener/
├── ARCHITECTURE.md
├── README.md
├── wrangler.toml
├── src/
│   ├── index.ts             # Worker 進入點
│   ├── router.ts            # 路由分發
│   ├── handlers/
│   │   ├── redirect.ts      # Redirect + 爬蟲偵測
│   │   └── api.ts           # Admin CRUD + 上傳
│   ├── services/
│   │   ├── kv.ts            # KV 操作
│   │   ├── db.ts            # D1 操作
│   │   └── r2.ts            # R2 圖片操作
│   ├── logan/
│   │   └── codec.ts         # logan 編碼/解碼
│   └── utils/
│       ├── crawler.ts       # 爬蟲偵測
│       └── auth.ts          # API key 驗證
├── dashboard/               # Pages SPA（後台）
│   └── ...
├── migrations/
│   └── 0001_init.sql
└── scripts/
    └── backup.sh
```

## 待決事項

- [ ] 域名確認（`go.logan.tw` 或其他）
- [ ] 後台框架選擇
- [ ] R2 圖片 public access 方式（custom domain 或 worker 代理）
- [ ] Click log 保留策略
- [ ] 是否需要 QR code 功能
