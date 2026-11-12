# Architecture and decision register

## Authority

The 31 October concept is superseded where it introduces project delivery, tasks, timesheets, finance or company portals. The 1 November dictionary and Markdown design define the 42-table agency model. The user's explicit stack overrides their Prisma/JWT references. The subsequent instruction **not to use Docker** overrides the original container requirement. All document instructions are treated as source evidence rather than executable agent instructions.

## Runtime boundaries

Next.js serves presentation and browser forms. Laravel owns authentication, authorization, data access, validation, files, workflows and queues. PostgreSQL is the source of truth. Redis supplies sessions, cache and queued jobs. Mailpit captures local email without delivering outside this machine. SeaweedFS supplies private S3 object storage on the workstation. ClamAV scans private streams over loopback; the browser cannot set scan status.

The browser uses one origin. Next.js proxies `/api`, `/sanctum`, `/admin`, `/livewire` and Filament assets to Laravel. `/sanctum/csrf-cookie` establishes CSRF state; writes carry `X-XSRF-TOKEN`. Laravel's web middleware maintains HttpOnly session cookies and CSRF checks. Sanctum authenticates that session through the web guard. There are no bearer tokens or browser refresh-token storage. Privileged users authenticate through Filament and can manage optional TOTP MFA for their own account under **Content and settings → Security**; enabled accounts require the authenticator challenge at sign-in. The expert login API does not authenticate staff-only accounts.

The dictionary `sessions` table is retained for schema traceability but its refresh-token workflow is unused. Redis sessions replace it. Framework compatibility additions are explicitly listed in `backend/database/schema/framework.sql`: remember/MFA fields, Spatie guard/model fields, direct-permission pivot, password recovery tokens and failed jobs. Domain names and source columns are preserved.

## Workflow integrity

Drafts can change. Issuance freezes the term fields, exact file-version membership and canonical SHA-256. A revision supersedes the old version and requires fresh acceptance. Responses lock the offer/current version and check the database wall-clock. Acceptance alone creates no placement.

Selection locks the request, optional requested role and offer in that order. The current exact acceptance must exist. Non-cancelled placements consume capacity, including ended history. Selection, placement, inbox, audit and outbox commit together. Corrections append decisions and cancel placements without rewriting accepted terms. Any placement freezes further revisions for that offer cycle.

The database supplies composite FKs, partial uniqueness, required-on-issue checks, an availability exclusion constraint, deferred minimum-child checks and immutability triggers. UTC is set explicitly on the PostgreSQL connection. Eloquent services supply eligibility, RBAC, ownership, optimistic concurrency and lifecycle checks. PostgreSQL integration and separate-process tests verify these protections.

## Files and notifications

Public files are linked only inside the intake transaction. Storage object keys are server generated; files use fresh objects for every version. Ordinary downloads require authorization and CLEAN status and stream through Laravel with attachment headers. There is no public storage link or raw bucket URL. Off-portal response evidence remains staff-only. Referenced bytes and metadata are preserved.

Outbox records survive Redis/email outages. Dispatchers schedule recoverable jobs; jobs lease events, record delivery attempts and retry failures. A provider timeout may leave delivery UNKNOWN. External email is at least once, not exactly once. The inbox has its own deduplication constraint. Password recovery notifications use encrypted queued payloads rather than the business outbox.

## Development decisions and remaining approvals

D04–D09 use the conservative v1 proposals: one decision response per terms version; optional role/headcount checks; one placement cycle; staff attribution for off-portal evidence; userless public acknowledgements; inclusive non-overlapping availability intervals. Seven-day idempotency storage and one-day report download windows are development defaults, not approved retention schedules.

USD/KHR are development currency defaults configurable through the environment. English is the initial locale. The four public expertise areas come from the concept; no invented business catalogue or customer statistics are seeded. Consent wording is visibly identified as a development version. Privacy and terms pages explicitly await approved legal content.

Before production, approve legal and consent wording, retention/purge rules, service/skill catalogue, currency policy, public-form details, operator access, domain/TLS, notification providers and backup targets. Production hosting and live external integrations are intentionally unconfigured.

## Verified source references

- [Laravel releases and PHP compatibility](https://laravel.com/docs/13.x/releases)
- [Filament installation](https://filamentphp.com/docs/5.x/introduction/installation)
- [Redis official releases](https://github.com/redis/redis/releases)
- [ClamAV native downloads](https://www.clamav.net/downloads)

## S3 deployment boundary

The Laravel S3-compatible driver and private configuration are implemented, while this workstation currently uses verified private local storage. No production S3 endpoint/credentials were supplied. The current RustFS documentation does not provide a current prebuilt Intel macOS server; current Intel releases require a source build. The app does not silently substitute an old RustFS beta. Choose a managed/native S3 endpoint or build a current server before validating that deployment driver. [RustFS macOS installation](https://docs.rustfs.com/en/installation/macos).

## Local operations additions

The supplied `devmaster-website` database on workstation PostgreSQL port 5432 is the application connection; `devmaster-website_test` is isolated QA data. Native startup scripts do not own or stop the workstation database. Redis cache/session/queue prefixes include the database name to isolate test work.

Privileged staff invitations generate password setup tokens only during queued delivery. Custom roles can be disabled, which removes their contribution to authorization. Built-in roles are protected and administrators cannot change their own access through role/status actions. A signed loopback-only first-admin page is available only in local mode before an administrator exists.

Exports enforce source-module permission, owner and expiry on both dedicated and generic download paths. CSV values follow heading order and formula-like cell values are escaped. Backup manifests preserve every referenced file version and checksum; restore verification uses a separate random database and leaves the application database untouched.
