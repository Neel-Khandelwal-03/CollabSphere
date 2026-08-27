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
- **Post-Checkpoint-7 fix**: existing Direct Messages couldn't be opened (missing error/loading state on the open-conversation mutation), Files sidebar badge corrected — both fixed and tested, committed to `staging`.
- **Checkpoint 8 — Notifications, Activity Logs & Mentions**: complete, tested (this document). Built on `staging`, not yet merged to `production` — see Git workflow.
- **Checkpoint 9 — Analytics, Global Search, Performance & UI Polish**: complete, tested (this document). Built on `staging`, not yet merged to `production` — see Git workflow.
- Everything else (Notifications, Analytics, final deployment) is not started.
- **Note**: an unrelated Shopping Cart/Products/Inventory request was received between Checkpoint 5 and 6 and correctly identified as a mismatch with this project's actual domain before any work began — flagged to the user, confirmed as a mistake, no code written for it.

## Checkpoint 9 — Analytics, Global Search, Performance & UI Polish

### Analytics — real SQL aggregation, not JavaScript counting

Every number across Dashboard, Workspace Analytics, and Project Analytics comes from `COUNT`/`GROUP BY`/`FILTER`/`DATE_TRUNC` in PostgreSQL, never from fetching full row sets into Node and counting there — verified directly by seeding known data and confirming every returned number matched exactly, including the trickier ones (a completed-but-overdue task correctly excluded from "upcoming deadlines," a project's completion percentage computed from its actual status breakdown).

Recharts was added (none of this project's prior checkpoints had a chart library) and deliberately restricted to the app's own existing 4 semantic colors (violet/green/red/gray) rather than a new chart-specific palette — matching `globals.css`'s own documented restraint ("violet is the single brand signal, green is reserved for positive states only"). Eight required chart types are covered by four reusable components (`StatusBarChart` alone covers Tasks-by-Status, Tasks-by-Priority, Issues-by-Status, and Issues-by-Severity), rather than eight near-identical one-off implementations.

Team contribution is deliberately framed as an activity indicator — a plain list with proportional bars, no rank numbers, no "top performer" language — per the spec's explicit warning against presenting it as a performance score.

**A real performance regression, caught before it shipped**: wiring the analytics tabs directly into Workspace/Project Details pushed Recharts into those pages' *initial* bundle — Project Details jumped from 275KB to 402KB, Workspace Details from 240KB to 354KB, confirmed by the actual build output, not assumed. Fixed with `next/dynamic` lazy-loading on both tabs; confirmed the bundles dropped straight back to their pre-analytics sizes. Recharts now only loads when someone actually opens the Analytics tab.

### Global Search — structurally RBAC-scoped, not filtered after the fact

Every search query is scoped to `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = $1)` — a private workspace's projects, tasks, issues, files, and members are unreachable through this service for anyone outside it, not merely hidden from results after being fetched. Verified twice: once via direct service call, once via a real HTTP request with a genuine outsider account, both confirming zero results leak across the boundary. Search results for the spec's own worked example ("authentication") were verified to match it exactly — same project, same task, same issue.

Migration `012_search_indexes.sql` adds `pg_trgm`-backed GIN indexes on every searchable name/title column, making `ILIKE '%term%'` substring search genuinely fast rather than an unindexed sequential scan on every keystroke — PostgreSQL's own native capability, per the spec's explicit preference over introducing a separate search engine.

The UI is a Cmd/Ctrl+K command palette (debounced, categorized results, localStorage-only recent searches — never sent to or stored on the server, per the spec's own privacy caution), mounted once in `AppShell`. Deliberately **not** also bound to `/` — that's a character people type constantly in comment boxes and chat composers, and binding it there would be exactly the shortcut conflict the spec's own caveat warns against.

A real gap found while wiring file search results: clicking a file result needed to land on a specific tab (`?tab=files`) on Workspace/Project Details, but neither page read any tab state from the URL at all. Fixed by reading `window.location.search` in a `useEffect` on mount — deliberately not `useSearchParams()`, which would have required wrapping these large, pre-existing page components in a Suspense boundary for no benefit beyond this one small feature.

### Performance audit — investigated, not just narrated

- **Socket.IO listener lifecycle**: read through `useChatSocket`, `useNotifications`, and the core `useSocket` provider line by line. All three were already well-built — `useChatSocket` has an explicit defensive dedup check on incoming messages (`old.some((m) => m.id === message.id) ? old : [...old, message]`), so even a duplicate event couldn't render a message twice; every `socket.on` has a matched `socket.off` in cleanup; `SocketProvider` is correctly mounted at the true persistent root (`app/layout.js`), so the actual connection survives page navigation, confirmed by reading the file rather than assuming it.
- **Found and fixed a real, common React Query issue**: no global `staleTime` default existed, meaning most list queries (workspaces, projects, tasks, members, etc.) refetched on every single component remount — e.g. navigating away and back — even when nothing had changed. Fixed with one shared default (30s) rather than annotating dozens of individual hooks; confirmed safe since mutations already call `invalidateQueries` explicitly, which bypasses staleTime regardless, so this doesn't mask a user's own changes.
- **Backend query audit**: every `SELECT *` in the codebase is a single-row lookup by primary key or unique constraint (findById-style functions) — not the bulk-list pattern the spec is concerned about. The genuine "list everything" endpoints (cross-workspace tasks, cross-workspace issues) already paginate. The unbounded ones (a project's full Kanban board, a task's comment thread, a workspace's member list) are legitimately bounded, per-entity collections where pagination would either break the feature (a Kanban board must show its complete set) or add complexity with no current, measurable benefit — a reviewed-and-accepted design choice, not an oversight.

### UI polish — concrete fixes, not a redesign

- **Loading-state anti-pattern** ("Tasks: 0" while still loading, which the spec explicitly warns against) was found in two real, specific places — the Workspaces page's mobile count label and the Members count on Workspace Details — both rendering `?? 0` with no loading gate. Fixed both. Several other similar-looking spots were checked and confirmed already correctly gated behind parent loading states — not everything examined turned out to need a fix, which is itself an honest audit outcome.
- **A much larger, real gap in error handling**: five of the primary data-fetching surfaces (Workspaces list, Projects list, and the shared `TaskTable`/`IssueTable`/Dashboard stats) had *no* error handling at all. Traced the actual failure mode, not assumed one: `tasks = data?.tasks || []` meant a failed request would silently present as "No tasks found" — actively misleading, not just unhelpful. Built one reusable `ErrorState` component and wired it into all five, with each empty-state condition now explicitly guarded by `!isError` so a failure can no longer masquerade as "nothing here."
- **Accessibility**: `SearchPalette`'s Escape-to-close only worked while the search input specifically had focus (an input-scoped `onKeyDown`). Replaced with the same document-level `keydown` listener and body-scroll-lock the existing `Modal` component already established — more robust, and consistent with the rest of the app rather than a second, narrower pattern.
- Verified the collapsed-sidebar overflow fix and the portal-based tooltip fix (both from earlier checkpoints) are still intact, and confirmed neither `NotificationBell`'s dropdown nor `SearchPalette`'s overlay use viewport-relative positioning that could reintroduce that class of bug.

### An honest finding: dark mode was never actually built

Before treating Part 7 of this checkpoint as a "verify existing dark mode" task, the codebase was checked directly: no `.dark` class, no theme provider, no `prefers-color-scheme` media query, and no dark-variant CSS custom properties exist anywhere across all 8 prior checkpoints. There is nothing to verify because dark mode doesn't exist — the light-only palette in `globals.css` is the only theme this app has ever had.

Given this, building a complete second theme (a full parallel color system, verified across every component, chart, and state) is a substantial, deliberate design undertaking in its own right — not a "verify" task, and not something to fold into an already-large checkpoint without being asked for it directly, especially given this project's explicit "do not redesign the entire application" instruction. Documented here plainly rather than either fabricating verification results for a feature that isn't there, or silently building a full theme system unprompted.

### Manual testing performed (all executed live, not assumed)

| Scenario | Result |
|---|---|
| Dashboard/Workspace/Project analytics verified against known, seeded data — every number and every chart's data matched exactly | ✅ |
| Search results matched the spec's own worked example exactly (project/task/issue for "authentication") | ✅ |
| Search RBAC boundary — a genuine outsider account gets zero results across every category, verified via real HTTP, not just direct service call | ✅ |
| Bundle-size regression from lazy-loading Recharts, confirmed via actual build output before and after | ✅ |
| `ErrorState` wiring — confirmed via code trace that the underlying data defaults (`data?.tasks || []`) previously made failures indistinguishable from empty state | ✅ |
| Full regression, 14/14 checks across Checkpoints 1–9, including the real `DELETE /api/projects/:id` and `/api/workspaces/:id` endpoints (confirming the Checkpoint 8 cascade-ordering fix still holds) | ✅ |
| Frontend production build clean across all 16 routes, zero new warnings, after every change made this checkpoint | ✅ |

### Known limitations

- Not verified in an actual browser — a genuine, fresh attempt was made this session specifically because this checkpoint is UI-heavy (not assumed unavailable from memory): `npx playwright install chromium` reports success (exit 0) but the browser binary never downloads, silently, for the same confirmed network-access reason as every prior checkpoint's attempt.
- No dedicated full `/search` results page was built — the command palette already satisfies the spec's actual UI requirements (categorized results, click-to-navigate, keyboard shortcut), and building a second, separate results view without a clear additional requirement would be scope expansion without justification. Worth revisiting if a fuller browsing experience is wanted.
- Dark mode does not exist in this application (see above) — not a Checkpoint 9 regression, a pre-existing state across the whole project, documented rather than silently left unaddressed.
- Accessibility and responsive verification in this checkpoint were code-level (reading actual layout/positioning logic, actual ARIA attributes, actual event handlers) rather than visual, for the same browser-access reason as above.


## Checkpoint 8 — Notifications, Activity Logs & Mentions

The largest checkpoint yet — touching nearly every existing controller, with a real, iteratively-debugged database bug found and fixed along the way.

### Architecture decisions, and why

**`notifications.type` deliberately breaks from this project's usual Postgres ENUM convention**, using `VARCHAR + CHECK` instead. The spec's own type list is already 19 entries and explicitly "at minimum" — ENUM extension (`ALTER TYPE ... ADD VALUE`) has real friction for a classification this likely to keep growing across future checkpoints, where a CHECK constraint is trivial to widen in a later migration.

**`activity_logs` is additive to, not a replacement for**, the existing `task_activity`/`issue_history` tables built in Checkpoints 4–5. Those power narrow per-entity timelines ("what happened to this one task"); the new table answers a workspace/project-wide question ("what happened across this whole space") — the same distinction GitHub draws between a repo-wide Activity feed and a single PR's timeline. Controllers call both at the same mutation points, not one rewritten into the other.

**Mention syntax is a structured token (`@[Display Name](userId)`), not free-text `@username` parsing.** The user model has no `username` field — only `name`/`email` — and open-ended name extraction from prose is genuinely ambiguous (multi-word names, partial matches, substring collisions). The frontend's autocomplete inserts this token when a match is selected; the backend parses it via an unambiguous regex and validates *only* the `userId` — the display name is decoration the backend never trusts, satisfying "do not rely only on client-side parsing" precisely.

**Notification creation and activity logging both went through a `notify()`/`log()` convenience wrapper** (create + Socket.IO broadcast in one call) rather than repeating "create, then emit" at every one of the 6+ controllers that needed it — directly matching the spec's "do not duplicate notification creation logic inside every controller."

### A real, previously-undetected Checkpoint 7 gap, found and fixed

`fileEvents` was built and emitted from `file.controller.js` back in Checkpoint 7 — but never actually subscribed to in `socket.js`. File upload/delete events have been silently going nowhere in real time since Checkpoint 7. Found and fixed while wiring this checkpoint's new `notificationEvents`/`activityEvents` bridges, since it's the exact same category of omission.

### A genuine, multi-step database bug — the debugging process, not just the fix

Testing surfaced a real, reproducible error: deleting multiple users in one statement (`DELETE FROM users`) could throw `insert or update on table "issues" violates foreign key constraint "issues_project_id_fkey"`. This took three iterations to actually resolve, worth documenting honestly rather than presenting only the final answer:

1. **First hypothesis (migration 009) was wrong.** Guessed `issues.linked_task_id`'s `SET NULL` action was racing against `issues.project_id`'s `CASCADE` action. Retested after applying it — the failure persisted verbatim, so the migration was kept (harmless) but the guess was discarded rather than declared a fix.
2. **Isolated reproduction with minimal, fully controlled data** (not guessing) narrowed the actual trigger condition: an issue's *assignee* — a second user distinct from the workspace owner — being deleted in the same statement as the owner.
3. **Second attempt (migration 010)** made every `SET NULL`-to-`users` foreign key deferrable, based on that finding. Retested — **still failed**, same error, still naming `issues_project_id_fkey` specifically.
4. **That repeated detail was the actual clue.** The real mechanism: a `SET NULL` action fires a row `UPDATE`, and that `UPDATE` re-validates *every* foreign key on the row, including `CASCADE` ones — if the `CASCADE` constraint isn't itself deferrable, it fails against a competing cascade path mid-transaction. Making `issues_project_id_fkey` deferrable resolved the exact reproduction immediately.
5. **Audited the whole schema for the same shape** (a `CASCADE` ancestor-reference plus a `SET NULL` user-reference on the same table) rather than fixing tables one at a time as each was separately discovered — migration 011 covers all of them.

**Final verification was deliberately realistic, not just the minimal case**: two users, a workspace, a task and an issue each assigned to the second user, a comment, the resulting notifications and activity log entries — confirmed rich state existed, deleted both users in one statement, confirmed a completely clean cascade across every table, then separately re-ran the real `DELETE /api/projects/:id` and `DELETE /api/workspaces/:id` endpoints to confirm they still work correctly with the new schema.

**Honest scope note**: none of this is reachable through any of the application's actual delete endpoints today — CollabSphere has no "delete user account" feature, and workspace/project deletion never touches the `users` table itself. The hazard only fires when a user row is deleted directly, a database operation the app never performs. Fixed anyway: a genuine integrity risk worth closing before any future account-deletion feature could hit it, and it was actively blocking reliable test-data cleanup during this checkpoint's own testing.

### Notification triggers (all live-tested, not assumed)

Task/issue: assignment, reassignment, status change (to the assignee), comment mentions, comment-added-to-your-item (deliberately **not** sent if the commenter also mentioned you in the same comment — verified the dedup directly: exactly one notification, not two). Project: member added/removed. Workspace: invitation (only if the invitee already has an account — an email-only invite has no user row to attach an in-app notification to), invitation accepted (notifies the original inviter), role changed. Files: uploading to a task/issue notifies its assignee; general workspace/project file uploads are activity-logged only — deliberately no notification, since there's no single clear recipient the way an assignee provides. Chat: `@mentions`, with conversation-type-aware authorization — workspace members for group chat, only the actual two participants for a direct conversation (verified: mentioning a real workspace member who isn't a DM participant is silently excluded from the stored mentions and generates zero notification, confirmed by checking the excluded user's actual notification list contained only her unrelated prior activity).

### Frontend

`NotificationBell` (unread badge, dropdown, live via `notification:new` on a new personal Socket.IO room — `user:<id>`, which didn't exist before this checkpoint) and a full `/notifications` page with filters, mounted in `AppShell`'s header. `ActivityTimeline` as a new "Activity" tab on both Workspace and Project Details, filterable, live via `activity:new` — left the existing, narrower "Recent Activity" widget on the Overview tab (a Checkpoint 2 system) untouched, since it serves a genuinely different purpose.

`MentionTextarea` — one reusable `@`-detection/autocomplete component, wired into all three real composers (task comments, issue comments, chat), each supplying its own correctly-scoped candidate list. Task/issue candidates reuse `useMentionableUsers`, a thin reshape over the existing `useWorkspaceMembers` hook rather than a new endpoint; chat's DM candidates are just the other participant, matching the backend's narrower authorization.

Two real bugs caught in this session's own new code before shipping: the shared `Textarea` component wasn't wrapped in `React.forwardRef`, which would have silently broken `MentionTextarea`'s cursor-position access entirely (a plain function component silently drops any ref passed to it) — fixed the shared component properly. And task/issue detail pages had no query-param deep-linking for a notification to open a specific item — Issues already had this from Checkpoint 5; Tasks was missing it, added to match, since the spec explicitly requires clicking a notification to navigate to the relevant entity.

### Manual testing performed (all executed live against a running Postgres + Express + Next.js stack, including live Socket.IO)

| Scenario | Result |
|---|---|
| Task assignment → live `notification:new` delivered to the assignee's personal room within the same HTTP request/response cycle | ✅ |
| Comment mention + separate assignee notification correctly deduped to exactly one notification, not two | ✅ |
| Self-assignment / self-mention correctly produces zero self-notification | ✅ |
| DM mention of a real workspace member who isn't a DM participant: silently excluded from stored mentions, zero notification | ✅ |
| Workspace invitation (existing-account case), acceptance notifying the original inviter, role change | ✅ |
| Project member add/remove | ✅ |
| File-upload notification correctly reaches the exact Cloudinary network boundary cleanly | ✅ |
| Mark-as-read / mark-all-as-read / unread count, all consistent after each mutation | ✅ |
| Full realistic cascade-delete verification (two users, task, issue, comment, notifications, activity logs) plus the real `DELETE /api/projects/:id` and `DELETE /api/workspaces/:id` endpoints | ✅ |
| Live Socket.IO: both `notification:new` and `activity:new` confirmed delivered in real time | ✅ |
| Full regression, 14/14 checks across Checkpoints 1–8 | ✅ |
| Frontend production build clean across all 16 routes, zero new warnings | ✅ |

### Known limitations

- **File-related notification triggers are wired and verified up to the Cloudinary network boundary only** — the same disclosed limitation as every Cloudinary-touching checkpoint since Checkpoint 4; the user confirmed Cloudinary isn't connected yet and will test that layer separately once it is.
- **Group-chat mention notifications link to the DM inbox, not the exact workspace/project chat tab** — a bare conversation ID isn't enough to resolve that deep link without over-building a lookup for a single notification type; disclosed rather than silently left incomplete.
- **Project creation and general file uploads are activity-logged but don't generate notifications** — a deliberate scope decision (no single clear recipient), not an oversight.
- Not verified in an actual browser — a genuine, fresh attempt was made this session (not assumed unavailable from a prior session): `npx playwright install chromium` reports success (exit 0) but the browser binary never actually downloads, silently, for the same confirmed reason as prior checkpoints (this sandbox's network access doesn't reach the required CDN). Manual verification steps below.

### Manual browser verification steps

1. Log in as two different users in two browser sessions (or one normal + one incognito).
2. User A assigns User B a task. Confirm User B's notification bell badge increments without a page refresh, and clicking the bell shows "You were assigned a task."
3. Click that notification — confirm it navigates to the Tasks page with that exact task's drawer already open.
4. User A comments on a task assigned to User B, typing `@` and picking User B from the autocomplete dropdown. Confirm the inserted mention renders as a styled pill, not raw text, once posted.
5. Confirm User B receives exactly one notification for that comment (a mention notification), not two.
6. Open Workspace Details → Activity tab. Confirm entries appear for everything performed above, each with the actor's avatar, a plain-English description, and a relative timestamp. Try each filter chip.
7. Open a task and mention a user who is *not* a member of that workspace by manually constructing the URL-unreachable case is hard to test manually — instead, confirm the autocomplete dropdown itself never offers non-members as suggestions.
8. Visit `/notifications`, confirm all the filter tabs work, and confirm "Mark all read" clears the bell badge.
9. Confirm the sidebar's "Notifications" item no longer shows "SOON" and is clickable.


## Post-Checkpoint-7 fix: existing Direct Messages couldn't be opened, Files sidebar state
## Post-Checkpoint-7 addition: delete conversation, and a real production bug diagnosed from browser screenshots
## Post-Checkpoint-7 fix: read receipts showing a false "Seen by" for users who hadn't actually seen the message

A user reported a message showing "Seen by [Owner]" despite that person not being logged in when it was sent. Traced this to `ChatPanel.js`'s `readersFor()` function: it checked only whether a reader had *any* non-null `last_read_message_id` at all, never comparing it against the specific message being rendered. The practical effect: once someone opens a chat even a single time, they show as having "seen" every message sent in that conversation forever afterward, regardless of whether they were ever present for it.

Fixed by comparing the reader's last-read message's *position* in the already-loaded message list against the position of the message being checked, rather than timestamp — the live `read:update` Socket.IO event only carries a `messageId`, not a `last_read_at`, so a timestamp-based comparison would have silently broken for anyone whose read state arrived via that live event instead of the initial page load.

Verified against the exact real backend response shape the frontend receives (not synthetic data): reproduced the reported scenario precisely — a user marks an older message read, then a brand-new message arrives while they're absent — confirmed the old logic reproduces the false "seen" and the fixed logic correctly shows no one until that specific person actually reads that specific message, then correctly shows them once they do.



### The production "Something went wrong" bug — diagnosed, not fixed in code

A user reported the deployed app (Vercel + Render + Neon) showing "Something went wrong. Please try again." when opening an existing DM, with screenshots of the actual failure. That exact string is significant: it's not any message this app's frontend code writes — it's `errorHandler.js`'s generic fallback for an *unexpected*, non-operational backend exception, meaning the request reached the backend and got a structured response back (ruling out CORS/network failures) but something inside threw.

Cross-referencing against the two screenshots: the conversation **list** loaded correctly ("Sahil Mohammed / hi" was visible), but **opening** it failed. Those two use different queries — `listDirectForUser` (the list) never touches `messages.file_id` or the `files` table; `messageService.list` (used only when opening a conversation) does. Both only exist as of migration `007_files.sql`. This is a precise, code-level match: **the production Neon database was very likely missing migrations 006 and/or 007** — not a code bug, a deployment-state gap. Nothing in the application code needed to change for this diagnosis; the fix is running the missing migrations against the production database, which requires access to Render/Neon this environment doesn't have.

**A free path around Render's shell being locked behind a paid plan**: `migrate.js` only needs `DATABASE_URL` and network access — it can be run directly from any machine with the Neon connection string, no Render shell required. Also fixed the actual root cause of *why* this could happen at all: Render deploys never ran migrations automatically, so it depended on someone remembering to run them by hand after every schema change. `render.yaml`'s `startCommand` now runs `node src/database/migrate.js && node src/server.js` — migrations apply automatically (and safely — the script skips anything already applied, and each migration is its own transaction) on every deploy and restart, on the free plan, no shell needed. Since Blueprint settings only apply when a service is first created, an already-existing Render service also needs its **Start Command** updated directly in its dashboard settings to pick this up.

### New feature: delete conversation

Requested alongside the bug report. Needed no schema change — `conversation_participants` and `messages` already cascade-delete on `conversation_id` (migration 006), so `conversationService.remove()` is a single `DELETE FROM conversations`.

Authorization differs by conversation type, matching how destructive each action actually is: a **direct message** has no "moderator" concept, so either participant may delete it (gated by `loadConversation`'s existing participant check); a **workspace or project chat** is shared by everyone in that space, so deleting it requires Owner/Admin. Deleting a workspace/project chat doesn't remove the *tab* — visiting it again transparently recreates a fresh, empty conversation, since those were always "get or create" to begin with.

Broadcasts a new `conversation:deleted` Socket.IO event over the exact same `messageEvents` → `utils/socket.js` bridge every other chat event already uses — no new WebSocket architecture. Verified live: if the other DM participant currently has the conversation open when it's deleted, their client is notified in real time and the thread closes on their screen too, not just the deleter's.

### Testing (all executed live)

| Scenario | Result |
|---|---|
| Non-participant cannot delete a DM (403) | ✅ |
| A participant who didn't create the DM can delete it; cascade removes the conversation, all its messages, and both participant rows (verified via direct row counts before/after) | ✅ |
| A brand-new DM can be started with the same pair immediately after deletion, with no leftover unique-index conflict | ✅ |
| Member (non-Owner/Admin) blocked (403) from clearing Workspace or Project chat; Owner succeeds (200) on both | ✅ |
| Re-visiting a cleared Workspace/Project chat tab transparently recreates a fresh, empty conversation | ✅ |
| Live Socket.IO: the other DM participant, with the conversation open, receives `conversation:deleted` within the same test run | ✅ |
| Full regression: task, Kanban move, issue, Workspace Files, workspace activity feed | ✅ (5/5) |
| Frontend production build clean, all 15 routes compile, zero new warnings | ✅ |

One bug caught in this session's own new code before it shipped: the "delete from the open thread's header" button initially passed `activeThread.summary` as the delete target, which has no `.id` field matching the conversation (only `other_user_id`) — would have tried to delete `undefined`. Fixed to construct the correct shape explicitly.



### Investigation, done before writing any fix

Traced the full chain the bug report specified: conversation list → conversation ID → selected-conversation state → message history fetch → Socket.IO room → composer → send → persistence → real-time delivery → read receipt. Verified every layer live against the exact scenario from the report (a user named "Sahil Mohammed" with a prior "hi" message):

- `GET /chat/direct` (the conversation list) returns the correct shape, including `workspace_id` and `other_user_id` on each row.
- `POST /chat/direct` (what clicking a conversation calls) — tested with the exact `workspaceId`/`userId` pulled from a real list response — returns `201` with the correct `{ conversation, messages, readStates }` shape, including the existing "hi" message.
- Re-read `chat/page.js`'s `openConversation` and the `useStartDirectConversation` hook line by line against this response shape. Every field lines up.

**The API layer was already fully correct.** No backend change was needed to fix the actual data flow. What the investigation did surface, directly from the code (not a guess): **`openConversation` had no error handling and no loading state at all.** If the mutation failed for *any* reason — an expired access token at that exact moment (they last 15 minutes), a transient network blip, anything — the promise would simply reject with nothing catching it, and the UI would sit exactly where the bug report describes: no spinner, no error, permanently on "Select a conversation, or start a new one." This matches the reported symptom precisely, is a real, concrete gap (not a rationalization), and is exactly what the checkpoint's own "Loading / Error States" section separately requires regardless of root cause. Fixed by adding a per-conversation loading indicator and a real, visible error message on failure — in both the existing-conversation click path and the "+ New DM" path, which had the identical gap.

One more real (if minor) defensive bug caught while reading this code closely: `activeThread?.conversation.id` would throw if `activeThread` were ever truthy while `activeThread.conversation` was somehow undefined — the leading `?.` only guards the first property access, not the chained `.id` after it. Fixed to `activeThread?.conversation?.id`.

`ChatPanel` itself was also missing a send-failure error message (it already had one for file-upload failures, added in Checkpoint 7, but not for plain text messages) — added, benefiting Workspace Chat, Project Chat, and DMs alike since they all share this one component.

### A genuine, fresh attempt at browser verification

Per the request's explicit instruction, a real attempt was made to get browser automation working in this environment before falling back to API/socket-level testing — not simply asserting the earlier known limitation still held. `npx playwright install chromium --with-deps` was run fresh; it fails because the sandbox's network access doesn't extend to the Ubuntu package repository Playwright's Chromium dependencies need (a 403 on `deb.nodesource.com`, a domain outside this environment's allowlist), and the browser binary itself did not download either. This is a hard, confirmed environment constraint, not an assumption. Manual verification steps are provided below.

### Issue 2 — Files sidebar

Audited the actual repository rather than trusting the request's framing (which was written as if File Management hadn't shipped yet): **Checkpoint 7 (File Management & Cloudinary) is fully implemented and already committed to `staging`** — this is Case A from the request, not Case B. The sidebar's "Files" item still had `comingSoon: true`, inconsistent with the real state of the app. Fixed: `comingSoon` removed, item is now clickable.

One real architectural wrinkle worth being explicit about: Files has no dedicated top-level page — Checkpoint 7 deliberately built it as "Files" tabs on Workspace Details and Project Details (matching that checkpoint's own design, since a file library is inherently workspace/project-scoped, unlike Chat's flat DM list). There is no single `/files` route to link to. Rather than invent one — which the request for this fix explicitly said not to do ("Do NOT implement File Management as part of this task") — the sidebar item links to `/workspaces`, the natural entry point to reach any workspace's Files tab. This is genuinely functional, not a dead link, but it does mean "Workspaces" and "Files" both highlight as active on `/workspaces` routes, a minor cosmetic overlap being disclosed rather than left unmentioned. A dedicated cross-workspace Files page, if wanted, would be new File Management UI and is out of scope here.

The existing `NAV_ITEMS` array (a single config array, each item declaring `href`/`comingSoon`, rendered generically in one place) already *is* the "config-driven, not scattered hardcoded UI" pattern the request asked for in Case B — no further refactor was needed to satisfy that intent.

### Sidebar collapse/overflow re-verified, not just assumed intact

The collapsed-sidebar horizontal-overflow bug fixed in an earlier session (a portal-rendered `Tooltip` escaping the nav container's scroll context) was re-inspected: the fix is still in place, `Tooltip.js` still portals to `document.body`, and no new `overflow-y-auto` container without a matching `overflow-x-hidden` was introduced by this fix. Not re-verified in an actual browser, for the same confirmed reason above — code-level re-inspection only.

### Manual browser verification steps (since automation is confirmed unavailable here)

1. Log in, go to **Chat**. Confirm the conversation list loads with existing DMs, each showing the other person's name and last message.
2. Click an existing conversation. Confirm: a brief spinner appears next to that row while it loads, the right panel populates with the header (avatar + name), full message history in order, the composer is visible and focusable, and no error appears.
3. Type and send a message. Confirm it appears instantly, then refresh the page and confirm it's still there.
4. Open the same conversation in a second browser (or an incognito window) logged in as the other participant. Send a message from each side and confirm the other side receives it within roughly a second, with correct sender name and no duplicates.
5. While the second user is *not* looking at the conversation, send a message from the first; confirm an unread badge appears on the second user's conversation list, and clears once they open it.
6. Type in the composer on one side and confirm a "typing..." indicator appears on the other side within a couple seconds, then disappears shortly after typing stops.
7. Click the online status dot next to a conversation; confirm it reflects whether that person's Chat page is currently open elsewhere.
8. Click **+ New message**, pick a workspace, pick a member who already has a DM with you — confirm it opens the *same* existing conversation (check the message history is the old one, not empty) rather than creating a second one.
9. Pick a member with no existing DM — confirm a new empty conversation opens and a message can be sent.
10. Disconnect network briefly (e.g., devtools offline mode), attempt to send a message, confirm a visible error appears rather than the message silently vanishing; reconnect and confirm the composer works again.
11. In the sidebar, confirm **Files** no longer shows "SOON," is clickable, and takes you to Workspaces.
12. Collapse the sidebar; confirm no horizontal scrollbar appears anywhere, tooltips still show on hover over icons, and expanding it back works cleanly.


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

