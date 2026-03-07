# URL Shortener

個人用短網址/長網址服務，部署在 Cloudflare 免費方案。

## 兩種模式

| 格式 | 範例 | 說明 |
|---|---|---|
| 短網址 | `go.logan.tw/Uk` | Sqids 編碼 |
| 長網址 | `go.logan.tw/loοgan` | Logan Unicode-o 編碼 |

兩種格式指向同一個 DB record，自動雙向可用。

## 架構

- **Worker** (Hono): 路由、redirect、爬蟲偵測、Admin API
- **D1**: 連結主表 + 點擊記錄
- **KV**: 快取層（TTL 24h）
- **R2**: OG 圖片儲存
- **Dashboard**: Vue 3 + Vite + Tailwind CSS SPA

## 快速開始

### 1. 安裝

```bash
npm install
cd dashboard && npm install && cd ..
```

### 2. 建立 Cloudflare 資源

```bash
./scripts/setup.sh
```

把產生的 ID 填入 `wrangler.toml`。

### 3. 設定 API Key

```bash
wrangler secret put API_KEY
```

### 4. 本地開發

```bash
# 先 build dashboard
cd dashboard && npm run build && cd ..
# 啟動 Worker
npm run dev
```

### 5. 部署

```bash
cd dashboard && npm run build && cd ..
npm run deploy
```

## 測試

```bash
npm test
```

## 結構

```
├── src/
│   ├── index.ts          # Worker 進入點 (Hono)
│   ├── types.ts          # 型別定義
│   ├── codec/
│   │   ├── sqids.ts      # 短網址編解碼
│   │   └── logan.ts      # 長網址編解碼 (loooogan)
│   ├── handlers/
│   │   ├── redirect.ts   # Redirect + 爬蟲偵測 + click log
│   │   └── api.ts        # Admin CRUD API
│   ├── services/
│   │   ├── db.ts         # D1 操作
│   │   ├── kv.ts         # KV 快取操作
│   │   └── r2.ts         # R2 圖片操作
│   └── utils/
│       ├── auth.ts       # API key 驗證
│       ├── crawler.ts    # 爬蟲偵測
│       └── hash.ts       # IP 雜湊
├── dashboard/            # Vue 3 + Vite SPA
├── migrations/
│   └── 0001_init.sql     # D1 schema
├── tests/
│   └── codec.test.ts     # Codec 單元測試
└── wrangler.toml
```
