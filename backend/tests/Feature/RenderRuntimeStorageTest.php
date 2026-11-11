<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class RenderRuntimeStorageTest extends TestCase
{
    use DatabaseTransactions;

    public function test_database_sessions_persist_uuid_users_in_the_separate_http_table(): void
    {
        if (! Schema::hasTable('laravel_sessions')) {
            (require database_path('migrations/2026_11_11_080217_create_render_runtime_tables.php'))->up();
        }
        config(['session.table' => 'laravel_sessions']);
        $user = User::factory()->create();
        $this->be($user);
        $session = app('session')->driver('database');
        $session->start();
        $session->put('deployment_probe', 'persisted');
        $sessionId = $session->getId();

        $session->save();
        app('session')->forgetDrivers();
        $restored = app('session')->driver('database');
        $restored->setId($sessionId);
        $restored->start();

        $this->assertSame('persisted', $restored->get('deployment_probe'));
        $this->assertDatabaseHas('laravel_sessions', ['id' => $sessionId, 'user_id' => $user->id]);
    }

    public function test_database_cache_supports_persistent_values_and_scheduler_locks(): void
    {
        if (! Schema::hasTable('laravel_sessions')) {
            (require database_path('migrations/2026_11_11_080217_create_render_runtime_tables.php'))->up();
        }
        $cache = Cache::store('database');

        $cache->put('deployment_probe', 'cached', 60);
        $lock = $cache->lock('deployment_probe_lock', 60);

        $this->assertSame('cached', $cache->get('deployment_probe'));
        $this->assertTrue($lock->get());
        $this->assertFalse($cache->lock('deployment_probe_lock', 60)->get());
        $this->assertTrue($lock->release());
    }
}
