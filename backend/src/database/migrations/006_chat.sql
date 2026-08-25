-- ============================================================
-- CollabSphere — Migration 006: Real-Time Chat
-- ============================================================

DO $$ BEGIN
    CREATE TYPE conversation_type AS ENUM ('workspace', 'project', 'direct');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Every conversation belongs to exactly one workspace — even direct
-- messages, since CollabSphere's entire permission model is
-- workspace-membership-based (matching how Slack scopes DMs to a
-- workspace). This lets every chat route reuse the existing
-- requireWorkspaceRole middleware unchanged, the same way Project/Task/
-- Issue already do, instead of inventing a parallel "DM permission"
-- concept.
CREATE TABLE IF NOT EXISTS conversations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type         conversation_type NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    project_id   UUID REFERENCES projects (id) ON DELETE CASCADE,
    -- Only set for type='direct': the pair of participant user IDs,
    -- sorted so (A,B) and (B,A) always store identically. This is what
    -- lets "find or create the DM between these two users" be a single
    -- atomic INSERT ... ON CONFLICT, the same race-safe pattern already
    -- used for workspace/project chat below — rather than a
    -- SELECT-then-INSERT with a lock on a row that may not exist yet to
    -- lock, which doesn't actually stop two truly concurrent callers
    -- from both inserting a duplicate conversation.
    direct_user_min_id UUID REFERENCES users (id) ON DELETE CASCADE,
    direct_user_max_id UUID REFERENCES users (id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT project_conversation_has_project
        CHECK (type <> 'project' OR project_id IS NOT NULL),
    CONSTRAINT non_project_conversation_has_no_project
        CHECK (type = 'project' OR project_id IS NULL),
    CONSTRAINT direct_conversation_has_pair
        CHECK (type <> 'direct' OR (direct_user_min_id IS NOT NULL AND direct_user_max_id IS NOT NULL)),
    CONSTRAINT direct_pair_is_ordered
        CHECK (direct_user_min_id IS NULL OR direct_user_min_id < direct_user_max_id)
);

-- Exactly one workspace-chat conversation per workspace, one project-chat
-- conversation per project, and one direct conversation per participant
-- pair per workspace — all enforced at the database level via partial
-- unique indexes, not just application logic, so a race between two
-- concurrent "get or create" calls can't produce duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_workspace_chat
    ON conversations (workspace_id) WHERE type = 'workspace';
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_project_chat
    ON conversations (project_id) WHERE type = 'project';
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_direct_pair
    ON conversations (workspace_id, direct_user_min_id, direct_user_max_id) WHERE type = 'direct';

CREATE INDEX IF NOT EXISTS idx_conversations_workspace_id ON conversations (workspace_id);

-- Only populated for type='direct'. Workspace/project chat participation
-- is derived live from workspace_members / project assignment (via the
-- same RBAC middleware every other module already uses) rather than
-- mirrored into this table, which would need to be kept in sync on every
-- join/leave/invite-accept for no real benefit.
CREATE TABLE IF NOT EXISTS conversation_participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants (conversation_id);

CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES users (id) ON DELETE SET NULL,
    content         TEXT NOT NULL,
    edited_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages (conversation_id, created_at);

-- Read receipts as "last read pointer per user per conversation" (the
-- Slack/Discord approach) rather than one row per message per recipient
-- — far cheaper at scale, and still fully answers both directions of
-- "read receipts": unread count (messages after last_read_at) and
-- "seen by" (participants whose last_read_at >= a given message).
CREATE TABLE IF NOT EXISTS conversation_reads (
    conversation_id      UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    user_id               UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES messages (id) ON DELETE SET NULL,
    last_read_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);
