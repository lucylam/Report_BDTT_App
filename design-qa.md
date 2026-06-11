# BDTT Webapp Redesign Audit

Date: 2026-06-11

## Automated Checks

- `npm run typecheck`: passed after removing stale generated `.next` cache.
- `npm run lint`: passed after ignoring generated `.next`, `.claude`, `node_modules`, `out`, `dist`, and `coverage` paths.
- `npm run build`: passed.
- Local HTTP smoke test on `http://localhost:3001`: `/login`, `/admin`, `/admin/tasks`, `/admin/personnel`, `/admin/upload`, and `/worker` all returned HTTP 200.

## Design Scope Implemented

- Added shared PVCFC pastel design foundation, Plus Jakarta Sans, glass/card/button/input/focus/mobile-safe-area tokens.
- Redesigned login, change-password, home, admin shell, dashboard, WorkOrder, personnel, upload, and worker workspace surfaces.
- Preserved API routes, Supabase migrations, domain types, Excel parser/export, Google Sheets sync flow, progress update flow, cancel reason flow, offline save state, and existing route contracts.
- Did not edit credential JSON or production config.

## Manual Visual QA Status

- Browser/screenshot automation was not available in this Codex session, and no local Chromium/Edge/Chrome/Firefox command was discoverable from the shell.
- Pending direct visual check in a browser: desktop and 390x844 mobile viewports for `/login`, `/admin`, `/admin/tasks`, `/admin/personnel`, `/admin/upload`, and `/worker`.
- Items to confirm visually: no mobile horizontal scroll, no text overflow, tap targets remain at least 44px, status colors remain distinct, and import/export/filter/search/progress/cancel/logout controls are reachable.
