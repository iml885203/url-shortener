ALTER TABLE links ADD COLUMN og_enabled INTEGER NOT NULL DEFAULT 0;

UPDATE links
SET og_enabled = 1
WHERE (og_title IS NOT NULL AND trim(og_title) != '')
   OR (og_desc IS NOT NULL AND trim(og_desc) != '')
   OR (og_image IS NOT NULL AND trim(og_image) != '');
