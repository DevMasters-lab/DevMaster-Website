Current follow-up: see [Project cleanup report](PROJECT_CLEANUP_REPORT.md) for the later source moves, dependency updates, and working native staff setup/recovery. The records below describe the earlier admin removal and initial audit.

# Admin module removal — final cleanup

Follow-up: the standalone Permissions resource and its page folder have also been removed. Permission selection remains in the Roles editor; authorization models, records, and role relationships are retained. The deletion manifest and audit history below describe the earlier cleanup.

The user explicitly requested deletion of unused backend menus and their code/files/folders after the initial hide-only audit. This cleanup supersedes the navigation-restoration approach described in the historical audit below.

Deletion scope: 21 Filament resource classes and their 21 page folders (44 files), plus nine relation-manager files used only by retired admin screens. All models, policies, services, migrations, API controllers, API endpoints, database tables, jobs, and scheduler tasks remain because they have non-menu consumers.

Request roles and request history stay as read-only Company request tabs, rewritten to remove their dependency on deleted resources. Candidate/offer tabs and matching/offer/export/diagnostic admin actions are retired along with their screens. The sidebar restoration configuration and unused generic CRUD forms are removed.

Current panel: Dashboard; Company intake → Company requests; Documents → Document management and Document versions; Website content → Public pages; Access management → Users, Roles; Settings → Notification templates, System settings, Security. Eight resources remain. Deleted module URLs return 404, and there is no configuration switch that restores them.

Route comparison after deletion: all 32 API route entries are unchanged. Only 23 Filament resource routes were removed (21 list pages and two record-detail pages), leaving 69 total application routes. Native Filament login/reset/MFA and the current eight resources retain their original methods, names, actions, and middleware.

The retired screens no longer provide manual matching, offer administration, report requests/downloads, diagnostics/retries, CRM master editing, or expert review/invitation. The related domain code is retained for existing API, scheduled, queued, and historical-data consumers. This is an admin UI cleanup; no database cleanup or dependency removal was performed.

Exact deletion manifest, recorded before deletion:

- `backend/app/Filament/Resources/AuditEventResource.php`
- `backend/app/Filament/Resources/AuditEventResource/ManageRecords.php`
- `backend/app/Filament/Resources/AvailabilityResource.php`
- `backend/app/Filament/Resources/AvailabilityResource/ManageRecords.php`
- `backend/app/Filament/Resources/CandidateResource.php`
- `backend/app/Filament/Resources/CandidateResource/ManageRecords.php`
- `backend/app/Filament/Resources/ContactResource.php`
- `backend/app/Filament/Resources/ContactResource/ManageRecords.php`
- `backend/app/Filament/Resources/DeliveryAttemptResource.php`
- `backend/app/Filament/Resources/DeliveryAttemptResource/ManageRecords.php`
- `backend/app/Filament/Resources/ExpertOfferResource.php`
- `backend/app/Filament/Resources/ExpertOfferResource/ManageRecords.php`
- `backend/app/Filament/Resources/ExpertOfferResource/ViewRecord.php`
- `backend/app/Filament/Resources/ExpertProfileResource.php`
- `backend/app/Filament/Resources/ExpertProfileResource/ManageRecords.php`
- `backend/app/Filament/Resources/ExpertProfileResource/ViewRecord.php`
- `backend/app/Filament/Resources/ExpertReviewResource.php`
- `backend/app/Filament/Resources/ExpertReviewResource/ManageRecords.php`
- `backend/app/Filament/Resources/ExportJobResource.php`
- `backend/app/Filament/Resources/ExportJobResource/ManageRecords.php`
- `backend/app/Filament/Resources/NotificationResource.php`
- `backend/app/Filament/Resources/NotificationResource/ManageRecords.php`
- `backend/app/Filament/Resources/OfferResponseResource.php`
- `backend/app/Filament/Resources/OfferResponseResource/ManageRecords.php`
- `backend/app/Filament/Resources/OfferVersionResource.php`
- `backend/app/Filament/Resources/OfferVersionResource/ManageRecords.php`
- `backend/app/Filament/Resources/OrganizationResource.php`
- `backend/app/Filament/Resources/OrganizationResource/ManageRecords.php`
- `backend/app/Filament/Resources/OutboxEventResource.php`
- `backend/app/Filament/Resources/OutboxEventResource/ManageRecords.php`
- `backend/app/Filament/Resources/OutreachRecordResource.php`
- `backend/app/Filament/Resources/OutreachRecordResource/ManageRecords.php`
- `backend/app/Filament/Resources/PlacementResource.php`
- `backend/app/Filament/Resources/PlacementResource/ManageRecords.php`
- `backend/app/Filament/Resources/RequestActivityResource.php`
- `backend/app/Filament/Resources/RequestActivityResource/ManageRecords.php`
- `backend/app/Filament/Resources/RequestRoleResource.php`
- `backend/app/Filament/Resources/RequestRoleResource/ManageRecords.php`
- `backend/app/Filament/Resources/SelectionDecisionResource.php`
- `backend/app/Filament/Resources/SelectionDecisionResource/ManageRecords.php`
- `backend/app/Filament/Resources/ServiceResource.php`
- `backend/app/Filament/Resources/ServiceResource/ManageRecords.php`
- `backend/app/Filament/Resources/SkillResource.php`
- `backend/app/Filament/Resources/SkillResource/ManageRecords.php`
- `backend/app/Filament/RelationManagers/ExpertAvailability.php`
- `backend/app/Filament/RelationManagers/ExpertOffers.php`
- `backend/app/Filament/RelationManagers/ExpertReviews.php`
- `backend/app/Filament/RelationManagers/OfferPlacements.php`
- `backend/app/Filament/RelationManagers/OfferSelections.php`
- `backend/app/Filament/RelationManagers/OfferVersions.php`
- `backend/app/Filament/RelationManagers/RelatedRecords.php`
- `backend/app/Filament/RelationManagers/RequestCandidates.php`
- `backend/app/Filament/RelationManagers/RequestOffers.php`

