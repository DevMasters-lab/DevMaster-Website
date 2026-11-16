# Project audit and refactoring report

Work branch: `codex/full-project-cleanup`. The pre-existing tracked changes and untracked files were snapshotted to `/private/tmp/devmasters-before-full-cleanup` before source changes. Existing working changes are preserved.

## Audit and implementation plan

The current app has three public pages, two live company-request dialogs, expert signup/sign-in previews, localized CMS fallbacks, a technology drawer/showcase, and nine required Filament resources. Laravel retains a broader API and queued domain workflow; models, policies, enums and relationships can be discovered dynamically through schema dictionaries and framework registration. These are not deletion candidates merely because static references are sparse.

Findings: layout and engagement files share one flat component folder; the live bid dialog imports a module containing retired application/contact/company forms; API client/error handling is compressed and has no direct request-contract tests; offer resources query attachments per version; staff setup emails point to retired frontend reset pages; a TypeScript build cache is tracked; the unrouted Laravel welcome view is the only consumer of the separate backend Vite starter stack. npm reports no advisories; Composer initially reports 12 advisories across seven packages.

Batches: (1) preserve the checkpoint and apply compatible backend security updates; (2) group layout/shared controls and engagement code, update all imports/tests, remove proven retired frontend UI and starter artifacts; (3) clarify and test the API client; (4) batch offer attachment loading and correct staff reset links using native Filament routes; (5) run TypeScript, dead-import checks, builds, unit/feature tests, route/schema preservation checks, and current dependency audits.

No new repository/service layer, auth route group, database abstraction, package, production migration, public API deletion, or UI redesign is planned.

## Source moves applied

- `frontend/src/components/LanguageSwitcher.tsx` → `frontend/src/components/ui/language-switcher.tsx`
- `frontend/src/components/ThemeToggle.tsx` → `frontend/src/components/ui/theme-toggle.tsx`
- `frontend/src/components/bid-invitation-form.tsx` → `frontend/src/features/engagement/bid-invitation-form.tsx`
- `frontend/src/components/engagement-dialog.module.css` → `frontend/src/features/engagement/engagement-dialog.module.css`
- `frontend/src/components/engagement-dialog.tsx` → `frontend/src/features/engagement/engagement-dialog.tsx`
- `frontend/src/components/expert-partnership-form.tsx` → `frontend/src/features/engagement/expert-partnership-form.tsx`
- `frontend/src/components/expert-portal-button.module.css` → `frontend/src/features/engagement/expert-portal-button.module.css`
- `frontend/src/components/expert-portal-preview.tsx` → `frontend/src/features/engagement/expert-portal-preview.tsx`
- `frontend/src/components/expert-signup-preview.tsx` → `frontend/src/features/engagement/expert-signup-preview.tsx`
- `frontend/src/components/footer-animation-joint.tsx` → `frontend/src/components/layout/footer-animation-joint.tsx`
- `frontend/src/components/footer-bug-chase.module.css` → `frontend/src/components/layout/footer-bug-chase.module.css`
- `frontend/src/components/footer-bug-chase.tsx` → `frontend/src/components/layout/footer-bug-chase.tsx`
- `frontend/src/components/footer-coding-bug.tsx` → `frontend/src/components/layout/footer-coding-bug.tsx`
- `frontend/src/components/form-feedback.tsx` → `frontend/src/features/engagement/form-feedback.tsx`
- `frontend/src/components/home-engagement-actions.module.css` → `frontend/src/features/engagement/home-engagement-actions.module.css`
- `frontend/src/components/home-engagement-actions.tsx` → `frontend/src/features/engagement/home-engagement-actions.tsx`
- `frontend/src/components/page-content.tsx` → `frontend/src/components/layout/page-content.tsx`
- `frontend/src/components/scroll-reveal.module.css` → `frontend/src/components/layout/scroll-reveal.module.css`
- `frontend/src/components/site-loader.module.css` → `frontend/src/components/layout/site-loader.module.css`
- `frontend/src/components/site-loader.tsx` → `frontend/src/components/layout/site-loader.tsx`
- `frontend/src/components/site-shell.tsx` → `frontend/src/components/layout/site-shell.tsx`
- `frontend/src/data/expert-specializations.ts` → `frontend/src/features/engagement/expert-specializations.ts`
- `frontend/src/hooks/use-company-request-submission.ts` → `frontend/src/features/engagement/use-company-request-submission.ts`

## Verified cleanup scope

