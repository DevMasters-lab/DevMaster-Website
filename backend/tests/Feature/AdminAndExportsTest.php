<?php

namespace Tests\Feature;

use App\Filament\Resources\UserResource\ManageRecords;
use App\Models\Service;
use App\Models\User;
use App\Services\ExportService;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\Support\WorkflowFixture;
use Tests\TestCase;

class AdminAndExportsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_all_admin_resource_tables_render_with_database_backed_queries(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('ADMIN');
        $this->actingAs($admin);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();
        foreach (glob(app_path('Filament/Resources/*/ManageRecords.php')) as $file) {
            $resource = basename(dirname($file));
            $class = 'App\\Filament\\Resources\\'.$resource.'\\ManageRecords';
            Livewire::test($class)->assertSuccessful();
        }
    }

    public function test_csv_and_xlsx_exports_use_private_versioned_files_and_quarantine(): void
    {
        Storage::fake('private');
        $admin = User::factory()->create();
        $admin->assignRole('ADMIN');
        $s = app(ExportService::class);
        foreach (['CSV', 'XLSX'] as $format) {
            $job = $s->request($admin, ['export_type' => 'REQUESTS', 'format' => $format]);
            $s->generate($job);
            $job->refresh();
            $this->assertSame('COMPLETED', $job->status);
            $this->assertSame('PENDING', $job->outputDocumentVersion->scan_status);
            $bytes = Storage::disk('private')->get($job->outputDocumentVersion->object_key);
            $this->assertSame(hash('sha256', $bytes), $job->outputDocumentVersion->sha256);
            if ($format === 'XLSX') {
                $this->assertStringStartsWith('PK', $bytes);
            } else {
                $this->assertStringContainsString('reference_no', $bytes);
            }
        }
    }

    public function test_contextual_admin_tables_search_expert_names_and_user_emails(): void
    {
        $fixture = WorkflowFixture::make();
        $this->actingAs($fixture['admin']);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();
        Livewire::test(ManageRecords::class)
            ->searchTable($fixture['user']->email)->assertCanSeeTableRecords([$fixture['user']]);
        Livewire::test(\App\Filament\Resources\ExpertProfileResource\ManageRecords::class)
            ->searchTable($fixture['expert']->contact_email)->assertCanSeeTableRecords([$fixture['expert']]);
        Livewire::test(\App\Filament\Resources\ExpertOfferResource\ManageRecords::class)
            ->searchTable($fixture['expert']->full_name)->assertCanSeeTableRecords([$fixture['offer']]);
    }

    public function test_public_catalogue_uses_only_active_database_services(): void
    {
        $visible = Service::create(['code' => 'VISIBLE_QA', 'name' => 'Visible service', 'description' => 'A public service.', 'is_active' => true]);
        Service::create(['code' => 'HIDDEN_QA', 'name' => 'Hidden service', 'is_active' => false]);
        $this->getJson('/api/v1/reference-data')->assertOk()
            ->assertJsonFragment(['id' => $visible->id, 'code' => 'VISIBLE_QA', 'name' => 'Visible service', 'description' => 'A public service.'])
            ->assertJsonMissing(['name' => 'Hidden service']);
    }
}
