-- Add Google identity support to an existing Dodo Hosting database.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
-- PostgreSQL permits multiple NULL values in a normal unique index.
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
  ON users (google_sub);

-- Existing password accounts remain in the database. The new website UI only
-- offers Google sign-in. Do not auto-link accounts by matching email alone.
