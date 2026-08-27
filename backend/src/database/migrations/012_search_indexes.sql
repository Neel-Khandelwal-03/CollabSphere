-- ============================================================
-- CollabSphere — Migration 012: Search indexes (Checkpoint 9)
-- ============================================================

-- pg_trgm enables trigram-based GIN indexes, which make ILIKE '%term%'
-- substring search fast at scale instead of a sequential scan on every
-- keystroke. This is PostgreSQL's own native capability (per the
-- checkpoint's explicit instruction to prefer it over introducing a
-- separate search engine), just not enabled by default.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_workspaces_name_trgm ON workspaces USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_name_trgm ON projects USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm ON tasks USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_issues_title_trgm ON issues USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_files_original_name_trgm ON files USING gin (original_name gin_trgm_ops);
