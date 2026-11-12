<?php

namespace App\Filament\Pages;

use Filament\Auth\MultiFactor\Contracts\MultiFactorAuthenticationProvider;
use Filament\Facades\Filament;
use Filament\Pages\Page;
use Filament\Schemas\Components\Group;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Components\Attributes\Unexposed;
use Filament\Support\Icons\Heroicon;

class Security extends Page
{
    protected static string|\BackedEnum|null $navigationIcon = Heroicon::OutlinedShieldCheck;

    protected static ?string $slug = 'settings/security';

    public static function getNavigationGroup(): string|\UnitEnum|null
    {
        return __('Content and settings');
    }

    public static function getNavigationLabel(): string
    {
        return __('Security');
    }

    #[Unexposed]
    public function getTitle(): string
    {
        return __('Security');
    }

    #[Unexposed]
    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('Two-factor authentication'))
                ->description(__('Add an extra verification step when you sign in. You can enable or disable it for your own account.'))
                ->schema(collect(Filament::getMultiFactorAuthenticationProviders())
                    ->map(fn (MultiFactorAuthenticationProvider $provider): Group => Group::make($provider->getManagementSchemaComponents())
                        ->statePath($provider->getId()))
                    ->all()),
        ]);
    }
}
