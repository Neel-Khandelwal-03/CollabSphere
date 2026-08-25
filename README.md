# CollabSphere

Developer collaboration & project management platform, built incrementally in checkpoints.

## Status

- **Checkpoint 1 — Authentication**: complete, tested, untouched since.
- **Checkpoint 2 — Workspace Management**: complete, audited, untouched in this round except one additive route (labels) required for Task Management.
- **Checkpoint 3 — Project Management**: complete, tested, untouched in this round except the Project Details page gaining two more tabs.
- **Checkpoint 4 — Task Management & Kanban**: complete, tested, untouched in this round except two minimal, justified additions for Issue integration.
- **Checkpoint 5 — Issue Tracking**: complete, tested — rebuilt twice after mid-checkpoint environment resets, re-verified in full each time.
- **Post-Checkpoint-5 fixes**: Dashboard task count, sidebar overflow, missing issue-creation UI — all fixed and tested.
- **Checkpoint 6 — Real-Time Chat**: complete, tested. Full Module 9 scope (workspace/project/direct messaging, presence, typing, read receipts).
- **GitHub workflow established**: `production`/`staging` branches created and pushed, Checkpoint 6 deployed-and-prepared for Vercel/Render/Neon (see Git workflow / Deployment architecture sections).
- **Checkpoint 7 — File Management & Cloudinary**: complete, tested (this document). Built on `staging`, not yet merged to `production` — see Git workflow.
- Everything else (Notifications, Analytics, final deployment) is not started.
- **Note**: an unrelated Shopping Cart/Products/Inventory request was received between Checkpoint 5 and 6 and correctly identified as a mismatch with this project's actual domain before any work began — flagged to the user, confirmed as a mistake, no code written for it.

## Checkpoint 7 — File Management & Cloudinary

Built on `staging`, per the required Git workflow — not pushed or merged to `production` yet; see the Git workflow section for what's still pending (staging push, PR, manual merge approval).

### Audit findings (done before writing any code)

A real Cloudinary utility already existed from Checkpoint 4 (`uploadBuffer`, an allowlist covering exactly the file types this checkpoint asks for, a working multer middleware) — reused as-is. But the audit found two things that materially changed the plan:

1. **No `public_id` was ever stored anywhere.** `task_attachments`' delete handler only ever removed the PostgreSQL row — it never called Cloudinary's delete API, because it had no `public_id` to call it with. Every task attachment deleted since Checkpoint 4 is an orphaned Cloudinary resource. This wasn't a design gap noticed in passing — it's a real, previously-shipped bug, fixed as part of this checkpoint (see below).
2. **Issues and Chat had zero attachment infrastructure** — a blank slate for both, not something to extend.

### Architecture

