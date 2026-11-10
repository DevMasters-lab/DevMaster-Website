<?php

use App\Jobs\DeliverOutboxEvent;
use App\Models\ExpertOffer;
use App\Models\OutboxEvent;
use App\Models\User;
use App\Services\OfferService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\URL;

Artisan::command('devmasters:outbox', function () {
    OutboxEvent::whereIn('status', ['PENDING', 'FAILED', 'PUBLISHING'])->where('available_at', '<=', now())->where(fn ($q) => $q->whereNull('locked_until')->orWhere('locked_until', '<', now()))->limit(100)->get()->each(fn ($e) => DeliverOutboxEvent::dispatch($e->id));
});
Artisan::command('devmasters:expire-offers', function () {
    ExpertOffer::where('status', 'ISSUED')->each(fn ($o) => app(OfferService::class)->expire($o));
});
Artisan::command('devmasters:create-admin {email} {--name=Administrator}', function () {
    $email = strtolower($this->argument('email'));
    if (User::where('email', $email)->exists()) {
        $this->error('Account already exists.');

        return 1;
    } $password = $this->secret('Choose a password of at least 12 characters');
    if (strlen($password) < 12) {
        $this->error('Password too short.');

        return 1;
    } $u = User::create(['email' => $email, 'display_name' => $this->option('name'), 'password_hash' => $password, 'status' => 'ACTIVE', 'email_verified_at' => now()]);
    $u->assignRole('ADMIN');
    $this->info('Administrator created. MFA setup is required at first sign-in.');
});
Schedule::command('devmasters:outbox')->everyMinute()->withoutOverlapping();
Schedule::command('devmasters:expire-offers')->everyMinute()->withoutOverlapping();

Artisan::command('devmasters:setup-link', function () {
    if (! app()->environment('local')) {
        $this->error('Local setup is unavailable in this environment.');

        return 1;
    }
    $this->line(URL::temporarySignedRoute('local.setup', now()->addMinutes(30)));
})->purpose('Create a private, expiring local first-administrator setup link.');
