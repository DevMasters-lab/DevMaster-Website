<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\Notification;
use App\Models\NotificationTemplate;
use App\Models\OutboxEvent;
use App\Models\User;
use App\Support\Localization;
use Illuminate\Support\Str;

class BusinessEvents
{
    public function record(string $type, string $entity, string $id, ?User $actor, ?string $email = null, ?User $recipient = null, array $data = []): OutboxEvent
    {
        AuditEvent::create(['actor_user_id' => $actor?->id, 'actor_type' => $actor ? 'USER' : 'PUBLIC', 'action' => $type, 'entity_type' => $entity, 'entity_id' => $id, 'correlation_id' => (string) Str::uuid(), 'change_summary' => $data]);
        $eventId = (string) Str::uuid();
        $recipient ??= $entity === 'user' ? User::find($id) : null;
        $locale = Localization::valid($recipient?->preferred_locale) ? $recipient->preferred_locale : app()->getLocale();
        $templates = NotificationTemplate::where('template_key', $type)->where('channel', 'EMAIL')->whereIn('locale', ['km', 'en'])->where('is_active', true)->pluck('id', 'locale')->all();
        $translations = [];
        foreach (['en', 'km'] as $language) {
            $translations[$language] = ['title' => __(str_replace('.', ' ', ucfirst($type)), [], $language), 'body' => __($data['message'] ?? 'Your DevMasters record has been updated.', [], $language)];
        }
        $template = NotificationTemplate::where('template_key', $type)->where('channel', 'EMAIL')->where('locale', $locale)->where('is_active', true)->first();
        $event = OutboxEvent::create(['id' => $eventId, 'event_type' => $type, 'aggregate_type' => $entity, 'aggregate_id' => $id, 'deduplication_key' => $type.':'.$id.':'.$eventId, 'payload' => ['schema_version' => 1, 'locale' => $locale, 'recipient_user_id' => $recipient?->id, 'notification_template_ids' => $templates, 'notification_template_id' => $template?->id, 'recipient_email' => $email ?? $recipient?->email, 'data' => $data]]);
        if ($recipient) {
            Notification::create(['recipient_user_id' => $recipient->id, 'outbox_event_id' => $event->id, 'notification_type' => $type, 'translations' => $translations, 'title' => $translations[$locale]['title'], 'body' => $translations[$locale]['body'], 'action_path' => '/expert']);
        }

        return $event;
    }
}
