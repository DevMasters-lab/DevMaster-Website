<?php

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Contracts\Console\Kernel;
use PragmaRX\Google2FA\Google2FA;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
try {
    if (! str_ends_with(config('database.connections.pgsql.database'), '_test')) {
        throw new RuntimeException('E2E fixtures require the disposable test database.');
    }
    (new DatabaseSeeder)->run();
    $admin = User::factory()->create(['preferred_locale' => 'en']);
    $admin->assignRole('ADMIN');
    $secret = (new Google2FA)->generateSecretKey();
    $admin->saveAppAuthenticationSecret($secret);
    $localeAdmin = User::factory()->create(['preferred_locale' => 'en']);
    $localeAdmin->assignRole('ADMIN');
    $localeSecret = (new Google2FA)->generateSecretKey();
    $localeAdmin->saveAppAuthenticationSecret($localeSecret);
    file_put_contents($argv[1], json_encode(['admin_email' => $admin->email, 'admin_password' => 'Test-only-password-123!', 'totp_secret' => $secret, 'i18n_admin_email' => $localeAdmin->email, 'i18n_admin_password' => 'Test-only-password-123!', 'i18n_totp_secret' => $localeSecret]));
    chmod($argv[1], 0600);
    echo 'Disposable E2E fixture prepared.';
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage());
    exit(1);
}
