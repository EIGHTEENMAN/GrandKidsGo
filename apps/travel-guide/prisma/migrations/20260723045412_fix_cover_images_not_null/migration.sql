-- make cover_images NOT NULL with default for existing rows
UPDATE spots SET cover_images = ARRAY[]::TEXT[] WHERE cover_images IS NULL;
ALTER TABLE spots ALTER COLUMN cover_images SET NOT NULL;

UPDATE restaurants SET cover_images = ARRAY[]::TEXT[] WHERE cover_images IS NULL;
ALTER TABLE restaurants ALTER COLUMN cover_images SET NOT NULL;

UPDATE hotels SET cover_images = ARRAY[]::TEXT[] WHERE cover_images IS NULL;
ALTER TABLE hotels ALTER COLUMN cover_images SET NOT NULL;

UPDATE parks SET cover_images = ARRAY[]::TEXT[] WHERE cover_images IS NULL;
ALTER TABLE parks ALTER COLUMN cover_images SET NOT NULL;

UPDATE playgrounds SET cover_images = ARRAY[]::TEXT[] WHERE cover_images IS NULL;
ALTER TABLE playgrounds ALTER COLUMN cover_images SET NOT NULL;

UPDATE malls SET cover_images = ARRAY[]::TEXT[] WHERE cover_images IS NULL;
ALTER TABLE malls ALTER COLUMN cover_images SET NOT NULL;

UPDATE hospitals SET cover_images = ARRAY[]::TEXT[] WHERE cover_images IS NULL;
ALTER TABLE hospitals ALTER COLUMN cover_images SET NOT NULL;

UPDATE guides SET cover_images = ARRAY[]::TEXT[] WHERE cover_images IS NULL;
ALTER TABLE guides ALTER COLUMN cover_images SET NOT NULL;