Cleanup validation:

- Full backend run: **194 passed, 1 opt-in native integration skipped**, 195 total cases, 1,034 assertions (`DB_DATABASE=devmaster-website_test php artisan test --compact`). Existing API, domain-workflow, jobs, authentication, file authorization, exports, and concurrency tests remain.
- Targeted backend run: **37 passed**, including the nine retained resources, all 21 deleted module URLs returning 404, English/Khmer sidebar organization, staff restrictions, permission revocation on an open Livewire page, and request-role/history tabs scoped to their owner.
- Frontend typechecking passed. The five relevant public form/proxy/route test files passed **311 tests**. Updated Playwright tests compile/list successfully (8 cases); they no longer expect retired admin modules and now check representative removed URLs return 404. Browser E2E and real S3/ClamAV/restore checks were not executed in this cleanup.
- Route inventory comparison passed: **32 API entries unchanged**, 23 retired admin routes deleted, 69 total routes remaining. All retained route methods/URIs/names/actions/middleware are unchanged; PHP source-line metadata may move.
- Confirmed the 53 manifest paths and 21 corresponding resource folders no longer exist. No retained application code references the deleted resource classes. Only the two required request relation managers remain.
- Pint and `git diff --check` passed. Tests use the separate PostgreSQL test database; application data and environment credentials were not overwritten.
- Concurrent frontend/CMS work was left intact; only the obsolete browser-test assertions and their admin-workflow fixture were adjusted for this cleanup.

---

# Historical initial audit (before requested deletion)

# Frontend-driven Laravel admin audit

Audited on 16 November 2026 against the current Next.js source and Laravel 13.39 / Filament 5.11 installation. The older README, architecture notes, and API documentation describe a larger product than the frontend currently exposes. This audit uses executable routes and mounted components as the source of truth.

## Frontend analysis

### Pages and navigation

`frontend/src/app/[slug]/page.tsx` explicitly allows only `home`, `privacy`, and `terms`. `frontend/src/proxy.ts` supplies `/km` and `/en` locale prefixes. `/` and `/about` redirect to the localized homepage.

