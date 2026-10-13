# Handoff

An internal workspace for creative teams: brief → task → department → submission → manager review. No public signup, client accounts, or email.

## Quick start

**Requirements:** Node.js 22.12+ (Node 22 LTS recommended), npm 10+, PostgreSQL 16+, and optionally Docker Compose. Run the commands below from the repository root unless another directory is shown.

### 1. Install

```bash
cd /home/patisto/Projects/handoff
npm ci
cp server/.env.example server/.env
cp web/.env.example web/.env
```

The root package uses npm workspaces and one committed lockfile. Both apps still run independently. `npm ci` installs both apps; you do not need to install separately inside each directory.

If your npm version blocks dependency install scripts, inspect and allow the Prisma and esbuild scripts it reports. Never run npm as root.

### 2. Start PostgreSQL

The included Compose file starts **only PostgreSQL**, on `localhost:55440`, with a persistent volume. It creates separate administrator and restricted application roles.

```bash
docker compose up -d db
docker compose ps
```

If your Linux account cannot access Docker, run the Docker commands with `sudo` from your own terminal. You do not need sudo for any npm command.

The development defaults match `server/.env.example`:

| Purpose                            | Username        | Password              | Database  |
| ---------------------------------- | --------------- | --------------------- | --------- |
| Migrations and seed (`DIRECT_URL`) | `handoff_admin` | `handoff_local_admin` | `handoff` |
| API runtime (`DATABASE_URL`)       | `handoff_app`   | `handoff_local_app`   | `handoff` |

These are local development credentials. Use your own credentials for deployment.