- `frontend/src/components/intake-form.tsx`: active dialog uses only its bid wrapper; all other rendered forms correspond to explicitly retired routes. The mounted expert UI is a separate preview. Existing bid component will be imported directly; tests will exercise current forms. Backend expert APIs remain.
- `frontend/src/components/FileInput.tsx`: its sole source consumer is the retired form implementation above.
- Unused `commandHeaders` export: no source/config/dynamic consumers; live forms already maintain their own idempotency keys.
- Retired global expert sidebar/statistics/offer-action rules: no mounted component or allowed route renders those classes; the only remaining expert dialogs use their own preview classes and CSS modules. Preserve shared selectors and responsive/Khmer/font rules.
- `frontend/tsconfig.tsbuildinfo`: generated TypeScript state; ignore future caches.
- `backend/resources/views/welcome.blade.php`, `backend/resources/css/app.css`, `backend/resources/js/app.js`, `backend/vite.config.js`, `backend/package.json`: only the unrouted welcome view consumes these Vite entries. Native startup and the Docker/Render image build PHP/Filament assets without a backend Node/Vite build. Remove the obsolete npm steps from Composer's setup script. Filament-published vendor assets and all fonts remain.

Source assets supplied by the user, public URLs, migration/schema files, storage/media, environment files, deployment scripts and manifests, and development PHP tools are retained where external or dynamic usage cannot be disproven.

## Results

### Architecture and refactoring

```text
frontend/src/
  app/                       # Existing routes/layout/global styles; URLs unchanged
  components/
    layout/                  # Site shell, loader, page wrapper and footer animation
    ui/                      # Language and theme controls
    ...                      # Existing website/CMS/technology components retained
  features/engagement/       # Live bid/partnership forms, previews, dialogs, feedback,
                             # specialization data, submission hook and feature CSS
  hooks/                     # Shared scroll-reveal behavior
  i18n/                      # Existing English/Khmer locale providers and navigation
  lib/                       # API client, proxy, theme, carousel, loader/scroll helpers
  data/                      # Existing technology data/details
backend/app/
  Http/{Controllers,Middleware,Requests,Resources}/
  Models/ Policies/ Enums/ Services/ Jobs/ Notifications/ Observers/
  Providers/ Livewire/ Support/
  Filament/{Resources,Pages,Widgets,RelationManagers}/
```

All 23 planned moves were applied and imports/mocks/CSS-module references updated. No new route groups or speculative repositories/events/actions layers were introduced. The nine-resource admin cleanup already present at the checkpoint was preserved and retested.

Removed eight proven obsolete/generated files: two retired frontend form modules, the TypeScript build cache, and five Laravel/Vite starter files. Removing the backend Node manifest retires six starter dependency declarations (`vite`, `laravel-vite-plugin`, `@tailwindcss/vite`, `tailwindcss`, `concurrently`, optional `@laravel/multiplex`); no frontend runtime dependency or PHP development tool was removed. Composer setup no longer invokes the removed pipeline. Its dev command starts the real PHP API server.

Removed 32 standalone CSS rules for retired expert sidebar/statistics/cards/offer actions and narrowed one simple shared selector group (global CSS: 29,878 → 27,985 bytes). Shared functional selectors, all fonts and locale typography remain intact; the 21 functional/shared rule bodies were compared with the original CSS. Retained complex/shared legacy selectors where pruning could affect active UI. Removed an unused idempotency helper/type and redundant imports/test setup. Browser fixtures now create only their two required admin accounts, rather than unused experts/candidates/offers.

The API client now has readable typed request/error handling, one pending CSRF request shared by concurrent writes, consistent network errors, safe-method handling, preserved multipart boundaries and idempotency headers, and pre-indexed localized error messages. Direct client tests cover these contracts. The source API path/response contract remains unchanged.

Offer list/detail endpoints eager-load document links and file metadata, replacing per-version attachment queries with two bounded relationship queries across all versions. Serialization keeps attachment order, exact keys/values, response history and issued-version filtering. Regression tests cover list/detail, multiple issued versions, an excluded draft, private-field omission through exact payload assertions, and both query counts.

Staff invitation and queued recovery URLs now use the existing native Filament reset routes. Filament’s defaults require active panel access, so changing only the email URL would still block invited accounts. The native request/reset pages now accept eligible invited staff, preserve throttling, the 12-character password minimum, MFA state and updated-account reset events, and share account eligibility/activation logic with the existing API through `AccessManagementService`. Recovery confirmation is uniform for unknown/ineligible accounts to avoid account enumeration. Suspended/disabled/non-staff accounts are rejected; expert API recovery responses and destinations are preserved. No menu or public API was added.

