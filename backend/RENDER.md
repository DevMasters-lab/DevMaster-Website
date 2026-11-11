# DevMasters API on Render Free

This runbook deploys the existing Laravel backend from `DevMasters-lab/DevMaster-Website` to `https://api.devmasters.dev`, using the existing Neon project `devmaster-website` in Singapore. It does not create or replace a database. Render builds Docker remotely; Docker Desktop is not required on the Mac.

## Application and container

The lock file contains Laravel **13.39.0**, Sanctum **4.3.3**, Filament **5.11.0**, and Livewire **4.4.8**. Although `composer.json` allows PHP `^8.3`, locked Symfony dependencies require **PHP 8.4.1 or newer**. The Dockerfile uses PHP 8.4 with Apache and installs the production dependencies from `composer.lock`, without development packages.

Apache serves only `public/`, enables rewriting, and listens on `0.0.0.0` at Render's `PORT`. Configuration and view caches are generated at runtime after secrets are available. `.env` files, Composer credentials, local storage, and cached local configuration are excluded from the image. Keep secrets in Render environment variables; do not add Docker build arguments containing secrets. [Render Docker documentation](https://render.com/docs/docker).

Supervisor runs Apache and `php artisan schedule:work`. The synchronous queue executes jobs dispatched by the existing minute-by-minute outbox schedule. PostgreSQL stores HTTP sessions and cache/locks. The new infrastructure migration creates `laravel_sessions`, `cache`, and `cache_locks`; it preserves the application's existing `sessions` business table, which has a different schema. There is no separate Redis service or paid Render worker requirement.

## Render settings

Create **New → Web Service** and select the existing GitHub repository:

| Setting | Value |
| --- | --- |
| Name | `devmasters-api` |
| Repository | `DevMasters-lab/DevMaster-Website` |
| Branch | `main` |
| Language | Docker |
| Root Directory | `backend` |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` |
| Docker Command | Leave empty; use the image default |
| Region | Singapore |
| Instance Type | **Free** |
| Health Check Path | `/api/health` |
| Pre-deploy command | Leave empty |

The repository path is `backend/Dockerfile`; after choosing root directory `backend`, use the root-relative path `./Dockerfile` in Render.

## Render environment variables

Use `.env.render.example` as the safe template and enter values in the service's **Environment** section. Do not upload an actual `.env` file. Angle-bracket values below are placeholders to replace, not literal settings.

```dotenv
APP_NAME=DevMasters
APP_ENV=production
APP_DEBUG=false
APP_KEY=<persistent-existing-production-key-or-generate-once>
# APP_PREVIOUS_KEYS is optional: preserve real historical keys if rotation was used.
# APP_PREVIOUS_KEYS=
APP_URL=https://api.devmasters.dev
FRONTEND_URL=https://website.devmasters.dev
APP_LOCALE=km
APP_FALLBACK_LOCALE=en
LOG_CHANNEL=stderr
LOG_LEVEL=info

DB_CONNECTION=pgsql
DB_HOST=<exact-neon-hostname>
DB_PORT=5432
DB_DATABASE=neondb
DB_USERNAME=neondb_owner
DB_PASSWORD=<neon-role-password>
DB_SSLMODE=require
PGSSLCERT=/var/www/.postgresql/postgresql.crt

SESSION_DRIVER=database
SESSION_TABLE=laravel_sessions
SESSION_LIFETIME=120
SESSION_DOMAIN=.devmasters.dev
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
SANCTUM_STATEFUL_DOMAINS=website.devmasters.dev,api.devmasters.dev
TRUSTED_PROXIES=*
CACHE_STORE=database
QUEUE_CONNECTION=sync
RUN_MIGRATIONS=false
RUN_ADMIN_SEED=false

