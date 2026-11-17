-- The deployment script inserts a guarded auto_slug backfill before these triggers.
ALTER TABLE links ADD COLUMN auto_slug TEXT;
CREATE TABLE short_codes (
  code TEXT PRIMARY KEY NOT NULL,
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('auto', 'custom')),
  UNIQUE(link_id, kind)
);
-- BACKFILL
INSERT INTO short_codes SELECT auto_slug, id, 'auto' FROM links;
INSERT INTO short_codes SELECT custom_slug, id, 'custom' FROM links WHERE custom_slug IS NOT NULL;
CREATE TRIGGER links_codes_insert AFTER INSERT ON links BEGIN
  INSERT INTO short_codes VALUES (NEW.auto_slug, NEW.id, 'auto');
  INSERT INTO short_codes SELECT NEW.custom_slug, NEW.id, 'custom' WHERE NEW.custom_slug IS NOT NULL;
END;
CREATE TRIGGER links_codes_update AFTER UPDATE OF custom_slug ON links BEGIN
  DELETE FROM short_codes WHERE link_id = NEW.id AND kind = 'custom';
  INSERT INTO short_codes SELECT NEW.custom_slug, NEW.id, 'custom' WHERE NEW.custom_slug IS NOT NULL;
END;
CREATE TRIGGER links_auto_immutable BEFORE UPDATE OF auto_slug, id ON links BEGIN
  SELECT RAISE(ABORT, 'Auto code is immutable');
END;
