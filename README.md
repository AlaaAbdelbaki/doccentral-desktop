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

## Build the Windows installer

```bash
npm run dist     # → release/DocCentral-Setup-<version>.exe (NSIS, per-user install)
npm run pack     # unpacked app in release/win-unpacked/ for a quick check
```

App icon: `build/icon.svg` (tooth) is the source; `build/icon-alt-d.svg` is an
alternative "D" monogram kept for reference. After editing an SVG, run
`npm run icons` to regenerate the 1024px PNGs (electron-builder derives the
Windows `.ico` from `build/icon.png`).

The installer is not code-signed yet, so Windows SmartScreen shows an
"unknown publisher" warning on first run (More info → Run anyway).
Uninstalling keeps the clinic data in `%APPDATA%\DocCentral`.

## Data safety

- Saves are atomic (temp file + fsync + rename), so a crash or power cut
  mid-save cannot corrupt `doccentral.db`.
- A backup is kept per day in `userData/backups/` (newest 7).
- If the database is found damaged on start-up, it is kept aside as
  `doccentral.db.corrupt-<timestamp>`, the newest good backup is restored,
  and the user is shown what happened.

## Tests

```bash
npm run test:unit        # database persistence (node:test)
npm run test:e2e         # Playwright end-to-end, drives the real app
npm run test:e2e:report  # HTML report with screenshots + videos
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
