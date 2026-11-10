<?php

namespace App\Providers;

use App\Livewire\LocaleHook;
use App\Models\Contact;
use App\Models\DocumentVersion;
use App\Models\Organization;
use App\Models\PublicPage;
use App\Models\Service;
use App\Models\Skill;
use App\Models\SystemSetting;
use App\Models\User;
use App\Observers\MasterRecordObserver;
use App\Policies\DocumentVersionPolicy;
use App\Support\Localization;
use Filament\Actions\Action;
use Filament\Forms\Components\Field;
use Filament\Infolists\Components\TextEntry;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Livewire\Livewire;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->booting(fn () => Livewire::componentHook(LocaleHook::class));
    }

    public function boot(): void
    {
        Field::configureUsing(fn ($field) => $field->translateLabel()->label(fn () => __(ucfirst(strtolower(Str::headline($field->getName()))))));
        TextEntry::configureUsing(fn ($entry) => $entry->translateLabel());
        TextColumn::configureUsing(fn ($column) => $column->translateLabel());
        SelectFilter::configureUsing(fn ($filter) => $filter->label(fn () => Localization::label($filter->getName())));
        Action::configureUsing(fn ($action) => $action->translateLabel());
        foreach ([Organization::class, Contact::class, Skill::class, Service::class, PublicPage::class, SystemSetting::class] as $model) {
            $model::observe(MasterRecordObserver::class);
        }
        Livewire::setUpdateRoute(fn ($handle) => Route::post('/livewire/update', $handle)->middleware('web'));
        Livewire::setScriptRoute(fn ($handle) => Route::get('/livewire/livewire.js', $handle));
        Gate::before(function (User $u, string $ability) {
            if ($u->status !== 'ACTIVE') {
                return false;
            }

            return null;
        });
        foreach (json_decode(file_get_contents(database_path('schema/dictionary.json')), true) as $table => $columns) {
            $model = Str::studly(Str::singular($table));
            $policy = 'App\\Policies\\'.$model.'Policy';
            if (class_exists($policy)) {
                Gate::policy('App\\Models\\'.$model, $policy);
            }
        }
        Gate::policy(DocumentVersion::class, DocumentVersionPolicy::class);
        foreach (['public-submissions' => 10, 'login' => 5, 'recovery' => 3, 'commands' => 30] as $name => $limit) {
            RateLimiter::for($name, fn ($r) => Limit::perMinute($limit)->by($r->user()?->id ?? $r->ip()));
        }
        ResetPassword::createUrlUsing(fn ($user, $token) => config('devmasters.frontend_url').'/reset-password?token='.urlencode($token).'&email='.urlencode($user->email).($user->hasPermissionTo('admin.access') ? '&portal=admin' : ''));
    }
}
