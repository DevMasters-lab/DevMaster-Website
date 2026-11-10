<?php

namespace Tests\Feature;

use App\Models\OfferVersion;
use App\Services\AdminWorkflow;
use App\Services\OfferService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Support\WorkflowFixture as F;
use Tests\TestCase;

class ConcurrencyGuardsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_stale_skill_replacement_returns_conflict(): void
    {
        $f = F::make();
        $this->actingAs($f['user']);
        $version = $f['expert']->record_version ?? 1;
        $this->putJson('/api/v1/expert/skills', ['record_version' => $version, 'skills' => []])->assertOk();
        $this->putJson('/api/v1/expert/skills', ['record_version' => $version, 'skills' => []])->assertConflict();
    }

    public function test_stale_draft_terms_cannot_overwrite_concurrent_changes(): void
    {
        $f = F::make();
        $v = OfferVersion::findOrFail($f['offer']->current_version_id);
        $counter = $v->record_version;
        app(AdminWorkflow::class)->saveDraft($f['admin'], $v, ['record_version' => $counter, 'scope' => 'Updated scope']);
        try {
            app(AdminWorkflow::class)->saveDraft($f['admin'], $v, ['record_version' => $counter, 'scope' => 'Stale overwrite']);
            $this->fail('Expected conflict.');
        } catch (HttpException $e) {
            $this->assertSame(409, $e->getStatusCode());
        }$this->assertSame('Updated scope', $v->refresh()->scope);
    }

    public function test_management_cannot_select_a_different_terms_version_than_reviewed(): void
    {
        $f = F::make();
        $old = F::issue($f);
        F::accept($f, $old);
        $service = app(OfferService::class);
        $new = $service->revise($f['admin'], $f['offer']->refresh(), $f['offer']->record_version, []);
        $new = $service->issue($f['admin'], $f['offer']->refresh(), $f['offer']->record_version);
        F::accept($f, $new);
        try {
            $service->decide($f['admin'], $f['offer'], ['decision' => 'SELECTED', 'reason' => 'Stale selection', 'expected_version_id' => $old->id]);
            $this->fail('Expected version conflict.');
        } catch (HttpException $e) {
            $this->assertSame(409, $e->getStatusCode());
        }
    }

    public function test_staff_cannot_attach_another_experts_private_cv_to_an_offer(): void
    {
        $a = F::make();
        $b = F::make($a['admin']);
        $file = F::file($b);
        try {
            app(AdminWorkflow::class)->attach($a['admin'], OfferVersion::findOrFail($a['offer']->current_version_id), $file);
            $this->fail('Expected privacy rejection.');
        } catch (HttpException $e) {
            $this->assertSame(403, $e->getStatusCode());
        }
    }
}
