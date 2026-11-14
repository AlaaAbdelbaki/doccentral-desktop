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
- **Sync** — two-way, every 60s and on reconnect (`src/lib/sync-core.js`).
  Pending local rows are pushed; changes from other devices are pulled by a
  server-stamped `server_updated_at` cursor (device clocks aren't trusted).
  Conflicts: the newest `updated_at` wins, enforced server-side. A fresh
  computer downloads the clinic on first sign-in. Offline, everything keeps
  working and syncs later.
- **Cloud access rules** — every row carries `clinic_id`; Supabase Row Level
  Security limits each account to the clinics it belongs to (a live row in
  `users`). Nobody can add themselves to another clinic; hard deletes are
  blocked. On a computer that already holds a clinic, only its members can
  sign in.
- **Renderer** — React 18 bundled with esbuild; UI → repository → IPC bridge.

### Cloud setup (once per Supabase project)

Run `supabase/migrations/0001_init_doccentral.sql` then
`0002_clinic_isolation_and_sync.sql` in the Supabase SQL editor — or use
**Settings → Data & sync → Copy migration SQL**, which bundles both. Both are
idempotent. A project holding exactly one clinic has its existing rows
assigned to it automatically.

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

## Languages (EN / FR / AR)

All user-facing text goes through `t()` (`src/lib/translate.js`); English is
the key, French and Arabic live in `src/lib/locales/fr.js` and `ar.js`.

```js
t('Save')                              // plain text
t('{n} appointments', { n })           // placeholders: translate whole sentences, never fragments
```

Dates, times and amounts follow the chosen language (`locale()`); Arabic
switches the layout to right-to-left (CSS uses logical properties such as
`margin-inline-start`, so new styles should too).

**Default language:** the PC's Windows display language if it's French or
Arabic, otherwise English. A language picked in Settings or on the sign-in
screen is remembered and wins; *Settings → Language → Same as this computer*
goes back to following Windows.

When adding UI text: wrap it in `t()`, add the key to both locale files, then
run `node scripts/i18n-audit.mjs` — it lists any text that bypasses `t()` and
any key missing a translation. `npm run test:unit` fails on either, and the
e2e suite opens every screen in Arabic and French and fails on leftover
English.

## Tests

```bash
npm run test:unit        # persistence, cloud access rules and two-device sync
                         # (real Postgres via PGlite — no Supabase needed)
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
