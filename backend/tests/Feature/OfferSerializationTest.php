<?php

namespace Tests\Feature;

use App\Models\OfferDocument;
use App\Services\OfferService;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\Support\WorkflowFixture;
use Tests\TestCase;

class OfferSerializationTest extends TestCase
{
    use DatabaseTransactions;

    #[TestWith([false])]
    #[TestWith([true])]
    public function test_offer_attachments_are_ordered_and_loaded_in_two_batched_queries_for_all_issued_versions(bool $detail): void
    {
        $this->seed();
        $fixture = WorkflowFixture::make();
        $first = WorkflowFixture::file($fixture);
        $second = WorkflowFixture::file($fixture);
        OfferDocument::create(['offer_version_id' => $fixture['offer']->current_version_id, 'document_version_id' => $second->id, 'sort_order' => 2, 'label' => 'Second document']);
        OfferDocument::create(['offer_version_id' => $fixture['offer']->current_version_id, 'document_version_id' => $first->id, 'sort_order' => 1, 'label' => 'First document']);
        for ($index = 0; $index < 3; $index++) {
            WorkflowFixture::issue($fixture);
            app(OfferService::class)->revise($fixture['admin'], $fixture['offer']->refresh(), $fixture['offer']->record_version, []);
        }
        $attachmentQueries = [];
        $fileQueries = [];
        DB::listen(function (QueryExecuted $query) use (&$attachmentQueries, &$fileQueries): void {
            if (str_contains($query->sql, 'from "offer_documents"')) {
                $attachmentQueries[] = $query->sql;
            }
            if (str_contains($query->sql, 'from "document_versions"')) {
                $fileQueries[] = $query->sql;
            }
        });
        $path = '/api/v1/expert/offers'.($detail ? '/'.$fixture['offer']->id : '');

        $response = $this->actingAs($fixture['user'])->getJson($path)->assertOk();

        $versions = $response->json($detail ? 'data.versions' : 'data.0.versions');
        $this->assertCount(3, $versions);
        foreach ($versions as $version) {
            $this->assertSame([
                ['id' => $first->id, 'original_filename' => 'cv.pdf', 'scan_status' => 'CLEAN', 'sha256' => hash('sha256', 'test'), 'size_bytes' => 4, 'label' => 'First document'],
                ['id' => $second->id, 'original_filename' => 'cv.pdf', 'scan_status' => 'CLEAN', 'sha256' => hash('sha256', 'test'), 'size_bytes' => 4, 'label' => 'Second document'],
            ], $version['attachments']);
        }
        $this->assertCount(1, $attachmentQueries);
        $this->assertCount(1, $fileQueries);
    }
}
