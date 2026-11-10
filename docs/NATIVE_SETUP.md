# Native local setup

The application runs locally without Docker or hosting. PostgreSQL is the workstation's existing server at `127.0.0.1:5432`; application data is in `devmaster-website`. Credentials are stored only in ignored `backend/.env`. Tests use the separate `devmaster-website_test` database. The older workspace PostgreSQL cluster is preserved and is no longer the application's connection.

## Start, status and stop

From the repository root, with PostgreSQL already running:

```sh
bash infra/scripts/native-services.sh start
python3 infra/scripts/native-app.py start
```

Keep the application supervisor terminal open. It starts Laravel, the built Next.js frontend, a Redis queue worker and the scheduler. It also owns a foreground SeaweedFS process when S3 is not already running, waits for HTTP and dependency readiness, and stops its children together on Ctrl+C. In another terminal:

```sh
python3 infra/scripts/native-app.py status
python3 infra/scripts/native-app.py stop
```

The services script manages only workspace-owned Redis, Mailpit, ClamAV and SeaweedFS processes. It never initializes, replaces or stops the workstation's PostgreSQL server. `bash infra/scripts/native-services.sh stop` stops only recognized workspace service PIDs. Logs and PID records are under ignored `.runtime/`. Restarting the machine requires starting PostgreSQL and then these commands again; OS login services have not been installed.

## Local endpoints

| Component | Endpoint | Purpose |
|---|---|---|
| Website | http://localhost:3000 | Public site and same-origin Laravel proxy |
| Expert sign-in | http://localhost:3000/km/login | Approved, activated experts |
| Administration | http://localhost:3000/admin | Filament; mandatory authenticator MFA |
| Laravel | 127.0.0.1:8081 | API and Admin backend |
| PostgreSQL | 127.0.0.1:5432 | Supplied application/test databases |
| Redis | 127.0.0.1:56379 | Cache, sessions and queued jobs; AOF persistence |
| S3 | 127.0.0.1:58333 | SeaweedFS private `devmasters-private` bucket |
| ClamAV | 127.0.0.1:53310 | Private INSTREAM scanning |
| Captured email inbox | http://127.0.0.1:58025 | Mailpit; no external delivery |
| Captured email SMTP | 127.0.0.1:51025 | Laravel notification transport |

Use `localhost:3000` consistently in the browser for session cookies. PHP 8.4 uses the limits in `infra/php/`; the supervisor sets `PHP_INI_SCAN_DIR` automatically.

## Current workstation administrator

The user-requested local administrator has been created: `devmasters.codex@gmail.com`, display name **DevMasters Administrator**, status ACTIVE. Its current password is saved only in ignored `.runtime/local-admin-credentials.json` with owner-only file permissions (0600). Open that file locally to retrieve the password, then sign in at http://localhost:3000/admin/login.

Password sign-in has been verified in Chrome. At first sign-in choose **Set up** for the authenticator app, scan the QR code in your own authenticator, enter its six-digit code, enable it and save your recovery codes. The administrator cannot access protected resources before this enrollment. No authenticator secret or recovery codes were generated or retained by the setup procedure.

Local services and starter skill categories are initialized from the four disciplines in the supplied concept. The brand setting is DevMasters. Additional services/skills can be edited in the Admin Portal. Currencies remain USD/KHR development defaults. Privacy, terms and consent retain their clearly identified development wording; approved legal/business wording is deferred until production preparation.

The repeatable catalogue command is:

```sh
cd backend
php artisan devmasters:configure-local devmasters.codex@gmail.com --no-interaction
```

It requires local mode and an active ADMIN with settings permission. It fills missing records, preserves edited/inactive records, and records an audit event. It never creates experts, company requests, offers or placements.

## First administrator on another installation

No default account or reusable password is seeded. Generate a signed link, valid for 30 minutes:

```sh
cd backend
php artisan devmasters:setup-link
```

Open the printed link locally, choose your email and password, then enroll an authenticator at first login. Setup is disabled outside local mode and after the first administrator exists. The interactive alternative is `php artisan devmasters:create-admin your-email@example.com`.

Admins can invite staff and assign active custom roles. Staff invitations appear in Mailpit with a password setup link; privileged sign-in still requires MFA. Experts apply publicly, are reviewed and approved, then invited to activate. All development email is captured locally.

## Storage and recovery

This workstation uses native SeaweedFS 4.51 S3 storage. Object credentials are in ignored `.runtime/seaweedfs/credentials.json` and `backend/.env`; neither belongs in source control. S3 rejects anonymous bucket access. Laravel streams authorized CLEAN files; raw storage URLs are never exposed by the platform. Every file version has a server-generated key and SHA-256 checksum. Filament/Livewire temporarily stage uploads on the private local disk, then write the permanent version into S3. General local-disk HTTP serving is disabled. `PRIVATE_STORAGE_DRIVER=local` remains available as a documented alternate configuration.

Health check, including a disposable write/read/delete round trip:

```sh
cd backend
php artisan devmasters:doctor --write-storage
php artisan devmasters:backup
php artisan devmasters:verify-backup /absolute/directory/printed/by/backup
```

Backups default to private `backend/storage/app/backups/`. Each contains a PostgreSQL custom dump, every referenced private file version, and a checksum manifest. Verification restores to a randomly named disposable database, checks foreign keys and all referenced object checksums, then drops only that disposable database. It requires database-creation permission. The live database is not replaced. Keep an independent protected copy of backups and `APP_KEY` before moving machines; workstation-local backups alone do not protect against disk loss.

## Runtime dependencies

This workstation has PHP 8.4 and PostgreSQL 18 through Homebrew. Patched Redis 7.4.12, official SeaweedFS, Mailpit and ClamAV binaries are retained under ignored `.runtime/`. ClamAV was unpacked locally; its executable library paths were adapted and locally signed. Signature verification remains enabled. Configuration is in `.runtime/clamd.conf` and `.runtime/freshclam.conf`. Update signatures using that configuration.

On another machine install supported native packages, restore the ignored environment/runtime configuration securely, install Composer/npm dependencies, run migrations and build the frontend. Do not copy workstation binaries across OS/CPU types. Native Linux production templates are provided under `infra/` for a later deployment; they have not been deployed. No hosting information is required for the current local scope.

## Khmer and English

Open http://localhost:3000/km or http://localhost:3000/en. Unprefixed public routes use the saved cookie or Khmer default. Use the language select in the public header, Expert topbar or Filament topbar; an additional control is available inside Admin form modals. Switching keeps unsaved input and selected files. Signed-in selections are saved to the existing user account. Login restores that preference.

The localization migration is applied on both local databases. Original business records, filenames, contracts and workflow codes are unchanged. Services/skills have Khmer fields in Admin; public pages and notification templates retain separate locale versions. Missing editable translations fall back to English/original content. See [I18N_IMPLEMENTATION.md](I18N_IMPLEMENTATION.md) for the schema extension, fallback policy and coverage.

For a full native test run, use the same PHP settings as the application:

```sh
cd backend
PHP_INI_SCAN_DIR=:/Applications/XAMPP/xamppfiles/htdocs/DevMaster/infra/php RUN_NATIVE_INTEGRATION=1 php artisan test --compact
```

The absolute configuration path above is specific to this workstation; adapt it on another installation.
