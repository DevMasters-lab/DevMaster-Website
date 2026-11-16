# DevMasters

A Next.js public website and Expert Portal with a Laravel REST API and Filament Admin Portal. PostgreSQL preserves the agency workflow: anonymous requests → manual matching → versioned offers → expert response → separate management selection → placement history.

**Runs natively without Docker.** No NestJS, Prisma, Express, company accounts, tasks, timesheets or deliverable management are included.

## Current implementation

- Laravel 13.42, PHP 8.4, Filament 5.11, Sanctum cookie authentication and Spatie permissions.
- Next.js 16.4, React 19, TypeScript, Tailwind 4, React Hook Form, Zod, TanStack Query and next-intl.
- Khmer (default) and English across public, Expert and Filament interfaces, persistent preferences, localized API errors, content and notifications.
- All 42 documented domain tables and 442 source columns, 80 simple foreign keys, composite consistency checks, 37 enums, history guards and database indexes.
- Public homepage, privacy and terms pages; Laravel-connected bid and expert-partnership forms. Expert signup, sign-in and recovery are local previews. The existing expert REST APIs remain available.
- Nine Filament resources for company requests, private documents and versions, public pages, users, roles, permissions, notification templates and settings, plus Dashboard and Security. Request review, requested-role/history tabs, staff invitations, CMS editing and private uploads remain. Retired admin modules and their page folders have been removed; their domain services, APIs, data and background jobs are preserved. See the [admin audit and deletion manifest](docs/BACKEND_ADMIN_AUDIT.md).
- Native private S3-compatible storage on this workstation; local filesystem support is also available. Upload quarantine and native ClamAV scanning. Redis queues/cache/sessions, transactional outbox and local Mailpit inbox.

See the [project cleanup report](docs/PROJECT_CLEANUP_REPORT.md) for the current folder structure, dependency audit, and verification results.

See [Khmer/English support](docs/I18N_IMPLEMENTATION.md), [native runtime setup](docs/NATIVE_SETUP.md), [implementation progress](docs/IMPLEMENTATION_PROGRESS.md), [architecture and decisions](docs/ARCHITECTURE.md), [API contract](docs/API.md), and [verification](docs/VERIFICATION.md) for boundaries and exact results. The current scope is local only. Hosting is deferred at the user’s request; legal pages retain explicit development wording.

## Run on this workstation

The supplied PostgreSQL database is connected and migrated. No reinstallation or environment overwrite is needed:

```sh
bash infra/scripts/native-services.sh start
python3 infra/scripts/native-app.py start
```

Open `/km` for Khmer or `/en` for English; the language menu preserves the current page and entered form data. Filament remains at `/admin` with its own synchronized language menu.

Use `python3 infra/scripts/native-app.py status` or `stop` in another terminal. The local administrator is `devmasters.codex@gmail.com`. Its current password is in ignored `.runtime/local-admin-credentials.json` (owner-only permissions). Sign in at `/admin`; optional authenticator setup is under **Settings → Security**. For another fresh installation, run `php artisan devmasters:setup-link` in `backend` to create the first administrator.

## Prerequisites for another workstation

PHP 8.4 with bcmath, intl, mbstring, sodium, zip, fileinfo and pdo_pgsql; Composer; Node.js 22.12+; PostgreSQL 18 with `btree_gist`; Redis 7.4.12+; ClamAV and current signatures. Mailpit captures development email locally. PostgreSQL and Redis bind to loopback in development.

```sh
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Set PostgreSQL, Redis, storage, and email values in .env first.
php artisan migrate --force
php artisan db:seed --force
php artisan devmasters:create-admin your-email@example.com
```

The administrator command prompts privately for a password. Administrators can enable authenticator MFA under **Settings → Security**; enabled accounts still require an authenticator code at sign-in. No default production credentials are seeded. Expert APIs retain application approval and account-activation requirements, but the current public expert dialogs do not submit applications or authenticate. Staff setup and recovery use the native `/admin/password-reset` pages, including invited accounts. Retired expert frontend setup/correction destinations are documented in the admin audit.

```sh
cd frontend
npm ci
npm run build
npm run start -- --port 3000
```

For local development, run `php artisan serve --host=127.0.0.1 --port=8081` in `backend`, and `npm run dev -- --port 3000` in `frontend`. The frontend proxies Laravel paths through the same browser origin. Never run the PHP development server as a production web server.

In separate backend terminals:

```sh
php artisan queue:work --timeout=180 --tries=5
php artisan schedule:work
```

The scheduler dispatches committed outbox events and expires unanswered offers. Mailpit’s local inbox is [http://127.0.0.1:58025](http://127.0.0.1:58025). Local endpoints: website and expert previews [http://localhost:3000](http://localhost:3000), administration [http://localhost:3000/admin](http://localhost:3000/admin).

## Tests

Create a separate `devmaster-website_test` PostgreSQL database. The backend suite does not use SQLite. Concurrency tests write tagged fixtures to the test database; other tests roll back their transactions. Never point tests at a production database.

```sh
cd backend
DB_DATABASE=devmaster-website_test php artisan migrate --force
php artisan test
```

```sh
cd frontend
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Playwright uses locally installed Google Chrome by default. E2E tests require the native servers and the disposable fixture described in `docs/VERIFICATION.md`. No backend response mocking is used by E2E tests. `infra/scripts/restore-drill.sh` runs the native S3/ClamAV/backup integration test with a disposable restored database. `php artisan devmasters:backup` and `devmasters:verify-backup <directory>` provide normal local backup/recovery verification.

## Deployment

See `infra/nginx.conf.example` and `infra/systemd/`. Use a TLS-enabled same-origin reverse proxy, PHP-FPM, Next.js, managed/native PostgreSQL and Redis, private local/S3 storage, ClamAV, a queue worker and scheduler. Set `APP_ENV=production`, `APP_DEBUG=false`, secure cookies and a real mail provider. Keep `.env`, `.runtime`, database backups and private storage out of the web root and Git. Point any Apache/XAMPP backend virtual host at `backend/public`, never the repository root.

The supplied requirements and database source files are retained under `docs/source/`. The provided logo is retained as `assets/Logo.jpg` and copied to the frontend public assets.
# DevMaster-Website
