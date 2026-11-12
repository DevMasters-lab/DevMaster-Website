# DevMasters shared production domain

The Next.js app on Vercel owns `https://devmasters.dev`. Laravel stays at `https://devmasters-api.onrender.com`; Next.js externally rewrites selected paths to that origin without changing the browser URL. Filament 5 is mounted at `/admin`, with Livewire 4 handling its forms and actions. Browser API calls already use relative `/api/v1/*` URLs with credentials and CSRF tokens.

## Deploy the existing installation

1. In Render → **devmasters-api → Environment**, set `RUN_MIGRATIONS=false` and `RUN_ADMIN_SEED=false` before deploying. Preserve the existing `APP_KEY`, `APP_PREVIOUS_KEYS` if used, all Neon `DB_*` values, and existing storage/mail/scanner secrets. Do not generate a key, initialize users, or migrate this database for the domain change.
2. Apply the Render settings below and deploy the reviewed `main` commit. Keep Docker root directory `backend`, Dockerfile `./Dockerfile`, Docker command empty, and health check `/api/health`. Startup rebuilds Laravel configuration, route, and view caches using runtime variables. No manual `optimize:clear` or database cache clear is needed.
3. In Vercel → project → **Settings → Build and Deployment**, use framework **Next.js**, root directory `frontend`, build command `npm run build`, and default output directory. Set production branch `main` under Git settings. Keep existing application settings.
4. In Vercel → **Settings → Environment Variables**, set production `LARAVEL_URL=https://devmasters-api.onrender.com` and `FRONTEND_URL=https://devmasters.dev`. `LARAVEL_URL` is a server-side build-time value and must point to Render, never back to `https://devmasters.dev` (which would loop). `FRONTEND_URL` also supplies the frontend metadata origin. Browser API calls need no `NEXT_PUBLIC_API_URL`. Scope preview values separately; use a stable hostname explicitly configured in Laravel if testing authenticated preview deployments.
5. In Vercel → **Settings → Domains**, attach `devmasters.dev` to this project. In Hostinger → **DNS / Nameservers → DNS Zone Editor**, use the exact apex A record Vercel shows for this project. Remove only conflicting apex website A/AAAA/CNAME records; preserve MX/TXT/mail and unrelated records. If using `www`, add it to Vercel, create its supplied CNAME, and redirect it to the apex. DNS routes hosts, so `/admin` and `/api` require no separate records. Do not attach the apex to Render. Wait for Vercel verification and TLS readiness. [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Hostinger DNS editor](https://www.hostinger.com/support/how-to-use-hostingers-dns-zone-editor/).
6. Redeploy Vercel after saving environment variables; rewrites are compiled at build time. Keep the Render `.onrender.com` URL enabled and reachable throughout testing.

### Exact Render changes

Enter these values individually in Render's environment editor. The literal unquoted value `null` for `SESSION_DOMAIN` is parsed by Laravel as no Domain attribute.

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://devmasters.dev
FRONTEND_URL=https://devmasters.dev
TRUSTED_PROXIES=*
SESSION_DRIVER=database
SESSION_TABLE=laravel_sessions
SESSION_DOMAIN=null
SESSION_PATH=/
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
SANCTUM_STATEFUL_DOMAINS=devmasters.dev,devmasters-api.onrender.com
RUN_MIGRATIONS=false
RUN_ADMIN_SEED=false
```

Keep `CACHE_STORE=database` and `QUEUE_CONNECTION=sync` as required by this existing Render container. Remove any stale `ASSET_URL` override pointing at an HTTP or Render hostname; no override is needed. `APP_URL` is the canonical URL for console jobs, notifications, and public-disk links. `FRONTEND_URL` controls frontend reset/correction links and allowed CORS origin. Stateful domains contain hosts only, without schemes or paths. The API already explicitly applies Laravel's `web` middleware to session-backed v1 routes; no CSRF exemption or broad stateful-middleware addition is needed.

Host-only secure cookies work on both domains, with independent sessions. Setting `SESSION_DOMAIN=devmasters.dev` or `.devmasters.dev` would prevent direct Render login from retaining cookies. The runtime session table is **`laravel_sessions`**; **`sessions`** is a business table and must not be reused. Existing Neon credentials and schema remain unchanged.

### Forwarded URLs and caching

Next.js external rewrites change the upstream Host to Render. The frontend also passes its actual public host and protocol in overwritten `X-Devmasters-Proxy-Host` / `X-Devmasters-Proxy-Proto` request headers. Laravel accepts forwarded host information only from a trusted proxy and only for configured application/frontend origins. These headers select an allowed URL origin; they do not authenticate a user or bypass CSRF. Direct Render GET/HEAD requests to `/`, `/admin` and `/admin/login` now redirect to `https://devmasters.dev/admin`; other direct-origin routes retain the Render origin. This redirect checks both the raw Host and the trusted effective host, so Vercel-to-Render requests do not redirect to themselves. Benign scalar query parameters are retained; credential/session/CSRF/MFA and navigation parameters, nested input, control characters and oversized values are dropped. Redirect responses use no-store and no-referrer. Apache passes both entry paths, including trailing-slash variants, directly to Laravel before its generic slash redirect, preventing internal HTTP/port URLs from escaping. Do not force every HTTP request to `APP_URL`, since APIs and signed URLs still need request-specific origins.

`frontend/vercel.json` sets `skipMiddlewareRequestBody=true`: the routing middleware only needs headers, while the external rewrite target still receives the complete body. Keep this setting to avoid sending uploads through middleware's body limit. For standalone Next.js, the body buffer is raised to 64 MB to match PHP's `post_max_size`; individual application files remain limited to 10 MiB and company requests permit five attachments. Verify a multipart request larger than 10 MiB on staging after deployment as well as a small Livewire upload. Do not replace the external rewrites with a Vercel API Function upload relay, which has a separate payload limit. [Vercel body forwarding option](https://vercel.com/changelog/skip-sending-request-bodies-to-routing-middleware), [Next.js proxy buffering](https://nextjs.org/docs/app/api-reference/config/next-config-js/proxyClientMaxBodySize).

`TRUSTED_PROXIES=*` matches the existing Render ingress deployment. Narrow this to verified ingress CIDRs if your hosting setup provides a stable allowlist. Never expose the container directly to untrusted connections while treating every source as a proxy.

Admin, API, CSRF, locale, Livewire actions, and download responses receive `private, no-store` browser cache headers and `no-store` CDN headers, including errors and redirects. Vercel rewrite caching is explicitly disabled for these routes. Keep dashboard routing rules from overriding these protections; purge any previously configured cache for these paths when deploying. Framework CSS/JS and Next.js public fonts remain eligible for normal asset caching. [Vercel external rewrite caching](https://vercel.com/docs/routing/rewrites#disabling-caching-for-rewrites-to-external-origins).

The official login and dashboard entry is `/admin`: guests receive the unchanged native Filament login component and authenticated administrators receive the native protected dashboard. Native `/admin/login` stays registered internally for Livewire guest middleware; browser GET/HEAD requests to that old URL redirect to `/admin`. Guest snapshots retain the native guest route path, while dashboard snapshots retain their protected route path. Keep both registrations and native authentication middleware when updating this adapter.

## Laravel path inventory

| Public path | Purpose |
| --- | --- |
| `/admin`, `/admin/*` | Filament login, logout POST, reset/MFA flows, dashboard and resources, local signed setup |
| `/api`, `/api/*` | Public health and existing `/api/v1/*` APIs, expert login/logout, submissions and private document downloads |
| `/sanctum/csrf-cookie` | Session and readable encrypted XSRF cookie bootstrap |
| `/locale` | Laravel language-switch POST, retaining CSRF validation |
| `/livewire/*`, `/livewire-{hash}/*` | Component updates, scripts, maps, temporary upload POST, signed previews and component assets |
| `/filament/exports/*`, `/filament/imports/*` | Authenticated export and failed-import downloads |
| `/css/filament/*`, `/js/filament/*`, `/fonts/filament/*` | Published framework assets |
| `/storage/*` | Public-disk files only; Docker creates the public storage symlink |

Livewire's hash derives from the existing key. Filament login normally posts its component state to Livewire rather than a separate `/login` controller. Preserve all methods, query strings (including signatures), cookies, and CSRF headers through the proxy. Do not add broad `/login`, `/logout`, `/build`, `/fonts`, or catch-all rewrites. Next.js continues to own localized frontend pages, `/_next/*`, public typography fonts, and its images. `storage/app/private` remains inaccessible as public files; private documents require their authenticated API or admin action.

## Verification after both deployments

These checks do not log cookies or modify business data:

```sh
curl --fail --silent --show-error https://devmasters-api.onrender.com/api/health
curl --fail --silent --show-error https://devmasters.dev/api/health
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' https://devmasters.dev/admin
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' https://devmasters.dev/api/v1/reference-data
curl --silent --show-error --output /dev/null --write-out '%{http_code}\n' https://devmasters.dev/sanctum/csrf-cookie
```

Expect 200 health/login/reference data and 204 CSRF. Inspect `/admin`'s login HTML: all actions, Livewire URLs, assets and signed previews should use `devmasters.dev` or relative paths, with no mixed HTTP content or Render navigation. Confirm direct Render `/admin` and `/admin/login` return 302 to the public `/admin`, while proxied `/admin` returns 200 without changing the browser URL. Public `/admin/login` returns 302 to `/admin`. Direct Render API/health requests remain available.

Using an existing authorized admin account, complete login and the authenticator challenge if MFA is enabled. Accounts without MFA can open the dashboard and manage optional enrollment under **Content and settings → Security**. Check CSS/JS/font requests, Livewire update responses, session continuity across navigation, language switch, password reset destination, and logout POST. Check expert login/logout and unauthenticated `/api/v1/auth/me` → 401 JSON. In DevTools, verify Secure/HttpOnly session cookies, host-only domain, valid XSRF headers, no-store authenticated/error/redirect responses, and no repeated CDN `HIT` for sensitive responses. An unsafe request without the expected origin/token must remain rejected. Do not disable an account's MFA or CSRF to get a green result.

Uploads, record edits, exports, reset emails and authenticated production login require a controlled acceptance test using approved accounts; they are not performed against existing production data by repository validation. Test those with a separate staging database/bucket before exercising production mutations. Do not run the existing Playwright global fixture against production: it prepares test database records.

## Reliability limits and working alternatives

Render Free sleeps after 15 idle minutes, needs about a minute to wake, and loses local files on sleep/restart/redeploy. Local Livewire temporary uploads can disappear during an interrupted upload flow. Permanent private documents already support S3 through `PRIVATE_STORAGE_DRIVER=s3`; keep the existing durable bucket configuration and credentials. Public-disk files need durable storage too if used. The scheduler also stops during sleep. [Render Free limitations](https://render.com/docs/free).

Vercel caps an external proxied request at 120 seconds. Cold start plus a long export/download/scan can exceed that, even though PHP allows 180 seconds. Increasing PHP or Next.js timeouts does not remove the platform cap. [Vercel proxy timeout](https://vercel.com/docs/limits#proxied-request-timeout).

For reliable production keep this domain layout with an always-on Laravel service, durable S3 storage, and a continuously running scheduler/worker; make long exports asynchronous and download the completed object. If workflows must stream for longer than Vercel allows, use a reverse proxy/CDN with suitable timeouts in front of both services, routing `/admin` and Laravel action/API paths directly to Laravel while routing other paths to Vercel. Another practical option is an always-on Laravel service at `admin.devmasters.dev`, with its assets/actions on the same admin host; the frontend can stay at the apex. A subdomain alone does not fix Render Free sleep or ephemeral storage.

## Repository validation — 12 November 2026

- Full Laravel suite: 147 passed, 721 assertions, one optional native integration test skipped. New coverage includes allowlisted proxy headers and marker fallback, direct Render URLs, asset URLs, signed Livewire upload URLs, host-only secure cookies, CSRF rejection, sensitive error caching, and actual password plus mandatory TOTP login through HTTP Livewire followed by logout/session termination. Database tests use transactions on the existing local test database and roll back; no Neon data, migrations or credentials are involved.
- Frontend: 54 Vitest tests, TypeScript checking and production build passed. Proxy tests cover namespace boundaries, localized routes, static assets, request markers and cache rules.
- Real Next.js external rewrite tests: GET/POST routing, cookies including multiple Set-Cookie headers, CSRF headers, request bodies, exact signed query strings and an 11 MiB multipart payload passed against an isolated echo origin.
- Headless Chrome through a production Next.js server and an isolated Laravel HTTP server: admin login CSS/JS/fonts loaded without failed requests or JavaScript errors; a real Livewire login validation update returned 200; API health returned 200, unauthenticated API returned 401, CSRF bootstrap returned 204, and direct-origin redirects remained correct. The frontend `/en` route returned 200; CMS data rendering was covered by the database-backed Laravel suite rather than this empty-database HTTP smoke test. A request without a trusted browser origin or CSRF token returned 419. Laravel 13 also legitimately accepts same-origin browser requests through its origin check.
- Composer strict validation, production platform checks, PHP lint, Pint, shell syntax and diff whitespace checks passed. Docker is unavailable locally, so a real image build/Apache startup still requires Render deployment validation.
- Pre-deployment live read-only checks: Render health/login worked; supplying public forwarded HTTPS/host headers returned the correct public-domain redirect. The apex Vercel deployment returned `DNS_HOSTNAME_RESOLVED_PRIVATE`, consistent with its localhost fallback. Hosting environment values and DNS were not changed by these checks. Authenticated production journeys and Vercel's deployed body forwarding remain acceptance checks after applying the configuration above.

The local `backend/.env` checksum remained unchanged. No keys, Neon credentials or production business records were changed; no migrations or seeders were run against production.
