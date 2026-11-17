CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(100),
  google_sub VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_have_auth_method CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at);