| Actual page or control | Implementation and data needs |
| --- | --- |
| `/km/home`, `/en/home` | `public-home.tsx`: optional CMS hero content, engagement dialogs, static expertise presentation, technology showcase, and client logo carousel. |
| `/km/privacy`, `/en/privacy` | `public-page.tsx`: localized CMS Markdown, with a static development-policy fallback. |
| `/km/terms`, `/en/terms` | `public-page.tsx`: localized CMS Markdown, with a static development-terms fallback. |
| Header | Home logo link; Expert Portal preview dialog; theme and language controls. No page-menu dropdown or separate expert portal route. |
| Footer | Privacy and terms links, static branding/copyright, and decorative animation. |
| Invite Us to Bid | `EngagementDialog` mounts `CompanyForm` with `variant="bid-dialog"`, which renders `BidInvitationForm`. Sends a real company request. |
| Partner With Our Experts | `EngagementDialog` mounts `ExpertPartnershipForm`. Sends a real company request. |
| Become an Expert | Mounts `ExpertSignupPreview`. Local validation and confirmation only; no application, account, password, or CV is sent. |
| Expert Portal / recovery | Mounts `ExpertPortalPreview`. Sign-in and recovery are local previews; no authentication or recovery request is sent. |

The proxy redirects the retired `/services`, `/technology-skills`, `/hire-our-team`, `/expertise`, `/invite-us-to-bid`, `/be-our-team`, `/contact`, `/login`, `/forgot-password`, `/reset-password`, `/expert`, and `/application-corrections` route families to the homepage. The page allowlist also rejects arbitrary CMS slugs. There are no active news, blog, standalone about, service-detail, contact-message, or expert dashboard pages.

### Feature mapping and API contracts

All versioned paths below begin with `/api/v1`. Requests use the existing same-origin Laravel proxy, session cookies, `Accept: application/json`, locale headers, and CSRF protection for writes.

| Frontend feature | Actual API and payload | Required administration / action |
| --- | --- | --- |
| Home hero, privacy, terms | `GET /pages/{home\|privacy\|terms}` → `{data:{slug,locale,title,body_markdown,published_at}}`; published content selects the current locale with English fallback. Missing/error responses retain the static frontend fallback. | Keep Public pages. Preserve publication and locale controls. Other stored slugs and the generic API remain intact, although the current frontend will not render them. |
| Bid invitation | `POST /company-requests`, multipart, `Idempotency-Key`; `request_type=INVITE_US_TO_BID`, company/contact fields, generated title, serialized invitation details in `requirements`, optional timing and private attachments. | Keep Company requests, Document management, and Document versions. No separate bids module is needed. |
| Expert partnership | Same endpoint and envelope; `request_type=HIRE_OUR_TEAM`. Specialist roles, counts, collaboration type, and requirements are serialized into `requirements`; optional expected start date. | Keep Company requests. No separate partnership or contact-message module is needed. |
| Submission result | HTTP 201 `{data:{reference_no,message_code,message}}`. Existing localized validation/error keys and idempotent replay are retained. | Existing intake review, owner/status assignment, notes, snapshots, and request history remain available. |
| Submission attachments | `attachments[]`, up to five files, 10 MB each; PDF/DOCX/JPEG/PNG. `DocumentService` creates private document versions and scan events. | Keep both document screens: management provides upload; versions provide scan status and authorized CLEAN-file downloads. This is private file administration, not a public image gallery. |
| Language control | `POST /locale` persists language preference; the frontend also sets its locale cookie. `GET /sanctum/csrf-cookie` establishes the write session. | Preserve locale middleware, Sanctum, localization catalogues, and user preferences. No new menu. |
| Request acknowledgements | `request.received` outbox event and queued email delivery; template lookup uses event key/channel/locale. | Keep Notification templates under Settings. Preserve outbox processing, delivery records, retries, and the header inbox; hide their global diagnostic lists. |
| Expert signup / portal previews | No API calls from the mounted preview forms. `ApplicationForm` still exists in `intake-form.tsx` but is not mounted by an active route/dialog. | Hide expert-network, matching, and offer menus by default. Preserve their resources and complete backend workflows. |
| Technology list, expertise descriptions, specialization choices, client logos | Local `src/data/*`, translated component text, and `public/sample-logos/*`; no service/skill catalogue fetch from the mounted UI. | Hide Services and Skills. Database records do not control these frontend lists. |
| Theme, animations, logos, fonts, titles, metadata | Local components, CSS, assets, translation JSON, and browser preferences. | No new admin resources or media package. |
| Users, roles, permissions, account security | Essential staff administration independent of the public preview dialogs. | Keep Users, Roles, Permissions, Security, native Filament login/reset/MFA, and existing permission checks. |
| General settings | Existing approved non-secret keys are `business.contact`, `business.display_name`, `website.announcement`. The current frontend does not read them. | Keep System settings as explicitly required essential administration; do not imply they currently update frontend branding or announcements. |