`NEXT_DIST_DIR` optionally isolates build output; default remains `.next`. `.next-audit` was used with localhost ports 3300/18081 and the separate test database for production-browser verification, alongside the pre-existing app on 3000/8081. Build-generated temporary type-path edits and the prior synthetic fixture are restored after the checks.

### Dependency security

Current `npm audit`: zero advisories. Composer initially reported 12 advisories affecting seven packages. Compatible locked updates added/removed no PHP packages:

| Package | Before | After |
| --- | --- | --- |
| laravel/framework | 13.39.0 | 13.42.0 |
| symfony/filesystem | 8.1.9 | 8.1.11 |
| symfony/html-sanitizer | 8.1.10 | 8.1.11 |
| symfony/http-foundation | 8.1.10 | 8.1.11 |
| symfony/http-kernel | 8.1.10 | 8.1.11 |
| symfony/routing | 8.1.10 | 8.1.11 |
| symfony/yaml | 8.1.10 | 8.1.11 |

Composer reported zero advisories after the update. The lockfile and strict Composer validation are retained; dependency discovery, framework features and development PHP tools were not guessed to be unused from sparse imports.

### Verification

| Check | Result |
| --- | --- |
| Frontend `npm run lint` | **PASS**: TypeScript unused import/local/parameter checks, no new lint package. |
| Frontend `npm run typecheck` | **PASS**. |
| Full frontend unit/component suite | **PASS**: 469 tests across 23 files (`npm test -- --maxWorkers=2`). |
| Next.js production build | **PASS**: `NEXT_DIST_DIR=.next-audit LARAVEL_URL=http://127.0.0.1:18081 npm run build`; final corrected shared typography preserved. |
| Full Laravel suite | **PASS**: 213 passed, one opt-in native integration skipped; 214 total cases, 1,126 assertions, using `devmaster-website_test`. |
| Focused recovery/navigation checks | **PASS**: 29 cases, including invited/ineligible/unknown users and expert API recovery compatibility. The final account-event freshness correction was also checked against 24 password/authentication/lifecycle/access cases. |
| Offer serialization/query regression | **PASS**: both list/detail; exactly one link query plus one file query for all versions, ordered payload unchanged. |
| Production-browser E2E | **PASS**: all eight cases against the final corrected production build and isolated Laravel/PostgreSQL server. |
| Route comparison | **PASS**: 69 routes retained and all 32 API entries unchanged. Only the two existing native password-reset route implementation classes changed. Methods, URIs, names and middleware remain. |
| Schema/data safety | **PASS**: no model, migration, schema-source or database-configuration changes; no production migration/seeding/destructive database command executed. |
| Dependency audits | **PASS**: npm zero advisories; Composer zero advisories after seven compatible updates, with zero PHP packages added/removed. |
| Composer manifest/lock validation | **PASS**, strict mode. |
| Pint / whitespace | **PASS**. |

No failures remain in the completed checks. Real S3/ClamAV/backup-restore, live mail/SMS, remote deployment/TLS and production load checks are **NOT RUN**. The skipped native test is explicit, not counted as passed.

Browser checks cover English/Khmer pages and fonts, responsive overflow, navigation, preserved form drafts, a real anonymous bid submission through Next.js/Laravel/PostgreSQL, CSRF rejection, local-only signup previews, MFA, all nine admin resources, role creation, staff invitation, private local uploads and removed-menu 404s. The isolated test servers were stopped after verification and the previous synthetic fixture was restored. The pre-existing application remains running on ports 3000/8081.

### Remaining issues and retained candidates

- Existing expert signup/login/recovery dialogs are intentionally previews. Expert activation/correction emails still refer to retired public expert destinations; making those workflows live requires an explicit product decision and UI work. Staff native setup/recovery is fixed.
- Static logos, original source assets, mirrored frontend/backend font assets, translated catalogues, deployment manifests, schema dictionaries, historical requirements and migrations remain. External/dynamic consumption cannot be disproven safely. No storage/media/environment files or production data were removed.
- API response pagination/shape was preserved. Unbounded historical list endpoints and broader controller/service extraction should be addressed only with measured workloads and explicit API compatibility planning.
- Native S3/ClamAV/backup-restore integration remains opt-in and was not run. Browser uploads used the isolated local private disk. Live SMTP/SMS, remote hosting/TLS, off-machine backups and production load were not exercised.
- Legal/consent wording remains development content awaiting supplied approved text. This refactor is locally verified; it does not certify deployment readiness or publish/deploy anything.
- No ESLint dependency existed. The new `npm run lint` intentionally uses the installed TypeScript compiler for strict unused import/parameter checks, alongside the existing tests and build.
