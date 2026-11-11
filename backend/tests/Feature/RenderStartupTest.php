<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class RenderStartupTest extends TestCase
{
    #[DataProvider('proxySettings')]
    public function test_render_exports_proxy_settings_and_port_to_child_processes(string|false $proxies, string|false $port, string $expected): void
    {
        $process = $this->preflight(['TRUSTED_PROXIES' => $proxies, 'PORT' => $port]);

        $process->run();

        $this->assertSame(0, $process->getExitCode(), $process->getErrorOutput());
        $this->assertSame($expected, $process->getOutput());
    }

    public static function proxySettings(): array
    {
        return [
            'missing proxy variable' => [false, '17234', "*\n17234\n"],
            'empty proxy variable' => ['', '17234', "*\n17234\n"],
            'explicit proxy allowlist' => ['10.0.0.0/8,192.0.2.10', '17234', "10.0.0.0/8,192.0.2.10\n17234\n"],
            'explicit wildcard' => ['*', '17234', "*\n17234\n"],
            'default Render port' => [false, false, "*\n10000\n"],
        ];
    }

    #[DataProvider('forwardedRequests')]
    public function test_laravel_honors_the_render_proxy_setting(string|false $proxies, bool $secure, string $url): void
    {
        $probe = <<<'PHP'
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
Illuminate\Support\Facades\Route::get('/__render_proxy_test', fn () => [
    'secure' => request()->secure(),
    'url' => url('/api/health'),
]);
$request = Illuminate\Http\Request::create('http://api.devmasters.dev/__render_proxy_test', 'GET', [], [], [], [
    'REMOTE_ADDR' => '10.42.0.8',
    'HTTP_X_FORWARDED_PROTO' => 'https',
    'HTTP_X_FORWARDED_HOST' => 'website.devmasters.dev',
    'HTTP_X_FORWARDED_PORT' => '443',
]);
$response = $app->make(Illuminate\Contracts\Http\Kernel::class)->handle($request);
echo $response->getContent();
PHP;
        $process = $this->preflight(
            ['TRUSTED_PROXIES' => $proxies],
            'exec '.escapeshellarg(PHP_BINARY).' -r '.escapeshellarg($probe),
        );

        $process->run();

        $this->assertSame(0, $process->getExitCode(), $process->getErrorOutput());
        $this->assertSame(['secure' => $secure, 'url' => $url], json_decode($process->getOutput(), true));
    }

    public static function forwardedRequests(): array
    {
        return [
            'Render default' => [false, true, 'https://website.devmasters.dev/api/health'],
            'allowed proxy range' => ['10.0.0.0/8', true, 'https://website.devmasters.dev/api/health'],
            'untrusted proxy address' => ['192.0.2.0/24', false, 'http://api.devmasters.dev/api/health'],
        ];
    }

    public function test_missing_application_key_still_blocks_startup(): void
    {
        $process = $this->preflight(['APP_KEY' => false]);

        $process->run();

        $this->assertNotSame(0, $process->getExitCode());
        $this->assertStringContainsString('Set a persistent APP_KEY', $process->getErrorOutput());
    }

    public function test_neon_connections_without_required_ssl_still_block_startup(): void
    {
        $process = $this->preflight(['DB_SSLMODE' => 'prefer']);

        $process->run();

        $this->assertNotSame(0, $process->getExitCode());
        $this->assertStringContainsString('Set DB_SSLMODE=require', $process->getErrorOutput());
    }

    private function preflight(array $environment, ?string $command = null): Process
    {
        // Stop before filesystem writes and Artisan; exercise the real POSIX guards.
        $script = strstr(file_get_contents(base_path('start-render.sh')), "\ncd /var/www/html", true);
        $this->assertNotFalse($script);
        $probe = <<<'SH'

exec /bin/sh -c 'printf "%s\n" "$TRUSTED_PROXIES" "$PORT"'
SH;

        return new Process(['/bin/sh', '-c', $script."\n".($command ?? $probe)], base_path(), array_replace([
            'APP_ENV' => 'production',
            'APP_DEBUG' => 'false',
            'APP_KEY' => 'synthetic-test-key',
            'APP_URL' => 'https://api.devmasters.dev',
            'FRONTEND_URL' => 'https://website.devmasters.dev',
            'DB_CONNECTION' => 'pgsql',
            'DB_HOST' => 'synthetic.neon.tech',
            'DB_DATABASE' => 'neondb',
            'DB_USERNAME' => 'neondb_owner',
            'DB_PASSWORD' => 'synthetic-test-password',
            'DB_SSLMODE' => 'require',
            'DB_URL' => false,
            'SESSION_DRIVER' => 'database',
            'SESSION_TABLE' => 'laravel_sessions',
            'CACHE_STORE' => 'database',
            'QUEUE_CONNECTION' => 'sync',
            'TRUSTED_PROXIES' => false,
            'PORT' => '17234',
        ], $environment));
    }
}
