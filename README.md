# Dentora Patient Records

Desktop-capable patient record handler built with Next.js + Electron.

## Features

- Add, edit, delete patient records
- Search by patient name, phone, or condition
- Embedded SQLite storage in Electron
- Browser localStorage fallback during web development
- Build Windows executable installer (`.exe`) using Electron Builder

## Run in development mode

```bash
npm run dev
```

Open `http://localhost:3000`.

## Run as desktop app locally

```bash
npm run desktop
```

This command builds the Next.js static output and opens Electron.

## Local database architecture

The packaged Electron application stores data in `data/dentora.db` beneath
Electron's `userData` directory. SQLite is owned exclusively by the Electron
main process; the Next.js renderer uses a restricted preload/IPC bridge and
never receives filesystem or raw SQL access.

Patients, visits, treatments, payments, and doctors use normalized tables.
Settings and small application documents use a JSON document table. Writes are
transactional, foreign keys cascade visit data when a patient is deleted, and
WAL mode is enabled for reliable local operation.

On first launch after upgrading, an existing `data/dentora-db.json` file is
imported into SQLite and renamed to `dentora-db.json.migrated` as a backup.
Development at `http://localhost:3000` continues to use localStorage because a
regular browser cannot connect directly to the Electron main process.

No local HTTP API or database server is required. A remote API can be added
later as a separate synchronization layer if multi-device access is needed.

## Build executable (.exe)

```bash
npm run dist
```

After completion, installer output will be in:

- `dist/`

Typical file name:

- `Dentora Patient Records Setup <version>.exe`

## Database tests

```bash
npm run test:database
```
