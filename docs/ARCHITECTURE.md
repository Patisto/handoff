# Architecture and security boundaries

## Request lifecycle

The API uses Express + TypeScript, Zod validation, and Prisma/PostgreSQL. All JSON responses use `{ data, error }`; binary downloads are the exception. Validation errors are 422, authentication errors 401, authorization errors 403, inaccessible/missing records 404, and conflicting writes 409.

Authenticated requests verify the JWT, reload the active user and department memberships, and enter a Prisma interactive transaction through `middleware/transaction.ts`. **Every authenticated business-data handler sets both session variables inside that same transaction**, using Prisma `$executeRaw`:

```ts
await tx.$executeRaw`SELECT set_config('app.current_user_id', ${user.id}, true)`;
await tx.$executeRaw`SELECT set_config('app.current_role', ${user.role}, true)`;
```

`true` makes the settings transaction-local. All handler queries use `ctx.db` rather than the global client. Commit/rollback clears the identity before the pooled connection is reused. Socket subscription checks and cron jobs use the same transaction-bound identity pattern. Login and refresh use the unprotected auth tables before there is an authenticated request identity.

The migration enables **and forces** RLS for `tasks`, `projects`, `comments`, `files`, `notifications`, and `activity`. The runtime role is `NOSUPERUSER NOBYPASSRLS`; the server checks this at startup. Superusers bypass even forced RLS and must never be used for API requests.

## Visibility rules

- Managers use the `app.current_role = 'MANAGER'` policy branch.
- Members see tasks whose department appears in `user_departments` for `app.current_user_id`.
- Projects are readable if at least one task is visible. Nested task queries remain subject to task RLS.
- Comments and task files inherit task visibility. Project files inherit project visibility.
- Task-level activity requires access to that specific task, even if its project is otherwise visible.
- Notifications are selectable/updatable only by their recipient (or the manager policy branch); HTTP inbox handlers always filter to the current user.
- Notification insertion is allowed to the authenticated application context because member actions must notify managers. There is no public create-notification endpoint. `createMany` avoids `RETURNING` another user’s unreadable inbox row; Prisma generates the cuid IDs.

RLS is defense in depth against missing application filters. The database credential and custom session settings are controlled by the trusted backend. Do not distribute the runtime credential to end users or expose arbitrary SQL execution. Role checks and task services enforce write permissions and state transitions; RLS does not replace them.

## Authentication

Access tokens are HS256 JWTs with an issuer/audience/type check and a 15-minute expiry. They live in browser memory, not local storage. Refresh JWTs live in an HttpOnly cookie scoped to `/api/auth`, with `SameSite=Strict` and `Secure` in production. Only SHA-256 refresh-token hashes are stored in `RefreshSession`; successful refresh atomically rotates the hash. Replaying an old refresh token fails.

Passwords use bcrypt. Account deactivation removes refresh sessions and push devices, clears assignments, and disconnects sockets. Every HTTP authentication reloads active status and memberships. Explicit logout revokes the refresh session; a previously stolen access JWT can remain valid until its short expiry. The browser clears its token and query cache on logout/session expiry.

Origin checks, exact-origin credentialed CORS, Helmet, login throttling, general API throttling, strict schemas, and parameterized SQL supplement auth. File URLs are protected API endpoints; uploads are never exposed as an Express static directory.

## Task workflow

```text
Member: TODO → IN_PROGRESS → IN_REVIEW
Manager: review → APPROVED or REJECTED (reason required)
Manager: REJECTED → TODO to reopen for a new revision
```

Managers may move between any states; rejection always requires a nonblank reason. Member edits to task metadata are forbidden. Assignees must be active users belonging to the selected department. Department changes clear incompatible assignments. Status updates lock the task row and optionally compare `expectedStatus` to prevent lost updates.

## Realtime

Namespace `/ws` authenticates via `handshake.auth.token`. User and department rooms are derived on the server. Managers also join an internal manager room. A project subscription is authorized by a database transaction under the caller’s identity.

Detailed task/comment events go to the task’s department and managers. Project rooms receive only a project-ID invalidation, avoiding leakage of other departments’ task details. Notification events go to `user:{id}`. Events and push sends are scheduled **after transaction commit**, so clients never observe rolled-back changes. The client invalidates TanStack Query data after events and reconnects when its access token refreshes. Sockets expire with their JWT; changes to user membership disconnect that user’s sockets.

## Files

`StorageService` declares `save`, `get`, and `delete`. The local implementation stores generated UUID storage keys under `UPLOAD_DIR`. Prisma record IDs still default to cuid. Original filenames are sanitized and never used as filesystem paths. Downloads require auth and RLS and force attachment disposition.

Every upload adds an immutable record. A PostgreSQL advisory transaction lock serializes version allocation per task (or project), including concurrent submissions. Comment attachments are resolved to their task. Newly written files are removed if metadata insertion rolls back. Task/project/comment deletion schedules disk deletion after the database commit. A filesystem failure is logged; production operations should reconcile orphaned disk objects periodically.

Replace the local storage implementation for a future S3/GCS adapter; no cloud storage integration is included.

## Background jobs

- Every 15 minutes: open tasks due in the next 24 hours produce in-app notifications and optional FCM delivery to the assignee or department.
- Every hour: overdue, unapproved tasks are marked overdue and managers are notified.
- `reminderFor` and `overdueFor` store the notified deadline. Changing the deadline resets these fields. Jobs use PostgreSQL advisory locks across processes.
- Expired refresh sessions are cleaned up by the reminder jobs.
- Jobs use an active manager as the system actor. They do nothing until at least one active manager exists.

The UI derives overdue state from the current deadline immediately. The persisted overdue flag is maintained on status/deadline changes and the hourly job. In-app notifications persist even if push delivery fails. Push is best-effort; this MVP does not include a durable external-delivery retry queue.

## Frontend

React/Vite + strict TypeScript; Tailwind and local shadcn-style Radix primitives; React Router v6; Zustand for token/UI state; TanStack Query for server data; dnd-kit for accessible pointer/keyboard board movement. Primary creation and task detail use right-side drawers. Task changes, comments, inbox reads, and creation update caches optimistically and roll back on failure. Dependent views refetch after mutation or socket events.

Keyboard shortcuts: `N` creates a task for managers when focus is outside a form; `Ctrl/Cmd+K` focuses board search; `Esc` closes a drawer. On a card’s drag handle, Space starts/ends keyboard dragging and arrow keys move the card. Status controls in the drawer provide a direct alternative.
