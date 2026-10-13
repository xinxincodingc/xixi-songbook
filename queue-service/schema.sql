CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL,
  client TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS requests_day ON requests(day, created_at);
CREATE INDEX IF NOT EXISTS requests_client ON requests(client, day, created_at);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (client TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS login_attempts_client ON login_attempts(client, created_at);
