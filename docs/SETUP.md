# Setup reference

## Environment variables

Create each `.env` from the adjacent `.env.example`. Neither is committed.

### Server

| Variable                        | Required   | Default / purpose                                                                           |
| ------------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| `NODE_ENV`                      | No         | `development`; use `production` for secure cookies                                          |
| `PORT`                          | No         | `4000`                                                                                      |
| `WEB_ORIGIN`                    | No         | Exact browser origin, default `http://localhost:5173`; no trailing slash                    |
| `DATABASE_URL`                  | Yes        | PostgreSQL connection for restricted `handoff_app` role                                     |
| `DIRECT_URL`                    | CLI / seed | Administrator connection for migrations and seed; not used by API requests                  |
| `JWT_ACCESS_SECRET`             | Yes        | Separate random secret, minimum 32 characters                                               |
| `JWT_REFRESH_SECRET`            | Yes        | Different random secret, minimum 32 characters                                              |
| `UPLOAD_DIR`                    | No         | `./uploads`, relative to the server’s working directory; use an absolute path in production |
| `MAX_UPLOAD_MB`                 | No         | `20`; maximum one file per upload, configurable from 1 to 100                               |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | No         | Absolute path to a Firebase service account JSON file                                       |

`DATABASE_URL` and `DIRECT_URL` must point to the same database, with different roles. URL-encode punctuation in database passwords. Do not set the runtime URL to the migration account to work around a permissions error.

### Web

| Variable                  | Required  | Default / purpose                                          |
| ------------------------- | --------- | ---------------------------------------------------------- |
| `VITE_API_URL`            | No        | `http://localhost:4000/api`; must include `/api`           |
| `VITE_FIREBASE_CONFIG`    | Push only | Single-line JSON containing Firebase web-app configuration |
| `VITE_FIREBASE_VAPID_KEY` | Push only | Firebase Web Push public key                               |

All `VITE_*` values are public and bundled into the frontend. Never put a service account, database password, or JWT secret in them. Restart Vite after changes; rebuild for production changes.

## Manual PostgreSQL without Docker

Use a fresh PostgreSQL 16+ database. As a PostgreSQL administrator, run:

```sql
CREATE ROLE handoff_admin LOGIN PASSWORD 'replace-admin-password' SUPERUSER;
CREATE ROLE handoff_app LOGIN PASSWORD 'replace-app-password' NOSUPERUSER NOBYPASSRLS;
CREATE DATABASE handoff OWNER handoff_admin;
GRANT CONNECT ON DATABASE handoff TO handoff_app;
```

The superuser example is for a local development machine. On managed production PostgreSQL, use your provider’s migration administrator. That account must be able to create tables, functions, policies, indexes, grant table privileges to the application role, and bypass RLS when running the seed. Do not expose it to the web application process.

Set in `server/.env`:

```dotenv
DATABASE_URL=postgresql://handoff_app:replace-app-password@localhost:5432/handoff?schema=public
DIRECT_URL=postgresql://handoff_admin:replace-admin-password@localhost:5432/handoff?schema=public
```

Then, inside `server`:

```bash
npm run generate
npm run migrate
npm run seed
npm run dev
```

The second migration grants the runtime role access to application tables and enables/forces RLS on the six protected tables. It revokes access to `_prisma_migrations`. Do not use `prisma db push` as a replacement.

### Creating future migrations

`npm run migrate` only deploys existing migrations. To create a new one, use `npm run migrate:dev -- --name description`. Prisma development migrations need permission to create a shadow database, or a separately configured shadow database. New tables also need explicit application-role grants and appropriate RLS policies in their migration.

## Optional Firebase push

In-app notifications and live sockets work without Firebase. Missing or invalid server credentials disable push without blocking normal workflow.

1. Create/select a Firebase project and register a web app.
2. Enable Cloud Messaging. Obtain the web configuration and Web Push public VAPID key.
3. Download a server service-account JSON file and keep it outside the repository.
4. Set `FIREBASE_SERVICE_ACCOUNT_PATH` on the backend.
5. Set frontend configuration as single-line JSON, for example:

```dotenv
VITE_FIREBASE_CONFIG='{"apiKey":"public-web-key","authDomain":"your-project.firebaseapp.com","projectId":"your-project","storageBucket":"your-bucket","messagingSenderId":"your-sender-id","appId":"your-app-id"}'
VITE_FIREBASE_VAPID_KEY=your-public-web-push-key
```

6. Restart/rebuild both apps. Open **Inbox → Enable push** and grant browser permission.

Push needs HTTPS outside localhost and a browser supporting service workers and PushManager. The frontend bundles a Firebase messaging worker. Registration tokens are associated with the signed-in user; explicit logout unregisters that browser token from the backend. Foreground notices use the Socket.io inbox/toast flow; Firebase displays background notification payloads. Browser/site permission changes remain under the user’s control.