Publishing a `home` CMS record replaces the fallback hero, including its engagement buttons, with the supplied title and Markdown. Technology and logo sections remain outside that CMS boundary. This is existing behavior; this change does not add a section editor or change publication semantics.

## Backend resource audit and recommendations

The panel discovers 30 `DomainResource` subclasses, plus Dashboard and Security. The shared resource class provides table rendering, policy-based access, and workflow actions. The following inventory covers every resource; URLs are relative to `/admin` and remain registered in both navigation modes.

| Existing menu | Original group | URL | Purpose / default decision |
| --- | --- | --- | --- |
| Company requests | Company intake | `/company-requests` | **Keep**: both live public forms, review/clarification, ownership, and workflow entry. |
| Organizations | Company intake | `/organizations` | **Hide**: optional internal CRM masters; public submissions preserve company snapshots without an organization account. |
| Contacts | Company intake | `/contacts` | **Hide**: optional linked CRM contacts; public form contact details remain on requests. |
| Requested roles | Company intake | `/request-roles` | **Hide**: structured internal role records; request detail still has its roles tab and Add role action. |
| Request activity | Company intake | `/request-activities` | **Hide duplicate global list**: existing request timeline tab retains the history. |
| Expert applications and directory | Expert network | `/expert-profiles` | **Hide**: no current live application/portal UI; approval and invitation workflows are retained. |
| Application reviews | Expert network | `/expert-reviews` | **Hide**: existing expert detail review history remains. |
| Availability | Expert network | `/availabilities` | **Hide**: retained expert detail tab, API, and matching data. |
| Skills | Expert network | `/skills` | **Hide**: expert catalogue retained; frontend showcase and specialization choices use local data. |
| Candidate shortlist | Matching | `/candidates` | **Hide**: internal matching, outreach, and offer drafting; request candidates tab remains. |
| Outreach records | Matching | `/outreach-records` | **Hide**: retained matching business logic and history. |
| Expert offers | Offers and placements | `/expert-offers` | **Hide**: retained drafting, issue/revision, manual response, and management selection. |
| Offer versions | Offers and placements | `/offer-versions` | **Hide**: version history remains in offer details; draft editing and attachments remain at the existing URL. |
| Offer responses | Offers and placements | `/offer-responses` | **Hide**: exact-version responses and evidence remain stored and available through the API/resource. |
| Selection decisions | Offers and placements | `/selection-decisions` | **Hide**: independent management decisions and reversals remain in offer details. |
| Placements | Offers and placements | `/placements` | **Hide**: placement history and status actions remain; the current frontend has no placement page. |
| Document management | Documents | `/documents` | **Keep**: uploads and private documents used by real submissions. |
| Document versions | Documents | `/document-versions` | **Keep**: scan state, immutable file versions, authorized download. |
| Notifications | Communications | `/notifications` | **Hide global list**: private header inbox remains, along with expert notification APIs. |
| Notification templates | Communications | `/notification-templates` | **Keep; move to Settings**: localized, versioned acknowledgement templates. |
| Outbox events | Communications | `/outbox-events` | **Hide diagnostics**: queue delivery/scanning/export events and Retry action remain available. |
| Delivery attempts | Communications | `/delivery-attempts` | **Hide diagnostics**: provider result/history records remain. |
| Audit logs | Governance | `/audit-events` | **Hide global list**: audit recording and authorized direct access remain. |
| Reports and exports | Governance | `/export-jobs` | **Hide**: not required by current frontend; filtered reports, private generated files, jobs, and download checks remain. |
| Public pages | Content and settings | `/public-pages` | **Keep; move to Website content**: localized published Markdown. |
| Services | Content and settings | `/services` | **Hide**: reference-data API and request-service relationships remain; current frontend has no catalogue consumer. |
| System settings | Content and settings | `/system-settings` | **Keep; move to Settings**: existing allowlisted configuration administration. |
| Users | Identity | `/users` | **Keep; move to Access management**: staff invitations, status, and role assignments. |
| Roles | Identity | `/roles` | **Keep; move to Access management**: custom roles and permission assignment. |
| Permissions | Identity | `/permissions` | **Keep; move to Access management**: permission catalogue used by existing roles. |

