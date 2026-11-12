<?php

namespace App\Providers\Filament;

use App\Http\Middleware\RenderAdminLogin;
use App\Http\Middleware\ResolveLocale;
use Filament\Auth\MultiFactor\App\AppAuthentication;
use Filament\FontProviders\LocalFontProvider;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages\Dashboard;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Assets\Css;
use Filament\Support\Colors\Color;
use Filament\Widgets\AccountWidget;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->databaseTransactions()
            ->passwordReset()
            ->brandName('DevMasters')
            ->brandLogo(fn (): ?string => is_file(public_path('logo-light.png')) ? '/admin/logo-light.png' : null)
            ->darkModeBrandLogo(fn (): ?string => is_file(public_path('logo.png')) ? '/admin/logo.png' : null)
            ->brandLogoHeight('3.5rem')
            ->favicon('/favicon.png')
            ->font('Inter', provider: LocalFontProvider::class)
            ->assets([Css::make('devmasters-typography', public_path('fonts/devmasters.css'))->html('/fonts/devmasters.css')])
            ->renderHook('panels::topbar.end', fn () => view('filament.language-switcher'))
            ->renderHook('panels::auth.login.form.before', fn () => view('filament.language-switcher'))
            ->multiFactorAuthentication([AppAuthentication::make()->codeWindow(1)], isRequired: true)
            ->colors([
                'primary' => Color::Violet,
            ])
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\Filament\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\Filament\Pages')
            ->pages([
                Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\Filament\Widgets')
            ->widgets([
                AccountWidget::class,

            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                ResolveLocale::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                PreventRequestForgery::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
                RenderAdminLogin::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