Verify both foreground and background behavior against your Firebase project; this integration has not been exercised with live credentials here.

## Running on a phone

Vite binds to `0.0.0.0`. The Express server listens on the configured port. For LAN testing, set `VITE_API_URL=http://YOUR_LAN_IP:4000/api` and `WEB_ORIGIN=http://YOUR_LAN_IP:5173`, restart both apps, and open `http://YOUR_LAN_IP:5173` on your phone. Do not open `localhost` on the phone: that points to the phone itself. Browser push typically requires HTTPS on LAN addresses.

## Production deployment

1. Provision PostgreSQL with distinct migration and application credentials, then run the committed migrations using a deployment job.
2. Supply random secrets, `NODE_ENV=production`, the HTTPS frontend origin, and the restricted runtime database URL.
3. Run `npm ci`, `npm run generate --workspace server`, and `npm run build`.
4. Run the backend from `server` using `npm start` under your process manager. Mount `UPLOAD_DIR` on durable storage. Back up database and uploads together.
5. Serve `web/dist` with an HTTPS static server. Configure SPA fallback to `index.html` for routes such as `/projects/:id`.
6. Use a same-site deployment, e.g. `app.example.com` and `api.example.com`. The refresh cookie uses `SameSite=Strict` and `Secure` in production; unrelated cross-site domains will not work without revisiting cookie/CSRF configuration.
7. Proxy `/socket.io/` with WebSocket upgrade support. `/ws` is a Socket.io namespace, not its HTTP transport path. Match proxy body limits to `MAX_UPLOAD_MB` and allow authenticated file downloads.
8. Configure proxy trust deliberately before deploying behind a reverse proxy. The app defaults to trusting no proxy; blanket `trust proxy=true` is unsafe. Set the exact trusted proxy/network in `server/src/app.ts` for your topology so rate limiting receives correct client IPs.
9. Run one API instance for this MVP. Socket.io rooms are held in memory; multiple instances require a shared adapter. Reminder jobs use transaction advisory locks to avoid duplicate concurrent job runs.
10. Do not seed production with demo accounts. Provision your first manager through a controlled database/bootstrap operation, then add accounts through Admin. Rotate any demo credentials if you intentionally seed a staging environment.

Dependency audit findings are recorded in [VERIFICATION.md](VERIFICATION.md). Review and resolve relevant findings before public exposure.

## Troubleshooting

| Symptom                                  | Fix                                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Docker socket permission denied          | Run Compose with `sudo` in your terminal, configure Docker access through your OS, or use manual PostgreSQL.                          |
| Port `55440` already in use              | Change the host port in Compose and both database URLs.                                                                               |
| `relation does not exist`                | Run migrations, then regenerate the Prisma client.                                                                                    |
| `role handoff_app does not exist`        | Run `infra/init.sql` as an administrator before migrating. Compose only runs init scripts on first initialization of an empty volume. |
| `permission denied for table`            | Apply the second migration with the administrator URL. Check grants to `handoff_app`.                                                 |
| `Unsafe DATABASE_URL`                    | Runtime credentials are a superuser or bypass RLS. Switch to `handoff_app`.                                                           |
| Login rejected                           | Seed the same database used by `DATABASE_URL`; use a demo email and `password123`.                                                    |
| Session disappears after refresh         | Use consistent hostnames and same-site URLs; check `WEB_ORIGIN`, cookie restrictions, and HTTPS in production.                        |
| Network error in browser                 | Ensure the backend is running; verify `VITE_API_URL` includes `/api`; restart Vite after `.env` changes.                              |
| Empty member board                       | Assign the member to a department and create a task in that department. Members cannot see other departments.                         |
| Member cannot move a rejected task       | A manager must reopen it to To do. Then the member can start and submit it again.                                                     |
| Upload fails                             | Check size limit, directory write permissions, available disk space, and proxy body limits.                                           |
| Files cannot be downloaded after restart | Keep the same durable `UPLOAD_DIR`; metadata is in PostgreSQL, bytes are on disk.                                                     |
| Push button missing                      | Set both frontend Firebase values and restart/rebuild. In-app notifications still work.                                               |
| No reminders immediately after seed      | Due-soon checks run at quarter-hour marks; overdue checks run at the top of each hour.                                                |
| Changes don’t arrive live                | Check `/socket.io/` proxy routing, browser socket connection, and JWT validity. The client reconnects after refresh.                  |
| Prisma engine/cache permission error     | Use a writable cache directory or repair ownership of your user cache. Do not run the whole app as root.                              |

Stop the database without deleting data:

```bash
docker compose stop db
```

The named volume persists across container restarts. Removing the volume destroys the database; a normal restart or reseed does not require deleting it.
