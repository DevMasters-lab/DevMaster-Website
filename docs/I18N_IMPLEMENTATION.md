# Khmer and English implementation

Implemented on 2 November 2026 for the existing native local application. Khmer (`km`) is the default; English (`en`) is the only other supported locale. This supersedes the original English development default. No Docker, hosting, replacement backend or business workflow redesign was introduced.

## Coverage checklist

| Reviewed area | Implementation and verification |
|---|---|
| Locale infrastructure | next-intl 4.14.9; matching English/Khmer catalogues; server metadata and client hooks; supported-locale validation |
| Public interface | Homepage, About, Services, Expertise, Invite Us to Bid, Hire Our Team, Be Our Team, Contact, Privacy and Terms; header/footer/mobile menus |
| Intake | Company, application and scoped correction forms; labels, placeholders, client/API validation, localized native constraint prompts, acknowledgements, translated file-picker controls |
| Expert authentication | Sign-in, recovery, activation/reset, saved account preference, logout and ownership errors |
| Expert interface | Dashboard, profile/personal/professional data, skills, availability, documents, exact offers/responses, histories, notifications, consent and account security |
| Filament resources | All 30 existing resources listed below; navigation, resource names, tables, filters, action schemas and relation managers |
| Filament interactions | Topbar/login/modal switchers; Livewire component locale restoration; labels, modal actions, status displays, dashboard statistics/chart, validation, pagination and empty states |
| Laravel | Auth/password/validation resources, application and file/workflow errors, stable API error codes, locale resolution middleware |
| Editable content | Service/skill translations; existing localized public pages and versioned notification templates; explicit fallback |
| Notifications | Recipient preference, anonymous submission locale, inbox translations, exact template snapshots and queue locale restoration |
| Typography | Locally served Noto Sans Khmer and Inter, Khmer line height and wrapping, LTR layouts, responsive controls |
| Regression | PostgreSQL constraints, authentication/authorization, exact-version offers, separate selection, concurrency, private files, native scanning and restore |

The 30 Admin resources reviewed are Users, Roles, Permissions, Organizations, Contacts, Company Requests, Expert Profiles/Applications, Expert Reviews, Skills, Availability, Candidates, Outreach Records, Expert Offers, Offer Versions, Offer Responses, Selection Decisions, Placements, Documents, Document Versions, Notifications, Notification Templates, Services, Public Pages, Audit Events, Export Jobs, System Settings, Request Roles, Request Activities, Outbox Events and Delivery Attempts. Related record tables reuse their resource's translated definitions.

## URLs, preference and forms

Public and Expert URLs use `/km` and `/en`, for example `/km/hire-our-team` and `/en/expert/offers`. Existing App Router routes are retained through a Next.js proxy rewrite. Unprefixed public URLs redirect to the supported cookie or Khmer default. API, Filament, Livewire, asset and Sanctum paths retain their existing URLs. Canonical and `hreflang` links cover both languages with Khmer as `x-default`; private authentication/correction content retains its privacy settings.

The shared React locale provider changes dictionaries without remounting the current form. Native history updates retain the path, query and hash; selected files and entered values remain intact. The accessible select is available in desktop/mobile public navigation and the Expert topbar. Backend failures saving a preference show an error while keeping the local choice. Anonymous preference uses a one-year SameSite=Lax, non-secret cookie. Authenticated selections also update `users.preferred_locale`; login restores the saved preference and updates the current URL. Logout preserves the language cookie.

Filament uses its installed package translation mechanisms, application translation resources and small Khmer vendor overrides. Its switcher posts a CSRF-protected preference update and refreshes Livewire components without a page reload. The custom hook reapplies the resolved locale after Livewire restores the previous snapshot's locale. Open modal form state is retained. Privileged MFA remains required.

## Backend contract

`GET /api/v1/locale` reports the resolved locale. `POST /api/v1/locale` accepts only `{ "locale": "km" }` or `en`; `/locale` is the equivalent CSRF-protected web endpoint used by Filament. Existing same-origin Sanctum cookies remain the authentication strategy.

Resolution priority is an explicitly validated `X-Locale`, authenticated saved preference, supported locale cookie, supported `Accept-Language`, then configured Khmer default. Next.js sends its selected locale in `X-Locale`. Responses include `Content-Language` and relevant `Vary` values. Field names, UUIDs, reference numbers, enum values, permissions and workflow commands remain stable.

Errors return `message`, `code`, `locale` and, for validation, `errors` keyed by the original field names. Standard codes include `VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CSRF_EXPIRED`, `RATE_LIMITED` and `INTERNAL_ERROR`. Other workflow failures use a deterministic `ERROR_…` code derived from the untranslated source. Password-broker errors retain stable codes in both languages. Missing-record errors do not expose model details. Existing client errors can change language without repeating the mutation.

## Reviewed database extension and content fallback

Migration `2026_11_02_080331_add_localization_to_devmasters.php` was applied after backing up the live database. It adds no domain tables and changes no foreign keys or business state values:

- Nullable `users.preferred_locale`, checked to allow only `km`/`en`.
- JSONB `translations` on services and skills, with original English name/description fields preserved.
- JSONB `notifications.translations` containing localized inbox snapshots.

JSONB maps default to `{}` and PostgreSQL checks require an object with supported locale keys. Original 42-table business relationships remain intact. Rolling back removes only the added preference/translation columns, so export their values before rollback if they must be retained.

For services/skills, lookup is requested-language field → explicit English field → original field. Admin forms edit Khmer name/description alongside the preserved original content. The local catalogue command fills translations for unchanged starter records only; it preserves human edits and inactive records. Existing localized `public_pages` and `notification_templates` rows are reused, with English fallback. Unknown CMS slugs retain HTTP 404 handling. Missing interface translations fall back safely to the English source.

User-entered biographies, company names, role titles, offer terms, comments, filenames, identifiers, custom role names and historical evidence are preserved verbatim. Their language does not change unless an explicit content translation exists. Existing legacy notifications without translated snapshots retain their original content. CSV/XLSX machine column names remain stable for consumers.

## Notifications and typography

Outbox payloads capture the anonymous submission locale or recipient identity/preference and exact template version IDs by language. Delivery uses the current saved recipient preference when available, then captured locale, with English fallback for legacy events. Queue jobs scope and restore Laravel locale in `finally`, preventing one recipient's language from leaking into the next job. Password recovery is encrypted and queued with an explicit locale. Email remains captured by local Mailpit; no Gmail SMTP or external delivery was configured.

Fonts are served from `frontend/public/fonts` and `backend/public/fonts`, with OFL license files included. Sources: [Noto Sans Khmer](https://github.com/google/fonts/tree/main/ofl/notosanskhmer) and [Inter](https://github.com/google/fonts/tree/main/ofl/inter). Khmer base framework translations were reviewed from [Laravel-Lang](https://github.com/Laravel-Lang/lang/tree/main/locales/km); installed Filament Khmer resources are supplemented by application-owned overrides. Khmer and English are both LTR. Dates/numbers/currencies use the selected locale; business currency codes remain intact. Native operating-system date-picker dialogs may follow the browser/OS language.

## Verification and remaining inputs

See [VERIFICATION.md](VERIFICATION.md) for actual command results and browser coverage. The local feature does not require hosting details. Final business/legal wording and any desired translations of custom editable content remain content-owner inputs; current development notices remain visible in both languages. No automatic translation of contractual or user-provided content is performed.
