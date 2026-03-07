-- 連結主表
CREATE TABLE IF NOT EXISTS links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  url         TEXT NOT NULL,
  og_title    TEXT,
  og_desc     TEXT,
  og_image    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 點擊記錄
CREATE TABLE IF NOT EXISTS clicks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id     INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at  TEXT NOT NULL DEFAULT (datetime('now')),
  referrer    TEXT,
  country     TEXT,
  user_agent  TEXT,
  ip_hash     TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_link_time ON clicks(link_id, clicked_at);
