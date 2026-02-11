CREATE TABLE daily_stats (
  date  TEXT NOT NULL,
  path  TEXT NOT NULL,
  pv    INTEGER DEFAULT 0,
  uv    INTEGER DEFAULT 0,
  uses  INTEGER DEFAULT 0,
  PRIMARY KEY (date, path)
);

CREATE TABLE daily_visitors (
  date         TEXT NOT NULL,
  path         TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  PRIMARY KEY (date, path, visitor_hash)
);
