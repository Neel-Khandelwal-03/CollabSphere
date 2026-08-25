-- ============================================================
-- CollabSphere — Migration 005: Issue Tracking
-- ============================================================

DO $$ BEGIN
    CREATE TYPE issue_type AS ENUM (
        'bug', 'feature_request', 'improvement', 'task', 'research',
        'epic', 'documentation', 'performance', 'security', 'technical_debt'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE issue_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE issue_severity AS ENUM ('minor', 'major', 'critical', 'blocker');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE issue_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'reopened');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS issues (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    -- Per-project sequential display number (Project #12, like GitHub/Jira/
    -- Linear) — additive beyond the spec's literal column list. A raw UUID
    -- is unusable as the "Issue ID" the spec asks to display and search by;
    -- this is what a person actually types/reads/references. Assigned the
    -- same way task position was: counted within a transaction at create
    -- time. Immutable after creation.
    issue_number    INTEGER NOT NULL,
    linked_task_id  UUID REFERENCES tasks (id) ON DELETE SET NULL,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    type            issue_type NOT NULL DEFAULT 'bug',
    priority        issue_priority NOT NULL DEFAULT 'medium',
    status          issue_status NOT NULL DEFAULT 'open',
    severity        issue_severity NOT NULL DEFAULT 'minor',
    reporter_id     UUID REFERENCES users (id) ON DELETE SET NULL,
    assignee_id     UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at       TIMESTAMPTZ,

    UNIQUE (project_id, issue_number)
);

CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues (project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_assignee_id ON issues (assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_reporter_id ON issues (reporter_id);
CREATE INDEX IF NOT EXISTS idx_issues_linked_task_id ON issues (linked_task_id);

DROP TRIGGER IF EXISTS trg_issues_updated_at ON issues;
CREATE TRIGGER trg_issues_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS issue_comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id   UUID NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
    user_id    UUID REFERENCES users (id) ON DELETE CASCADE,
    comment    TEXT NOT NULL,
    -- Additive beyond the spec's literal column list, same reasoning as
    -- task_comments in Checkpoint 4: the spec's own COMMENTS section
    -- requires "Edit Own" as a feature, which needs somewhere to record
    -- that an edit happened.
    edited_at  TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments (issue_id);

-- Deliberately NOT creating a separate issue_labels table. The spec's own
-- LABELS section says "Reuse workspace labels from Checkpoint 4 whenever
-- possible. Do not duplicate label infrastructure" — task_labels is
-- already a generic, workspace-scoped (name, color) taxonomy with zero
-- task-specific columns, so it's reused as-is here. Only the join table
-- (issue_id <-> label_id) is new, since that relationship is genuinely
-- different from task_label_map.
CREATE TABLE IF NOT EXISTS issue_label_map (
    issue_id   UUID NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
    label_id   UUID NOT NULL REFERENCES task_labels (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (issue_id, label_id)
);

CREATE TABLE IF NOT EXISTS issue_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id     UUID NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
    action       VARCHAR(50) NOT NULL,
    performed_by UUID REFERENCES users (id) ON DELETE SET NULL,
    old_value    TEXT,
    new_value    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_issue_history_issue_id ON issue_history (issue_id, created_at);
