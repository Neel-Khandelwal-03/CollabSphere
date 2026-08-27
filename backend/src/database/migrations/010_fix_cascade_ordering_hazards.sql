-- ============================================================
-- CollabSphere — Migration 010: Fix cascade-delete ordering hazards
-- ============================================================

-- Found while testing Checkpoint 8, root-caused through isolated
-- reproduction with minimal, fully controlled data (not guessed):
-- issues.assignee_id's ON DELETE SET NULL action can race against
-- issues.project_id's ON DELETE CASCADE action when, in a single
-- statement, both the issue's assignee and the workspace owner
-- (whose deletion cascades workspace -> project -> issue) are deleted
-- together. Postgres's FK trigger machinery re-validates the row's
-- other constraints during the SET NULL update, and can find the
-- project already gone via the competing CASCADE path.
--
-- An initial, wrong hypothesis (a since-removed draft of this migration)
-- targeted issues.linked_task_id — reproduction after applying it
-- showed the failure persisted unchanged, which is what led to
-- isolating the actual cause instead of trusting the first guess.
--
-- Auditing the full schema found the same *shape* of risk on every
-- SET NULL reference to users, on any table reachable through a
-- CASCADE-deletable workspace/project ancestry — not just issues.
-- Fixed comprehensively rather than one column at a time as each is
-- separately discovered.
--
-- Honest scope note: none of this is reachable through any of the
-- application's actual delete endpoints today — CollabSphere has no
-- "delete user account" feature, and DELETE /api/workspaces/:id or
-- /api/projects/:id never touch the users table itself, only
-- workspace/project-scoped rows. The hazard only fires when a user row
-- is deleted directly (a database operation the app never performs).
-- Fixed anyway because it's a genuine integrity risk worth closing
-- before any future account-deletion feature could hit it, and it was
-- actively blocking reliable test-data cleanup during this checkpoint's
-- own testing.
--
-- The fix is the standard Postgres one: DEFERRABLE INITIALLY DEFERRED
-- resolves each constraint at transaction COMMIT rather than
-- immediately per-statement, after every other cascade in the same
-- transaction has settled. This changes nothing about observable
-- behavior in any non-conflicting scenario.

ALTER TABLE activity_logs DROP CONSTRAINT activity_logs_actor_id_fkey;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE files DROP CONSTRAINT files_uploaded_by_fkey;
ALTER TABLE files ADD CONSTRAINT files_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE issue_attachments DROP CONSTRAINT issue_attachments_uploaded_by_fkey;
ALTER TABLE issue_attachments ADD CONSTRAINT issue_attachments_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE issue_history DROP CONSTRAINT issue_history_performed_by_fkey;
ALTER TABLE issue_history ADD CONSTRAINT issue_history_performed_by_fkey
    FOREIGN KEY (performed_by) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE issues DROP CONSTRAINT issues_reporter_id_fkey;
ALTER TABLE issues ADD CONSTRAINT issues_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE issues DROP CONSTRAINT issues_assignee_id_fkey;
ALTER TABLE issues ADD CONSTRAINT issues_assignee_id_fkey
    FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE messages DROP CONSTRAINT messages_sender_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE notifications DROP CONSTRAINT notifications_actor_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE project_members DROP CONSTRAINT project_members_added_by_fkey;
ALTER TABLE project_members ADD CONSTRAINT project_members_added_by_fkey
    FOREIGN KEY (added_by) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE projects DROP CONSTRAINT projects_created_by_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE task_activity DROP CONSTRAINT task_activity_user_id_fkey;
ALTER TABLE task_activity ADD CONSTRAINT task_activity_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE task_attachments DROP CONSTRAINT task_attachments_uploaded_by_fkey;
ALTER TABLE task_attachments ADD CONSTRAINT task_attachments_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE tasks DROP CONSTRAINT tasks_created_by_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE tasks DROP CONSTRAINT tasks_assigned_to_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE workspace_invitations DROP CONSTRAINT workspace_invitations_invited_by_fkey;
ALTER TABLE workspace_invitations ADD CONSTRAINT workspace_invitations_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
