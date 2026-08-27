-- ============================================================
-- CollabSphere — Migration 011: Fix the actual mechanism behind the cascade-ordering hazard
-- ============================================================

-- Migration 010 made every SET NULL reference to users deferrable, on
-- the assumption that was the piece needing deferral. Retested against
-- the exact reproduction from before (a workspace owner and an issue's
-- assignee, both deleted in the same statement) and the failure
-- persisted unchanged — migration 010 alone did not fix it.
--
-- The error names issues_project_id_fkey specifically — a CASCADE
-- constraint, not a SET NULL one. The actual mechanism: the SET NULL
-- action on assignee_id fires an UPDATE on the issue row, and that
-- UPDATE re-validates every foreign key defined on the row, including
-- ones on columns it didn't touch — issues_project_id_fkey included.
-- If that CASCADE constraint isn't itself deferrable, it gets checked
-- immediately, before the competing CASCADE-delete path (from the
-- same statement's workspace -> project -> issue chain) has finished,
-- and fails because the project already looks gone from that
-- transaction's perspective.
--
-- Verified directly: making issues_project_id_fkey deferrable (ad hoc,
-- then folded into this migration) resolves the exact reproduction
-- that migration 010 alone did not.
--
-- This means the real fix is the CASCADE constraint, not the SET NULL
-- one — applied here to every table that has both a CASCADE reference
-- to an ancestor (workspace/project/task/issue/conversation) and a
-- SET NULL reference to users, the general shape that produces this
-- hazard. Tables where a user's own rows are CASCADE-deleted rather
-- than SET NULL-updated (task_comments, issue_comments) aren't
-- susceptible — deleting the referenced user removes those rows
-- entirely rather than updating them, so there's no competing UPDATE
-- to race against.
ALTER TABLE activity_logs DROP CONSTRAINT activity_logs_project_id_fkey;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE activity_logs DROP CONSTRAINT activity_logs_workspace_id_fkey;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE files DROP CONSTRAINT files_workspace_id_fkey;
ALTER TABLE files ADD CONSTRAINT files_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE files DROP CONSTRAINT files_project_id_fkey;
ALTER TABLE files ADD CONSTRAINT files_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE issue_attachments DROP CONSTRAINT issue_attachments_issue_id_fkey;
ALTER TABLE issue_attachments ADD CONSTRAINT issue_attachments_issue_id_fkey
    FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE issue_history DROP CONSTRAINT issue_history_issue_id_fkey;
ALTER TABLE issue_history ADD CONSTRAINT issue_history_issue_id_fkey
    FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE issues DROP CONSTRAINT issues_project_id_fkey;
ALTER TABLE issues ADD CONSTRAINT issues_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE messages DROP CONSTRAINT messages_conversation_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE project_members DROP CONSTRAINT project_members_project_id_fkey;
ALTER TABLE project_members ADD CONSTRAINT project_members_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE project_members DROP CONSTRAINT project_members_user_id_fkey;
ALTER TABLE project_members ADD CONSTRAINT project_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE projects DROP CONSTRAINT projects_workspace_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE task_activity DROP CONSTRAINT task_activity_task_id_fkey;
ALTER TABLE task_activity ADD CONSTRAINT task_activity_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE task_attachments DROP CONSTRAINT task_attachments_task_id_fkey;
ALTER TABLE task_attachments ADD CONSTRAINT task_attachments_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE tasks DROP CONSTRAINT tasks_project_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE workspace_invitations DROP CONSTRAINT workspace_invitations_workspace_id_fkey;
ALTER TABLE workspace_invitations ADD CONSTRAINT workspace_invitations_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
