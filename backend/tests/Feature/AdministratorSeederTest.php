<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\AuditTrail;
use Database\Seeders\AdministratorSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Panel;
use Illuminate\Database\Seeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AdministratorSeederTest extends TestCase
{
    use DatabaseTransactions;

    private array $originalEnvironment = [];

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['RUN_ADMIN_SEED', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_NAME'] as $name) {
            $this->originalEnvironment[$name] = [$_ENV[$name] ?? null, $_SERVER[$name] ?? null, getenv($name)];
        }
        $this->setEnvironment('RUN_ADMIN_SEED', 'true');
        $this->setEnvironment('ADMIN_EMAIL', 'seed-admin@example.test');
        $this->setEnvironment('ADMIN_PASSWORD', 'Test-bootstrap-password-123!');
        $this->setEnvironment('ADMIN_NAME', 'Bootstrap administrator');
    }

    protected function tearDown(): void
    {
        foreach ($this->originalEnvironment as $name => [$environment, $server, $process]) {
            if ($environment === null) {
                unset($_ENV[$name]);
            } else {
                $_ENV[$name] = $environment;
            }
            if ($server === null) {
                unset($_SERVER[$name]);
            } else {
                $_SERVER[$name] = $server;
            }
            putenv($process === false ? $name : $name.'='.$process);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        parent::tearDown();
    }

    public function test_does_not_create_accounts_or_roles_without_the_explicit_flag(): void
    {
        $this->isolateAdministratorTables();
        $this->setEnvironment('RUN_ADMIN_SEED', null);

        $this->runSeeder();

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('roles', 0);
        $this->assertDatabaseCount('audit_events', 0);
    }

    public function test_rejects_an_invalid_initialization_flag_before_creating_any_records(): void
    {
        $this->isolateAdministratorTables();
        $this->setEnvironment('RUN_ADMIN_SEED', 'yes');

        $exception = $this->initializationFailure();

        $this->assertSame('RUN_ADMIN_SEED must be true or false.', $exception->getMessage());
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('roles', 0);
    }

    public function test_creates_a_hashed_active_administrator_with_panel_access_and_a_system_audit_event(): void
    {
        $this->isolateAdministratorTables();
        $this->setEnvironment('ADMIN_EMAIL', '  SEED-ADMIN@example.test  ');

        $this->runSeeder();

        $administrator = User::where('email', 'seed-admin@example.test')->firstOrFail();
        $this->assertTrue(Hash::check('Test-bootstrap-password-123!', $administrator->getRawOriginal('password_hash')));
        $this->assertNotSame('Test-bootstrap-password-123!', $administrator->getRawOriginal('password_hash'));
        $this->assertSame('Bootstrap administrator', $administrator->display_name);
        $this->assertSame('ACTIVE', $administrator->status);
        $this->assertNotNull($administrator->email_verified_at);
        $this->assertNull($administrator->app_authentication_secret);
        $this->assertTrue($administrator->hasRole('ADMIN'));
        $this->assertTrue($administrator->canAccessPanel(Panel::make()));
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('audit_events', ['entity_id' => $administrator->id, 'entity_type' => 'users', 'action' => 'administrator.bootstrapped', 'actor_type' => 'SYSTEM', 'actor_user_id' => null]);
    }

    public function test_database_seeder_registers_the_flagged_administrator_initializer(): void
    {
        $this->isolateAdministratorTables();

        $this->runSeeder(DatabaseSeeder::class);

        $this->assertDatabaseHas('users', ['email' => 'seed-admin@example.test', 'status' => 'ACTIVE']);
        $this->assertDatabaseCount('audit_events', 1);
    }

    #[DataProvider('replacementPasswords')]
    public function test_rerunning_preserves_existing_password_mfa_identity_and_permissions(?string $replacementPassword): void
    {
        $this->isolateAdministratorTables();
        $this->runSeeder();
        $administrator = User::where('email', 'seed-admin@example.test')->firstOrFail();
        $administrator->update(['email' => 'SEED-ADMIN@example.test', 'app_authentication_secret' => 'TEST-MFA-SECRET', 'app_authentication_recovery_codes' => ['test-recovery-code']]);
        $original = $administrator->fresh()->getRawOriginal();
        $grantCount = DB::table('role_permissions')->count();
        $this->setEnvironment('ADMIN_PASSWORD', $replacementPassword);
        $this->setEnvironment('ADMIN_NAME', 'Changed name must not replace the original');

        $this->runSeeder();

        $this->assertSame($original, $administrator->fresh()->getRawOriginal());
        $this->assertDatabaseCount('role_permissions', $grantCount);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('user_roles', 1);
        $this->assertDatabaseCount('audit_events', 1);
    }

    public static function replacementPasswords(): array
    {
        return ['changed password' => ['Different-test-password-456!'], 'removed password' => [null]];
    }

    #[DataProvider('invalidPasswords')]
    public function test_rejects_missing_or_short_initial_passwords_without_partial_setup(?string $password): void
    {
        $this->isolateAdministratorTables();
        $this->setEnvironment('ADMIN_PASSWORD', $password);

        $exception = $this->initializationFailure();

        $this->assertStringContainsString('ADMIN_PASSWORD must be supplied privately', $exception->getMessage());
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('roles', 0);
        $this->assertDatabaseCount('permissions', 0);
        $this->assertDatabaseCount('audit_events', 0);
    }

    public static function invalidPasswords(): array
    {
        return ['missing password' => [null], 'short password' => ['short'], 'eleven Unicode characters' => [str_repeat('é', 11)]];
    }

    public function test_rejects_an_existing_non_administrator_without_promoting_or_resetting_it(): void
    {
        $this->isolateAdministratorTables();
        $user = User::factory()->create(['email' => 'SEED-ADMIN@example.test']);
        $original = $user->fresh()->getRawOriginal();

        $exception = $this->initializationFailure();

        $this->assertStringContainsString('not an active administrator', $exception->getMessage());
        $this->assertSame($original, $user->fresh()->getRawOriginal());
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('user_roles', 0);
        $this->assertDatabaseCount('roles', 0);
        $this->assertDatabaseCount('audit_events', 0);
    }

    public function test_rejects_ambiguous_case_variants_without_changing_existing_accounts(): void
    {
        $this->isolateAdministratorTables();
        $first = User::factory()->create(['email' => 'seed-admin@example.test']);
        $second = User::factory()->create(['email' => 'SEED-ADMIN@example.test']);
        $originalFirst = $first->fresh()->getRawOriginal();
        $originalSecond = $second->fresh()->getRawOriginal();

        $exception = $this->initializationFailure();

        $this->assertStringContainsString('Multiple accounts match ADMIN_EMAIL', $exception->getMessage());
        $this->assertSame($originalFirst, $first->fresh()->getRawOriginal());
        $this->assertSame($originalSecond, $second->fresh()->getRawOriginal());
        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseCount('roles', 0);
        $this->assertDatabaseCount('user_roles', 0);
        $this->assertDatabaseCount('audit_events', 0);
    }

    public function test_rejects_a_second_bootstrap_administrator_with_a_different_email(): void
    {
        $this->isolateAdministratorTables();
        $this->runSeeder(RolesAndPermissionsSeeder::class);
        $administrator = User::factory()->create(['email' => 'existing-admin@example.test']);
        $administrator->assignRole('ADMIN');

        $exception = $this->initializationFailure();

        $this->assertStringContainsString('administrator already exists with a different email', $exception->getMessage());
        $this->assertDatabaseMissing('users', ['email' => 'seed-admin@example.test']);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('user_roles', 1);
        $this->assertDatabaseCount('audit_events', 0);
    }

    public function test_refuses_an_inactive_admin_role_and_rolls_back_new_role_definitions(): void
    {
        $this->isolateAdministratorTables();
        $role = Role::create(['code' => 'ADMIN', 'name' => 'ADMIN', 'guard_name' => 'web', 'is_active' => false]);

        $exception = $this->initializationFailure();

        $this->assertSame('The ADMIN role is unavailable or inactive. No administrator was created.', $exception->getMessage());
        $this->assertDatabaseHas('roles', ['id' => $role->id, 'is_active' => false]);
        $this->assertDatabaseCount('roles', 1);
        $this->assertDatabaseCount('permissions', 0);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('user_roles', 0);
        $this->assertDatabaseCount('audit_events', 0);
    }

    public function test_rolls_back_audit_failure_and_does_not_expose_exception_details(): void
    {
        $this->isolateAdministratorTables();
        $this->mock(AuditTrail::class)->shouldReceive('record')->once()->andThrow(new RuntimeException('synthetic-sensitive-database-error'));

        $exception = $this->initializationFailure();

        $this->assertStringContainsString('Administrator initialization failed.', $exception->getMessage());
        $this->assertStringNotContainsString('synthetic-sensitive-database-error', $exception->getMessage());
        $this->assertNull($exception->getPrevious());
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('roles', 0);
        $this->assertDatabaseCount('permissions', 0);
        $this->assertDatabaseCount('user_roles', 0);
        $this->assertDatabaseCount('role_permissions', 0);
        $this->assertDatabaseCount('audit_events', 0);
    }

    #[DataProvider('unsafeProductionTargets')]
    public function test_refuses_unsafe_production_targets_before_connecting_or_writing(array $overrides): void
    {
        $defaultConnection = DB::getDefaultConnection();
        config(['database.connections.admin_guard_test' => array_merge(['driver' => 'pgsql', 'host' => 'unreachable-test.neon.tech', 'database' => 'neondb', 'sslmode' => 'require'], $overrides)]);
        DB::setDefaultConnection('admin_guard_test');
        $this->app['env'] = 'production';

        try {
            $exception = $this->initializationFailure();
        } finally {
            DB::setDefaultConnection($defaultConnection);
        }

        $this->assertSame('Administrator initialization requires APP_ENV=production and the Neon neondb PostgreSQL connection with required SSL. Local databases are refused.', $exception->getMessage());
    }

    public static function unsafeProductionTargets(): array
    {
        return ['wrong database' => [['database' => 'another_database']], 'local host' => [['host' => '127.0.0.1']], 'SSL disabled' => [['sslmode' => 'disable']]];
    }

    private function isolateAdministratorTables(): void
    {
        foreach (['users', 'roles', 'permissions', 'user_roles', 'role_permissions', 'audit_events'] as $table) {
            DB::statement('CREATE TEMP TABLE '.$table.' (LIKE public.'.$table.' INCLUDING ALL) ON COMMIT DROP');
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function runSeeder(string $class = AdministratorSeeder::class): void
    {
        /** @var Seeder $seeder */
        $seeder = $this->app->make($class);
        $seeder->setContainer($this->app)->run();
    }

    private function initializationFailure(): RuntimeException
    {
        try {
            $this->runSeeder();
        } catch (RuntimeException $exception) {
            return $exception;
        }

        $this->fail('Administrator initialization unexpectedly succeeded.');
    }

    private function setEnvironment(string $name, ?string $value): void
    {
        if ($value === null) {
            unset($_ENV[$name], $_SERVER[$name]);
            putenv($name);

            return;
        }
        $_ENV[$name] = $_SERVER[$name] = $value;
        putenv($name.'='.$value);
    }
}
