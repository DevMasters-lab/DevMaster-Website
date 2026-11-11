<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class RenderCheck extends Command
{
    protected $signature = 'devmasters:render-check {--configuration-only : Validate local configuration without connecting to external services}';

    protected $description = 'Check Render encryption, permissions and PostgreSQL runtime readiness without revealing secrets or changing data';

    public function handle(): int
    {
        if (! $this->configurationIsValid()) {
            return self::FAILURE;
        }

        if ($this->option('configuration-only')) {
            $this->info('Render configuration checks passed.');

            return self::SUCCESS;
        }

        if (! $this->databaseIsReady()) {
            return self::FAILURE;
        }

        $this->info('Render configuration, PostgreSQL SSL and runtime table checks passed.');

        return self::SUCCESS;
    }

    private function configurationIsValid(): bool
    {
        try {
            $this->laravel->forgetInstance('encrypter');
            $this->laravel->make('encrypter');
        } catch (Throwable) {
            $this->error('Invalid Laravel encryption configuration. Restore the correct persistent APP_KEY and valid previous keys; do not print or regenerate an existing key.');

            return false;
        }

        if ($this->laravel->environment('production') && config('app.debug')) {
            $this->error('Production requires APP_DEBUG=false.');

            return false;
        }

        if ($this->laravel->environment('production') && ! $this->loggingTargetsStderr()) {
            $this->error('Production logging must target stderr or errorlog; set LOG_CHANNEL=stderr.');

            return false;
        }

        foreach (['framework/views', 'framework/sessions', 'framework/cache/data'] as $directory) {
            $path = storage_path($directory);
            if (! is_dir($path) || ! is_writable($path)) {
                $this->error('Runtime directory is missing or not writable: storage/'.$directory.'.');

                return false;
            }
        }

        $cachePath = $this->laravel->bootstrapPath('cache');
        if (! is_dir($cachePath) || ! is_writable($cachePath)) {
            $this->error('Runtime directory is missing or not writable: bootstrap/cache.');

            return false;
        }

        return true;
    }

    private function loggingTargetsStderr(): bool
    {
        $channel = config('logging.default');
        $channels = $channel === 'stack' ? config('logging.channels.stack.channels', []) : [$channel];
        if ($channels === []) {
            return false;
        }

        foreach ($channels as $name) {
            if ($name === 'errorlog' && config('logging.channels.errorlog.driver') === 'errorlog') {
                continue;
            }
            if ($name !== 'stderr' || config('logging.channels.stderr.driver') !== 'monolog' || config('logging.channels.stderr.handler_with.stream') !== 'php://stderr') {
                return false;
            }
        }

        return true;
    }

    private function databaseIsReady(): bool
    {
        if (config('database.default') !== 'pgsql') {
            $this->error('Render requires DB_CONNECTION=pgsql.');

            return false;
        }
        if (config('session.driver') !== 'database' || config('session.table') !== 'laravel_sessions') {
            $this->error('Set SESSION_DRIVER=database and SESSION_TABLE=laravel_sessions; the sessions business table must remain unchanged.');

            return false;
        }
        if (config('cache.default') !== 'database') {
            $this->error('Render requires CACHE_STORE=database.');

            return false;
        }

        $defaultConnection = config('database.default');
        $sessionConnection = config('session.connection') ?: $defaultConnection;
        $cacheConnection = config('cache.stores.database.connection') ?: $defaultConnection;
        $lockConnection = config('cache.stores.database.lock_connection') ?: $cacheConnection;
        $checks = [
            [$sessionConnection, 'laravel_sessions', ['id', 'user_id', 'ip_address', 'user_agent', 'payload', 'last_activity'], 'HTTP sessions'],
            [$cacheConnection, config('cache.stores.database.table', 'cache'), ['key', 'value', 'expiration'], 'database cache'],
            [$lockConnection, config('cache.stores.database.lock_table') ?: 'cache_locks', ['key', 'owner', 'expiration'], 'database cache locks'],
        ];

        $connections = array_unique([$defaultConnection, $sessionConnection, $cacheConnection, $lockConnection]);
        foreach ($connections as $name) {
            if (! in_array(config('database.connections.'.$name.'.sslmode'), ['require', 'verify-ca', 'verify-full'], true)) {
                $this->error('PostgreSQL connections require DB_SSLMODE=require or a verified SSL mode.');

                return false;
            }
        }

        try {
            foreach ($connections as $name) {
                $connection = DB::connection($name);
                if ($connection->getDriverName() !== 'pgsql') {
                    $this->error('All runtime database connections must use PostgreSQL.');

                    return false;
                }
                if (! in_array($connection->getConfig('sslmode'), ['require', 'verify-ca', 'verify-full'], true)) {
                    $this->error('Effective PostgreSQL connection must require SSL.');

                    return false;
                }
                // libpq enforces TLS for these modes; pg_stat_ssl can describe an upstream proxy hop.
                $ready = $connection->selectOne('SELECT 1 AS ready');
                if ((int) ($ready?->ready) !== 1) {
                    $this->error('PostgreSQL readiness query did not succeed.');

                    return false;
                }
            }

            foreach ($checks as [$name, $table, $columns, $label]) {
                if (! DB::connection($name)->getSchemaBuilder()->hasColumns($table, $columns)) {
                    $this->error('Required runtime schema is missing or incompatible for '.$label.'. Review the additive runtime migration; no schema changes were made.');

                    return false;
                }
            }
        } catch (Throwable) {
            $this->error('PostgreSQL readiness check failed. Verify Neon credentials, SSL, connectivity and reviewed runtime migrations. No database data was changed.');

            return false;
        }

        return true;
    }
}
