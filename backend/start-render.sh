#!/bin/sh
set -eu

: "${APP_KEY:?Set a persistent APP_KEY in Render secrets}"
: "${APP_URL:?Set the public HTTPS API URL in Render}"
: "${FRONTEND_URL:?Set the public HTTPS frontend URL in Render}"
# Render terminates HTTPS at its ingress; preserve an explicit proxy allowlist.
TRUSTED_PROXIES="${TRUSTED_PROXIES:-*}"
export TRUSTED_PROXIES
# libpq must not probe /root for an optional client certificate after setuid.
PGSSLCERT="${PGSSLCERT:-/var/www/.postgresql/postgresql.crt}"
export PGSSLCERT
: "${DB_HOST:?Set the Neon hostname in Render}"
: "${DB_DATABASE:?Set the Neon database in Render}"
: "${DB_USERNAME:?Set the Neon role in Render}"
: "${DB_PASSWORD:?Set the Neon password in Render secrets}"

if [ "${APP_ENV:-}" != production ] || [ "${APP_DEBUG:-false}" != false ]; then
    echo 'Render requires APP_ENV=production and APP_DEBUG=false.' >&2
    exit 1
fi
if [ "${DB_CONNECTION:-}" != pgsql ]; then
    echo 'Set DB_CONNECTION=pgsql.' >&2
    exit 1
fi
case "${DB_SSLMODE:-}" in
    require|verify-ca|verify-full) ;;
    *) echo 'Set DB_SSLMODE=require (or a verified SSL mode) for Neon.' >&2; exit 1 ;;
esac
if [ -n "${DB_URL:-}" ]; then
    echo 'Unset DB_URL; use the explicit Neon DB_* variables.' >&2
    exit 1
fi
if [ "${SESSION_DRIVER:-}" != database ] || [ "${SESSION_TABLE:-}" != laravel_sessions ]; then
    echo 'Set SESSION_DRIVER=database and SESSION_TABLE=laravel_sessions; sessions is a business table.' >&2
    exit 1
fi
if [ "${CACHE_STORE:-}" != database ] || [ "${QUEUE_CONNECTION:-}" != sync ]; then
    echo 'This container requires CACHE_STORE=database and QUEUE_CONNECTION=sync.' >&2
    exit 1
fi

PORT="${PORT:-10000}"
case "$PORT" in
    ''|*[!0-9]*) echo 'PORT must be an integer.' >&2; exit 1 ;;
esac
if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo 'PORT must be between 1 and 65535.' >&2
    exit 1
fi
export PORT
cd /var/www/html
printf 'Listen 0.0.0.0:%s\n' "$PORT" > /etc/apache2/ports.conf

mkdir -p storage/app/private storage/app/public storage/framework/cache/data \
    storage/framework/cache/locks storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

# Build caches only after runtime secrets are available; never clear shared DB cache.
runuser -u www-data -- php artisan config:clear --no-interaction
runuser -u www-data -- php artisan devmasters:render-check --configuration-only --no-interaction
case "${RUN_MIGRATIONS:-false}" in
    true) runuser -u www-data -- php artisan migrate --force --no-interaction ;;
    false) ;;
    *) echo 'RUN_MIGRATIONS must be true or false.' >&2; exit 1 ;;
esac
runuser -u www-data -- php artisan config:cache --no-interaction
runuser -u www-data -- php artisan route:cache --no-interaction
runuser -u www-data -- php artisan view:cache --no-interaction
runuser -u www-data -- php artisan devmasters:render-check --no-interaction
apache2ctl -t

exec /usr/bin/supervisord -c /etc/supervisor/render.conf
