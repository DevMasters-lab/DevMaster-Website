# DevMasters backend

Laravel 13 / PHP 8.4 REST API and Filament 5 administration. The public Next.js application lives in `../frontend`; this backend has no separate Node/Vite asset pipeline. Filament publishes its vendor assets, and local typography lives in `public/fonts`.

- `app/Http`: controllers, middleware, validated requests, and API response resources.
- `app/Services`: transactional intake, matching, offers, account access, document handling, exports, audit, and outbox operations.
- `app/Models`, `app/Policies`, `app/Enums`: existing PostgreSQL domain schema, authorization, and status values, including framework/schema-discovered classes.
- `app/Filament`: nine retained admin resources, request context tabs, Dashboard widgets, Security, and native staff setup/recovery pages.
- `routes`: existing public/expert REST contracts, native web endpoints, and scheduled commands.
- `database`: retained migrations, schema source, factories and seeders. No production schema/data cleanup is part of the refactor.

Staff invitations and password recovery point to native Filament pages. Invited staff can set a password or request a fresh setup link; suspended, disabled, and non-staff users cannot activate through those pages. Existing expert API recovery contracts remain intact. Expert signup/sign-in dialogs on the public site remain previews.

Use the [repository README](../README.md) and [native setup](../docs/NATIVE_SETUP.md) for the configured local services. `composer run dev` starts the PHP development server on `127.0.0.1:8081`; run the Next.js frontend separately. Deployment configuration remains in the existing Render/Docker and `../infra` files.

Tests use the separate PostgreSQL `devmaster-website_test` database:

```sh
DB_DATABASE=devmaster-website_test php artisan test --compact
vendor/bin/pint --dirty --format agent
composer audit --locked
```

See the [project cleanup report](../docs/PROJECT_CLEANUP_REPORT.md), [admin deletion manifest](../docs/BACKEND_ADMIN_AUDIT.md), and [API contract](../docs/API.md) for scope, preserved behavior and remaining limitations.
