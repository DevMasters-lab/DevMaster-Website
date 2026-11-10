<?php

namespace App\Jobs;

use App\Models\DeliveryAttempt;
use App\Models\DocumentVersion;
use App\Models\ExpertProfile;
use App\Models\ExportJob;
use App\Models\NotificationTemplate;
use App\Models\OutboxEvent;
use App\Models\User;
use App\Notifications\BusinessNotification;
use App\Services\ApplicationCorrectionService;
use App\Services\DocumentService;
use App\Services\ExportService;
use App\Support\Localization;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

class DeliverOutboxEvent implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public int $timeout = 180;

    public function __construct(public string $eventId) {}

    public function backoff(): array
    {
        return [30, 120, 600, 1800];
    }

    public function handle(): void
    {
        $event = OutboxEvent::findOrFail($this->eventId);
        $recipient = isset($event->payload['recipient_user_id']) ? User::find($event->payload['recipient_user_id']) : null;
        $locale = $recipient?->preferred_locale ?? $event->payload['locale'] ?? 'en';
        Localization::inLocale($locale, fn () => $this->deliver());
    }

    private function deliver(): void
    {
        // Lease is separate from the provider call; jobs recover expired leases after worker death.
        $event = DB::transaction(function () {
            $e = OutboxEvent::lockForUpdate()->findOrFail($this->eventId);
            if ($e->status === 'PUBLISHED' || ($e->locked_until && $e->locked_until->isFuture())) {
                return null;
            }$e->update(['status' => 'PUBLISHING', 'locked_until' => now()->addMinutes(4), 'publish_attempts' => $e->publish_attempts + 1]);

            return $e;
        });
        if (! $event) {
            return;
        }
        try {
            if ($event->event_type === 'report.export') {
                $job = ExportJob::findOrFail($event->aggregate_id);
                if ($job->status !== 'COMPLETED') {
                    app(ExportService::class)->generate($job);
                }
            } elseif ($event->event_type === 'document.scan') {
                app(DocumentService::class)->scan(DocumentVersion::findOrFail($event->aggregate_id));
            } elseif ($email = $event->payload['recipient_email'] ?? null) {
                $templateId = $event->payload['notification_template_ids'][app()->getLocale()] ?? $event->payload['notification_template_ids']['en'] ?? $event->payload['notification_template_id'] ?? null;
                $template = $templateId ? NotificationTemplate::find($templateId) : null;
                $key = hash('sha256', $event->id.':'.$email.':EMAIL:'.($template?->id ?? 'default'));
                $data = $event->payload['data'] ?? [];
                $variables = ['{{reference_no}}' => $data['reference_no'] ?? '', '{{message}}' => __($data['message'] ?? 'Please sign in to review your latest update.')];
                $subject = $template ? strtr($template->subject ?? __('DevMasters update'), $variables) : 'DevMasters · '.__(ucfirst(str_replace('.', ' ', $event->event_type)));
                $body = $template ? strtr($template->body, $variables) : (isset($data['message']) ? __($data['message']) : __('Your reference: ').($data['reference_no'] ?? __('Please sign in to review your latest update.')));
                $already = DeliveryAttempt::where('outbox_event_id', $event->id)->where('delivery_key', $key)->where('status', 'SENT')->exists();
                if (! $already) {
                    if ($event->event_type === 'application.reviewed' && ($data['decision'] ?? '') === 'CORRECTIONS_REQUIRED') {
                        $profile = ExpertProfile::findOrFail($event->aggregate_id);
                        if ($profile->application_status === 'CORRECTIONS_REQUIRED' && ! $profile->user_id) {
                            $body .= ' '.__('Update your application within 48 hours: ').app(ApplicationCorrectionService::class)->link($profile);
                        }
                    }
                    if ($event->event_type === 'staff.invited') {
                        $staff = User::findOrFail($event->aggregate_id);
                        if ($staff->status === 'INVITED' && $staff->hasPermissionTo('admin.access')) {
                            $token = Password::createToken($staff);
                            $body .= ' '.__('Set up your password: ').config('devmasters.frontend_url').'/reset-password?token='.urlencode($token).'&email='.urlencode($staff->email).'&portal=admin';
                        }
                    }
                    $attempt = DeliveryAttempt::create(['outbox_event_id' => $event->id, 'notification_template_id' => $template?->id, 'notification_id' => \App\Models\Notification::where('outbox_event_id', $event->id)->value('id'), 'delivery_key' => $key, 'channel' => 'EMAIL', 'recipient_address' => $email, 'attempt_no' => $event->publish_attempts, 'provider' => config('mail.default')]);
                    try {
                        Notification::route('mail', $email)->notify((new BusinessNotification($subject, $body))->locale(app()->getLocale()));
                        $attempt->update(['status' => 'SENT', 'completed_at' => now()]);
                    } catch (\Throwable $e) {
                        $attempt->update(['status' => 'UNKNOWN', 'completed_at' => now(), 'error_code' => 'PROVIDER_ERROR', 'error_message' => 'Email delivery could not be confirmed.']);
                        throw $e;
                    }
                }
            }
            $event->update(['status' => 'PUBLISHED', 'published_at' => now(), 'locked_until' => null, 'last_error' => null]);
        } catch (\Throwable $e) {
            if ($event->event_type === 'document.scan') {
                DocumentVersion::where('id', $event->aggregate_id)->update(['scan_status' => 'ERROR', 'scanned_at' => now(), 'scan_message' => 'Scanner could not complete. A retry is pending.']);
            }$event->update(['status' => 'FAILED', 'locked_until' => null, 'available_at' => now()->addMinutes(2), 'last_error' => 'Delivery or scanning failed; inspect worker logs.']);
            throw $e;
        }
    }
}
