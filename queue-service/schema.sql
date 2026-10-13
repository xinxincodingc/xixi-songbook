CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL,
  client TEXT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS requests_day ON requests(day, created_at);
CREATE INDEX IF NOT EXISTS requests_client ON requests(client, day, created_at);