FILESYSTEM_DISK=private
PRIVATE_STORAGE_DRIVER=s3
AWS_ACCESS_KEY_ID=<private-storage-and-ses-access-key>
AWS_SECRET_ACCESS_KEY=<private-storage-and-ses-secret-key>
AWS_DEFAULT_REGION=<bucket-and-ses-region>
AWS_BUCKET=<existing-private-bucket>
AWS_USE_PATH_STYLE_ENDPOINT=false
LIVEWIRE_TEMPORARY_FILE_UPLOAD_DISK=local
CLAMAV_HOST=<reachable-protected-scanner-host>
CLAMAV_PORT=<scanner-tcp-port>

MAIL_MAILER=ses
MAIL_FROM_ADDRESS=<verified-ses-sender-address>
MAIL_FROM_NAME=DevMasters
ALLOWED_CURRENCIES=USD,KHR
CONSENT_VERSION=<existing-approved-consent-version>
```

Render supplies `PORT`; do not hardcode it. Leave `DB_URL` unset so it cannot override the individual Neon settings. Preserve the `APP_KEY` that encrypted existing MFA secrets and queued reset notifications, including when moving an existing database to Render. Only for a genuinely new installation with no encrypted data, write a key once into a permission-restricted, Git-ignored `.env.production` file using `php artisan key:generate --env=production --force --no-interaction`, then transfer it privately into Render. Never display, commit or regenerate an existing key on startup.

For S3-compatible providers, additionally set `AWS_ENDPOINT=https://<provider-endpoint>` and set `AWS_USE_PATH_STYLE_ENDPOINT` as that provider requires. For AWS S3, leave `AWS_ENDPOINT` unset. The current storage and SES configurations share `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_DEFAULT_REGION`. An S3-compatible provider's credentials usually cannot authenticate to AWS SES: use compatible AWS credentials for both, or arrange separate transport credentials/configuration before launch. Existing code does not use `AWS_ENDPOINT` as an SES endpoint.

