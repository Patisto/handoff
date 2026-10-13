# OSquared theme adaptation

Reference: the adjacent `OSquared/src/styles.css` and `OSquared/src/main.jsx` repository. This is a frontend presentation update; backend endpoints, JWT authentication, RLS, permission checks, task transitions, uploads, and notification delivery remain in place.

## What was adopted

- Dark blue-gray surfaces (`#12161a`, `#1b2026`, `#242b33`), cyan (`#00b4d8`) and teal accents.
- A light palette with off-white backgrounds, white cards, slate text, and darker teal controls.
- DM Sans body type and Space Grotesk headings, with system fallbacks.
- A 78px desktop icon rail expanding to 218px on hover or keyboard focus, and a compact mobile navigation dock.
- Gradient buttons, layered panels, semantic status colors, and a cyan studio-summary card.
- The overview’s wider work column and narrower summary/activity column.
- Abstract client-initial project covers and bordered Kanban columns.

Handoff keeps its own name, routes, account roles, five task statuses, optimistic mutations, dnd-kit interactions, and task drawers. The studio-summary percentage is computed from actual approved/total task counts. Recent activity and project progress come from existing authorized APIs; no sample statistics from the reference are inserted.

## Theme implementation

- `web/src/index.css`: semantic RGB tokens for dark/light modes, shared component styles, responsive shell, and reduced-motion support.
- `web/tailwind.config.js`: token-based utilities supporting opacity modifiers.
- `web/src/stores/theme.ts`: Zustand preference state and persistent theme application.
- `web/index.html`: early preference application to prevent a flash of the wrong theme.
- `web/src/components/ThemeToggle.tsx`: accessible toggle used on login and in the workspace header.
- `web/src/app/providers.tsx`: toast theme and cross-tab synchronization.

Some foreground colors in light mode are darker than the reference to improve readability. Hero/project covers intentionally keep a contrasting illustrated palette in both modes. Avoid adding fixed dark backgrounds to ordinary panels: use `bg-panel`, `bg-raised`, `text-soft`, `text-muted`, and the semantic status colors instead.

## Local review

Run `npm run dev` in `web` alongside the configured backend. Check both themes at desktop and phone widths, then refresh to confirm the theme persists. Check the expanding navigation with both pointer and keyboard, the mobile dock, and login/logout. The theme is a browser preference and does not alter user permissions.

Use the existing seeded demo to check assignment, member submission, file upload, comments, and manager approval/rejection. No new dependency install, database migration, or reseed is needed for this theme update. Google Fonts requires network access for the preferred fonts; the app remains usable with its system fallback.
