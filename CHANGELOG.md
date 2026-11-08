# Changelog

All notable changes to Dentora are documented here. Versions follow
[Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`. While the app
is pre-1.0, `MINOR` bumps mark new features and `PATCH` bumps mark fixes/tweaks;
`MAJOR` is reserved for breaking changes or the 1.0 release.

## [0.8.1]

### Changed
- All patient balances, treatment prices, visit totals, and payments now use
  Indian Rupee (`₹`) formatting with Indian digit grouping.

## [0.8.0]

### Added
- Embedded SQLite database owned by the Electron main process, with normalized
  tables for patients, visits, treatments, payments, and doctors.
- Narrow preload/IPC operations for collections, individual records, and app
  documents; the renderer has no filesystem or raw SQL access.
- Transactional record writes, foreign-key cascades, WAL mode, schema
  versioning, and focused SQLite CRUD/migration tests.
- Automatic one-time import of the previous `dentora-db.json`, which is retained
  as a `.migrated` backup after successful conversion.

### Changed
- Patient and doctor repositories now use record-level upsert/delete operations
  instead of rewriting their entire SQLite tables.
- Browser development retains localStorage as an intentional fallback; packaged
  Electron builds require no local HTTP API or separate database server.

## [0.7.1]

### Changed
- Replaced the previous patient samples with six fresh Indian test records
  covering no-visit, paid, partial, pending, outstanding, and credit scenarios.

## [0.7.0]

### Added
- Patient Profile editing with prefilled contact, age, gender, address, and
  emergency-contact details.
- Patient record deletion from the editor, protected by a confirmation step
  that clearly warns visit and treatment history will also be removed.

### Changed
- New and edited patient profiles now share the same form fields and Indian
  mobile-number handling.

## [0.6.2]

### Fixed
- Standardized dropdown arrows with consistent right padding and vertical
  alignment so they no longer touch the input border.

## [0.6.1]

### Changed
- Patient and emergency mobile fields now keep a fixed `+91` prefix and accept
  exactly 10 user-entered digits.
- The New Patient form now uses a full-width name field, followed by paired
  phone/email and age/gender rows for a balanced full-screen layout.
- Existing locally stored phone numbers and bundled patient samples are
  normalized to the Indian mobile-number format.

## [0.6.0]

### Added
- Gender information in patient creation and the Patient Profile demographics.

### Changed
- Replaced date-of-birth capture and display with age. Existing local patient
  records automatically convert their saved birth date into an age on load.

## [0.5.0]

### Added
- Quick-entry patient creation from the Patients page. Doctors can record a
  patient's required name and phone number plus optional email, date of birth,
  address, and emergency contact details.
- New records are saved to the local JSON database with generated initials,
  a "New" tag, zero balance, and an empty visit history, then opened directly
  in Patient Profile so a visit can be added next.

## [0.4.0]

### Added
- Patient Profile screen at `/patients/profile?id=<id>`, linked from each row's
  "View Profile" action on the Patients list.
  - Profile header: avatar, name, phone/email/last-visit, and treatment tags.
  - **Overview** tab: Demographics (date of birth, address, emergency
    contact) and a Financial Summary (total outstanding, total visits, last
    payment date).
  - **Visits & Treatments** tab: full visit history, newest first, each
    showing its type/status badges, treatments with prices, payments with
    method/masked reference/date, and free-form notes.
  - A "Visit Status" color group (Paid/Partial/Pending badges) added to the
    Settings theme editor, following the same configurable-token pattern as
    the rest of the palette.
- Patient records gained demographics (`dateOfBirth`, `address`, emergency
  contact) and a `visits` history, seeded with realistic sample data that's
  consistent with each patient's existing outstanding balance.
- Shared `formatDate`/`formatCurrency` helpers (`src/lib/format.ts`) used by
  both the Patients list and the new profile screen.

## [0.3.0]

### Removed
- Consent tracking removed from the Patients screen: the "Consent Status"
  column, its filter dropdown, the "Upload Consent" action, and the
  `consentStatus` field on patient records.
- The "Consent Status" color group removed from the Settings theme editor,
  and the sidebar link renamed from "Patients & Consent" to "Patients".

## [0.2.0]

### Added
- Doctor profile switcher in the topbar: view every clinician, switch the
  active one, add a new profile, and edit an existing profile's name/role.
- Profile picture upload for doctors, automatically center-cropped to a square
  and downscaled before being stored.
- Delete-profile flow with an inline confirmation step; the last remaining
  profile can't be deleted, and deleting the active profile falls back to
  another one automatically.
- Full theme system: ~37 configurable color tokens grouped by UI area, with
  Light/Dark presets editable from the Settings page (swatch + hex input +
  per-token reset, plus a reset-all-colors action).
- Electron-ready local JSON database abstraction (`src/lib/localDb.ts`) that
  writes to a JSON file under Electron and falls back to `localStorage` in the
  browser, so the app is ready to ship as a Windows executable later.
- Patient records and the doctor directory are now seeded from JSON and read
  through repository modules instead of being hardcoded in components.

### Changed
- Sidebar can collapse to an icon-only rail via the topbar hamburger button,
  and now does so automatically below 900px width.
- Sidebar is fixed in place and no longer scrolls with page content; only the
  main content area scrolls.
- Settings page color pickers no longer overlap or overflow at any screen
  width.

## [0.1.0]

### Added
- Initial replica of the Figma "DentalCare Pro" dental clinic management
  design.
- Sidebar + topbar application shell.
- Patients & Consent screen: search, status filter, and a table with avatars,
  tags, colored balances, and consent status badges.
