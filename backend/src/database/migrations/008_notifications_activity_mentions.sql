-- ============================================================
-- CollabSphere — Migration 008: Notifications, Activity Logs, Mentions
-- ============================================================

-- notifications.type deliberately uses VARCHAR + CHECK rather than this
-- project's usual Postgres ENUM convention (task_status, issue_type,
-- conversation_type, etc.) — the spec's own type list is already 19
-- entries and explicitly "at minimum," and ENUM extension (ALTER TYPE
-- ... ADD VALUE) has real friction for a classification this likely to
-- keep growing across future checkpoints. A CHECK constraint is trivial
-- to widen in a later migration; an ENUM is not.
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL CHECK (type IN (
        'TASK_ASSIGNED', 'TASK_STATUS_CHANGED', 'TASK_COMMENT', 'TASK_MENTION',
        'ISSUE_ASSIGNED', 'ISSUE_STATUS_CHANGED', 'ISSUE_COMMENT', 'ISSUE_MENTION',
        'PROJECT_CREATED', 'PROJECT_MEMBER_ADDED', 'PROJECT_MEMBER_REMOVED',
        'WORKSPACE_INVITATION', 'WORKSPACE_MEMBER_ADDED', 'WORKSPACE_ROLE_CHANGED',
        'FILE_UPLOADED', 'FILE_SHARED', 'CHAT_MENTION', 'DEADLINE_REMINDER', 'SYSTEM'
    )),
    title       VARCHAR(255) NOT NULL,
    message     TEXT,
    -- Polymorphic reference (task/issue/project/workspace/file/
    -- conversation/...) — deliberately no foreign key, the same way
    -- issue_history/task_activity's entity references already work.
    entity_type VARCHAR(50),
    entity_id   UUID,
    actor_id    UUID REFERENCES users (id) ON DELETE SET NULL,
    metadata    JSONB,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at     TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications (entity_type, entity_id);

DROP TRIGGER IF EXISTS trg_notifications_updated_at ON notifications;
CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- activity_logs is a workspace/project-wide feed — additive to, not a
-- replacement for, the existing task_activity/issue_history tables,
-- which power their own narrower per-entity timelines already built in
-- Checkpoints 4/5. This answers a different question ("what happened
-- across this whole workspace/project") than those do ("what happened
-- to this one task/issue"), the same distinction GitHub draws between a
-- repo-wide Activity feed and a single PR's timeline.
CREATE TABLE IF NOT EXISTS activity_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    project_id  UUID REFERENCES projects (id) ON DELETE CASCADE,
    actor_id    UUID REFERENCES users (id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    old_value   JSONB,
    new_value   JSONB,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_created ON activity_logs (workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_created ON activity_logs (project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_created ON activity_logs (actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs (entity_type, entity_id);

-- Mention storage: additive nullable columns on the three existing
-- comment/message tables, not a new "mentions" table and not a second
-- comment system. Structured as [{ "userId": "...", "name": "..." }] —
-- userId is what the backend ever trusts for validation/notifications;
-- name is display-only, sourced from the user row at write time so it
-- doesn't need a join to render later.
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS mentions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE issue_comments ADD COLUMN IF NOT EXISTS mentions JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS mentions JSONB NOT NULL DEFAULT '[]'::jsonb;
