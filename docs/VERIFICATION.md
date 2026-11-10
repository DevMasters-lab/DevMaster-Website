# Verification record

Executed on 2 November 2026 against native services. No Docker was used for application execution. Tests run against PostgreSQL 18 rather than SQLite. Browser tests use real Chrome, Next.js and Laravel with an isolated PostgreSQL test database. No fake backend responses are used by E2E tests.

## Multilingual completion — latest results

The final Khmer/English run passed **65 backend tests with 305 assertions**, **9 Vitest component tests**, and **12 Playwright tests**. TypeScript checking and the optimized Next.js webpack build passed. The backend run included the real native S3/scanning/backup/restore integration test, not a skipped substitute. A subsequent focused Expert language-persistence test passed after strengthening the screenshot readiness check.

Commands executed:

```sh
# backend, using the same PHP configuration as the local app
PHP_INI_SCAN_DIR=:/Applications/XAMPP/xamppfiles/htdocs/DevMaster/infra/php RUN_NATIVE_INTEGRATION=1 php artisan test --compact
# frontend
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The first full run without the app's PHP configuration exhausted the CLI default of 128 MB after rendering the expanded Admin resources. The repeated full run with the configured 512 MB limit passed. Earlier development checks found and corrected a Next.js rewrite redirect loop, Livewire snapshot locale restoration, translated phrase priority, and English-label capitalization regressions. These failed attempts are not counted as passes.

Bilingual browser coverage: all ten public pages in both languages; all eight Expert sections; all 30 Filament resources in Khmer plus the existing English Admin journey; actual Livewire language switching; unsaved modal input retention; file/input/query/hash preservation; refresh and navigation; saved preference after logout/login; Khmer font loading; mobile visibility/overflow; metadata language alternatives; localized unknown-page HTTP 404; native HTML validation prompts independent of browser language; real CSRF, TOTP, uploads, exact-version responses and separate management selection. The management test uses its own accepted offer and verifies the newly selected expert's placement rather than depending on another test. Backend localization tests cover validation fields, stable password-reset codes, default/cookie/header resolution, saved preferences, PostgreSQL locale checks, explicit content fallback, raw status preservation and queue recipient/locale isolation.

Inspected rendered screenshots for Khmer public mobile, Expert dashboard and Filament table. Khmer text wraps without clipping in these checked views; uploaded filenames and synthetic test identities remain unchanged. Visual artifacts are in ignored `.runtime/khmer-public-mobile.png`, `.runtime/khmer-expert.png`, and `.runtime/khmer-admin.png`. Browser tests use only `devmaster-website_test` and synthetic accounts.

Pint's required `--dirty --format agent` command was attempted and rejected because this workspace has no Git repository. Explicit Pint formatting over the application, configuration, routes, tests, migrations and language resources completed successfully. No lint/format result is counted as a functional test.

See [I18N_IMPLEMENTATION.md](I18N_IMPLEMENTATION.md) for module coverage, routing, fallback and the reviewed additive migration. Older entries below are the historical foundation verification and are superseded by these latest counts.

## Executed checks

| Check | Outcome |
|---|---|
| Full Laravel feature/unit suite | Latest: 65 tests passed, 305 assertions, including localization, native S3/scanning/restore and business/security regressions |
| Strengthened PostgreSQL deadline/capacity races | 2 tests passed in a subsequent targeted run; independent PHP processes |
| All Filament resource tables | 30 resource tables rendered successfully against PostgreSQL |
| Core admin detail pages | Company request, expert and offer pages rendered with relation managers |
| Application lifecycle | Public application → review with exact clean-file refs → invitation → secure password setup → own portal passed |
| Frontend components | Latest: 9 Vitest tests passed |
| TypeScript | `npm run typecheck` passed |
| Production frontend | `next build --webpack` passed; public, expert and correction routes compiled |
| Browser E2E | Latest: 12 Playwright tests passed with normal CSRF, including multilingual public/Expert/Admin journeys and previous lifecycle tests |
| Real native malware scanner | Clean PDF classified CLEAN; harmless EICAR test string classified INFECTED |
| Real queued email | Local acknowledgements processed through Redis/outbox and captured in Mailpit |
| AT20 restore drill | Database dump + private object archive restored; validated FKs, ownership policy and authorized download checksum passed |
| Dependency security audit | Most recent npm install reported zero vulnerabilities; Composer install reported no advisories |
| Responsive visual QA | Desktop and mobile homepage screenshots inspected; no horizontal overflow in checked public pages |

The default Turbopack compiler could not open its IPC port in this execution environment. The project uses Next.js's supported webpack option; the production build succeeds. Earlier failed checks exposed and corrected UUID pivot handling, trigger branch evaluation, database timezone interpretation, Sanctum session middleware selection and the same-origin Livewire proxy. Only final successful outcomes are treated as passes.

## Acceptance scenario mapping

| Scenario | Evidence |
|---|---|
| AT01 anonymous intake | AcceptanceTest; browser company form |
| AT02 pre-approval access | AcceptanceTest; browser access rejection |
| AT03 CRM mismatch | PostgreSQL composite FK test |
| AT04 shortlist mismatch | PostgreSQL composite FK test |
| AT05 cross-offer current version | PostgreSQL composite FK test |
| AT06 issued terms/attachments | Immutability trigger tests |
| AT07 superseded responses | Guarded service rejection test |
| AT08 expiry and races | Deadline test plus independent-process race |
| AT09 duplicate acceptance | Replay and contradictory-decision rejection |
| AT10 off-portal attribution | Staff permission and evidence requirements |
| AT11 premature selection | Current exact acceptance requirement |
| AT12 parallel capacity | Two processes competing for a one-person role |
| AT13 duplicate placement | Repeated command returns existing placement |
| AT14 email outage | Provider failure leaves business state/inbox committed |
| AT15 quarantine | Download/issuance denied; live scanner controls also executed |
| AT16 cross-expert isolation | Known foreign UUIDs denied or excluded |
| AT17 selection reversal | Append decision + atomic cancellation; evidence remains |
| AT18 hard deletion | FK/history guards reject deletion |
| AT19 snapshots | Original submissions and exact file links preserved |
| AT20 restore | `infra/scripts/restore-drill.sh` |

## Reproduce browser checks

Start the API against `devmaster-website_test` using normal local mode, so CSRF remains enabled:

```sh
cd backend
APP_ENV=local DB_DATABASE=devmaster-website_test php artisan serve --host=127.0.0.1 --port=8081
```

Serve the frontend production build on port 3000, then run `npm run test:e2e` in `frontend`. Global setup creates fresh synthetic expert/admin accounts and an issued offer only in the test database, storing temporary credentials in ignored `.runtime/e2e.json`. The MFA test uses the synthetic administrator's real TOTP challenge. Production credentials are never seeded. Return the API to the `devmaster-website` database after testing.

From the repository root, clean/malware checks are reproducible with `DB_DATABASE=devmaster-website_test php backend/tests/live-scan.php`. The native backup test dumps the test database, copies real private S3 objects and verifies a disposable restored database and every referenced checksum. Native S3 is verified locally. External SMTP/SMS, production TLS, off-machine backups, staging and large-scale load testing are deferred with hosting.

## Database-connection continuation

The supplied application connection is PostgreSQL `127.0.0.1:5432`, database `devmaster-website`. The initially empty database was backed up before migration. Migrations and role/permission seeding completed. Health checks passed for the supplied database, Redis, S3 write/read/delete, ClamAV PONG and Mailpit SMTP. Credentials were saved only in ignored local files.

`RUN_NATIVE_INTEGRATION=1 php artisan test --compact` executes the native integration test rather than skipping it. The latest full backend run passed all 52 tests with 196 assertions. A real clean PDF and harmless EICAR signature were subsequently classified CLEAN and INFECTED. The earlier scanner helper bootstrap/import issue was corrected and both checks executed again successfully.

The required Pint `--dirty` mode was attempted but cannot run because this workspace has no Git repository. Pint was then run successfully over application, configuration, routes, tests, seeders and factories. No tests are reported passed solely because formatting or compilation succeeded.

Final expanded browser run: all 9 tests passed. Admin and Expert Portal uploads reached real private S3 storage. The native backup contained 17 file versions during the final run and restored with all checksums and foreign keys validated. A direct anonymous request to an actual stored object returned HTTP 403. Browser offer confirmation also verifies Escape dismissal before a separate confirmed exact-version response.

Livewire temporary uploads use a private local staging disk before `DocumentService` writes a version to S3; Laravel's general local-disk serving route is disabled. Suspended accounts fail the shared document policy, including report files.

Final application handoff: API, Next.js, Redis worker and scheduler were returned to `devmaster-website` and left running. Website `/`, `/admin/login` and `/api/v1/reference-data` returned HTTP 200. Native data-service startup was exercised after a graceful SeaweedFS restart, with all five health checks passing. The application database has its own post-migration backup under private `storage/app/backups/`; QA fixtures remain only in the test database.

Post-restart persistence check: the initial background S3 launcher exited with its execution session, which was detected by the native integration test. The application supervisor was corrected to retain a foreground storage child when necessary and require dependency health before readiness. The repeated native storage/scanning/backup/restore test passed (1 test, 5 assertions); previous S3 objects survived restart. Final website, admin login and reference API checks returned HTTP 200, with storage/API/frontend/queue/scheduler processes running and all dependency checks OK.

## Local administrator follow-up — 2 November 2026

- Created the user-requested real local admin, with credentials saved in an ignored owner-only file.
- Real Chrome password sign-in succeeded and required MFA enrollment was shown. A direct visit to protected admin resources was redirected to enrollment; MFA remains enforced.
- Executed the new local catalogue setup; the live reference-data API returned four services and four starter skill categories.
- `ConfigureLocalPlatformTest`: 3 tests passed, 17 assertions, including idempotence/edit preservation and staff/non-local rejection. This is a targeted follow-up; the previous full suite result remains 52 tests/196 assertions.
- Attempted required Pint dirty mode (unavailable without Git), then successfully formatted the changed command/test directly.
- All three database migrations are applied. A post-setup backup is stored privately at `backend/storage/app/backups/20261102-074726-pzyjx42h`.

The post-setup backup restore verification also passed in a disposable database, and all five dependency health checks passed after account/catalogue configuration.

## Final multilingual local handoff

Applied localization migration is recorded as batch 2 on `devmaster-website`. The post-localization backup is `backend/storage/app/backups/20261102-092533-088gwnud`; no live private file versions existed at that snapshot. Live `/km`, `/en`, `/km/login`, and `/admin/login` returned HTTP 200. The reference-data API returned four Khmer service names with `X-Locale: km` and their preserved original English names with `X-Locale: en`. The regular PostgreSQL database, Redis, S3 round trip, ClamAV and Mailpit connectivity passed health checks.

The final native validation addition passed the expanded 9-test component suite and a rebuilt/typechecked frontend. The repeated full Chrome run passed all 12 tests after this change (1.4 minutes), including the real Khmer/English native validation-message assertions. The supervisor's relative invocation is canonicalized; its normal stop command was exercised successfully before restart. No unrelated application's processes were changed.

Final state: the QA supervisor was stopped with the documented command and the rebuilt application was restarted without a test-database override. The normal local administrator, password and required MFA were preserved. No hosting or production-provider settings are needed for this local handoff.
