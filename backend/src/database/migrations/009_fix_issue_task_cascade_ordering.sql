-- ============================================================
-- CollabSphere — Migration 009: Fix issue/task cascade-delete ordering hazard
-- ============================================================

-- Found while testing Checkpoint 8: deleting a workspace or project
-- cascades to both tasks and issues in the same transaction (both have
-- ON DELETE CASCADE on project_id). issues.linked_task_id's ON DELETE
-- SET NULL action (fired when a linked task is cascade-deleted) can
-- then race against issues.project_id's own CASCADE action on the same
-- row within that transaction, since a deleted project's issues get
-- removed by one cascade path while a deleted project's tasks trigger
-- a SET NULL update on those same issues via the other path.
--
-- Reproduced directly: DELETE FROM users (which cascades through
-- workspaces -> projects -> tasks/issues) threw "insert or update on
-- table issues violates foreign key constraint issues_project_id_fkey"
-- — a real integrity hazard, reachable through the actual
-- DELETE /api/workspaces/:id and DELETE /api/projects/:id endpoints
-- whenever a project has an issue linked to a task in that same
-- project, not just a testing artifact.
--
-- Standard Postgres fix: make the SET NULL constraint deferrable, so
-- its action resolves at transaction COMMIT rather than immediately
-- per-statement, after every other cascade in the same transaction has
-- already settled.
ALTER TABLE issues DROP CONSTRAINT issues_linked_task_id_fkey;
ALTER TABLE issues
    ADD CONSTRAINT issues_linked_task_id_fkey
    FOREIGN KEY (linked_task_id) REFERENCES tasks (id) ON DELETE SET NULL
    DEFERRABLE INITIALLY DEFERRED;
