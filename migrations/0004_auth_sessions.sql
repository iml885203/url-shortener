-- Separate authentication state; existing links/clicks and API keys are unchanged.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  issued INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_subject ON auth_sessions(subject);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires);
CREATE TABLE IF NOT EXISTS auth_revoked (
  subject TEXT PRIMARY KEY,
  cutoff INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_replay (
  jti TEXT PRIMARY KEY,
  expires INTEGER NOT NULL
);
