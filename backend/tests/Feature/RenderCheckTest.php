<?php

namespace Tests\Feature;

use Illuminate\Database\Connection;
use Illuminate\Database\Schema\Builder;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Mockery;
use PDOException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class RenderCheckTest extends TestCase
{
    public function test_valid_configuration_passes_without_database_access(): void
    {
        $this->productionConfiguration();
        DB::shouldReceive('connection')->never();

        $this->artisan('devmasters:render-check', ['--configuration-only' => true])
            ->expectsOutput('APP_KEY: present=yes; format_valid=yes; decoded_length_valid=yes')
            ->expectsOutput('APP_PREVIOUS_KEYS: present=no; format_valid=yes; decoded_length_valid=not_applicable')
            ->expectsOutput('Render configuration checks passed.')
            ->assertSuccessful();
    }

    public function test_invalid_key_fails_without_exposing_it_or_connecting_to_the_database(): void
    {
        $this->productionConfiguration();
        $invalidKey = 'synthetic-invalid-render-key';
        config(['app.key' => $invalidKey]);
        DB::shouldReceive('connection')->never();

        $exitCode = Artisan::call('devmasters:render-check', ['--configuration-only' => true]);
        $output = Artisan::output();

        $this->assertSame(1, $exitCode);
        $this->assertStringContainsString('APP_KEY: present=yes; format_valid=yes; decoded_length_valid=no', $output);
        $this->assertStringContainsString('Invalid APP_KEY:', $output);
        $this->assertStringNotContainsString($invalidKey, $output);
    }

    public function test_invalid_previous_key_fails_without_exposing_it(): void
    {
        $this->productionConfiguration();
        $previousKey = 'synthetic-invalid-previous-key';
        config(['app.previous_keys' => [$previousKey]]);
        DB::shouldReceive('connection')->never();

        $exitCode = Artisan::call('devmasters:render-check', ['--configuration-only' => true]);
        $output = Artisan::output();

        $this->assertSame(1, $exitCode);
        $this->assertStringContainsString('APP_KEY: present=yes; format_valid=yes; decoded_length_valid=yes', $output);
        $this->assertStringContainsString('APP_PREVIOUS_KEYS[1]: present=yes; format_valid=yes; decoded_length_valid=no', $output);
        $this->assertStringContainsString('Invalid APP_PREVIOUS_KEYS[1]:', $output);
        $this->assertStringNotContainsString($previousKey, $output);
    }

    #[DataProvider('missingCurrentKeys')]
    public function test_missing_current_key_is_distinguished_from_an_invalid_key(?string $key): void
    {
        $this->productionConfiguration();
        config(['app.key' => $key]);
        DB::shouldReceive('connection')->never();

        $exitCode = Artisan::call('devmasters:render-check', ['--configuration-only' => true]);
        $output = Artisan::output();

        $this->assertSame(1, $exitCode);
        $this->assertStringContainsString('APP_KEY: present=no;', $output);
        $this->assertStringContainsString('Missing APP_KEY.', $output);
        $this->assertStringNotContainsString('Invalid APP_KEY:', $output);
    }

    public static function missingCurrentKeys(): array
    {
        return ['unset' => [null], 'empty' => ['']];
    }

    public function test_valid_base64_previous_keys_preserve_old_decryption_and_use_the_current_key_for_new_values(): void
    {
        $this->productionConfiguration();
        $oldKey = str_repeat('o', 32);
        $olderKey = str_repeat('p', 32);
        $previousKey = 'base64:'.base64_encode($oldKey);
        config(['app.previous_keys' => [$previousKey, 'base64:'.base64_encode($olderKey)]]);
        $oldCiphertext = (new Encrypter($oldKey, 'AES-256-CBC'))->encryptString('synthetic-old-encrypted-data');
        DB::shouldReceive('connection')->never();

        $exitCode = Artisan::call('devmasters:render-check', ['--configuration-only' => true]);
        $output = Artisan::output();
        $encrypter = app('encrypter');
        $newCiphertext = $encrypter->encryptString('synthetic-new-encrypted-data');

        $this->assertSame(0, $exitCode);
        $this->assertStringContainsString('APP_PREVIOUS_KEYS[1]: present=yes; format_valid=yes; decoded_length_valid=yes', $output);
        $this->assertStringContainsString('APP_PREVIOUS_KEYS[2]: present=yes; format_valid=yes; decoded_length_valid=yes', $output);
        $this->assertSame('synthetic-old-encrypted-data', $encrypter->decryptString($oldCiphertext));
        $this->assertSame('synthetic-new-encrypted-data', (new Encrypter(str_repeat('r', 32), 'AES-256-CBC'))->decryptString($newCiphertext));
        $this->assertStringNotContainsString($previousKey, $output);
        $this->assertStringNotContainsString(base64_encode($oldKey), $output);
        $this->assertStringNotContainsString($oldKey, $output);
    }

    #[DataProvider('rawKeys')]
    public function test_valid_raw_keys_are_accepted_without_modification(string $key): void
    {
        $this->productionConfiguration();
        config(['app.key' => $key]);
        DB::shouldReceive('connection')->never();

        $exitCode = Artisan::call('devmasters:render-check', ['--configuration-only' => true]);
        $output = Artisan::output();

        $this->assertSame(0, $exitCode);
        $this->assertSame($key, app('encrypter')->getKey());
        $this->assertStringContainsString('APP_KEY: present=yes; format_valid=yes; decoded_length_valid=yes', $output);
        $this->assertStringNotContainsString($key, $output);
    }

    public static function rawKeys(): array
    {
        return [
            'ordinary raw key' => [str_repeat('s', 32)],
            'raw key with significant edge whitespace' => [' '.str_repeat('s', 30).' '],
        ];
    }

    #[DataProvider('invalidEncodedKeys')]
    public function test_invalid_encoded_keys_report_only_safe_status_and_the_failing_field(string $key, bool $formatValid): void
    {
        $this->productionConfiguration();
        config(['app.key' => $key]);
        DB::shouldReceive('connection')->never();

        $exitCode = Artisan::call('devmasters:render-check', ['--configuration-only' => true]);
        $output = Artisan::output();

        $this->assertSame(1, $exitCode);
        $this->assertStringContainsString('APP_KEY: present=yes; format_valid='.($formatValid ? 'yes' : 'no').'; decoded_length_valid=no', $output);
        $this->assertStringContainsString('Invalid APP_KEY:', $output);
        $this->assertStringNotContainsString($key, $output);
        $this->assertStringNotContainsString(str_replace('base64:', '', $key), $output);
    }

    public static function invalidEncodedKeys(): array
    {
        return [
            'malformed base64' => ['base64:synthetic%%%invalid', false],
            'valid base64 with wrong decoded length' => ['base64:'.base64_encode('synthetic-short-key'), true],
            'base64 without required format prefix' => [base64_encode(str_repeat('s', 32)), true],
        ];
    }

    public function test_legacy_base64_decoding_is_diagnosed_without_changing_laravel_acceptance(): void
    {
        $this->productionConfiguration();
        $encoded = base64_encode(str_repeat('l', 32));
        $key = 'base64:'.$encoded.'%';
        config(['app.key' => $key]);
        DB::shouldReceive('connection')->never();

        $exitCode = Artisan::call('devmasters:render-check', ['--configuration-only' => true]);
        $output = Artisan::output();

        $this->assertSame(0, $exitCode);
        $this->assertSame(str_repeat('l', 32), app('encrypter')->getKey());
        $this->assertStringContainsString('APP_KEY: present=yes; format_valid=no; decoded_length_valid=yes', $output);
        $this->assertStringNotContainsString($key, $output);
        $this->assertStringNotContainsString($encoded, $output);
    }

    #[DataProvider('invalidPreviousKeys')]
    public function test_invalid_previous_keys_are_identified_without_exposing_history(string $previousKey, bool $formatValid): void
    {
        $this->productionConfiguration();
        config(['app.previous_keys' => ['base64:'.base64_encode(str_repeat('p', 32)), $previousKey]]);
        DB::shouldReceive('connection')->never();

        $exitCode = Artisan::call('devmasters:render-check', ['--configuration-only' => true]);
        $output = Artisan::output();

        $this->assertSame(1, $exitCode);
        $this->assertStringContainsString('APP_KEY: present=yes; format_valid=yes; decoded_length_valid=yes', $output);
        $this->assertStringContainsString('APP_PREVIOUS_KEYS[2]: present=yes; format_valid='.($formatValid ? 'yes' : 'no').'; decoded_length_valid=no', $output);
        $this->assertStringContainsString('Invalid APP_PREVIOUS_KEYS[2]:', $output);
        $this->assertStringNotContainsString('Invalid APP_KEY:', $output);
        if (trim($previousKey) !== '') {
            $this->assertStringNotContainsString($previousKey, $output);
            $this->assertStringNotContainsString(str_replace('base64:', '', $previousKey), $output);
        }
        $this->assertStringNotContainsString(base64_encode(str_repeat('p', 32)), $output);
    }

    public static function invalidPreviousKeys(): array
    {
        return [
            'placeholder previous key' => ['REPLACE_WITH_PREVIOUS_KEY', true],
            'whitespace-only previous key' => [' ', true],
            'malformed base64 previous key' => ['base64:synthetic%%%invalid', false],
            'wrong-length base64 previous key' => ['base64:'.base64_encode('synthetic-short-previous-key'), true],
        ];
    }

    public function test_unsupported_cipher_is_distinguished_from_key_errors_without_database_access(): void
    {
        $this->productionConfiguration();
        config(['app.cipher' => 'unsupported-synthetic-cipher']);
        DB::shouldReceive('connection')->never();

        $this->artisan('devmasters:render-check', ['--configuration-only' => true])
            ->expectsOutput('Unsupported Laravel encryption cipher. Restore the supported cipher used by existing encrypted data.')
            ->assertFailed();
    }

    public function test_production_debug_mode_is_rejected(): void
    {
        $this->productionConfiguration();
        config(['app.debug' => true]);
        DB::shouldReceive('connection')->never();

        $this->artisan('devmasters:render-check', ['--configuration-only' => true])
            ->expectsOutput('Production requires APP_DEBUG=false.')
            ->assertFailed();
    }

    public function test_production_file_logging_is_rejected_without_opening_a_log(): void
    {
        $this->productionConfiguration();
        config(['logging.default' => 'single']);
        DB::shouldReceive('connection')->never();

        $this->artisan('devmasters:render-check', ['--configuration-only' => true])
            ->expectsOutput('Production logging must target stderr or errorlog; set LOG_CHANNEL=stderr.')
            ->assertFailed();
    }

    public function test_missing_runtime_directory_is_rejected_without_creating_it(): void
    {
        $this->productionConfiguration();
        $this->app->useStoragePath('/synthetic-missing-render-storage');
        DB::shouldReceive('connection')->never();

        $this->artisan('devmasters:render-check', ['--configuration-only' => true])
            ->expectsOutput('Runtime directory is missing or not writable: storage/framework/views.')
            ->assertFailed();
        $this->assertDirectoryDoesNotExist('/synthetic-missing-render-storage');
    }

    public function test_business_sessions_table_is_rejected_without_database_access(): void
    {
        $this->productionConfiguration();
        config(['session.table' => 'sessions']);
        DB::shouldReceive('connection')->never();

        $this->artisan('devmasters:render-check')
            ->expectsOutput('Set SESSION_DRIVER=database and SESSION_TABLE=laravel_sessions; the sessions business table must remain unchanged.')
            ->assertFailed();
    }

    public function test_unencrypted_database_configuration_is_rejected_before_connecting(): void
    {
        $this->productionConfiguration();
        config(['database.connections.pgsql.sslmode' => 'prefer']);
        DB::shouldReceive('connection')->never();

        $this->artisan('devmasters:render-check')
            ->expectsOutput('PostgreSQL connections require DB_SSLMODE=require or a verified SSL mode.')
            ->assertFailed();
    }

    public function test_connection_errors_are_reported_without_connection_details(): void
    {
        $this->productionConfiguration();
        $connectionDetails = 'synthetic-private-dsn-and-password';
        DB::shouldReceive('connection')->once()->with('pgsql')->andThrow(new PDOException($connectionDetails));

        $exitCode = Artisan::call('devmasters:render-check');
        $output = Artisan::output();

        $this->assertSame(1, $exitCode);
        $this->assertStringContainsString('PostgreSQL readiness check failed.', $output);
        $this->assertStringNotContainsString($connectionDetails, $output);
    }

    public function test_effective_connection_cannot_disable_ssl_even_when_static_configuration_requires_it(): void
    {
        $this->productionConfiguration();
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('getDriverName')->once()->andReturn('pgsql');
        $connection->shouldReceive('getConfig')->once()->with('sslmode')->andReturn('prefer');
        $connection->shouldReceive('selectOne')->never();
        $connection->shouldReceive('getSchemaBuilder')->never();
        DB::shouldReceive('connection')->once()->with('pgsql')->andReturn($connection);

        $this->artisan('devmasters:render-check')
            ->expectsOutput('Effective PostgreSQL connection must require SSL.')
            ->assertFailed();
    }

    public function test_full_check_passes_when_ssl_and_all_runtime_schemas_are_ready(): void
    {
        $this->productionConfiguration();
        $this->databaseReadiness();

        $this->artisan('devmasters:render-check')
            ->expectsOutput('Render configuration, PostgreSQL SSL and runtime table checks passed.')
            ->assertSuccessful();
    }

    #[DataProvider('incompatibleRuntimeSchemas')]
    public function test_missing_or_incompatible_runtime_schema_is_reported_without_modifying_it(string $table, string $label): void
    {
        $this->productionConfiguration();
        $this->databaseReadiness($table);

        $this->artisan('devmasters:render-check')
            ->expectsOutput('Required runtime schema is missing or incompatible for '.$label.'. Review the additive runtime migration; no schema changes were made.')
            ->assertFailed();
    }

    public static function incompatibleRuntimeSchemas(): array
    {
        return [
            'HTTP session schema' => ['laravel_sessions', 'HTTP sessions'],
            'cache schema' => ['cache', 'database cache'],
            'lock schema' => ['cache_locks', 'database cache locks'],
        ];
    }

    private function databaseReadiness(?string $incompatibleTable = null): void
    {
        $schema = Mockery::mock(Builder::class);
        $schema->shouldReceive('hasColumns')
            ->withArgs(fn (string $table, array $columns): bool => $columns !== [])
            ->andReturnUsing(fn (string $table): bool => $table !== $incompatibleTable);
        $connection = Mockery::mock(Connection::class);
        $connection->shouldReceive('getDriverName')->once()->andReturn('pgsql');
        $connection->shouldReceive('getConfig')->once()->with('sslmode')->andReturn('require');
        $connection->shouldReceive('selectOne')->once()->with('SELECT 1 AS ready')->andReturn((object) ['ready' => 1]);
        $connection->shouldReceive('getSchemaBuilder')->andReturn($schema);
        DB::shouldReceive('connection')->with('pgsql')->andReturn($connection);
    }

    private function productionConfiguration(): void
    {
        $this->app['env'] = 'production';
        config([
            'app.env' => 'production',
            'app.debug' => false,
            'app.key' => 'base64:'.base64_encode(str_repeat('r', 32)),
            'app.previous_keys' => [],
            'logging.default' => 'stderr',
            'database.default' => 'pgsql',
            'database.connections.pgsql.sslmode' => 'require',
            'session.driver' => 'database',
            'session.connection' => null,
            'session.table' => 'laravel_sessions',
            'cache.default' => 'database',
            'cache.stores.database.connection' => null,
            'cache.stores.database.lock_connection' => null,
        ]);
    }
}
