# syntax=docker/dockerfile:1
FROM php:8.4-apache-bookworm AS extensions

RUN apt-get update && apt-get install -y --no-install-recommends \
        libicu-dev libonig-dev libpq-dev libzip-dev \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath intl mbstring opcache pcntl pdo_pgsql pgsql zip

FROM php:8.4-apache-bookworm AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates libicu72 libonig5 libpq5 libzip4 postgresql-client supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite \
    && a2dissite 000-default \
    && echo 'ServerName localhost' > /etc/apache2/conf-available/server-name.conf \
    && a2enconf server-name \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY --from=extensions /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=extensions /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/
WORKDIR /var/www/html

FROM runtime AS build
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
COPY . .
RUN mkdir -p storage/framework/cache/data storage/framework/cache/locks \
        storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && APP_ENV=production APP_DEBUG=false CACHE_STORE=array SESSION_DRIVER=array \
        QUEUE_CONNECTION=sync LOG_CHANNEL=stderr \
        composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader \
    && composer check-platform-reqs --no-dev

FROM runtime AS production
COPY --from=build --chown=root:www-data /var/www/html /var/www/html
COPY --from=build /usr/local/bin/composer /usr/local/bin/composer
COPY render-php.ini /usr/local/etc/php/conf.d/zz-render.ini
COPY render-apache.conf /etc/apache2/sites-available/render.conf
COPY render-supervisord.conf /etc/supervisor/render.conf
RUN a2ensite render \
    && chmod +x start-render.sh \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R ug+rwX storage bootstrap/cache

ENV APP_ENV=production APP_DEBUG=false LOG_CHANNEL=stderr LOG_LEVEL=info PORT=10000
EXPOSE 10000
STOPSIGNAL SIGTERM
CMD ["/var/www/html/start-render.sh"]
