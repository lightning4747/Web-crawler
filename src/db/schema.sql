-- All discovered URLs and their crawl state
CREATE TABLE IF NOT EXISTS urls (
  id            SERIAL PRIMARY KEY,
  url           TEXT NOT NULL UNIQUE,
  domain        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | FETCHING | DONE | FAILED
  depth         INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetched_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_urls_status_domain ON urls (status, domain);

-- Extracted page content
CREATE TABLE IF NOT EXISTS crawled_pages (
  id            SERIAL PRIMARY KEY,
  url_id        INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  title         TEXT,
  description   TEXT,
  canonical_url TEXT,
  headings      JSONB,     -- { h1: [...], h2: [...], h3: [...] }
  text_content  TEXT,
  crawled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link graph
CREATE TABLE IF NOT EXISTS links (
  from_url_id   INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  to_url_id     INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  PRIMARY KEY (from_url_id, to_url_id)
);

-- Domain statistics for observability
CREATE TABLE IF NOT EXISTS domain_stats (
  domain TEXT PRIMARY KEY,
  pending_count INTEGER NOT NULL DEFAULT 0,
  fetching_count INTEGER NOT NULL DEFAULT 0,
  done_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_crawled_at TIMESTAMPTZ
);

