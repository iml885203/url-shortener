ALTER TABLE links ADD COLUMN custom_slug TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_custom_slug ON links(custom_slug);
