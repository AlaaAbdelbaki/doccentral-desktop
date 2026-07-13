# DocCentral Desktop (Electron)

Electron implementation of DocCentral with the DentaCore design system
(claude.ai/design project) and feature parity with the Flutter app:
patients, calendar/appointments, visits, treatment plans, invoicing &
payments, inventory, documents/attachments, day closeout, settings
(clinic profile, EN/FR/AR language switch, staff users).

## Architecture

- **Local database** — sql.js (WASM SQLite) in the main process, persisted to
  `userData/doccentral.db`. Schema mirrors the Flutter app's Drift tables,
  including the sync-metadata pattern (`id`, `created_at`, `updated_at`,
  `deleted_at`, `sync_status`) on every table.
- **Auth** — Supabase email+password (same project as the Flutter app);
  first sign-up provisions the clinic + owner Dentist user + roles locally.
  Sessions persist across restarts and work offline.
- **Sync** — pending rows are pushed to same-named Supabase tables every 60s
  and marked `synced` (best effort: if the remote schema doesn't exist yet,
  rows stay pending and the app keeps working offline).
- **Renderer** — React 18 bundled with esbuild; UI → repository → IPC bridge.

## Run

```bash
npm install
npm start
```

## Dev / self-check flags (environment variables)

| Var | Effect |
| --- | --- |
| `DOC_DEV_AUTOLOGIN=1` | Skip Supabase, provision a dev clinic and seed demo data |
| `DOC_DATA_DIR=<dir>` | Use a custom data directory (isolated DB) |
| `DOC_PAGE=<page>` | Open on a specific page (`patients`, `calendar`, …) |
| `DOC_SCREENSHOT=<file.png>` | Capture the window and quit (headless check) |
| `DOC_SCREENSHOT_DELAY=<ms>` | Delay before capture (default 2500) |

Demo data can also be loaded from **Settings → Data & sync → Load demo data**
(only when the database is empty).