**Already have PostgreSQL?** Follow [manual PostgreSQL setup](docs/SETUP.md#manual-postgresql-without-docker). The application role must be named `handoff_app` for the supplied migration grants, or you must adapt those grants before applying migrations.

### 3. Configure secrets

Edit `server/.env`. Generate **two different** secrets, each at least 32 characters:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Paste them into `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Keep the local database URLs and `WEB_ORIGIN=http://localhost:5173` unless you changed your ports. FCM is optional; leave its setting empty for now.

`web/.env` should contain:

```dotenv
VITE_API_URL=http://localhost:4000/api
```

The `/api` suffix is required. Use `localhost` consistently in browser URLs and configuration; do not mix it with `127.0.0.1`.

### 4. Generate, migrate, and seed

```bash
cd server
npm run generate
npm run migrate
npm run seed
```

- `generate` creates the Prisma client.
- `migrate` applies the checked-in schema migration and then the SQL RLS policies, indexes, and runtime grants.
- `seed` connects with `DIRECT_URL`. It inserts demo records without resetting existing task progress. It is safe to rerun.
- Do **not** substitute `prisma db push`: it does not install the raw SQL RLS migration.

### 5. Run the backend

In terminal A, from `handoff/server`:

```bash
npm run dev
```

API: **http://localhost:4000/api**  
Health check: **http://localhost:4000/api/health**  
Socket.io namespace: **http://localhost:4000/ws**

The backend starts Socket.io and the reminder jobs. It refuses to start if `DATABASE_URL` uses a superuser or a role with `BYPASSRLS`.

### 6. Run the frontend

In terminal B:

```bash
cd /home/patisto/Projects/handoff/web
npm run dev
```

Open **http://localhost:5173**. Restart Vite after changing `VITE_*` variables. You can seed or restart the frontend while the backend continues running.

## Demo accounts

All seeded accounts use **`password123`**.

| Email                 | Role / department |
| --------------------- | ----------------- |
| `manager@handoff.dev` | Manager           |
| `design1@handoff.dev` | Design            |
| `design2@handoff.dev` | Design            |
| `video1@handoff.dev`  | Video             |
| `copy1@handoff.dev`   | Copy              |

Seed: three projects, three departments, ten tasks across all statuses, sample comments, activity, and manager notifications. Demo deadlines are relative to the first seed run; rerunning preserves existing records.

## Two-minute demo

1. Log in as the manager. The **Task board** shows the seeded projects. Open **Overview** for the review queue.
2. Open a second browser profile or private window and log in as `design1@handoff.dev`.
3. In the member window, open **App store screenshots**. Move it from **To do** to **In progress**, attach a file, add a comment, then move it to **In review**. Drag the card handle or use the status control in the drawer.
4. In the manager window, the submission appears live. Open it and choose **Approve work** or **Request changes** with a reason.
5. For rejected work, the manager chooses **Reopen for revisions**. The member can then repeat the normal workflow.
6. To create your own flow: **Projects → New project**, then **New task**, select a department and optional assignee, and set a deadline.

A member sees all tasks in their departments, including tasks assigned to teammates. Project details expose only the tasks that member can access. Project-level briefs and files are shared with departments participating in that project. Use task attachments for department-specific work.

## Commands

| Directory | Command                                     | Purpose                                                              |
| --------- | ------------------------------------------- | -------------------------------------------------------------------- |
| root      | `npm run check`                             | Strict TypeScript checks for both apps                               |
| root      | `npm run lint`                              | ESLint                                                               |
| root      | `npm run format`                            | Format source with Prettier                                          |
| root      | `npm run build`                             | Build both apps                                                      |
| root      | `npm test`                                  | Workflow/validation unit tests; integration suite skipped by default |
| server    | `npm run generate`                          | Regenerate Prisma client                                             |
| server    | `npm run migrate`                           | Apply committed migrations                                           |
| server    | `npm run migrate:dev -- --name change_name` | Create a schema migration during development                         |
| server    | `npm run seed`                              | Insert demo data idempotently                                        |
| server    | `npm run test:integration`                  | Real PostgreSQL RLS/API tests; requires migrated database            |
| server    | `npm run dev`                               | API + Socket.io + cron, port 4000                                    |
| server    | `npm run build && npm start`                | Compile and start production backend                                 |
| web       | `npm run dev`                               | Vite, port 5173                                                      |
| web       | `npm run build`                             | Static frontend build in `web/dist`                                  |
| web       | `npm run preview`                           | Local inspection of built frontend                                   |

## Database tests

After configuring, migrating, and seeding:

```bash
cd server
npm run test:integration
```

Use a **dedicated development/test database**, never production. The suite creates uniquely named fixtures and removes its own records and uploaded files afterward. It checks:

- Direct Prisma reads under the non-bypass runtime role cannot read another department’s tasks, comments, files, task activity, notifications, or private projects.
- Transaction-local identity does not leak through the connection pool.
- API RBAC denies member administration and cross-department access.
- Task submission, comments, uploads, version increments, rejection, reopening, and approval.
- Refresh token rotation, replay rejection, and logout revocation.

The database, browser, realtime, and FCM flows were **not run in the authoring environment**. Run the integration suite and the two-browser demo on your machine before deployment. See [verification notes](docs/VERIFICATION.md).

## Project structure

```text
handoff/
├── server/
│   ├── prisma/{schema.prisma,migrations/,seed.ts}
│   ├── src/
│   │   ├── config/                 # env, db, CORS, sockets, storage
│   │   ├── middleware/             # JWT, roles, task access, transactions, errors
│   │   ├── modules/                # routes/controller/service/schema/types per module
│   │   ├── realtime/               # authenticated namespace + scoped emitters
│   │   ├── jobs/                    # deadline reminders and overdue notifications
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   └── uploads/                    # private local file storage, gitignored
├── web/
│   ├── src/
│   │   ├── app/                    # providers, router, authenticated layout
│   │   ├── api/                    # Axios, token refresh, Query client
│   │   ├── features/               # components/hooks/api/types per feature
│   │   ├── components/ui/          # shadcn-style Radix primitives
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── stores/                 # Zustand auth and local UI state
├── docs/{SETUP.md,ARCHITECTURE.md,API.md,VERIFICATION.md}
├── infra/init.sql
└── compose.yaml
```

## Interface and themes

Handoff’s interface adopts the local **OSquared** reference: cyan/teal accents, DM Sans body text, Space Grotesk headings, gradient panels, an expanding desktop navigation rail, and a mobile navigation dock. The overview combines the review/work queue, active projects, real approval progress, and recent activity.

Use the sun/moon button in the workspace header or login screen to switch between dark and light mode. Dark is the default. The browser remembers the selection under `handoff-theme`, applies it before the app renders, and synchronizes it across tabs. Forms, task drawers, notifications, and admin screens share the same theme tokens.

Colors and component styles are in `web/src/index.css`; Tailwind maps those CSS variables in `web/tailwind.config.js`. Fonts load from Google Fonts, with local system-font fallbacks when offline. See [theme implementation notes](docs/THEME.md).

## Further setup

- [Environment variables, manual PostgreSQL, optional FCM, deployment, troubleshooting](docs/SETUP.md)
- [RLS, authentication, realtime, storage, and job behavior](docs/ARCHITECTURE.md)
- [REST API and socket contract](docs/API.md)
- [Verification status and remaining deployment checks](docs/VERIFICATION.md)
