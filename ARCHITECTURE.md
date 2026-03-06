# URL Shortener — 技術架構文件

## 概述

個人用短網址服務，支援自訂 OG meta、點擊追蹤、後台管理。全部部署在 Cloudflare 免費方案上，零成本。

## 架構圖

```
                         ┌─────────────────────┐
                         │   Cloudflare DNS     │
                         │  (自訂短網址域名)     │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   Cloudflare Worker  │
                         │   (API + Redirect)   │
                         └──┬───────┬───────┬──┘
                            │       │       │
                   ┌────────▼──┐ ┌──▼────┐ ┌▼────────────┐
                   │  KV Store │ │  D1   │ │ Pages (SPA)  │
                   │ (快取層)   │ │(資料庫)│ │ (後台 UI)    │
                   └───────────┘ └───────┘ └─────────────┘
```

## 元件職責

### 1. Cloudflare Worker（核心）

負責所有 HTTP 請求處理：

- **Redirect 路徑** `GET /:slug`
  1. `KV.get(slug)` → 取得 URL + OG meta（edge 快取，低延遲）
  2. 檢查 User-Agent 是否為爬蟲
     - 爬蟲 → 回傳含自訂 `<meta og:*>` 的 HTML（附 `meta refresh` 跳轉）
     - 一般人 → `302 Found` redirect 到目標 URL
  3. `waitUntil()` → 非同步寫 click log 到 D1（不阻塞 response）

- **Admin API** `/api/*`（後台 SPA 呼叫）
  - `GET    /api/links` — 列出所有短網址（D1 查詢，含 click 統計）
  - `POST   /api/links` — 新增短網址（寫 D1 + 同步更新 KV）
  - `PUT    /api/links/:slug` — 編輯短網址（寫 D1 + 同步更新 KV）
  - `DELETE /api/links/:slug` — 刪除短網址（刪 D1 + 刪 KV）
  - `GET    /api/links/:slug/stats` — 查看點擊統計

- **驗證**：Admin API 需帶 API key（環境變數），簡單但足夠

### 2. KV Store（快取層）

- **用途**：Redirect 熱路徑的快取，確保即使 D1 超限，短網址仍可運作
- **結構**：`key = slug`, `value = JSON { url, ogTitle, ogDesc, ogImage }`
- **寫入時機**：Admin API 新增/編輯/刪除時同步更新
- **讀取**：每次 redirect 從 KV 讀取，不走 D1

### 3. D1 Database（資料庫）

#### Schema

```sql
-- 短網址主表
CREATE TABLE links (
  slug        TEXT PRIMARY KEY,
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
  slug        TEXT NOT NULL REFERENCES links(slug) ON DELETE CASCADE,
  clicked_at  TEXT NOT NULL DEFAULT (datetime('now')),
  referrer    TEXT,
  country     TEXT,
  user_agent  TEXT,
  ip_hash     TEXT
);

-- 查詢優化索引
CREATE INDEX idx_clicks_slug ON clicks(slug);
CREATE INDEX idx_clicks_slug_time ON clicks(slug, clicked_at);
```

#### 說明

- `clicks` 表記錄每次點擊的詳細資訊
- `country` 從 `CF-IPCountry` header 取得（Cloudflare 自動提供，免費）
- `ip_hash` 存 hash 而非原始 IP，保護隱私
- 用 `clicked_at` 索引支援時間範圍統計查詢

### 4. Pages SPA（後台 UI）

- **框架**：待定（Vue / React / 純 vanilla）
- **功能**：
  - 短網址列表（含 click 數量）
  - 新增/編輯短網址（slug、目標 URL、OG meta）
  - 點擊統計圖表（按天/referrer/國家）
- **驗證**：進入後台需輸入 API key
- **部署**：Cloudflare Pages，自動 CI/CD

## 爬蟲偵測

```javascript
const CRAWLERS = /facebookexternalhit|Twitterbot|LinkedInBot|Discordbot|LINE|Slackbot|Googlebot|bingbot/i;

function isCrawler(request) {
  const ua = request.headers.get('user-agent') || '';
  return CRAWLERS.test(ua);
}
```

爬蟲收到的 HTML：

```html
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="{自訂標題}" />
  <meta property="og:description" content="{自訂描述}" />
  <meta property="og:image" content="{自訂圖片}" />
  <meta property="og:url" content="{短網址}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url={目標 URL}" />
</head>
<body></body>
</html>
```

## 免費額度與瓶頸

| 資源 | 免費上限 | 每次 click 消耗 | 日承載量 |
|---|---|---|---|
| Workers 請求 | 100,000/天 | 1 | 100,000 |
| KV 讀取 | 100,000/天 | 1 | 100,000 |
| KV 寫入 | 1,000/天 | 0（僅 admin 操作） | N/A |
| D1 讀取 | 5,000,000/天 | 0（redirect 走 KV） | N/A |
| D1 寫入 | 100,000/天 | 1（click log） | 100,000 |
| D1 儲存 | 500 MB | ~200 bytes/click | ~250 萬筆 |
| Pages 部署 | 無限 | — | — |

**瓶頸**：Workers 請求、KV 讀取、D1 寫入，三者皆為 10 萬/天。

## 風險與對策

| 風險 | 影響 | 對策 |
|---|---|---|
| D1 寫入超限 | click log 中斷（redirect 不受影響） | click log 改批次寫入；或降級用 KV atomic counter |
| Workers CPU 10ms 限制 | Worker 超時 | `waitUntil()` 處理非關鍵邏輯；保持 redirect 路徑精簡 |
| D1 冷啟動延遲 50-100ms | 後台查詢稍慢 | Redirect 走 KV 不受影響；後台可接受 |
| 資料遺失（Free 僅 7 天 Time Travel） | 無法回溯 | 定期 `wrangler d1 export` 備份 |

## 專案結構（規劃）

```
url-shortener/
├── ARCHITECTURE.md          # 本文件
├── README.md
├── wrangler.toml            # Cloudflare Worker 設定
├── src/
│   ├── index.ts             # Worker 進入點
│   ├── router.ts            # 路由分發
│   ├── handlers/
│   │   ├── redirect.ts      # Redirect + 爬蟲偵測
│   │   └── api.ts           # Admin CRUD API
│   ├── services/
│   │   ├── kv.ts            # KV 操作封裝
│   │   └── db.ts            # D1 操作封裝
│   └── utils/
│       ├── crawler.ts       # 爬蟲 UA 偵測
│       └── auth.ts          # API key 驗證
├── dashboard/               # Pages SPA（後台）
│   ├── index.html
│   ├── src/
│   └── ...
├── migrations/
│   └── 0001_init.sql        # D1 schema
└── scripts/
    └── backup.sh            # D1 備份腳本
```

## 開發與部署

```bash
# 開發
npx wrangler dev

# 部署 Worker
npx wrangler deploy

# D1 migration
npx wrangler d1 execute <DB_NAME> --file=./migrations/0001_init.sql

# 部署後台（Pages）
npx wrangler pages deploy dashboard/dist
```

## 待決事項

- [ ] 短網址域名（例如 `s.logan.tw`）
- [ ] 後台框架選擇（Vue / React / vanilla）
- [ ] 是否需要 QR code 產生功能
- [ ] Click log 保留策略（多久清一次舊資料）
