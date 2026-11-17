-- Add Google identity support to an existing Dodo Hosting database.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
  ON users (google_sub)
  WHERE google_sub IS NOT NULL;

-- Existing password accounts remain in the database. The new website UI only
-- offers Google sign-in. Do not auto-link accounts by matching email alone.