No menu is permanently removed or merged into new business logic. Duplicate/global history lists are hidden while their existing contextual tabs remain. Those tabs retain their previous read-only behavior; a tab is not a replacement for every action on its standalone resource. Operators who need CRM maintenance, matching, offer actions, retries, audits, or reports should restore operational navigation or use the retained URLs above.

### Default panel organization

- Dashboard: account widget, requests-to-review statistic, and the existing 14-day request chart for users with request permission.
- Company intake: Company requests.
- Documents: Document management, Document versions.
- Website content: Public pages.
- Access management: Users, Roles, Permissions.
- Settings: Notification templates, System settings, Security.

The default sidebar has nine resource links, Dashboard, and Security, reduced from 30 resource links plus those two pages. Groups and item order are explicit and localized in English/Khmer. Permission filtering still applies: standard STAFF sees Dashboard, Company requests, both document screens, and Security.

## Implementation and safety

- `DomainResource::shouldRegisterNavigation()` selects the nine primary resources. It does not change `canViewAny()`, policy abilities, queries, route registration, actions, or relationships.
- `DomainResource` assigns the default navigation groups and order centrally. `AdminPanelProvider` orders the groups using translated labels. Security remains at `/admin/settings/security`.
- `PlatformStats` defaults to request metrics. Operational mode restores its expert/offer/placement cards, each gated by the corresponding module permission. The request chart and header notifications are retained.
- `ADMIN_SHOW_OPERATIONAL_NAVIGATION=true` restores all 30 resource menus and operational dashboard cards. The configuration key is `devmasters.show_operational_navigation`; default is `false`. Original resource groups are used in operational mode. As usual, refresh cached Laravel configuration after changing an environment value, and restart any long-running application workers as appropriate. No local environment or credentials were overwritten.
- Permission validation exposed an existing defect in `HandlesWorkflowErrors`: the shared handler suppressed Filament mount/hydrate authorization exceptions and converted them to toast notifications with HTTP 200. It now leaves exceptions unhandled when resource access is denied, so unauthorized page loads and subsequent Livewire updates return 403. Authorized workflow errors still show the existing feedback notifications.

No tables, migrations, models, controllers, policies, API routes, packages, business services, data, or jobs were deleted. The PostgreSQL schema, consent/history records, immutable snapshots, record versions, and foreign keys are unchanged. In particular, the request → candidate → offer/version → response → selection → placement chain and document/link/evidence relationships remain intact.

The scheduler still dispatches `devmasters:outbox` and `devmasters:expire-offers` every minute. `DeliverOutboxEvent` still handles email, document scanning, and report generation. Hiding their admin screens does not disable these processes. Both default and restored navigation continue to require existing module permissions; hiding a menu is not an access-control rule.

## Preserved API surface

`php artisan route:list --path=api --except-vendor` reports 32 API route entries. The complete route inventory is compared before and after this change, including methods, middleware, URIs, actions, and names.

| Surface | Retained routes / authentication |
| --- | --- |
| Health | `GET /api/health`. |
| Current public pages/forms | `GET /api/v1/pages/{slug}`; `POST /api/v1/company-requests`; locale GET/POST; existing CSRF-cookie endpoint. |
| Retained application/reference surface | `GET /api/v1/reference-data`; `POST /api/v1/expert-applications`; application-corrections GET/POST with token and recovery throttling. |
| Authentication | Login, forgot-password, reset-password POST; authenticated expert `auth/me` GET and logout POST. Filament has its own staff login, reset, and MFA routes. |
| Expert profile/availability | Dashboard GET; profile GET/PATCH; skills PUT; availability POST/DELETE. |
| Expert workflow | Offers list/detail GET; exact-version response POST; placements and selection-decisions GET. |
| Expert files/consent/inbox | Documents GET/POST; authorized version download GET; consents GET/POST; notifications GET and read PATCH. |

