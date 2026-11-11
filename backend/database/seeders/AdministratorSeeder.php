<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Services\AuditTrail;
use Illuminate\Database\Seeder;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;
use Throwable;

class AdministratorSeeder extends Seeder
{
    private ?string $failureReason = null;

    public static function enabled(): bool
    {
        $enabled = Env::get('RUN_ADMIN_SEED', false);
        if (! in_array($enabled, [true, false, null, ''], true)) {
            throw new RuntimeException('RUN_ADMIN_SEED must be true or false.');
        }

        return $enabled === true;
    }

    public function run(): void
    {
        if (! self::enabled()) {
            $this->command?->info('Administrator initialization is disabled.');

            return;
        }
        $this->failureReason = null;
        try {
            $this->assertDatabaseTarget();
            $email = Env::get('ADMIN_EMAIL');
            if (! is_string($email) || ! filter_var(trim($email), FILTER_VALIDATE_EMAIL) || strlen(trim($email)) > 254) {
                $this->fail('ADMIN_EMAIL must contain the intended administrator email address.');
            }
            $email = strtolower(trim($email));

            $created = DB::transaction(function () use ($email): bool {
                DB::select("SELECT pg_advisory_xact_lock(hashtextextended('devmasters:first-admin', 0))");
                $matches = User::whereRaw('LOWER(email) = ?', [$email])->lockForUpdate()->get();
                if ($matches->count() > 1) {
                    $this->fail('Multiple accounts match ADMIN_EMAIL. Review existing accounts privately; no administrator was created.');
                }
                $user = $matches->first();
                if ($user) {
                    $hasAdminAccess = DB::table('user_roles as ur')->join('roles as r', 'r.id', '=', 'ur.role_id')
                        ->join('role_permissions as rp', 'rp.role_id', '=', 'r.id')
                        ->join('permissions as p', 'p.id', '=', 'rp.permission_id')
                        ->where('ur.user_id', $user->id)->where('ur.model_type', $user->getMorphClass())
                        ->where('r.code', 'ADMIN')->where('r.name', 'ADMIN')->where('r.guard_name', 'web')->where('r.is_active', true)
                        ->where('p.name', 'admin.access')->where('p.guard_name', 'web')->exists();
                    if ($user->status === 'ACTIVE' && $hasAdminAccess) {
                        return false;
                    }
                    $this->fail('ADMIN_EMAIL already belongs to an account that is not an active administrator. No password, MFA or permissions were changed.');
                }
                if (DB::table('user_roles as ur')->join('roles as r', 'r.id', '=', 'ur.role_id')->where('r.code', 'ADMIN')->exists()) {
                    $this->fail('An administrator already exists with a different email. Use the existing administrator; no second bootstrap account was created.');
                }

                // Read the password only for first creation; never store it in configuration.
                $password = Env::get('ADMIN_PASSWORD');
                if (! is_string($password) || mb_strlen($password) < 12) {
                    $this->fail('ADMIN_PASSWORD must be supplied privately and contain at least 12 characters for first initialization.');
                }
                $name = Env::get('ADMIN_NAME', 'DevMasters Administrator');
                if (! is_string($name) || trim($name) === '' || mb_strlen($name) > 200) {
                    $this->fail('ADMIN_NAME must contain between 1 and 200 characters.');
                }

                $this->call(RolesAndPermissionsSeeder::class);
                $role = Role::where('code', 'ADMIN')->where('name', 'ADMIN')->where('guard_name', 'web')->first();
                if (! $role || ! $role->is_active) {
                    $this->fail('The ADMIN role is unavailable or inactive. No administrator was created.');
                }
                $user = User::create(['email' => $email, 'display_name' => trim($name), 'password_hash' => $password, 'status' => 'ACTIVE', 'email_verified_at' => now()]);
                $user->assignRole($role);
                app(AuditTrail::class)->record('administrator.bootstrapped', $user, null);
                app(PermissionRegistrar::class)->forgetCachedPermissions();
                if (! Hash::check($password, $user->getRawOriginal('password_hash')) || ! $user->hasPermissionTo('admin.access')) {
                    $this->fail('Administrator verification failed. No partial administrator setup was committed.');
                }

                return true;
            });
        } catch (Throwable) {
            throw new RuntimeException($this->failureReason ?? 'Administrator initialization failed. Check Neon connectivity, migrations and role definitions privately. No partial administrator setup was committed.');
        }

        $this->command?->info($created ? 'Administrator initialized successfully. MFA enrollment is required at first sign-in.' : 'Administrator already initialized; password, MFA and permissions are unchanged.');
    }

    private function assertDatabaseTarget(): void
    {
        $connection = DB::connection();
        if ($connection->getDriverName() !== 'pgsql') {
            $this->fail('Administrator initialization requires PostgreSQL.');
        }
        if (app()->environment('testing')) {
            return;
        }
        if (! app()->environment('production') || $connection->getConfig('database') !== 'neondb'
            || ! is_string($connection->getConfig('host')) || ! str_ends_with($connection->getConfig('host'), '.neon.tech')
            || ! in_array($connection->getConfig('sslmode'), ['require', 'verify-ca', 'verify-full'], true)) {
            $this->fail('Administrator initialization requires APP_ENV=production and the Neon neondb PostgreSQL connection with required SSL. Local databases are refused.');
        }
        if (DB::selectOne('SELECT current_database() AS name')->name !== 'neondb') {
            $this->fail('The connected database is not neondb. No administrator was created.');
        }
    }

    private function fail(string $message): never
    {
        $this->failureReason = $message;

        throw new RuntimeException($message);
    }
}
