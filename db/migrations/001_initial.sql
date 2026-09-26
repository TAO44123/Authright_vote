CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  closed_at INTEGER,
  archived_at INTEGER,
  manager_hash TEXT NOT NULL,
  manager_version INTEGER NOT NULL DEFAULT 1,
  create_key TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS poll_options (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE RESTRICT,
  label TEXT NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE (poll_id, id),
  UNIQUE (poll_id, position)
);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE RESTRICT,
  option_id TEXT NOT NULL,
  voter_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (poll_id, voter_hash),
  FOREIGN KEY (poll_id, option_id) REFERENCES poll_options(poll_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS votes_poll_time ON votes(poll_id, created_at);
CREATE INDEX IF NOT EXISTS options_poll_position ON poll_options(poll_id, position);
CREATE INDEX IF NOT EXISTS polls_created_at ON polls(created_at DESC);

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('admin', 'manager')),
  admin_id TEXT REFERENCES admin_users(id) ON DELETE CASCADE,
  poll_id TEXT REFERENCES polls(id) ON DELETE CASCADE,
  manager_version INTEGER,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_kind TEXT NOT NULL CHECK (actor_kind IN ('admin', 'manager')),
  admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_poll_time ON audit_logs(poll_id, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
