# REST API contract

All endpoints use `/api/v1`. Responses use `{data: ...}`; paginated resource lists also expose Laravel `links`/`meta`. Validation failures return HTTP 422 with `message` and `errors`. Unauthenticated access returns 401; denied access 403; unknown or foreign expert resources 404; stale state, idempotency mismatch, expiry and capacity conflicts 409. API consumers must handle non-JSON upstream failures.

## Authentication and CSRF

Use the frontend's same-origin URLs. GET `/sanctum/csrf-cookie` with credentials first. Browser writes include the decoded `XSRF-TOKEN` cookie as `X-XSRF-TOKEN`, and all requests retain session credentials. Never expose `.env` or place session credentials in browser local storage. Public writes also require CSRF. The login endpoint is limited to eligible experts; staff use the MFA-protected Filament panel.

| Method | Path | Access | Contract |
|---|---|---|---|
| GET | `/reference-data` | Public | Active services, skills and exact consent version/text |
| GET | `/pages/{slug}` | Public | Published English Markdown page; raw HTML is not rendered |
| POST | `/company-requests` | Public | Multipart company intake; UUID `Idempotency-Key` required |
| POST | `/expert-applications` | Public | Multipart application/CV/consent; UUID `Idempotency-Key` required |
| POST | `/auth/login` | Public | JSON email and password; regenerates session |
| POST | `/auth/forgot-password` | Public | Email; generic response prevents account enumeration |
| POST | `/auth/reset-password` | Public | Email, token, password and password_confirmation; 12-character minimum |
| GET | `/auth/me` | Approved active expert | Safe account identity |
| POST | `/auth/logout` | Approved active expert | Invalidates session; 204 |
| GET | `/expert/dashboard` | Own records | Database-derived offer, placement and unread counts |
| GET/PATCH | `/expert/profile` | Own profile | PATCH requires record_version and allowlisted profile fields |
| PUT | `/expert/skills` | Own skills | `record_version` and `skills: [{id, proficiency?, years_experience?}]`; empty arrays clear skills |
| POST | `/expert/availability` | Own profile | starts_on, ends_on?, status, hours_per_week?, notes? |
| DELETE | `/expert/availability/{id}` | Own interval | No overlapping inclusive intervals permitted |
| GET | `/expert/offers` | Own issued offers | Paginated, optional status; issued versions and exact terms |
| GET | `/expert/offers/{id}` | Own issued offer | Exact issued versions, response history, attachment metadata |
| POST | `/expert/offer-versions/{id}/responses` | Owning expert | response_type, comments?, command_id UUID; Idempotency-Key required |
| GET | `/expert/placements` | Own placements | Safe administrative placement history |
| GET | `/expert/selection-decisions` | Own offers | Safe selection outcomes; internal reasons are excluded |
| GET | `/expert/documents` | Own documents | Metadata and scan state; no object keys/bucket URLs |
| POST | `/expert/documents` | Own documents | Multipart file, purpose and optional owned document_id for a new version |
| GET | `/expert/document-versions/{id}/download` | Owned or intentionally offered CLEAN version | Authorized attachment stream, never a public object URL |
| GET | `/expert/notifications` | Own inbox | Paginated notifications |
| PATCH | `/expert/notifications/{id}/read` | Own notification | Idempotent read timestamp |
| GET/POST | `/expert/consents` | Own profile | POST purpose, action and current policy_version; events are append-only |

Public company form fields: `request_type` (`INVITE_US_TO_BID` or `HIRE_OUR_TEAM`), `submitted_company_name`, `submitted_contact_name`, `submitted_email`, `submitted_phone?`, `title`, `requirements` (20–20,000 characters), `expected_start_on?`, `expected_end_on?`, `response_due_at?`, and `attachments[]?` (maximum five, 10 MiB each; PDF/DOCX/JPG/PNG). Contact Us explicitly asks the visitor whether to discuss hiring/services or a bid; it does not introduce a third undocumented request type.

Expert application fields: `full_name`, `contact_email`, `contact_phone?`, `professional_title`, `biography` (20–10,000 characters), `location_text?`, `consent=1`, `consent_version`, `cv` (PDF/DOCX, maximum 10 MiB). No user account is created by submission.

Offer responses: `ACCEPTED`, `DECLINED`, `CHANGES_REQUESTED`, or `COMMENT`. The route names the exact offer version; the server checks current version, expiry, ownership and active eligibility after locking. A duplicate decision is rejected. Retrying the same idempotent payload returns its original result. Acceptance never creates a placement.

Public idempotency is scoped to the server session; retain cookies when retrying. A seven-day storage window is a development default. Authenticated commands are scoped to the authenticated user. Changing a payload under the same key returns 409.

Rate limits per minute: public submissions 10/IP; expert login 5/IP; recovery 3/IP; file/response commands 30/user. Other expert endpoints require the same session/eligibility guard. Staff workflow mutations currently use Filament actions calling the guarded Laravel services; a separate staff REST interface is not exposed.

Application correction links use GET/POST `/application-corrections/{token}`. A 64-character bearer token is hashed in Redis with a 48-hour expiry, bound to a userless application in CORRECTIONS_REQUIRED state. The API only exposes the scoped application fields, accepts profile corrections and an optional replacement CV, preserves the original snapshot and returns the application to SUBMITTED. It creates no login account. The link is generated during delivery of the review notification and is not stored in the business outbox.

## Khmer and English localization

The API retains its field names and stored status/enum values in every language. Send `X-Locale: km` or `X-Locale: en` to request translated validation and workflow messages. Without an explicit header, the supported saved preference, locale cookie, language header and configured default are considered in that order. The default is Khmer. Responses include `Content-Language`.

`GET /api/v1/locale` returns `{data: {locale, authenticated}}`. `POST /api/v1/locale` accepts `{locale: "km"}` or `en`, sets the locale cookie, and saves the authenticated user's preference. It uses the existing session/CSRF protections. Unsupported locales return 422 with `VALIDATION_FAILED`.

Error bodies contain a translated `message`, stable machine-readable `code` and `locale`; validation additionally returns `errors` keyed by unchanged field names. Content endpoints return an explicit locale translation where present and otherwise the documented English/original fallback. Original user content, references and file names are never automatically translated. See [I18N_IMPLEMENTATION.md](I18N_IMPLEMENTATION.md).
