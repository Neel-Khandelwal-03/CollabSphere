-- ============================================================
-- CollabSphere — Migration 004: Task Management & Kanban
-- ============================================================

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'testing', 'completed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tasks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id       UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    description      TEXT,
    status           task_status NOT NULL DEFAULT 'backlog',
    priority         task_priority NOT NULL DEFAULT 'medium',
    due_date         DATE,
    estimated_hours  NUMERIC(6,2) CHECK (estimated_hours IS NULL OR estimated_hours > 0),
    created_by       UUID REFERENCES users (id) ON DELETE SET NULL,
    assigned_to      UUID REFERENCES users (id) ON DELETE SET NULL,
    -- 0-based order within its (project_id, status) column, used for
    -- drag-and-drop. Maintained by task.service.js's move logic, never
    -- set directly by a plain UPDATE elsewhere.
    position         INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status_position ON tasks (project_id, status, position);

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS task_comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    user_id    UUID REFERENCES users (id) ON DELETE CASCADE,
    comment    TEXT NOT NULL,
    edited_at  TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments (task_id);

CREATE TABLE IF NOT EXISTS task_labels (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    name         VARCHAR(50) NOT NULL,
    color        VARCHAR(7) NOT NULL DEFAULT '#6E56CF',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_task_labels_workspace_id ON task_labels (workspace_id);

CREATE TABLE IF NOT EXISTS task_label_map (
    task_id    UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    label_id   UUID NOT NULL REFERENCES task_labels (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, label_id)
);

CREATE TABLE IF NOT EXISTS task_attachments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users (id) ON DELETE SET NULL,
    file_name   VARCHAR(255) NOT NULL,
    file_url    TEXT NOT NULL,
    -- Additive beyond the spec's literal column list: mime type and byte
    -- size are what actually let the UI decide whether to render an image
    -- preview vs a generic file icon, and show a human-readable size.
    file_type   VARCHAR(100),
    file_size   INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments (task_id);

-- Task-scoped activity trail (NOT the general cross-entity Activity Logs
-- module from the master spec — that's still a future checkpoint). This
-- exists specifically to back the "Activity Timeline" on the Task
-- Details drawer. Deletion events aren't persisted here: task_id cascades
-- on task delete, so a "deleted" row would vanish in the same instant it
-- was written, and there's no page left to show it on anyway.
CREATE TABLE IF NOT EXISTS task_activity (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    user_id    UUID REFERENCES users (id) ON DELETE SET NULL,
    action     VARCHAR(50) NOT NULL,
    details    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity (task_id, created_at);
