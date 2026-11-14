# DocCentral Desktop — architecture

How the app is put together and why. For setup and day-to-day commands, see
the [README](../README.md).

- [Overview](#overview)
- [Local database](#local-database)
- [Data safety](#data-safety)
- [Authentication and access on a computer](#authentication-and-access-on-a-computer)
- [Cloud access rules (Supabase RLS)](#cloud-access-rules-supabase-rls)
- [Two-way sync](#two-way-sync)
- [Languages and right-to-left layout](#languages-and-right-to-left-layout)
- [Testing strategy](#testing-strategy)

## Overview

```
Renderer (React 18, sandboxed)
  pages/*.jsx → lib/repos.js → lib/dbx.js → window.dc.db ───┐
  lib/sync.js ───────────────────────────► Supabase (HTTPS) │
                                                            │ IPC via preload.js
Main process (Electron)                                     │
  main.js → db.js ◄─────────────────────────────────────────┘
            sql.js (SQLite in WASM) ↔ userData/doccentral.db
```

- The renderer runs with `contextIsolation` and `sandbox`; it reaches the
  database only through the small IPC bridge in `preload.js`
  (`window.dc.db.all / get / run`).
- Pages never write SQL directly: they call repositories (`src/lib/repos.js`),
  which hold the business rules (invoice totals, payment validation, stock
  adjustments, day closeout).
- The app is **offline-first**: the local database is the source of truth for
  the UI, and sync runs in the background.

## Local database

- **Engine:** sql.js (SQLite compiled to WASM) in the main process, persisted
  to `userData/doccentral.db` (`%APPDATA%\DocCentral` on Windows).
- **Schema:** mirrors the Flutter app's Drift tables. Every table carries the
  sync metadata `id` (UUID), `created_at`, `updated_at`, `deleted_at`
  (soft delete) and `sync_status`.
- **Clinic scoping:** clinic-owned tables carry `clinic_id`, stamped
  automatically on insert by `src/lib/dbx.js`.
- **Migrations:** `migrate()` in `db.js` runs on every start and is
  idempotent (adds missing columns, backfills `clinic_id`, creates
  `sync_state`).

## Data safety

- **Atomic saves:** each save writes a temp file, `fsync`s it and renames it
  over `doccentral.db`, so a crash or power cut mid-save cannot leave a
  half-written database.
- **Daily backups:** the first save of each day also writes a copy of the
  database to `userData/backups/doccentral-YYYY-MM-DD.db`; the newest 7 are
  kept.
- **Recovery on start-up:** the database is checked with
  `PRAGMA integrity_check`. If it is damaged, it is kept aside as
  `doccentral.db.corrupt-<timestamp>`, the newest good backup is restored,
  and the user is told what happened. If no backup is usable, the app starts
  empty and says so; with sync enabled, signing in pulls the clinic back from
  the cloud.

## Authentication and access on a computer

- Supabase email + password. Sessions persist across restarts and work
  offline.
- The first sign-up on an empty computer creates the clinic, the owner
  (Dentist) and the default roles.
- Who may open the app on a computer is decided in one place,
  `src/lib/access.js` (`decideAccess`), from the local clinic, the local user
  and the account's cloud membership:
  - **open** — a known member of this computer's clinic;
  - **pull** — an empty computer and a member of a cloud clinic: download it;
  - **provision** — an empty computer and a brand-new account;
  - **refuse** — anyone else (for example, an account from another clinic).
- Staff are added by the owner from Settings; they can then sign in on their
  own computer and receive the clinic.

## Cloud access rules (Supabase RLS)

Defined in `supabase/migrations/`:

- `0001_init_doccentral.sql` — tables, with Row Level Security **on and no
  policies** (deny by default), so re-running it can never re-open access.
- `0002_clinic_isolation_and_sync.sql` — clinic isolation and sync support:
  - every row carries `clinic_id`; `is_clinic_member(clinic_id)` (a live row
    in `users` for `auth.uid()`) gates select, insert and update;
  - nobody can add themselves to another clinic — only existing members, or
    the clinic's creator adding themselves as its first user;
  - hard deletes are not allowed (there is no delete policy); deletes are
    soft, through `deleted_at`;
  - a single-clinic project has its existing rows assigned to that clinic
    automatically.

Both files are idempotent and can be re-run safely.

## Two-way sync

`src/lib/sync-core.js` (pure logic, tested without Supabase) and
`src/lib/sync.js` (the Supabase adapter and scheduling).

- **When:** every 60 seconds, on reconnect, and on demand from Settings. Only
  one sync runs at a time.
- **Push:** local rows with `sync_status = 'pending'` are upserted in batches.
  A row is marked synced only if it hasn't changed meanwhile
  (`WHERE updated_at = ?`). If a batch is rejected by RLS, rows are retried
  one by one so a single bad row doesn't block the rest.
- **Pull:** per table, rows changed since a cursor are fetched in pages,
  ordered by `server_updated_at, id` (keyset paging). The cursor is
  `server_updated_at`, stamped by the server, because device clocks can't be
  trusted; a short overlap window re-reads the boundary so nothing committed
  late is missed.
- **Conflicts:** last write wins on `updated_at`, enforced server-side by the
  `dc_sync_guard` trigger (an older write is ignored), and locally on pull.
- **Deletes:** soft deletes (`deleted_at`) sync like any other change.

## Languages and right-to-left layout

- All user-facing text goes through `t()` (`src/lib/translate.js`). English
  is the key; French and Arabic live in `src/lib/locales/fr.js` and `ar.js`.
  Placeholders are filled after translation, so whole sentences are
  translated, never fragments:

  ```js
  t('Save')
  t('{n} appointments', { n })
  ```

- Dates, times and amounts are formatted for the current language
  (`locale()`).
- Arabic switches the document to `dir="rtl"`. CSS uses logical properties
  (`margin-inline-start`, `inset-inline-end`, `text-align: start` …);
  directional icons flip with `.dir-flip`; phone numbers and emails stay
  left-to-right inside `<bdi className="ltr">`.
- **Default language:** the Windows display language if it is French or
  Arabic, otherwise English. A language picked in Settings or on the sign-in
  screen is remembered and wins; *Settings → Language → Same as this
  computer* goes back to following Windows.
- `scripts/i18n-audit.mjs` parses the source and lists text that bypasses
  `t()` and keys missing a translation; the unit tests fail on either.

## Testing strategy

| Layer | Tool | What it proves |
| --- | --- | --- |
| Persistence | `node:test` | atomic saves, backups, recovery from a corrupt file |
| Cloud rules | `node:test` + PGlite | RLS on a real Postgres: isolation between clinics, no self-joining, no hard deletes, idempotent migrations |
| Sync | `node:test` + PGlite | two simulated computers: push, pull, paging, conflicts, soft deletes, staff joining |
| Access | `node:test` | every `decideAccess` outcome |
| Translations | `node:test` + audit | no untranslated text, no missing keys, placeholders preserved |
| End-to-end | Playwright + Electron | the real app: every page, billing, calendar, inventory, closeout, every screen in Arabic and French, default language — with screenshots and videos |

PGlite runs Postgres in WASM with small stubs for Supabase's roles and
`auth.uid()`, so the cloud rules are tested without a Supabase project.
