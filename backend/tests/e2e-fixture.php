<?php

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Contracts\Console\Kernel;
use PragmaRX\Google2FA\Google2FA;
use Tests\Support\WorkflowFixture;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
try {
    if (! str_ends_with(config('database.connections.pgsql.database'), '_test')) {
        throw new RuntimeException('E2E fixtures require the disposable test database.');
    }
    (new DatabaseSeeder)->run();
    $f = WorkflowFixture::make();
    $v = WorkflowFixture::issue($f);
    $secret = (new Google2FA)->generateSecretKey();
    $f['admin']->saveAppAuthenticationSecret($secret);
    $f['admin']->update(['preferred_locale' => 'en']);
    $f['user']->update(['preferred_locale' => 'en']);
    $management = WorkflowFixture::make($f['admin']);
    $managementVersion = WorkflowFixture::issue($management);
    WorkflowFixture::accept($management, $managementVersion);
    $localeAdmin = User::factory()->create(['preferred_locale' => 'en']);
    $localeAdmin->assignRole('ADMIN');
    $localeSecret = (new Google2FA)->generateSecretKey();
    $localeAdmin->saveAppAuthenticationSecret($localeSecret);
    file_put_contents($argv[1], json_encode(['expert_email' => $f['user']->email, 'expert_password' => 'Test-only-password-123!', 'offer_reference' => $f['offer']->reference_no, 'admin_offer_reference' => $management['offer']->reference_no, 'admin_expert_name' => $management['expert']->full_name, 'admin_email' => $f['admin']->email, 'admin_password' => 'Test-only-password-123!', 'totp_secret' => $secret, 'i18n_admin_email' => $localeAdmin->email, 'i18n_admin_password' => 'Test-only-password-123!', 'i18n_totp_secret' => $localeSecret]));
    chmod($argv[1], 0600);
    echo 'Disposable E2E fixture prepared.';
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage());
    exit(1);
}
