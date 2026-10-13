# Verification and deployment notes

## What is included

- Committed Prisma schema and two SQL migrations, including RLS, grants, and indexes.
- Idempotent demo seed.
- Strict TypeScript configuration and build scripts for both applications.
- ESLint and Prettier.
- Unit tests for the full member transition matrix, manager transitions, rejection reasons, dates, and mass-assignment rejection.
- An opt-in PostgreSQL integration suite for direct RLS isolation, API RBAC/workflow, file versions, and token rotation.

## Authoring checks

Strict TypeScript checks and ESLint passed. Both applications built successfully. The unit test command was attempted but the sandbox blocked the tsx IPC socket (`listen EPERM`), so no test pass is claimed. Database integration and browser checks were left for your local setup as requested.

## Local verification

Run from the repository root:

```bash
npm run check
npm run lint
npm test
npm run build
```

Then, with your migrated local database:

```bash
cd server
npm run test:integration
```

Finally, run the two-browser demo in the README. Test mobile width, pointer/keyboard dragging, lost network connections, and manager/member realtime updates. Configure Firebase and test both foreground and background notification delivery if enabling push.

The authoring environment did not run a PostgreSQL server or browser session; database integration, migrations against a live database, sockets, and push delivery remain for local verification. Do not interpret generated migration SQL or a successful frontend build as proof that those runtime checks passed.

## Dependency audit

The initial install reported 24 audit findings (12 moderate, 12 high), including transitive Firebase/gRPC dependencies, Prisma tooling, Tailwind tooling, and React Router v6. These were not remediated during setup handoff. Audit results change as advisories and packages change; run `npm audit` yourself and review the exact installed lockfile before deployment.

Do not run `npm audit fix --force` blindly: its proposed changes included breaking/downgrade changes and a React Router v7 migration, while this app explicitly requires React Router v6. Some findings concern build tooling or server-side router features not used by this SPA; that does not establish that every finding is harmless. Review applicability and patched versions before treating the deployment as production-ready.

## MVP operational limits

- One API instance; no distributed Socket.io adapter is included.
- Local uploads require durable storage and coordinated backups. Cloud storage is abstracted but not implemented.
- FCM sends are best-effort after database commit; no durable push retry queue.
- Dashboard calendar-day grouping uses UTC; timestamps render in the browser’s locale.
- Explicit logout revokes refresh credentials; issued access tokens expire after 15 minutes.
- No virus scanning, external file transformation, or public file hosting is included.
- Seed accounts are for local demos only. Do not retain their shared password in a real deployment.
