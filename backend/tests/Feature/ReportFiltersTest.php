<?php

namespace Tests\Feature;

use App\Models\CompanyRequest;
use App\Models\User;
use App\Services\ExportService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ReportFiltersTest extends TestCase
{
    use DatabaseTransactions;

    public function test_report_filters_and_csv_column_order_match_the_requested_contract(): void
    {
        $this->seed();
        Storage::fake('private');
        $actor = User::factory()->create();
        $actor->assignRole('ADMIN');
        $match = CompanyRequest::factory()->create(['title' => 'Unique report scope', 'submitted_company_name' => '=Untrusted spreadsheet formula', 'submitted_at' => '2026-10-10 12:00:00+00']);
        CompanyRequest::factory()->create(['title' => 'Outside date range', 'submitted_at' => '2026-09-01 12:00:00+00']);
        $service = app(ExportService::class);

        $job = $service->request($actor, ['export_type' => 'REQUESTS', 'format' => 'CSV', 'filters' => ['status' => 'SUBMITTED', 'from' => '2026-10-01', 'to' => '2026-10-31', 'search' => 'Unique report']]);
        $service->generate($job);

        $stream = fopen('php://temp', 'w+');
        fwrite($stream, Storage::disk('private')->get($job->refresh()->outputDocumentVersion->object_key));
        rewind($stream);
        $this->assertSame(['reference_no', 'request_type', 'title', 'submitted_company_name', 'status', 'submitted_at'], fgetcsv($stream, escape: ''));
        $row = fgetcsv($stream, escape: '');
        $this->assertSame($match->reference_no, $row[0]);
        $this->assertSame('Unique report scope', $row[2]);
        $this->assertSame("'=Untrusted spreadsheet formula", $row[3]);
        $this->assertFalse(fgetcsv($stream, escape: ''));
        fclose($stream);
    }

    public function test_unrecognized_filter_keys_and_statuses_are_rejected(): void
    {
        $this->seed();
        $actor = User::factory()->create();
        $actor->assignRole('ADMIN');
        $this->expectException(ValidationException::class);

        app(ExportService::class)->request($actor, ['export_type' => 'REQUESTS', 'format' => 'CSV', 'filters' => ['sql' => 'DROP TABLE users']]);
    }

    public function test_export_downloads_enforce_owner_and_expiry_even_through_document_policy(): void
    {
        $this->seed();
        Storage::fake('private');
        $owner = User::factory()->create();
        $owner->assignRole('ADMIN');
        $other = User::factory()->create();
        $other->assignRole('ADMIN');
        $service = app(ExportService::class);
        $job = $service->request($owner, ['export_type' => 'REQUESTS', 'format' => 'CSV', 'filters' => ['to' => '2026-12-31']]);
        $service->generate($job);
        $version = $job->refresh()->outputDocumentVersion;
        $version->update(['scan_status' => 'CLEAN']);

        $this->assertTrue(Gate::forUser($owner)->allows('view', $version));
        $this->assertFalse(Gate::forUser($other)->allows('view', $version));
        $owner->update(['status' => 'SUSPENDED']);
        $this->assertFalse(Gate::forUser($owner->fresh())->allows('view', $version));
        $owner->update(['status' => 'ACTIVE']);
        $job->update(['expires_at' => now()->subMinute()]);
        $this->assertFalse(Gate::forUser($owner)->allows('view', $version));
    }
}