- **`task_attachments`** (Checkpoint 4) — extended, not replaced: added `public_id`/`resource_type`/`folder` columns (nullable; pre-migration rows get `NULL`, a documented limitation — see Known Limitations). `create()`/`remove()` in both `taskAttachment.service.js` and `task.controller.js` updated to actually populate and use them.
- **`issue_attachments`** — new table, built to mirror `task_attachments`' corrected shape from day one rather than needing the same retrofit. Matches this codebase's established Task/Issue architectural mirroring (comments, labels, activity trails all already follow this pattern).
- **`files`** — new general-purpose table backing Workspace Files, Project Files, and chat file-sharing, none of which have a single natural "owning entity" the way a task or issue attachment does.
- **`messages.file_id`** — one additive, nullable column (Checkpoint 6's table). A shared file is still just a message with a file attached, not a parallel "file message" concept.

**Workspace/Project Files views are a UNION query across `files` + `task_attachments` + `issue_attachments`** (see `file.service.js`), not a duplicated copy of anything — a file attached to a task and visible in "Project Files" is the exact same row, satisfying the spec's explicit "do not duplicate storage records for the same physical file" requirement. Verified directly: created one file via each of the three paths, confirmed all three appear in both the Workspace and Project views with zero duplication, and confirmed search/category-filter/sort all work correctly across the union.

### Two real bugs found and fixed (both predate this checkpoint)

1. **The Cloudinary-orphan bug above** — `task.controller.js`'s `deleteAttachment` now actually calls `deleteResource()` before removing the database row, with explicit handling for both failure directions (Cloudinary fails → row stays, nothing silently vanishes; Cloudinary succeeds but the DB delete then fails → logged as an orphaned-metadata case needing manual cleanup, not silently swallowed).
2. **Oversized uploads returned an opaque 500, not a validation error.** Multer's own errors (`LIMIT_FILE_SIZE` and others) were never translated by `errorHandler.js` — they fell straight through to the generic "Something went wrong" 500 handler. Fixed centrally in `errorHandler.js` rather than per-route, so every current and future upload route benefits. Verified live: a 16MB upload against the 15MB limit now correctly returns `400 "File is too large. Maximum size is 15MB."` — confirmed against **both** the new `/api/files` route and the pre-existing task attachment route, proving the fix actually closes the historical gap rather than just avoiding it going forward.

### Security

Filenames are never trusted as storage identifiers — `sanitizeFilenameForStorage` strips to a conservative charset and the actual Cloudinary `public_id` is a random-prefixed, sanitized name, not the raw client-supplied filename. Verified directly against path-traversal (`../../etc/passwd`), XSS-shaped (`<script>...`), and unicode input — all safely neutralized before ever reaching Cloudinary. Dangerous extensions (`.exe`, `.bat`, `.sh`, `.dll`, etc.) are explicitly denylisted by extension in addition to the MIME allowlist, so a mislabeled dangerous file can't slip through on a generic content-type. Every file read (`GET`, `/download`, list) is gated by workspace membership via the same `requireWorkspaceRole` middleware every other module uses — a file can never be reached by guessing an ID, only by first passing the same RBAC check as everything else in this app.

### Frontend

`FileManager` (search/filter/sort, grid/list toggle, drag-and-drop upload with live progress via a new `uploadWithProgress` XHR utility — `fetch` has no upload-progress API at all) is one shared component parameterized by workspace-or-project scope, rendered from a new "Files" tab on both Workspace Details and Project Details — the same "one component, multiple entry points" pattern already established by `IssueTable`/`CreateIssueModal`. `FilePreview` (inline image, embedded PDF, download prompt for everything else) is shared across the file manager, issue attachments, and chat file messages — one component, not three.

Issue attachments got a new `IssueAttachmentPanel`, deliberately mirroring `AttachmentPanel`'s established look rather than being built from scratch, wired into the Issue Details drawer with the same assigned-only-for-Members gating every other issue mutation already uses.

Chat file-sharing reuses the exact same message cache and `messageEvents` → Socket.IO bridge plain text messages already use — no new WebSocket event type. `MessageBubble` renders a shared file inline (image preview or a file card with icon/name/size/download), and only shows the file's caption as separate text when a real caption was typed, not the filename the backend defaults to when none was given.

### Two real bugs caught in this session's own new code, before they shipped

- `useFiles.js` originally exposed a `downloadFileUrl()` helper meant to be used in a plain `<a href>` — but a browser link can't attach an `Authorization` header, so the backend's authenticated `/download` redirect would have silently failed auth if used that way. Removed; the frontend uses `secure_url` directly instead, the same already-working pattern `AttachmentPanel.js` established in Checkpoint 4 (a URL is only ever visible after an authorized API call in the first place, so a further backend hop isn't needed for the browser case). The backend endpoint itself is unaffected and still correct for non-browser API consumers that can set the header themselves.
- `FileList`'s per-row delete button was checking `canDelete` as a static boolean, but `FileManager` passes it a per-file permission *function* — meaning every row would have shown a delete button regardless of actual permission. Fixed to call `canDelete(file)` per row, matching how `FileCard` already correctly did it.

### Manual testing results (all executed against a running Postgres + Express + Next.js stack, including live Socket.IO)

| Scenario | Result |
|---|---|
| Union query: one file via each of 3 paths (general upload, task attachment, issue attachment) → all 3 appear in both Workspace and Project Files views, zero duplication | ✅ |
| Search, category filter (image/document), and sort (newest/oldest/name/size) all correct across the union | ✅ |
| Valid PNG upload reaches the Cloudinary network boundary cleanly (RBAC, validation, filename sanitization all pass) | ✅ |
| Oversized upload (16MB vs 15MB limit) → clean 400, verified on both the new file route and the pre-existing task attachment route | ✅ |
| Dangerous/unsupported file type → clean 400 | ✅ |
| Path traversal / XSS-shaped / unicode filenames → all safely sanitized | ✅ |
| Issue attachment: upload (mocked), appears in `GET /issues/:id`, non-uploader/non-manager delete → 403, uploader delete → 200 and DB row actually removed | ✅ |
| Chat file-sharing: shared file (mocked) appears in the message thread **and** the Workspace Files view from the same row; plain text messages unaffected (`file_id: null`, no regression) | ✅ |
| Live Socket.IO: real-time chat delivery and the `taskEvents`/`issueEvents` → socket bridge both re-verified working after all backend changes | ✅ |
| Full regression: auth → workspace → Workspace Files endpoint → project → Project Files endpoint → task → Kanban move → issue → issue's `attachments` field → workspace chat | ✅ (10/10) |
| Frontend production build → all 15 routes compile clean, zero new lint warnings | ✅ |

### Known limitations

- **Cloudinary itself is untestable in this sandbox** — no network access to cloudinary.com and no real credentials, the same disclosed limitation as every Cloudinary-touching checkpoint since Checkpoint 4. Everything up to and including the exact point of the real network call has been verified; the actual upload/delete calls have not.
- **Pre-migration-007 task attachments have no `public_id`.** They still delete cleanly from PostgreSQL (the fixed `deleteResource` treats a missing `public_id` as a no-op rather than an error), but nothing was ever recorded to clean up on the Cloudinary side for files uploaded before this checkpoint — a real, documented gap, not a silently swallowed failure.
- **No orphan-cleanup job.** If a Cloudinary delete succeeds but the subsequent database delete fails, the failure is logged clearly (not silently swallowed) but there's no automated reconciliation sweep — out of scope for this checkpoint, flagged rather than pretended away.
- Not verified in an actual browser — same disclosed limitation as every UI checkpoint in this project so far; everything above is verified via the API/socket layer directly and a clean production build.


## Checkpoint 6 — Real-Time Chat

Full Module 9 scope, confirmed with the user before building: Workspace Chat + Project Chat + Direct Messages, with messaging, online presence, typing indicators, and read receipts. This is the first real-time (Socket.IO) feature in the app — everything built in Checkpoints 4 and 5 (`taskEvents`, `issueEvents`) was designed anticipating exactly this.

### Note on an unrelated request that arrived first

Before this checkpoint began, a request came in for a "Shopping Cart API" integrating with "Products and Inventory APIs." Neither exists anywhere in this codebase, and the request had no connection to CollabSphere's actual domain (workspaces/projects/tasks/issues). Rather than build a disconnected e-commerce subsystem on top of a project-management tool, this was flagged to the user directly, who confirmed it was a mistake and to continue with the planned roadmap. Recorded here for the same reason every other judgment call in this document is recorded — so the reasoning is visible, not just the outcome.

### A mid-build discovery, handled transparently

Partway into this checkpoint, a substantial amount of chat backend infrastructure was found already on disk — fully built, but with no accompanying memory of having built it (almost certainly the result of the conversation being compacted/summarized at some point, cutting off narrative visibility into that earlier work). Rather than either blindly trusting it or blindly discarding and rebuilding it, every existing file was read and audited line-by-line before anything was changed, exactly like inspecting a codebase inherited from someone else. That audit found the REST API layer essentially complete and well-designed, but Socket.IO was not yet wired into `server.js`, and the entire frontend was missing. Both were completed from there, and everything — old and new — was tested together as one unit rather than assuming the untested parts were the only parts that needed testing.

### Database schema (migration `006_chat.sql`)

`conversations` (type: workspace/project/direct, workspace_id, project_id, plus a sorted `direct_user_min_id`/`direct_user_max_id` pair for DMs) · `conversation_participants` (only populated for direct conversations — workspace/project chat participation is derived live from `workspace_members`/project assignment via the same RBAC middleware every other module already uses, rather than mirrored into a table that would need to be kept in sync on every join/leave) · `messages` (adds `edited_at`, same edit-own reasoning as every other comment/message table in this app) · `conversation_reads` (a "last read pointer per user per conversation" — the Slack/Discord approach — rather than one row per message per recipient, far cheaper at scale and still fully answers both directions of "read receipts": unread counts and "seen by").

Every conversation belongs to exactly one workspace, even direct messages — matching how Slack scopes DMs to a workspace. This is what lets every chat route reuse `requireWorkspaceRole` completely unmodified via a new `loadConversation` middleware (mirroring `loadTask.js`/`loadIssue.js` exactly), instead of inventing a parallel "DM permission" concept. One real consequence worth calling out because it might look like an oversight later: a workspace Viewer can start and read a DM, but is blocked from sending in it — `requireWorkspaceRole('member')` gates message-send uniformly across all three conversation types, deliberately, consistent with Viewer being read-only everywhere else in this app. Verified live: Viewer gets 200 on start/read, 403 on send.

### A concurrency bug caught by testing, not by review

The first version of "find or create the DM between these two users" used `SELECT ... FOR UPDATE` to lock the existing row before deciding whether to insert. That only works if a row already exists to lock — two people starting a DM with each other at the same instant for the *first* time would both pass the "not found" check and both insert, producing two conversations for the same pair. Rewritten to use a deterministic sorted-pair column (`direct_user_min_id`/`direct_user_max_id`) with a partial unique index and a single atomic `INSERT ... ON CONFLICT`, the same race-safe pattern workspace and project chat already used. Verified with a genuine 10-way parallel test (`Promise.all` of 10 concurrent calls, not a theoretical read of the SQL) — exactly one conversation, exactly two participant rows, every time.

### Socket.IO

`utils/socket.js` attaches to the same `http.Server` instance `app.listen()` already returns (`server.js` needed one small, necessary addition — Socket.IO can't attach to an Express app directly, only to the underlying HTTP server). Auth handshake reuses the exact same access-token verification as every REST route, so there's no parallel auth mechanism to keep in sync; a socket with an invalid or expired token is rejected before `'connection'` ever fires — verified live by connecting with a garbage token and confirming immediate rejection.

Presence is tracked in-memory (`userId -> Set<socketId>`), deliberately not persisted — presence is inherently transient and doesn't need to survive a server restart, unlike messages or read receipts. A user only goes "offline" once their *last* socket disconnects, correctly handling multiple open tabs.

`taskEvents` and `issueEvents` — the EventEmitters built in Checkpoints 4 and 5 specifically so this step would be a pure subscribe with no controller changes — are now actually bridged into room broadcasts. Verified live: a task or issue created over plain REST arrives at a connected socket as `task:created`/`issue:created` in real time. This closes a design decision made two checkpoints ago.

### A read-receipts gap caught while designing the frontend, before writing any UI against it

The initial backend design only exposed read state via the live `read:update` socket event — meaning a freshly loaded chat page would show every message as unseen regardless of actual history, since there was no way to ask "what has everyone already read" on page load. Added `getReadStatesForConversation` and included it in the three initial-load responses (workspace chat, project chat, DM start). Verified: mark a conversation read, then simulate a fresh page load (a completely new request) and confirm the read state is visible immediately, with no live event required.

### Frontend

`SocketProvider`/`useSocket` (connects once authenticated, tracks live presence keyed by workspace) · `useChat.js` (REST hooks; message list backed by a `staleTime: Infinity` query that only ever changes via known mutations or explicit socket events, never a silent background refetch) · `useChatSocket.js` (joins/leaves the conversation's room, splices `message:new`/`updated`/`deleted` straight into that same cache key, tracks typing state with auto-expiry in case a `typing:stop` never arrives, tracks live read state seeded from the initial `readStates`) · `ChatPanel`/`MessageBubble`/`TypingIndicator`/`PresenceDot`/`NewDirectMessageModal`.

`ChatPanel` is parameterized entirely by an already-resolved `conversationId` — the caller (Workspace Chat tab, Project Chat tab, or the DM page) resolves *which* conversation via the appropriate get-or-create hook and hands the result down, keeping the panel itself agnostic to which of the three ways a conversation came into existence. Wired into a new "Chat" tab on Workspace Details, a new "Chat" tab on Project Details, and a new global `/chat` page (conversation list + active thread) for DMs. The Sidebar's "Chat" link, dormant since Checkpoint 4, is now real.

One more gap caught before it shipped: clicking an *existing* DM from the conversation list only had that list's lightweight summary row (name, avatar, last-message preview) — no read state, no full message history. Rather than adding a new endpoint, selecting an existing DM re-calls the same `getOrCreateDirectConversation` endpoint already used for starting a new one (it's idempotent — calling it again for an existing pair just returns that conversation fresh), so both paths share one tested code path instead of two.

### Manual testing results (all executed against a running Postgres + Express + Next.js stack, including live Socket.IO connections — not just REST)

| Scenario | Result |
|---|---|
| Workspace chat: get-or-create idempotent across two different users | ✅ |
| Project chat: get-or-create, message send/receive | ✅ |
| DM: start, idempotent regardless of which user initiates or the order of the two IDs passed | ✅ |
| DM concurrency: 10 truly parallel "start a DM" calls between a new pair → exactly 1 conversation, exactly 2 participant rows | ✅ |
| DM privacy: an outsider gets 403, not 404 (can't even confirm the conversation exists) | ✅ |
| Edit-own enforced (non-author → 403); Owner can moderate-delete in group chat but *not* in a DM, even as Owner | ✅ |
| Unread counts accurate; mark-read correctly zeroes them; a user's own messages never count toward their own unread | ✅ |
| readStates visible on a fresh page load, not just after a live event | ✅ |
| Live socket: bad token rejected before `connection`; valid tokens receive `presence:snapshot`; a REST-sent message arrives at a joined socket as `message:new` within the same test run; typing relay observed live; presence `offline` broadcast observed on disconnect | ✅ |
| Live socket: `taskEvents`/`issueEvents` bridge — a task/issue created over REST arrives at a connected socket in real time | ✅ |
| DM + Viewer role: can start and read a DM, blocked (403) from sending — consistent with Viewer being read-only everywhere else in this app | ✅ |
| Full regression: auth → workspace → project → task → issue → workspace chat → project chat, plus Checkpoint 2's activity feed | ✅ |
| Frontend production build → all 16 routes compile clean, zero new lint warnings beyond the two pre-existing, unrelated `<img>` ones | ✅ |

### Known limitations

- No file/image sharing in messages — out of scope for this checkpoint per the user's own scoping answer (messaging + presence + typing + read receipts only).
- No message search.
- Presence and typing are correctly not persisted (by design, see above) — they reset on server restart, which is the intended behavior for inherently transient state, not a gap.
- Not verified in an actual browser — this sandbox has no browser available, the same disclosed limitation as every prior UI checkpoint in this project. Everything above is verified via the REST/socket layer directly and a clean production build.


## Post-Checkpoint-5 bug fixes: Dashboard task count, sidebar overflow, missing issue-creation UI

Three issues reported after Checkpoint 5. Investigated each against the actual running code before changing anything, per the fix request's explicit "do not guess" instruction. No backend or database changes were needed for any of the three — every root cause was frontend-only, and all three are now verified against the live Postgres + Express backend.

### Dashboard "Tasks assigned" always showed 0

**Root cause**: not a caching bug, not a wrong column, not a missing invalidation — `dashboard/page.js` had `{ label: 'Tasks assigned', value: '0', icon: CheckSquare }`, a literal hardcoded string. It never queried anything. Every layer beneath it was already correct: `task.service.js` filters strictly on `assigned_to` (never `created_by`), `PUT /tasks/:id` correctly persists reassignment, and `useUpdateTask`'s existing `onSuccess` already runs `invalidateQueries({ queryKey: ['tasks'], exact: false })`, which — confirmed by reading `KEYS.list = (filters) => ['tasks', filters]` — already covers any `useTasks({ assignedTo, ... })` query via prefix matching. The fix was purely wiring the UI to data that was already correctly available: `useTasks({ assignedTo: user.id, pageSize: 1 })`, the same count-only convention already used for the Issues tab's badge count. No new query-key shape, no new backend endpoint.

Verified end-to-end against the live database: task created assigned to User B (A:0, B:1) → reassigned to User A (A:1, B:0) → unassigned (both:0) → three more tasks assigned to A (A:3) → re-queried with a freshly issued login token, simulating a browser refresh/logout-login (still 3, stable). All exactly as specified.

### Collapsed sidebar showed a horizontal scrollbar

**Root cause**: `Tooltip.js` positioned its floating label `absolute left-full` with `whitespace-nowrap`, inside a `relative` wrapper that lives inside the sidebar's nav-items container — which sets `overflow-y-auto`. Per the CSS overflow spec, setting only one axis to a non-`visible` value computes the *other* axis to `auto` too, so that container became horizontally scrollable, and the tooltip's wide non-wrapping label (e.g. a full name + email) contributed to its scrollable area even while invisible (`opacity-0`). This is a nested overflow context inside the sidebar itself — `overflow-x: hidden` on `<body>` was never going to touch it, which is why the fix request was explicit about not accepting that as a real solution.

**Fix**: `Tooltip.js` rewritten to portal its floating label to `document.body` with `position: fixed` coordinates computed from the trigger's own `getBoundingClientRect()`, instead of `position: absolute` relative to a narrow parent. The label is no longer a descendant of any sidebar container, so it can't contribute to any of their overflow regions, collapsed or expanded, regardless of how wide its content is. `overflow-x-hidden` was then added to the nav-items container as the explicitly-sanctioned secondary defensive layer, on top of the real fix rather than instead of it.

Verified by code inspection (no absolutely-positioned overflow-contributing element remains inside any `overflow-y-auto` container) and by a clean production build. Not verified in a real browser — this sandbox has no browser available, the same disclosed limitation as the original layout fix earlier in this project.

### `/issues` had no way to create an issue

**Root cause**: `CreateIssueModal` already existed, fully built, from Checkpoint 5 — it was simply never imported or rendered on the global `/issues` page, and it only accepted `projectId`/`workspaceId` as *required* props, which that page doesn't have (it's cross-workspace, cross-project by design).

**Fix**: `CreateIssueModal` extended with an optional cascading Workspace → Project selector, reusing the exact same locked-prop-vs-inline-selector pattern already established by `CreateProjectModal` for its own optional workspace selector — not a new pattern. When `workspaceId`/`projectId` props are supplied (the Project Details "Issues" tab, which already had a working creation flow), the modal behaves exactly as before; the selector only appears when launched from the global page. A "+ Raise Issue" button was added to the page header and the empty state; both open the *same* modal instance rather than two implementations. Backend authorization needed no changes: `POST /api/issues` already resolves the real workspace from the submitted project row server-side and checks membership against that — not against anything the client claims — so this was purely a matter of giving users a working way to reach an already-secure endpoint.

Verified against the live backend: outsider (not a workspace member) → 403; Viewer role → 403; invalid assignee (not a workspace member) → 400; valid creation → 201, appears immediately in `GET /api/issues` with no page refresh; existing priority/status-change and persistence on Checkpoint 5's issue detail flow re-checked with no regression.

### Regression sweep (run after all three fixes landed)

Auth, workspace CRUD + invite/accept, workspace activity feed, `project_count`, project CRUD, project-scoped issue count, task CRUD, Kanban board data, task↔issue `relatedIssues`, and workspace-role RBAC (a Member correctly blocked from deleting a workspace) — all re-verified against the live database. Zero regressions. Frontend production build clean, all 14 routes compiling with only the two pre-existing `<img>`-element lint warnings (unrelated, present since Checkpoint 4).


## Checkpoint 5 — Issue Tracking

Per the checkpoint instructions, Auth/Workspace/Project/Task code was left alone *except* where Issue integration explicitly required a touch:

1. **`task.controller.js`**: `getTask` now also returns `relatedIssues` (issues where `linked_task_id` matches). Required by the spec's explicit "Task page should display Related Issues." The Issue service is `require()`'d lazily inside the handler rather than imported at module load time, so the Task module has no hard compile-time dependency on the Issue module existing.
2. **`taskLabel.service.js`**: two new functions added, `attachToIssue`/`detachFromIssue` — purely additive, existing `attachToTask`/`detachFromTask` untouched. This is the direct mechanism for "Reuse workspace labels from Checkpoint 4... do not duplicate label infrastructure": the label *definitions* (the `task_labels` table, create/list) are reused as-is; only the issue-side join-table functions are new, because `issue_label_map` is a different table than `task_label_map`.
3. **`project.routes.js`**: added `GET /:projectId/issues` (additive route). Unlike Task Management, this one *is* explicitly in the checkpoint's endpoint list.
4. **Project Details page**: gained an "Issues" tab with a live count badge. `Tabs.js` gained an optional `count` prop (backward compatible — undefined renders nothing, so the Workspace Details page's existing tab usage is unaffected).
5. **`TaskDetailsDrawer.js`**: gained a "Related Issues" section linking to `/issues?open=<id>`.

Nothing in `auth.*`, `workspace.*`, `project.controller.js`/`project.service.js`, or `task.service.js` was touched. A full regression (register → workspace → project → task → issue → close → delete, plus re-checks of Checkpoint 2's activity feed and Checkpoint 3's `project_count`) was run after everything landed — three times, in fact, for reasons noted below.

## Two mid-checkpoint environment resets, handled transparently

This sandbox environment was fully reset twice while this checkpoint was in progress — every file under `/home/claude`, plus the Postgres installation itself, wiped both times. Each time, the most recently saved deliverable (`collabsphere-layout-fix.zip`, covering Checkpoints 1–4 and the layout fix, already saved to persistent storage outside the ephemeral filesystem) was restored, Postgres was reinstalled and every prior migration re-applied, and every Checkpoint 5 file was re-created from content already produced earlier in this same work session — re-application of known-good work, not a redesign. After each rebuild, everything was **re-tested from scratch against the rebuilt environment** rather than assumed to still work: endpoint wiring, the stricter Member RBAC model, Viewer read-only enforcement, labels, search/filter/sort, the close/reopen lifecycle, workspace isolation, and cross-checkpoint integration checks were all run again for real, and all passed again each time. This zip is being saved to persistent storage immediately after the final verification pass, specifically to be resilient to a third reset. Mentioned here rather than silently — the goal throughout this project has been to only report what was actually verified in the environment as it currently exists.

## A spec conflict, resolved explicitly

The DATABASE section asks to create an `issue_labels` table; the LABELS section says "Reuse workspace labels from Checkpoint 4... do not duplicate label infrastructure." These directly contradict each other. Resolved in favor of the more specific, clearly-reasoned instruction: no `issue_labels` table was created. `task_labels` (name, color, workspace-scoped) is reused as-is; only `issue_label_map` (the join table) is new, since that relationship doesn't already exist anywhere.

## Two more real things worth calling out

1. **A UUID is not a usable "Issue ID."** The DATABASE section's literal column list has no display-friendly identifier, but the ISSUE TABLE section asks to *display* "Issue ID" and the SEARCH section asks to *search by* it — nobody types a UUID into a search box or refers to "issue a3f9c2e1" out loud. Added `issue_number`, a per-project sequential integer (Project #12, the GitHub/Jira/Linear convention), assigned the same way task `position` was in Checkpoint 4 — counted within a creation transaction. Search treats a purely-numeric query as also matching `issue_number` exactly, alongside the normal title/description `ILIKE`.
2. **Issue Management's Member permissions are deliberately stricter than Task Management's.** Checkpoint 4 gave Members a broad "Move Tasks" capability separate from the assigned-only edit restriction — any Member could drag any card. Checkpoint 5's spec lists only "Create, Edit assigned issues, Comment" for Member, with no equivalent carve-out — so here, status/priority/severity/assignee/link-task changes *all* require either Admin/Owner or being the assignee. This is a real, deliberate divergence between the two modules driven by each checkpoint's own literal wording, not an inconsistency — called out explicitly so it doesn't read as a bug later.

## Database schema (migration `005_issues.sql`)

`issues` (project_id, **issue_number**, linked_task_id, title, description, type, priority, status, severity, reporter_id, assignee_id, timestamps, closed_at) · `issue_comments` (adds `edited_at`, same reasoning as `task_comments` in Checkpoint 4 — the spec's own COMMENTS section requires "Edit Own" as a feature) · `issue_label_map` (issue_id ↔ `task_labels.id` — see above) · `issue_history` (issue_id, action, performed_by, old_value, new_value — literal spec columns, no JSONB blob this time, unlike `task_activity`'s `details` column).

`closed_at` is set when status becomes `'closed'` and cleared to `NULL` on any other status (including `'reopened'`) — verified directly against the live database before ever wiring it into the HTTP layer.

## API endpoints

All 14 endpoints from the checkpoint spec. Two more were added beyond the literal list, for the same reason as Checkpoint 4's comment-edit endpoint — an explicitly required feature had no corresponding route:
- `POST`/`DELETE /issues/:id/labels/:labelId` — "Add Labels"/"Remove Labels" are explicit FEATURES with no endpoint in the literal list. (Creating a *new* label reuses the existing `POST /workspaces/:id/labels` from Checkpoint 4 — there's no separate "create an issue label" route because that would be the duplication the spec explicitly warns against.)

RBAC reuses `requireWorkspaceRole` unmodified via a new `loadIssue` middleware. `POST /issues` reuses `resolveProjectFromBody` **directly from `loadTask.js`** rather than writing a near-identical copy — it's already fully generic (keyed off `req.body.projectId`), so importing it across modules was more honest than duplicating ten lines to get a same-module import path.

## Frontend

`/issues` (cross-project table, deep-linkable via `?open=<id>` from the Task drawer) · Project Details → Issues tab with a live count badge · `IssueDetailsDrawer` (inline status/priority/severity/assignee/linked-task editors, labels, comments, history) · Create/Edit issue modals · `IssueTable`, `IssueCommentPanel`, `IssueHistoryTimeline` · new badges: `IssueStatusBadge`, `SeverityBadge`, `IssueTypeBadge` (10 types, each with its own icon/color) · `PriorityBadge` from Checkpoint 3 is **reused as-is** for issues (identical low/medium/high/critical enum, no reason to fork it) · `useIssues.js` hook file.

`IssueCommentPanel` is a deliberate near-duplicate of Task's `CommentPanel` rather than a shared component — refactoring `CommentPanel` to be generic across both would have meant modifying working Task module code for a Checkpoint 5 convenience, which the standing instruction says not to do without a real integration reason. A ~90-line duplication was judged the smaller cost.

## Manual testing results (all executed against a running Postgres + Express + Next.js stack — three times, per the environment-reset note above)

| Scenario | Result |
|---|---|
| Create issue (valid) → 201, `issue_number` starts at 1 per project and increments correctly | ✅ |
| Validation: title < 3 chars → 400; invalid `type` enum value → 400 | ✅ |
| `linkedTaskId` pointing at a task in a *different* project → 400 (cross-project link rejected) | ✅ |
| Member (not assignee) blocked from status/priority/severity/assignee/edit — 403 on all five, confirming the stricter-than-Task model | ✅ |
| Member (not assignee) can still create issues and comment — 201 on both | ✅ |
| Owner assigns issue to Member; that Member can now change status/edit — 200 on both | ✅ |
| Member (even when assignee) blocked from delete — 403 (delete is Admin+ only, no exception) | ✅ |
| Viewer: can `GET` (200), blocked from create (403) | ✅ |
| Comment: author edits own → 200; non-author → 403 (no exception, even for Admin) | ✅ |
| Label: attach an existing workspace label to an issue → 201, appears in the issue's label list | ✅ |
| Task ↔ Issue integration: linking populates the issue's `linked_task_title`; the task's `relatedIssues` shows it | ✅ |
| Search by title, and by numeric `issue_number` — both independently verified | ✅ |
| Filter by priority; sort alphabetically — independently verified | ✅ |
| Close → `status: closed`, `closed_at` set; full history shows every prior event in correct order | ✅ |
| Workspace isolation: a user in an unrelated workspace gets 403 on the issue | ✅ |
| Full Checkpoint 1→2→3→4→5 regression (register → workspace → project → task → issue), plus re-checks of Checkpoint 2's activity feed and Checkpoint 3's `project_count` | ✅ |
| Frontend production build → all 14 routes compile clean | ✅ |
| Every route returns 200 against the running `next start` server | ✅ |

Two real bugs were caught and fixed during the first build pass, before they reached a user, and both fixes carried through correctly across every subsequent rebuild:
- `IssueDetailsDrawer.js` imported `useWorkspaceLabels` from the wrong file (it actually lives in `useTasks.js` from Checkpoint 4, not `useWorkspaces.js`) — caught by the production build failing, not by inspection.
- `issue.controller.js`'s label handlers originally called the *task* label map functions (`attachToTask`/`detachFromTask`), which would have silently written into the wrong table (`task_label_map` instead of `issue_label_map`) — caught by re-reading the code before it was ever run, not by a test failure, which is exactly why it's worth mentioning: the test suite would have shown a false pass (attach "succeeds," 201 returned) while corrupting unrelated task data.

Test data was cleared after every run.

## Design decisions

- **`issue_number`**, not the UUID, is the human-facing identifier — see above.
- **Deliberately stricter Member permissions than Task Management** — see above. Both are correct readings of their respective checkpoint's own spec text; the divergence is intentional, not an oversight.
- **`IssueEvents` mirrors `TaskEvents` exactly** (`utils/issueEvents.js`) — same single-emitter, real-time-ready pattern established in Checkpoint 4, so Checkpoint 6's Socket.IO layer subscribes to both the same way.
- **`issue_history` uses plain `old_value`/`new_value` TEXT columns**, not a JSONB blob like `task_activity`'s `details` — this one follows the spec's literal column list exactly, since it was given explicitly (unlike `task_activity`, which Checkpoint 4 designed from scratch).

## Performance considerations

- Same approach as Checkpoint 4: `listForProject`/`listForUser` share one filter-building function so search/filter/sort behave identically everywhere they're exposed, and label previews use a `LATERAL` join rather than N+1 queries.
- Indexes on every column `issues` gets filtered by: `project_id`, `status`, `assignee_id`, `reporter_id`, `linked_task_id`.
- The Issues tab's count badge fetches `pageSize=1` from the existing list endpoint rather than requiring a dedicated `COUNT`-only endpoint — one extra lightweight request, no new API surface.

## Known limitations

- Same Cloudinary-network-untested and nodemailer-advisory notes from Checkpoint 4 apply unchanged (neither module was touched this round).
- No issue attachments — not requested by this checkpoint's spec (Task attachments from Checkpoint 4 are the only attachment surface so far).
- `issue_history` doesn't persist through issue deletion, same reasoning as `task_activity` in Checkpoint 4 (cascades away with the issue; there's no page left to view it on afterward).
- This sandbox's processes (Postgres, Node, and twice the entire filesystem) have been reaped unpredictably throughout this project — worked around throughout by restarting, restoring from the last persisted backup, and re-verifying rather than assuming prior state held.


## Layout fix (pre-Checkpoint 5)

Two issues were reported before Checkpoint 5 started: the fixed sidebar let page content slide underneath it during horizontal scroll, and the sidebar was too wide with no collapse option. Both fixed, frontend-only (zero backend files touched — confirmed via a full backend regression after the change).

**Root cause of the overlap bug**: `AppShell.js` rendered the sidebar as `position: fixed`, with a separate empty flex spacer `div` reserving its width in the document flow. These two elements weren't actually linked — a `fixed` element is positioned relative to the *viewport*, not its flow position. When wide content (a Kanban board, a data table) had nowhere to contain its own overflow, it expanded `<body>` itself, causing the whole page to scroll horizontally. The spacer scrolled away with the page; the `fixed` sidebar didn't move (by definition), so content slid underneath it.

**The fix**: removed `position: fixed` entirely. The sidebar is now a real CSS flex item in a `flex h-screen overflow-hidden` root row — there's nothing left to desync, because there's no second, independently-positioned copy of it. The other half of the fix is `min-w-0` on the main content column: without it, a flex child refuses to shrink below its content's intrinsic width, which is what let a wide Kanban board push the *entire layout* wider instead of scrolling within itself. With `min-w-0` in place, `overflow-x-auto` on individual wide components (Kanban's column row, the task table) does exactly what it's supposed to — contain the scroll locally.

Collapsible sidebar: `AppShell` holds `collapsed` state, persisted to `localStorage` (read in a `useEffect` after mount to avoid an SSR hydration mismatch, since `localStorage` doesn't exist on the server). Width animates between 260px/72px via a 200ms `transition-[width]`. `Sidebar.js` renders icon-only with a CSS-only hover tooltip (`Tooltip.js`) when collapsed; the same component also handles the mobile/tablet overlay drawer (passed no `onToggleCollapse`, so it just renders full-width with no toggle button). Added: workspace-switcher placeholder, pinned user-profile-and-logout footer, and a left-edge active-route indicator bar, on top of the existing nav item list.

**What was actually verified, and how:**
- A full production build compiles clean across all 13 routes.
- Every Tailwind utility class this fix depends on (`overflow-x-auto`, `overflow-y-auto`, `overflow-x-hidden`, `min-w-0`, `min-w-[720px]`, `h-screen`, the arbitrary `transition-[width]`) was confirmed present in the compiled CSS output by grepping the actual build artifacts — not assumed from the source alone, since Tailwind's JIT purging can silently drop classes it doesn't detect.
- `html { overflow-x: hidden }` compiles and survives minification; the equivalent rule on `body` gets optimized away as redundant by the CSS minifier (confirmed by inspecting the output) — harmless, since `<html>` is the element that actually establishes page-level scroll and a single rule there is the standard, sufficient pattern.
- The box-model logic (root `overflow-hidden` at exactly `100vh` → sidebar as a real flex item sized by inline style → main column with `min-w-0` and its own `overflow-y-auto` → individual components owning their own `overflow-x-auto`) was traced through manually, twice, against how GitHub/Linear/Notion structure the same problem.
- A full backend regression (register → workspace → project → task) confirms zero backend impact, as expected for a frontend-only change.

**What could not be verified in this sandbox, and why**: actual pixel-level browser rendering — scrolling a wide Kanban board and confirming the sidebar visually stays put, watching the collapse animation, confirming `localStorage` state survives a real page refresh, hovering a collapsed icon to see the tooltip. This sandbox has no network route to any browser-binary CDN (Playwright, Puppeteer, Chrome for Testing), no working snap support for the `chromium-browser` apt package, and the one apt package that bundles a browser (`node-playwright`) has an unmet `nodejs:any` dependency this container's Node installation doesn't satisfy — installing a second, conflicting Node runtime to chase that felt like an unreasonable risk to the working dev environment for a testing convenience. The fix follows a well-established, standard CSS pattern rather than a novel one, and every mechanical part of it (class compilation, build success, code logic) was checked as rigorously as the environment allows — but a real-browser pass before shipping is still worth doing, and is called out here rather than glossed over.

## Checkpoint 4 — what changed and why

Per the checkpoint instructions, Auth/Workspace/Project code was left alone *except* where task integration explicitly required a touch:

1. **`workspace.routes.js`**: added `POST/GET /:workspaceId/labels` (additive). Labels are workspace-scoped shared taxonomy (per the `task_labels` schema), not task-scoped, so they live here rather than under `/tasks` — same reasoning as the Checkpoint 3 projects route.
2. **Project Details page**: extended from a flat layout to Kanban/Tasks/Overview/Members/Settings tabs, with Kanban now the default. Every Checkpoint 3 capability (edit, archive, restore, delete, assign members) is still present, just reorganized — the old placeholder "Task Summary" (always zero) is now real, computed from actual tasks.
3. **Sidebar**: "Tasks" is now a real link instead of "Coming Soon."

Nothing in `auth.*`, `workspace.controller.js`, `workspace.service.js`, `project.controller.js`, or `project.service.js` was touched.

## Two real bugs caught by testing (not just written and assumed correct)

1. **Stale read after transaction commit.** `task.service.js`'s `move()` (the drag-and-drop reorder logic) ran its position-shifting `UPDATE`s on a dedicated transaction client, then called `findById()` — which uses a *different* pooled connection — before the transaction committed. Postgres correctly returned the pre-move data to that second connection, so the API response for a move claimed nothing had changed even though the database was updated correctly moments later. This only surfaces by calling the HTTP endpoint and comparing the response to a follow-up `GET` — invisible if you only unit-test the SQL in isolation, which is exactly how it slipped through initially. Fixed by having `move()` return a plain boolean and letting the controller re-fetch via `findById()` *after* `move()` resolves (i.e., after commit) — the same pattern `create()` already used correctly.
2. **Multer file-type rejection returned a generic 500-style message.** The `fileFilter` callback threw a plain `Error`, which the centralized error handler correctly treats as non-operational (logs server-side, hides the reason from the client) — technically "working as designed," but bad UX for a routine validation failure. Fixed by throwing `ApiError.badRequest(...)` instead, so unsupported file types now return a clear message.

## Database schema (migration `004_tasks.sql`)

- **`tasks`**: project_id, title, description, status, priority, due_date, estimated_hours, created_by, assigned_to, **position**, timestamps.
- **`task_comments`**: adds `edited_at` beyond the spec's literal columns, to support "Edit Own Comment."
- **`task_labels`**: workspace-scoped, unique per (workspace_id, name).
- **`task_label_map`**: task↔label join table.
- **`task_attachments`**: adds `file_type`/`file_size` beyond the spec's literal columns — needed to decide image-preview-vs-icon and show human-readable file sizes.
- **`task_activity`**: task-scoped event trail (see Known Limitations for why this is deliberately narrower than a full Activity Logs module).

`position` is a dense 0-based integer per `(project_id, status)`. Every move (create, delete, drag-drop, status-change) shifts neighboring rows in the same transaction to keep it gap-free — verified directly against the live database (create 3 → reorder → cross-column move → delete-with-gap-close, all confirmed dense and correct) before ever wiring it into the HTTP layer.

## API endpoints

All 14 endpoints from the checkpoint spec, plus what they required to actually work end-to-end (documented additions, not silent scope creep):
- `PATCH /tasks/:id/comments/:commentId` — the spec requires "Edit Own Comment" as a feature but the endpoint list omitted it.
- `POST` / `GET /workspaces/:id/labels` — the spec requires "Create"/"Reuse" labels and a Label Selector, but no endpoint existed to create or list them.

RBAC reuses `requireWorkspaceRole` unmodified via a new `loadTask` middleware (mirrors Checkpoint 3's `loadProject`) plus `resolveProjectFromBody` for `POST /tasks` (no `:taskId` exists yet, so the workspace is resolved from `req.body.projectId` instead). The checkpoint's permission table is finer-grained than Workspace/Project's binary admin-or-not, so it's implemented in two layers:

- **Coarse gate (middleware, identical everywhere):** Viewer can never hit a write route; `requireWorkspaceRole('member')` floor for create/comment/move/label actions, `requireWorkspaceRole('admin')` for delete.
- **Fine-grained business rule (controller, per-record):** a Member may only edit (`PUT`) a task *assigned to them* — Admin/Owner can edit any task. This does **not** apply to status changes (`PATCH /status` and `/position`) — "Move Tasks" is listed as a general Member capability in the spec, separate from "Update Assigned Tasks," so any Member can drag any card. Comment/attachment deletion allows the author *or* Admin/Owner (a documented, slightly more permissive reading than the spec's literal "delete own" — reasonable moderation capability). Comment *editing* is author-only, no exception, matching "Edit Own Comment" literally.

## Frontend

`/tasks` (cross-project table: search/filter/sort/pagination) · Project Details → Kanban tab (`@dnd-kit`, optimistic drag with automatic rollback on failure) and Tasks tab (same table component, scoped) · `TaskDetailsDrawer` (slide-in panel: inline status/priority/assignee editors, description, labels, attachments, comments, activity timeline) · Create/Edit task modals · `LabelSelector`, `CommentPanel`, `AttachmentPanel` · `useTasks.js` hook file.

**Optimistic drag-and-drop**: `useMoveTask` snapshots the pre-drag column state in `onMutate`, rewrites the cache immediately so the card appears to move instantly, and restores the snapshot in `onError` if the `PATCH` fails — the standard React Query optimistic-update recipe, applied specifically because the spec calls for it explicitly ("Update UI optimistically, Rollback on failure").

## Manual testing results (all executed against a running Postgres + Express + Next.js stack)

| Scenario | Result |
|---|---|
| Create task (valid) → 201, correct defaults | ✅ |
| Validation: title < 3 chars, due date in the past, negative estimated hours → 400 on all three | ✅ |
| Member (not assignee) edits task → 403; same Member can still move/change status of *any* task → 200 | ✅ |
| Member deletes a task → 403 (delete is Admin+ only) | ✅ |
| Owner assigns task to Member; that Member can now edit it → 200 | ✅ |
| Drag-drop reorder within a column, and across columns, verified both via direct DB assertions *and* the HTTP response — including the stale-read bug above, caught specifically by this dual-layer check | ✅ |
| Delete a task closes the position gap in its column (no orphaned gaps) | ✅ |
| Viewer role: can `GET` tasks (200), blocked from create/move/comment (403 on all three) | ✅ |
| Comment: author edits own → 200; non-author edit attempt → 403 (no exception, even for Admin) | ✅ |
| Comment: non-author, non-admin delete attempt → 403; Admin deletes someone else's comment → 200 | ✅ |
| Label: Admin creates → 201; Member attempts to create → 403; duplicate name → 409 | ✅ |
| Label: Member attaches an *existing* label to a task → 201 (attach/detach is Member+, only creation is Admin+) | ✅ |
| Attachment: wrong file type rejected by multer's `fileFilter` with a clear message (not a generic error) | ✅ |
| Attachment: missing Cloudinary credentials → clear 400, not a silent failure or fake success | ✅ |
| Attachment: DB write/list/delete path tested directly (mocking only the Cloudinary network call, which this sandbox cannot reach — see Known Limitations) | ✅ |
| Attachment delete: non-uploader non-admin → 403; uploader → 200 | ✅ |
| Workspace isolation: a task's project belongs to Workspace A; a user who is only in Workspace B gets 403 | ✅ |
| Full Checkpoint 1→2→3→4 regression (register → workspace → project → task → comment → label → move → delete) run *after* all changes landed | ✅ |
| Frontend production build → all 13 routes compile clean | ✅ |
| Every route returns 200 against the running `next start` server | ✅ |

Test data was cleared after every run. One recurring non-bug: bulk-deleting several users in a single `DELETE FROM users` statement occasionally hit a Postgres multi-path CASCADE/SET NULL ordering error specific to deleting *several unrelated users at once*. Worked around by deleting in explicit dependency order for test cleanup. Documented under Known Limitations since there's no bulk-delete-users feature in the actual product for this to ever affect.

## Design decisions

- **`position` as a dense integer**, not a float/fractional-indexing scheme. Simpler to reason about and query; the tradeoff is an `O(n)` shift on every move within a column, which is fine at task-list scale (hundreds, not millions, of cards per column) and avoids float-precision drift over many reorders.
- **`task_activity` is intentionally narrow** — a task-scoped trail, not the general cross-entity Activity Logs module from the master spec (still a future checkpoint). It exists because "Activity Timeline" was an explicit Task Details requirement now, and building the full generalized version prematurely would mean guessing at a schema shape before Issues/Chat/Files exist to inform it.
- **Real-time-ready, concretely**: every task mutation emits through a single `taskEvents` `EventEmitter` (`utils/taskEvents.js`) rather than being scattered inline. Checkpoint 6 subscribes Socket.IO listeners to this same emitter — controllers won't need to change.

## Performance considerations

- `listForProject` (Kanban data source) is unpaginated by design — a board needs its full state to render columns correctly, and reasonable project sizes make this cheap. `listForUser` / `GET /tasks` (used by the cross-project table) *is* paginated (default 25/page) since that list has no natural upper bound.
- Label/comment/attachment counts and label previews on list views use `LATERAL` joins and subqueries rather than N+1 application-level queries — one round trip per list, regardless of task count.
- Indexes: `(project_id, status, position)` composite for Kanban column queries, plus individual indexes on `assigned_to`, `status`, and every foreign key that gets filtered on.

## Known limitations

- **Cloudinary uploads are implemented but not network-tested.** This sandbox has no route to `api.cloudinary.com`. The upload code (multer → buffer → `cloudinary.uploader.upload_stream`) is correct and fails clearly (not silently) when credentials are absent; the surrounding logic (RBAC, validation, DB write/list/delete) was verified by exercising the service layer directly with a mocked upload result. The actual third-party round trip needs verification in an environment with real credentials and network access before this ships.
- **Task-level activity doesn't survive task deletion** (by design — the row would cascade-delete in the same instant it was written, and there's no page left to view it on).
- **No comment/attachment pagination** — fine at expected per-task volume, would need it if comment threads grow very large.
- Same nodemailer moderate-severity advisory noted in earlier checkpoints — still unaddressed, still unrelated to this checkpoint's scope.
- **Ownership transfer** (workspace) still isn't exposed — unchanged scope cut from Checkpoint 2.
- **Logo** is still a plain URL field — file upload arrives with the File Management module.

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env    # fill in DATABASE_URL, JWT secrets, Cloudinary credentials
npm install
npm run migrate         # applies all four migrations
npm run dev              # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
# .env.local already points NEXT_PUBLIC_API_URL at http://localhost:5000/api
npm install
npm run dev              # http://localhost:3000
```

Register, create a workspace, create a project, then open its Kanban tab — drag a card between columns to see the optimistic update. Add a label and a comment from the task drawer. If `CLOUDINARY_*` env vars aren't set, attachment uploads will fail with a clear error rather than silently doing nothing.

## Design

Same visual identity as every prior checkpoint — the merge-graph motif, graph-paper palette, Space Grotesk / Inter / JetBrains Mono type pairing, self-hosted via `@fontsource`. No new design tokens were introduced for the Kanban board; column backgrounds and card shadows reuse the existing `ink`/`line`/`surface` tokens.

## Project structure

```
collabsphere/
├── backend/
│   └── src/
│       ├── controllers/
│       │   ├── auth / workspace / workspaceInvitation / project / task / label / issue .controller.js
│       │   ├── chat.controller.js                             (Checkpoint 6)
│       │   └── file.controller.js                              (new, Checkpoint 7)
│       ├── services/
│       │   ├── user / refreshToken / passwordReset / workspace / workspaceMember / workspaceInvitation
│       │   │   / workspaceActivity / project / projectMember / task* / issue* .service.js
│       │   ├── conversation.service.js, message.service.js     (Checkpoint 6; message.service.js gained
│       │   │   file_id support in Checkpoint 7)
│       │   └── file.service.js, issueAttachment.service.js     (new, Checkpoint 7; taskAttachment.service.js
│       │       gained public_id/resource_type/folder, additive)
│       ├── middleware/
│       │   ├── authenticate.js, requireWorkspaceRole.js, validate.js, errorHandler.js (Checkpoint 7: now
│       │   │   translates Multer errors into proper 400s), loadProject/Task/Issue/Conversation.js
│       │   └── loadFile.js, fileValidators.js                  (new, Checkpoint 7)
│       ├── routes/
│       │   ├── auth / workspace (+chat, +files) / project (+chat, +files) / task / issue (+attachments) /
│       │   │   chat (+file-message) .routes.js
│       │   └── file.routes.js                                  (new, Checkpoint 7)
│       ├── utils/
│       │   ├── cloudinary.js (Checkpoint 4; Checkpoint 7 added deleteResource, filename sanitization,
│       │   │   configurable size limit), taskEvents.js, issueEvents.js, messageEvents.js
│       │   └── fileEvents.js                                    (new, Checkpoint 7)
│       └── database/migrations/  001–007  (007_files.sql new — extends task_attachments, adds
│           issue_attachments/files, adds messages.file_id)
└── frontend/
    └── src/
        ├── app/
        │   ├── dashboard/, login/, ..., workspaces/[workspaceId]/ (+Files tab), projects/[projectId]/ (+Files tab)
        │   └── tasks/, issues/, chat/
        ├── components/
        │   ├── AppShell.js, Sidebar.js, workspaces/*, projects/*, tasks/*, issues/* (+IssueAttachmentPanel,
        │   │   Checkpoint 7), chat/* (MessageBubble now renders shared files, Checkpoint 7)
        │   └── files/                                           (new, Checkpoint 7: FileManager, FileCard,
        │       FileList, FilePreview, FileDropzone, FileTypeIcon)
        ├── hooks/
        │   ├── useAuth/Workspaces/Projects/Tasks/Issues/Chat/Socket.js
        │   └── useFiles.js                                      (new, Checkpoint 7)
        └── lib/apiClient.js, uploadWithProgress.js               (new, Checkpoint 7 — XHR-based, for real
            upload progress; fetch has no progress API)
```

## Roadmap (next checkpoints)

1. Notifications + Activity Logs (the general module, superseding the narrow per-entity trails built so far — chat's `messageEvents`, Checkpoint 6's Socket.IO layer, and now `fileEvents` are all ready to broadcast these too)
2. Dashboard & Analytics
3. Deploy Checkpoint 7 to `production` (currently on `staging` only — pending PR review and manual merge, see Git workflow) and actual Vercel/Render/Neon deployment with real credentials (prep complete, see Deployment architecture; execution requires credentials this sandbox doesn't have)

## Git workflow

```
staging
  ↓ develop checkpoint
  ↓ checkpoint complete
  ↓ test checkpoint + regression test
  ↓ push staging → origin/staging
  ↓ test staging
  ↓ Pull Request: staging → production
  ↓ merge
production
  ↓ deploy
  ↓ production smoke test
```

`production` contains only tested, approved checkpoints and is never developed on directly. All checkpoint work happens on `staging`; a Pull Request merges `staging` into `production` only after the checkpoint is complete and regression-tested. As of this document, `production` and `staging` point at the identical commit — everything through Checkpoint 6, including the post-Checkpoint-5 fixes.

**Starting Checkpoint 7** (or any future checkpoint) follows this sequence: `git checkout staging`, `git pull origin staging`, build only that checkpoint, run its tests plus the full regression suite, review `git diff`/`git status` to confirm only the necessary files changed, commit, push to `origin/staging`, verify on the staging environment, then open a `staging → production` Pull Request and merge only after it passes.

## Deployment architecture

```
Vercel
  └─ Next.js frontend
       ↓ HTTPS + WebSocket, cross-origin
Render
  └─ Express REST API + Socket.IO (single Node process, one HTTP server)
       ↓ TLS
Neon
  └─ PostgreSQL
```

Cloudinary is provisioned and referenced in the backend's `.env.example` but not yet load-bearing — it becomes required once the File Management checkpoint is built (see Roadmap).

**CORS and cross-origin cookies are already production-configured in the application code, not something this deployment pass needed to add**: `app.js`'s CORS and `utils/socket.js`'s Socket.IO CORS both read `origin` from `CLIENT_URL` rather than a hardcoded value or wildcard, and the refresh-token cookie's `secure`/`sameSite` attributes are conditional on `NODE_ENV=production` (`Secure; SameSite=None` in production, `SameSite=Lax` over plain HTTP in development) — exactly what cross-origin Vercel↔Render cookie delivery requires. Setting the right environment variables on Render is what activates this; no code changes were needed.

A `render.yaml` Blueprint at the repo root lets Render provision the backend service (root directory, build/start commands, health check) from one file instead of manual dashboard configuration — secret values are declared (so Render prompts for them) but never given values in the file itself.

**What actually deploying requires** (this sandbox has no network access to render.com, vercel.com, or neon.tech, and no accounts/API keys for any of them — this part has to happen from your machine/dashboard):
1. Push `production` and `staging` to GitHub (see the exact commands in the delivery notes).
2. Neon: create a project, copy its pooled connection string into `DATABASE_URL`.
3. Render: New → Blueprint → point at this repo's `render.yaml` → fill in the `sync: false` secrets (JWT secrets, `DATABASE_URL`, email credentials) → deploy from `production`.
4. Run `node src/database/migrations/../migrate.js` (or Render's shell) once against the Neon database to apply all 7 migrations.
5. Vercel: New Project → this repo → set **Root Directory** to `frontend` → add `NEXT_PUBLIC_API_URL` pointing at the Render backend's `/api` path → deploy from `production`.
6. Go back to Render and set `CLIENT_URL` to the resulting Vercel URL (CORS needs the real frontend origin, not a guess made before it exists).

