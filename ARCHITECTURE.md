# URL Shortener — 技術架構文件

## 概述

個人用短網址/長網址服務，支援自訂 OG meta、圖片上傳、點擊追蹤、後台管理。全部部署在 Cloudflare 免費方案上，零成本。

## 兩種模式（同一個 ID）

每條連結在 DB 中有一個 auto-increment ID，同時可透過短網址和長網址存取：

### 短網址（Sqids 編碼）
```
go.logan.tw/Uk        ← ID 經 Sqids 編碼
go.logan.tw/Lqj8a0    ← ID 較大時自動變長
```
- ID → Sqids encode → URL-safe 短字串
- 可逆：decode 回 ID，不需要額外存 slug
- 自動避免髒字

### 長網址（Logan 編碼）
```
go.logan.tw/loogan       ← ID 0（最短，2 個 o）
go.logan.tw/loοgan       ← ID 1
go.logan.tw/lᴏᴏᴏᴏgan    ← ID 255
```
- ID → base-4 → 4 種 Unicode `o` → 包上 `l...gan`
- 肉眼看全是 `loooogan`

### 同一條連結，兩個入口
```
go.logan.tw/Uk       ← 短網址
go.logan.tw/loοgan   ← 長網址
         ↓               ↓
      Sqids.decode    Logan.decode
         ↓               ↓
        ID 1     ===    ID 1     → 同一筆 DB record
```

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
   - 符合 `/^l[oοоᴏ]{2,}gan$/` → Logan 編碼，decode → ID
   - 其他 → Sqids decode → ID
2. 用 ID 查連結：先查 KV 快取 → miss 查 D1
3. 檢查 User-Agent：
   - 爬蟲（LINE/FB/Discord/Twitter）→ 回 HTML with `<meta og:*>`
   - 一般人 → `302 Found` redirect
4. `waitUntil()` → 非同步寫 click log 到 D1

#### Admin API `/api/*`

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/links` | 列出所有連結（含 click 統計）|
| POST | `/api/links` | 新增連結 |
| PUT | `/api/links/:id` | 編輯（URL、OG meta）|
| DELETE | `/api/links/:id` | 刪除 |
| GET | `/api/links/:id/stats` | 點擊統計 |
| POST | `/api/upload` | 上傳 OG 圖片到 R2 |

驗證：API key（環境變數）

### 2. KV Store（快取層）

- **結構**：`key = ID`, `value = JSON { url, ogTitle, ogDesc, ogImage }`
- **寫入**：Admin API 新增/編輯/刪除時同步更新
- **讀取**：兩種模式都 decode 出 ID 後查 KV

### 3. D1 Database

```sql
-- 連結主表
CREATE TABLE links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  url         TEXT NOT NULL,
  og_title    TEXT,
  og_desc     TEXT,
  og_image    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 點擊記錄
CREATE TABLE clicks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id     INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at  TEXT NOT NULL DEFAULT (datetime('now')),
  referrer    TEXT,
  country     TEXT,
  user_agent  TEXT,
  ip_hash     TEXT
);

CREATE INDEX idx_clicks_link_id ON clicks(link_id);
CREATE INDEX idx_clicks_link_time ON clicks(link_id, clicked_at);
```

不需要 `type` 或 `slug` 欄位了 — 短/長都從 ID 算出來。

### 4. R2 Bucket（OG 圖片儲存）

- **免費額度**：10 GB 儲存、1,000 萬 reads/月、100 萬 writes/月
- **上傳**：後台選圖 → Worker API → R2
- **URL**：`https://r2.go.logan.tw/{id}/{filename}`

### 5. Pages SPA（後台 UI）

- 連結列表（顯示短網址 + 長網址 + click 數）
- 新增連結（輸入目標 URL → 自動產生短/長兩種格式）
- 編輯連結（URL、OG title/desc/image）
- 上傳 OG 圖片
- 點擊統計（按天/referrer/國家）
- 驗證：輸入 API key
- 框架：待定

## 編碼規則

### Sqids（短網址）

```
依賴：sqids (npm)

encode: ID → 短字串（如 "Uk"、"Lqj8a0"）
decode: 短字串 → ID

設定：
  alphabet: 自訂（避免與 logan 編碼衝突）
  minLength: 2（至少 2 字元）
```

### Logan（長網址）

```
字元對照：
  o  (U+006F) = 0
  ο  (U+03BF) = 1
  о  (U+043E) = 2
  ᴏ  (U+1D0F) = 3

encode:
  1. ID → base-4 字串
  2. padStart(2, '0')（至少 2 位）
  3. 每位數替換為對應 Unicode o
  4. 前加 'l'，後加 'gan'

decode:
  1. 去掉 'l' 和 'gan'
  2. 每個 o → 0~3
  3. base-4 字串 → parseInt → ID

範例：
  ID 0   → base4 "00" → "oo"     → "loogan"
  ID 1   → base4 "01" → "oο"     → "loοgan"
  ID 5   → base4 "11" → "οο"     → "lοοgan"
  ID 15  → base4 "33" → "ᴏᴏ"     → "lᴏᴏgan"
  ID 16  → base4 "100"→ "οoo"    → "lοoogan"
  ID 255 → base4 "3333"→ "ᴏᴏᴏᴏ" → "lᴏᴏᴏᴏgan"
```

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
  <meta property="og:url" content="{網址}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url={目標 URL}" />
</head>
<body></body>
</html>
```

## 免費額度

| 資源 | 免費上限 | 每次 click | 日承載量 |
|---|---|---|---|
| Workers 請求 | 100,000/天 | 1 | 100,000 |
| KV 讀取 | 100,000/天 | 1 | 100,000 |
| D1 寫入 | 100,000/天 | 1（click log）| 100,000 |
| D1 儲存 | 500 MB | ~200 bytes | ~250 萬筆 |
| R2 儲存 | 10 GB | — | — |
| R2 讀取 | 10,000,000/月 | 1（OG image）| — |
| Pages | 無限部署 | — | — |

## 專案結構

```
url-shortener/
├── ARCHITECTURE.md
├── README.md
├── wrangler.toml
├── package.json
├── tsconfig.json
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
│   ├── codec/
│   │   ├── sqids.ts         # Sqids 短網址編解碼
│   │   └── logan.ts         # Logan 長網址編解碼
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
- [ ] R2 圖片 public access 方式
- [ ] Click log 保留策略
- [ ] Sqids alphabet 自訂（避免與 `l...gan` 格式衝突）
- [ ] 是否需要 QR code 功能
