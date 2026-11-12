<?php

namespace Tests\Feature;

use Filament\Facades\Filament;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminBrandLogoTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('brand-logo');
        $this->app->usePublicPath(Storage::disk('brand-logo')->path(''));
        config(['app.url' => 'https://devmasters.dev', 'devmasters.frontend_url' => 'https://devmasters.dev']);
        TrustProxies::at('127.0.0.1');
        DB::shouldReceive('connection')->never();
    }

    public function test_missing_logo_preserves_native_text_branding_and_returns_a_session_free_404(): void
    {
        $this->assertNull(Filament::getPanel('admin')->getBrandLogo());
        $this->assertNull(Filament::getPanel('admin')->getDarkModeBrandLogo());
        $this->get('https://devmasters.dev/admin/logo.png')
            ->assertNotFound()->assertHeaderMissing('Set-Cookie');
    }

    public function test_uploaded_logo_is_available_directly_and_through_the_existing_admin_proxy_without_a_session(): void
    {
        $contents = file_get_contents(base_path('public/logo.png'));
        Storage::disk('brand-logo')->put('logo.png', $contents);
        $this->assertSame('/admin/logo.png', Filament::getPanel('admin')->getBrandLogo());
        $this->assertSame('3.5rem', Filament::getPanel('admin')->getBrandLogoHeight());
        $this->assertNull(Filament::getPanel('admin')->getDarkModeBrandLogo());

        foreach (['https://devmasters.dev', 'http://devmasters-api.onrender.com'] as $origin) {
            $response = $this->get($origin.'/admin/logo.png', [
                'X-Forwarded-Host' => 'devmasters.dev',
                'X-Forwarded-Proto' => 'https',
                'X-Forwarded-Port' => '443',
            ])->assertOk()->assertHeaderMissing('Location')->assertHeaderMissing('Set-Cookie');

            $response->assertHeader('Content-Type', 'image/png');
            $this->assertSame(hash('sha256', $contents), hash_file('sha256', $response->baseResponse->getFile()->getPathname()));
        }
    }

    public function test_legacy_jpg_asset_remains_available_and_other_file_extensions_are_not_served(): void
    {
        Storage::disk('brand-logo')->put('logo.jpg', file_get_contents(base_path('public/logo.jpg')));
        $this->get('https://devmasters.dev/admin/logo.jpg')->assertOk()->assertHeaderMissing('Set-Cookie');
        Storage::disk('brand-logo')->put('logo.txt', 'not an image');
        $this->get('https://devmasters.dev/admin/logo.txt')->assertNotFound();
    }
}
