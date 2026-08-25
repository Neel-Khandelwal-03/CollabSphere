-- ============================================================
-- CollabSphere — Migration 007: File Management (Cloudinary)
-- ============================================================

-- task_attachments (Checkpoint 4) could upload to Cloudinary but never
-- actually delete from it — DELETE only ever removed the PostgreSQL row.
-- public_id is what Cloudinary's own deletion API requires; it was never
-- captured. Adding it (and resource_type/folder, needed to call that API
-- correctly) is the minimal fix — existing rows get NULL here, a
-- documented limitation (see README), not silently pretended away.
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS public_id VARCHAR(500);
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20);
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS folder VARCHAR(255);

-- Issues had zero attachment infrastructure before this migration — a
-- blank slate, built to mirror task_attachments' shape exactly (matching
-- this codebase's established Task/Issue architectural mirroring), with
-- public_id/resource_type/folder present from day one rather than
-- retrofitted.
CREATE TABLE IF NOT EXISTS issue_attachments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id      UUID NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
    uploaded_by   UUID REFERENCES users (id) ON DELETE SET NULL,
    file_name     VARCHAR(255) NOT NULL,
    file_url      TEXT NOT NULL,
    file_type     VARCHAR(100),
    file_size     INTEGER,
    public_id     VARCHAR(500),
    resource_type VARCHAR(20),
    folder        VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_attachments_issue_id ON issue_attachments (issue_id);

-- General-purpose file library — backs Workspace Files, Project Files,
-- and chat file-sharing, none of which have a single natural "owning
-- entity" the way a task or issue attachment does. workspace_id is
-- always required (every file traces back to a workspace, matching the
-- same rule Checkpoint 6 established for conversations); project_id is
-- optional, set when a file is uploaded from within a specific project
-- rather than a workspace's general library.
--
-- Workspace/Project Files views are NOT a separate copy of task or issue
-- attachments — they UNION this table with task_attachments and
-- issue_attachments at query time (see file.service.js), so a file
-- attached to a task and visible in "Project Files" is the same
-- underlying row, not a duplicate upload, satisfying the spec's explicit
-- "do not duplicate storage records for the same physical file" rule.
CREATE TABLE IF NOT EXISTS files (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    project_id    UUID REFERENCES projects (id) ON DELETE CASCADE,
    uploaded_by   UUID REFERENCES users (id) ON DELETE SET NULL,
    original_name VARCHAR(255) NOT NULL,
    public_id     VARCHAR(500) NOT NULL,
    file_url      TEXT NOT NULL,
    secure_url    TEXT NOT NULL,
    resource_type VARCHAR(20) NOT NULL,
    mime_type     VARCHAR(150),
    file_size     INTEGER,
    folder        VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON files (workspace_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files (project_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files (created_at);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files (mime_type);

DROP TRIGGER IF EXISTS trg_files_updated_at ON files;
CREATE TRIGGER trg_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Chat file-sharing: a message optionally carries exactly one shared
-- file. Additive, nullable column on the existing messages table rather
-- than a parallel "file messages" concept — a shared file is still just
-- a message, per the checkpoint's own required flow ("create the chat
-- message referencing the file").
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES files (id) ON DELETE SET NULL;
