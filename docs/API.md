# API reference

Base URL: `http://localhost:4000/api`. Protected routes take `Authorization: Bearer <accessToken>`. Browser refresh/logout use the HttpOnly refresh cookie and credentials-enabled requests. Dates are ISO 8601 strings, with a timezone, for example `2026-10-20T14:00:00Z`.

```json
{ "data": { "id": "..." }, "error": null }
```

```json
{
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "message": "Please check the form fields.", "details": {} }
}
```

List endpoints support `limit` (1–200, default 100) and `offset` (default 0), except departments, which returns the department directory. Dashboard queries take no parameters. Uploaded file downloads return binary content.

## Routes

| Method | Path                      | Access / request                                                             |
| ------ | ------------------------- | ---------------------------------------------------------------------------- |
| POST   | `/auth/login`             | `{email,password}` → `{accessToken,user}` + refresh cookie                   |
| POST   | `/auth/refresh`           | Refresh cookie → rotated cookie and access token                             |
| POST   | `/auth/logout`            | Revoke cookie session                                                        |
| GET    | `/auth/me`                | Current user and departments                                                 |
| GET    | `/users`                  | Manager                                                                      |
| POST   | `/users`                  | Manager; `{name,email,password,role?,departmentIds?}`; password min 10 chars |
| PATCH  | `/users/:id`              | Manager; partial create fields; omit password to preserve it                 |
| PATCH  | `/users/:id/deactivate`   | Manager; cannot deactivate self                                              |
| GET    | `/departments`            | Manager                                                                      |
| POST   | `/departments`            | Manager; `{name}`                                                            |
| PATCH  | `/departments/:id`        | Manager; `{name}`                                                            |
| POST   | `/departments/:id/users`  | Manager; `{userIds:[...]}` **replaces** membership                           |
| GET    | `/projects`               | RLS scoped; optional `status`                                                |
| POST   | `/projects`               | Manager; `{name,clientName,brief?,deadline,status?}`                         |
| GET    | `/projects/:id`           | RLS scoped                                                                   |
| PATCH  | `/projects/:id`           | Manager; partial create fields                                               |
| DELETE | `/projects/:id`           | Manager; cascades tasks/comments/files/activity                              |
| GET    | `/tasks`                  | RLS scoped; filters below                                                    |
| POST   | `/tasks`                  | Manager; task payload below                                                  |
| GET    | `/tasks/:id`              | Department access or manager                                                 |
| PATCH  | `/tasks/:id`              | Manager; partial task fields except `projectId` and status                   |
| DELETE | `/tasks/:id`              | Manager                                                                      |
| PATCH  | `/tasks/:id/status`       | `{status,expectedStatus?,rejectionReason?}`; role-aware                      |
| POST   | `/tasks/:id/assign`       | Manager; `{assigneeId:string                                                 | null,departmentId?}` |
| GET    | `/tasks/:id/comments`     | Task access                                                                  |
| POST   | `/tasks/:id/comments`     | Task access; `{body}`                                                        |
| DELETE | `/comments/:id`           | Author or manager, with task access                                          |
| GET    | `/files`                  | RLS scoped; optional `taskId` or `projectId`                                 |
| POST   | `/files`                  | Multipart; `file` + exactly one of `taskId`, `projectId`, `commentId`        |
| GET    | `/files/:id`              | RLS scoped metadata                                                          |
| GET    | `/files/:id/download`     | RLS scoped binary attachment                                                 |
| GET    | `/notifications`          | Own inbox; optional `unread=true`                                            |
| PATCH  | `/notifications/:id/read` | Mark own notification read                                                   |
| PATCH  | `/notifications/read-all` | Mark own inbox read                                                          |
| POST   | `/notifications/devices`  | Register FCM token; `{token}`                                                |
| DELETE | `/notifications/devices`  | Unregister own token; `{token}`                                              |
| GET    | `/activity`               | RLS scoped; optional `projectId`, `taskId`                                   |
| GET    | `/dashboard/manager`      | Manager                                                                      |
| GET    | `/dashboard/member`       | Own assigned work, under department RLS                                      |
| GET    | `/health`                 | Public liveness                                                              |

Task creation:

```json
{
  "projectId": "project-id",
  "title": "Campaign hero artwork",
  "description": "Working files and a final export, please.",
  "departmentId": "design-id",
  "assigneeId": null,
  "priority": "HIGH",
  "deadline": "2026-10-20T14:00:00Z"
}
```

Task filters: `projectId`, `departmentId`, `assigneeId`, `status`, `priority`, `deadline` (inclusive upper bound), `deadlineFrom` (inclusive lower bound), `limit`, `offset`.

Enums:

- Role: `MANAGER`, `MEMBER`.
- Project status: `ACTIVE`, `COMPLETED`, `ARCHIVED`.
- Task status: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `APPROVED`, `REJECTED`.
- Priority: `LOW`, `NORMAL`, `HIGH`, `URGENT`.

## Socket contract

Connect with Socket.io client to `http://localhost:4000/ws` and `auth: { token: accessToken }`. Socket.io’s default transport path remains `/socket.io/`.

Server-controlled rooms: `user:{id}`, `department:{id}`, `project:{id}`. Clients cannot join arbitrary departments or users.

Client events:

- `project:subscribe(projectId, ack?)`: authorized subscription, replacing a previous project room. Ack: `{ok:boolean}`.
- `project:unsubscribe(projectId)`: leave that project room.

Server events:

- `task:created`: task record.
- `task:updated`: task record or invalidation `{id}`; `{id,removed:true}` on deletion/removal from a department.
- `task:statusChanged`: updated task record.
- `comment:created`: comment record.
- `notification:new`: `{userId,type,payload}`; refetch the inbox for canonical IDs/read state.
- `board:refresh`: `{projectId}`; refetch visible board data.

Treat socket events as invalidations and use the REST API as the source of truth. Reconnects refetch state, covering events missed during a temporary disconnection.
