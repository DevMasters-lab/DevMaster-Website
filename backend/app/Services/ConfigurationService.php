<?php

namespace App\Services;

use App\Models\NotificationTemplate;
use App\Models\PublicPage;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ConfigurationService
{
    public function page(User $actor, array $data, ?PublicPage $page = null): PublicPage
    {
        Gate::forUser($actor)->authorize('content.manage');
        Validator::make($data, ['locale' => ['required', Rule::in(['km', 'en'])]])->validate();
        abort_unless(preg_match('/^[a-z][a-z0-9-]*$/', $data['slug']), 422, 'Use a safe page slug.');

        return DB::transaction(function () use ($actor, $data, $page) {
            $values = array_intersect_key($data, array_flip(['slug', 'locale', 'title', 'body_markdown', 'status']));
            $values += ['updated_by_user_id' => $actor->id, 'published_at' => $data['status'] === 'PUBLISHED' ? now() : null];
            if ($page) {
                $page->update($values);

                return $page;
            }

            return PublicPage::create($values);
        });
    }

    public function template(User $actor, array $data): NotificationTemplate
    {
        Gate::forUser($actor)->authorize('notifications.manage');
        Validator::make($data, ['locale' => ['required', Rule::in(['km', 'en'])]])->validate();

        return DB::transaction(function () use ($actor, $data) {
            DB::select('SELECT pg_advisory_xact_lock(hashtextextended(?,0))', [$data['template_key'].':'.$data['channel'].':'.$data['locale']]);
            $q = NotificationTemplate::where('template_key', $data['template_key'])->where('channel', $data['channel'])->where('locale', $data['locale']);
            $no = ($q->max('version_no') ?? 0) + 1;
            if ($data['is_active'] ?? false) {
                (clone $q)->where('is_active', true)->update(['is_active' => false]);
            }

            return NotificationTemplate::create(array_intersect_key($data, array_flip(['template_key', 'channel', 'locale', 'subject', 'body', 'is_active'])) + ['version_no' => $no, 'variables_schema' => ['allowed' => ['reference_no', 'message']], 'created_by_user_id' => $actor->id, 'published_at' => now()]);
        });
    }

    public function setting(User $actor, string $key, array $value, string $description): SystemSetting
    {
        Gate::forUser($actor)->authorize('settings.manage');
        abort_unless(in_array($key, ['business.contact', 'business.display_name', 'website.announcement']), 422, 'This setting is not in the approved non-secret allowlist.');
        abort_if(strlen(json_encode($value)) > 5000, 422, 'Setting is too large.');

        return SystemSetting::updateOrCreate(['key' => $key], ['value' => $value, 'description' => $description, 'updated_by_user_id' => $actor->id]);
    }
}