Protected expert routes keep Sanctum authentication, session authentication, and the expert eligibility middleware. Public submission/recovery/command throttling, request validation, idempotency scope, error codes, response envelopes, localization, upload quarantine, and file download policies are unchanged.

## Validation

Tests used the separate `devmaster-website_test` PostgreSQL database; the application database was not migrated or reseeded by this audit.

| Check | Result |
| --- | --- |
| `DB_DATABASE=devmaster-website_test php artisan test --compact` | **192 passed, 1 skipped**, 1,089 assertions, 193 total cases. Covers existing API intake, idempotency, authentication, access management, CMS/localization, exports, file policies, schema/workflow guards, concurrency, deployment behavior, and all resource tables. |
| New `AdminNavigationTest` cases | **12 passed** within the full suite: exact default sidebar/group order in English and Khmer; full navigation restoration; restricted STAFF sidebar; retained authorized direct URLs; denied STAFF direct URLs in both modes; guest rejection; revocation on an open Livewire page; default/full/permission-filtered dashboard statistics. |
| Existing workflow-error feedback | Existing `AccessManagementTest` still passes, including the self-suspension denial toast. Page-access denials now propagate instead of being swallowed. |
| `npm run typecheck -- --incremental false` | **Passed**. |
| `npm test -- --maxWorkers=2` | **449 passed**, 20 files. Includes live form payloads, previews remaining local, retired route allowlist, locale behavior, and Laravel proxy contracts. The initial unrestricted run had one 5-second showcase-test timeout; the isolated rerun passed 17/17, and the complete run with two workers passed. No test timeout/configuration was changed. |
| Full route inventory before/after | **All 92 route contracts unchanged**, comparing methods, URIs, names, actions, domains, and middleware. All 32 API entries match exactly. The only inventory metadata change is the PHP source line number of the admin MFA redirect closure after adding an import. |
| Admin translations | Both JSON catalogues parse; bilingual default navigation assertions pass. |
| `vendor/bin/pint --dirty --format agent` and `git diff --check` | **Passed**. |

The skipped test is the opt-in real S3/ClamAV/backup-restore integration test (`RUN_NATIVE_INTEGRATION=1`). This audit did not run that native integration or Playwright browser E2E: the native application supervisor was not running. Existing feature tests exercise uploads, quarantine, private exports, and download authorization with their test storage fixtures; they do not certify external storage, live malware scanning, or real mail delivery. No frontend source changes were made for this audit; concurrent frontend edits were left intact.

## Outstanding existing integration limitations

1. Expert signup, portal login, and recovery intentionally remain previews. Preserved expert APIs do not make them live. `ApplicationForm` is reusable source, not evidence of an active public application flow.
2. Existing expert/staff setup and correction emails can refer to retired frontend `/reset-password`, `/forgot-password`, `/expert`, or `/application-corrections` destinations. Enabling the corresponding operational workflows requires reviewing those destinations. Native Filament login/reset/MFA routes remain available; this sidebar change does not reconnect retired frontend screens.
3. Partnership specialist rows are plain text within `company_requests.requirements`; the frontend does not create structured `request_roles` or `request_role_skills`. Existing staff Add role functionality remains available. No parsing or schema change is introduced.
4. Public pages currently accept general slugs and Markdown. Only three slugs are routed by Next.js; editing another stored page does not create a new frontend route. Publishing home Markdown can replace its engagement controls as described above.
5. System settings, Services, and Skills are not frontend branding/catalogue controls in the current UI. Updating them does not change hardcoded logos, specialization choices, technology cards, or translations.
6. Privacy/terms fallback text remains development wording awaiting approval. No legal content or new CMS/media feature was invented during this audit.