The installed AWS SDK supports SES over HTTPS. Verify the sender/domain and SES sending permissions, including sandbox recipient restrictions if applicable. Render Free blocks outbound SMTP ports 25, 465 and 587, so ordinary SMTP settings are unsuitable. Do not use `MAIL_MAILER=log` for real password recovery or invitations. [Render Free restrictions](https://render.com/docs/free).

## Neon connection and production migrations

In the existing Neon project's **Connect** dialog, choose the intended branch, database `neondb`, and role `neondb_owner`. Copy its hostname and role password into Render secrets. Keep `DB_SSLMODE=require`; Laravel passes it to PostgreSQL's SSL connection configuration. [Neon secure connections](https://neon.com/docs/connect/connect-securely).

Use the **direct/unpooled** Neon hostname for migration administration. A pooled hostname may be used for normal requests after checking application behavior. Do not infer the endpoint from the project name. The migrations require PostgreSQL and `btree_gist`, which Neon supports. [Neon supported extensions](https://neon.com/docs/extensions/pg-extensions).

1. Back up the existing production database and private objects off-host. Verify recovery before schema changes. Rehearse pending migrations against a separate Neon branch copied from the production branch.
2. Inspect migration history and schema. The initial migration creates enums and tables without `IF NOT EXISTS`; if tables already exist but migration records are absent, reconcile that history with a reviewed plan before running anything. Never substitute a database reset.
3. Review pending SQL and apply migrations once using the same checked-out commit and production secrets. A local PHP 8.4 environment with Composer dependencies can perform this without Docker or a paid Render shell. Put production values in the already-ignored `backend/.env.production`, restrict that file to your user, and use the direct Neon host. Do not replace the local `.env`.

   ```sh
   cd backend
   chmod 600 .env.production
   php artisan config:clear --env=production --no-interaction
   php artisan migrate:status --env=production --no-interaction
   php artisan migrate --pretend --env=production --no-interaction
   # Only after backup, rehearsal and SQL review:
   php artisan migrate --force --env=production --no-interaction
   ```

   Ensure exported shell variables do not override this environment file. Do not run automated tests with production credentials. Remove the temporary production file securely when administration is finished.

4. Alternatively, after the same review and backup, temporarily set Render `RUN_MIGRATIONS=true` for one deployment. Startup runs ordinary `migrate --force`, then starts the server. Set it back to `false` immediately after successful migration. This flag is an explicit opt-in and persists until changed; it is not automatically consumed. Avoid simultaneous migration runs or overlapping deployment administration.
5. Normal startup does not seed users. First-time administrator initialization is a separate explicit opt-in described below. `RolesAndPermissionsSeeder` now adds missing built-in permissions without removing existing grants; it does not reset users, passwords or MFA.

## Initialize the first production administrator once

The previous `DatabaseSeeder` created only roles and permissions, and Docker startup did not execute a user seeder. The interactive `devmasters:create-admin` command is not a suitable unattended startup command. The production bootstrap class is now **`Database\Seeders\AdministratorSeeder`**, registered in `DatabaseSeeder` only when `RUN_ADMIN_SEED=true`.

In Render → **devmasters-api → Environment**, retain the working application/database secrets and add these temporary settings privately:

```dotenv
RUN_ADMIN_SEED=true
ADMIN_EMAIL=<your-initial-administrator-email>
ADMIN_PASSWORD=<private-password-at-least-12-characters>
ADMIN_NAME=DevMasters Administrator
```

`ADMIN_NAME` is optional. Use a unique password; never put it in Git, a command argument, logs or chat. These values are read directly from the runtime environment, and the password is not stored in Laravel's configuration cache. For the deployed temporary hostname, use `APP_URL=https://devmasters-api.onrender.com`. Keep `APP_ENV=production`, `APP_DEBUG=false`, `DB_CONNECTION=pgsql`, `DB_DATABASE=neondb`, the actual `.neon.tech` host and `DB_SSLMODE=require`. Preserve the existing `APP_KEY` and legitimate previous keys. Leave `RUN_MIGRATIONS=false` if the existing migrations have already been applied.

1. Save the environment changes and deploy the commit containing this seeder. Startup checks the runtime configuration and database schema before invoking only this administrator seeder with `--force --no-interaction`.
2. The seeder verifies the effective PostgreSQL target is Neon `neondb` with SSL. It takes the existing first-admin advisory lock, creates missing canonical roles/permissions additively, hashes the password using the User model, creates an active verified user, assigns the `ADMIN` role with the `web` guard, and records `administrator.bootstrapped` in one transaction. Any failure rolls back these changes and prevents Apache from starting. No account setup HTTP endpoint is added; MFA remains required.
3. Look for `Administrator initialized successfully` in the deployment logs. If the same active administrator already exists with `admin.access`, the seeder reports that initialization is already complete and leaves its password, MFA and permissions unchanged, even if `ADMIN_PASSWORD` has changed or is absent. A matching non-admin/inactive user, an inactive/conflicting ADMIN role, or an existing administrator with a different email causes a safe failure. Resolve that existing account through the normal administration/recovery process; this bootstrap will not promote or reset it.
4. After success, set **`RUN_ADMIN_SEED=false`**, remove **`ADMIN_PASSWORD`**, and optionally remove `ADMIN_EMAIL`/`ADMIN_NAME`, then save and redeploy. The flag is not automatically consumed in Render; it otherwise remains enabled across restarts. Startup removes bootstrap variables from the server/scheduler child environment after the seeder succeeds.
5. Sign in at `https://devmasters-api.onrender.com/admin/login` and complete mandatory authenticator MFA enrollment. For this direct temporary hostname, leave `SESSION_DOMAIN` unset/empty so the browser can retain its secure cookie. Keep CSRF and secure cookie settings enabled. Use `.devmasters.dev` when using the custom API subdomain and shared domain flow.

The administrator resides in PostgreSQL and survives Render restarts. This code adds no migration. Missing application/authentication tables must be addressed by reviewing and applying the existing ordinary migrations above, not by resetting the database. Do not run broad or unrelated business seeders against production.

### Local Mac alternative

Use PHP 8.4 and the same checked-out commit/dependencies. Put the production connection and bootstrap variables above in the Git-ignored, user-only `backend/.env.production`, keeping the local `.env` unchanged. Confirm `DB_DATABASE=neondb`, the direct Neon host and SSL before proceeding. Clear any stale configuration cache and ensure exported shell variables do not override the file:

```sh
cd backend
chmod 600 .env.production
php artisan config:clear --env=production --no-interaction
php artisan db:seed --class='Database\Seeders\AdministratorSeeder' --env=production --force --no-interaction
```

After success, disable the flag and remove the temporary password from the private environment file, or securely remove the file. Do not run tests using that environment. The seeder refuses non-production/local database targets outside the isolated test environment. Docker and a paid Render shell are unnecessary. Avoid overlapping local and Render administration runs.

### Read-only administrator verification

In the existing Neon SQL editor for the intended branch/database `neondb`, run this query using the actual email. It returns account/role status and the required permission without selecting passwords, hashes or MFA secrets:

```sql
SELECT u.email, u.status, r.name AS role, r.guard_name, r.is_active,
       EXISTS (
           SELECT 1 FROM role_permissions rp
           JOIN permissions p ON p.id = rp.permission_id
           WHERE rp.role_id = r.id AND p.name = 'admin.access' AND p.guard_name = 'web'
       ) AS has_admin_access
FROM users u
JOIN user_roles ur ON ur.user_id = u.id AND ur.model_type = 'App\Models\User'
JOIN roles r ON r.id = ur.role_id
WHERE u.email = '<your-initial-administrator-email>' AND r.code = 'ADMIN';
```

Expect an `ACTIVE` user, active `ADMIN` role, `web` guard and `has_admin_access=true`. Keep the existing local setup-link route unavailable in production.

Validation of this initialization change: **136 tests passed, 643 assertions, one external integration test skipped**. The new seeder tests use local PostgreSQL transactions and temporary tables. They cover password hashing, administrator access, additive grants, repeat-run password/MFA preservation, conflicting accounts/roles, rollback and sanitized errors. Shell tests verify that seeding failure stops server startup and bootstrap variables are removed before server launch. POSIX shell syntax, PHP lint, Pint and whitespace checks passed. No production seed/migration or Docker build was run; live account/role verification remains required after the explicitly enabled deployment.

## Persistent files and background work

Configure a private S3-compatible bucket before accepting applications, uploads or reports. Existing uploads, quarantine objects and exports already use the private disk. Preserve existing object keys when moving files and copy existing objects to the configured bucket. Keep backup copies outside Render. Local temporary uploads and generated export scratch files may remain ephemeral.

Provide a reachable, access-controlled ClamAV TCP endpoint. Documents remain quarantined when the scanner cannot complete; the deployment does not disable this protection. Scans, business email, reports, password-reset jobs and offer expiration depend on the configured services and scheduler. The existing platform doctor also checks Redis independently of selected drivers, so its Redis warning does not by itself diagnose this database-backed deployment.

Render Free sleeps after idle periods, loses local changes on restarts, and has no interactive shell or one-off jobs. The scheduler pauses while asleep, resumes on wake, and processes eligible outbox work afterward. Offer expiration and scheduled work can be delayed. This Free setup cannot promise continuous background processing; external storage, scanning and email have their own availability and provider costs. [Render Free behavior](https://render.com/docs/free).

The image includes Bookworm's PostgreSQL 15 client for existing administration commands. Its `pg_dump` cannot back up a newer PostgreSQL server. Check the Neon server version and run backups off-host with a matching or newer client. Container-local backup archives disappear on restart and must never be your only recovery copy.

## Deploy and connect the frontend

1. Commit and push only the reviewed deployment changes to the existing `main` branch. Preserve unrelated working-tree changes.
2. Create the Render service with the settings above and fill its environment values. Complete migrations through the reviewed approach above before relying on session-backed routes.
3. Deploy and inspect build/runtime logs. Confirm Apache and scheduler both start. Test `/api/health` using the **actual** hostname assigned by Render.
4. Complete custom-domain DNS and TLS below.
5. In Vercel, set production `LARAVEL_URL=https://api.devmasters.dev` and `FRONTEND_URL=https://website.devmasters.dev`, then redeploy the frontend so Next.js rewrites use the new destination. Do not add `NEXT_PUBLIC_API_URL`: this application already uses server-side `LARAVEL_URL` and same-origin browser paths.

The browser calls `/api/v1/*` and `/sanctum/csrf-cookie` on `website.devmasters.dev`; Next.js proxies them to Laravel. Existing code includes credentials, retrieves CSRF cookies, and sends `X-XSRF-TOKEN`. Shared `.devmasters.dev` cookies, HTTPS, exact-origin CORS with credentials, and the configured stateful domains support this flow. `SameSite=lax` permits these same-site HTTPS subdomains. Keep the API version prefix and existing JSON error handling unchanged.

## Hostinger DNS for api.devmasters.dev

1. Render → service → **Settings → Custom Domains**: add `api.devmasters.dev`.
2. Hostinger → `devmasters.dev` → **DNS / Nameservers → DNS Zone Editor**: add the record below. Use the hostname Render actually assigned, which can differ from the service name.

   | Type | Name | Target | TTL |
   | --- | --- | --- | --- |
   | CNAME | `api` | `<actual-assigned-service>.onrender.com` | Default |

   Enter a hostname only in Target: no `https://` and no path. Replace conflicting `api` A/AAAA/CNAME records only. Preserve `website`, apex, mail and other DNS records; no nameserver change is required when Hostinger already hosts the authoritative zone. [Hostinger CNAME instructions](https://www.hostinger.com/support/4738777-how-to-manage-cname-records-at-hostinger/), [Render subdomain DNS instructions](https://render.com/docs/configure-other-dns).

3. Return to Render and click **Verify** after propagation. Render provisions and renews the HTTPS certificate. Wait for both DNS verification and certificate readiness before switching Vercel. [Render custom domains](https://render.com/docs/custom-domains).

## Deployment checks

These commands display status and CORS headers without printing cookies or secret values:

```sh
curl --fail --silent --show-error https://api.devmasters.dev/api/health
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' \
  https://api.devmasters.dev/api/v1/reference-data
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' \
  https://website.devmasters.dev/api/v1/reference-data
curl --silent --show-error --dump-header - --output /dev/null \
  --request OPTIONS https://api.devmasters.dev/api/v1/auth/login \
  --header 'Origin: https://website.devmasters.dev' \
  --header 'Access-Control-Request-Method: POST' \
  --header 'Access-Control-Request-Headers: content-type,x-xsrf-token' \
  | awk 'BEGIN { IGNORECASE=1 } /^HTTP\// || /^[Aa]ccess-[Cc]ontrol-/ || /^[Vv]ary:/ { print }'
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' \
  --header 'Accept: application/json' \
  https://website.devmasters.dev/sanctum/csrf-cookie
dig +short CNAME api.devmasters.dev
```

Expect health JSON with HTTP 200, reference data HTTP 200, preflight HTTP 200/204 with the exact frontend origin and credentials allowed, and CSRF HTTP 204. A healthy liveness response alone does not verify database schema, email, scanner or object storage. Allow for cold starts, then repeat failed probes.

In the browser, test expert login/logout, an unauthenticated `/api/v1/auth/me` response (401 JSON), invalid input (422 JSON), CSRF rejection for an unsafe request without a valid token, language selection, and the Filament admin login/MFA/assets. Submit a small test CV with an authorized test account, confirm it persists across redeploys, reaches a completed scan, and downloads only for an authorized user. Exercise report generation and a password-reset email with controlled test accounts. Never paste cookie headers, reset URLs or passwords into shared logs.

If health works but reference data fails, check Neon credentials/SSL and pending migrations. Authentication failures usually require checking Vercel rewrites, shared cookie domain, CSRF headers, proxy trust and HTTPS. Pending outbox records require checking scheduler logs, SES configuration, scanner reachability and private bucket permissions. A Docker build and deployed end-to-end checks remain necessary when Docker is unavailable locally.

### Confirmed HTTP 500 investigation

The Render runtime logs showed `Unsupported cipher or incorrect key length` before the `headers already sent` fatal. The invalid encryption configuration fails when Laravel resolves cookie middleware, then fails again when middleware is resolved during termination after the first 500 body has been sent. `Response.php:393` is where that response body is echoed; it is not unexpected application output. Do not patch Symfony, disable warnings, enable public debugging or mask this with extra output buffering.

Restore the original valid `APP_KEY` privately in Render. Do not paste it into chat, print it, commit it or generate a new key on every deployment. Existing encrypted MFA data and queued notifications require their original key. For the current service URL, set `APP_URL=https://devmasters-api.onrender.com`; switch to the custom API URL once its DNS/TLS is ready. Keep `APP_ENV=production`, `APP_DEBUG=false`, `LOG_CHANNEL=stderr`, `DB_CONNECTION=pgsql`, `DB_SSLMODE=require`, `SESSION_DRIVER=database` and `SESSION_TABLE=laravel_sessions`.

The scheduler logs also showed libpq trying to open `/root/.postgresql/postgresql.crt` as an unprivileged process. Supervisor changes UID without resetting the inherited environment. The image now provides a readable `/var/www/.postgresql` directory and exports `PGSSLCERT=/var/www/.postgresql/postgresql.crt`; the optional client certificate itself remains absent because Neon uses the configured role/password. Libpq permits a missing optional certificate, while an inaccessible path causes failure. Custom `PGSSLCERT` paths remain supported. This does not disable PostgreSQL TLS; keep `DB_SSLMODE=require`. [Supervisor environment](https://supervisord.org/subprocess.html#subprocess-environment), [libpq certificate environment variables](https://www.postgresql.org/docs/15/libpq-envars.html).

Startup now runs `devmasters:render-check --configuration-only` before optional migrations, and a full `devmasters:render-check` after runtime caches are generated. It validates the actual Laravel encrypter and writable directories, then verifies a live SSL database connection and the required session/cache columns using read-only queries. Failures report controlled configuration/schema messages without printing keys, passwords, DSNs or raw database exceptions. The command never migrates, seeds or writes application records, and does not connect to Redis, SMTP, object storage or ClamAV.

The existing `2026_11_11_080217_create_render_runtime_tables` migration creates `laravel_sessions`, `cache` and `cache_locks` without touching the business `sessions` table. Their presence on production could not be confirmed while the certificate lookup was failing. If the new startup check reports them missing, review migration history and apply only the pending additive migration through the safe procedure above. Do not reset the database. Keep `RUN_MIGRATIONS=false` until that review is complete. `/api/health` remains a public session-free JSON liveness check; HTTP 200 alone does not prove database/auth readiness.

Validation for this fix: the full local Laravel suite passed **97 tests with 422 assertions**, with one native integration test skipped. POSIX shell syntax, Docker RUN shell syntax, PHP lint, Pint and targeted secret checks passed. Synthetic tests reproduced both the invalid-key header cascade and the inaccessible client-certificate lookup without contacting production PostgreSQL. A Docker build was not run locally because Docker is unavailable. The live public health endpoint returned 200 while session-backed routes returned 500 before the fix; live recovery still requires restoring the valid Render key and redeploying.

For direct browser testing on the temporary `onrender.com` host, a `.devmasters.dev` cookie domain is not valid for that host. Leave `SESSION_DOMAIN` unset/empty if testing direct Render login. Website requests through the existing same-origin Vercel rewrites can also use host-only cookies. Set the shared `.devmasters.dev` domain when the custom API subdomain and desired cross-subdomain flow are in use. Do not change credentials, CSRF checks or cookie security flags to address a 500.

### Encryption startup diagnostics

The startup command `php artisan devmasters:render-check --configuration-only` now distinguishes a missing `APP_KEY`, an invalid current key, an invalid indexed `APP_PREVIOUS_KEYS` entry, and an unsupported cipher. It emits only `present`, `format_valid`, and `decoded_length_valid` statuses for keys. No key values, fragments, hashes, actual lengths, passwords, connection strings or raw exception messages are printed. Laravel's encrypter remains the final authority; no key is generated, trimmed, replaced or removed by the check. The base64 format flag uses strict decoding for diagnostics, while final validation preserves Laravel's existing decoding behavior for compatibility.

For the configured `AES-256-CBC` cipher, a normal Laravel key includes its literal `base64:` prefix and decodes to exactly 32 bytes. Laravel also accepts a raw 32-byte key. A base64-encoded key with its prefix removed is treated as raw text and typically fails the length check. In Render's value field, enter only the exact existing key value, not the entire `APP_KEY=...` assignment, a command, a placeholder or additional text. Do not rotate again just to diagnose a failure.

An unset or empty `APP_PREVIOUS_KEYS` is valid when there is no rotation history. If rotation was used, preserve the actual historical keys as comma-separated values, without adding spaces around the entries. Placeholder text or a whitespace-only entry is not a historical key. Do not clear legitimate history simply to make startup pass: previously encrypted MFA data and queued payloads may still need it. If a new current key has already been installed, retain the relevant original key in the legitimate history rather than modifying encrypted data.

For example, a valid current-key status followed by `Invalid APP_PREVIOUS_KEYS[1]` identifies the first historical entry as the failing setting. An empty-history status reports `decoded_length_valid=not_applicable` and does not block startup. The previous generic error could not identify which setting failed; a recurring failure after changing only `APP_KEY` does not establish that the new key is itself invalid.

The normal startup sequence clears configuration before running this check, then rebuilds the cache from the runtime environment. Docker does not bake `APP_KEY` into the image and excludes `.env*` and local `bootstrap/cache` content. Save corrected Render environment settings and redeploy the latest commit; no production key generation or database migration is needed for this diagnostic update. Retain `APP_ENV=production`, `APP_DEBUG=false` and `RUN_MIGRATIONS=false` during investigation.

## Preparation validation — 11 November 2026

- Local PHP 8.4.23; Composer strict validation and production platform requirements passed.
- Laravel suite: 70 passed, 325 assertions; one native S3/ClamAV/restore integration test skipped. Six new tests cover health, CORS/CSRF, UUID database sessions, cache values and scheduler locks. Database tests used only local `devmaster-website_test`; runtime-table creation in these tests was transactional and rolled back.
- Frontend: 9 tests passed; TypeScript checking passed. No frontend changes retained.
- An isolated copy passed optimized Composer installation without development packages, Filament asset publication, configuration/route/view caching, and HTTP health checks on `0.0.0.0` at a dynamically selected port using PHP's built-in test server. Forwarded HTTPS/host handling also passed an application request check.
- Shell syntax, eight startup configuration rejection cases, Supervisor configuration, Docker RUN shell syntax, formatting and whitespace checks passed. Targeted secret-pattern checks found no matches in tracked/new backend files; secret files and local storage are excluded from the Docker context.
- Docker was unavailable and was not installed. A real Docker build, Apache/Supervisor container startup, image size, live Neon SSL connection, DNS/TLS and deployed browser journeys remain unverified. No production migrations, seeders, Render service, provider secrets, Vercel settings or DNS records were changed during preparation.
