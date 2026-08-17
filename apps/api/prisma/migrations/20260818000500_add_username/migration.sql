-- Add username to existing users, deriving a stable unique value from email.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

WITH normalized AS (
  SELECT
    "id",
    CASE
      WHEN LENGTH(REGEXP_REPLACE(LOWER(SPLIT_PART("email", '@', 1)), '[^a-z0-9._-]', '', 'g')) >= 3
        THEN LEFT(REGEXP_REPLACE(LOWER(SPLIT_PART("email", '@', 1)), '[^a-z0-9._-]', '', 'g'), 24)
      ELSE 'user_' || LEFT(REPLACE("id"::text, '-', ''), 8)
    END AS base
  FROM "User"
), ranked AS (
  SELECT "id", base, ROW_NUMBER() OVER (PARTITION BY base ORDER BY "id") AS position
  FROM normalized
)
UPDATE "User" AS target
SET "username" = ranked.base || CASE WHEN ranked.position > 1 THEN '_' || ranked.position::text ELSE '' END
FROM ranked
WHERE target."id" = ranked."id";

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
