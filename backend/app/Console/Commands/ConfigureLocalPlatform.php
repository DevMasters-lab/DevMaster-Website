<?php

namespace App\Console\Commands;

use App\Models\Service;
use App\Models\Skill;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\AuditTrail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ConfigureLocalPlatform extends Command
{
    protected $signature = 'devmasters:configure-local {administrator-email : Existing active administrator email}';

    protected $description = 'Initialize the documented local service and skills catalogue without overwriting existing edits';

    public function handle(): int
    {
        if (! app()->environment('local')) {
            $this->error('This command is available only in the local environment.');

            return self::FAILURE;
        }
        $administrator = User::where('email', mb_strtolower(trim($this->argument('administrator-email'))))->first();
        if (! $administrator || $administrator->status !== 'ACTIVE' || ! $administrator->hasRole('ADMIN') || ! $administrator->can('settings.manage')) {
            $this->error('An existing active administrator with settings permission is required.');

            return self::FAILURE;
        }
        $catalogue = [
            'SOFTWARE_DEVELOPMENT' => ['Software development', 'Web applications, digital platforms, systems integration and technical software expertise.'],
            'NETWORKING' => ['Networking', 'Network planning, infrastructure design and specialist support for connected systems.'],
            'CYBERSECURITY' => ['Cybersecurity', 'Security expertise, risk assessment and advisory support for resilient operations.'],
            'DATA_MANAGEMENT' => ['Data management', 'Data organization, information systems and specialist expertise to make information useful.'],
        ];
        DB::transaction(function () use ($administrator, $catalogue): void {
            DB::select("SELECT pg_advisory_xact_lock(hashtextextended('devmasters:local-configuration',0))");
            foreach ($catalogue as $code => [$name, $description]) {
                $service = Service::firstOrCreate(['code' => $code], ['name' => $name, 'description' => $description, 'sort_order' => array_search($code, array_keys($catalogue), true), 'is_active' => true]);
                $skill = Skill::firstOrCreate(['code' => $code], ['name' => $name, 'description' => $description, 'is_active' => true]);
                foreach ([$service, $skill] as $record) {
                    $translations = $record->translations ?? [];
                    foreach (['name' => $name, 'description' => $description] as $field => $source) {
                        if ($source === $record->$field && ! isset($translations['km'][$field])) {
                            $translations['km'][$field] = __($source, [], 'km');
                        }
                    }if ($translations !== $record->translations) {
                        $record->update(['translations' => $translations]);
                    }
                }
            }
            SystemSetting::firstOrCreate(['key' => 'business.display_name'], ['value' => ['text' => 'DevMasters'], 'description' => 'Brand name supplied for the local platform.', 'updated_by_user_id' => $administrator->id]);
            app(AuditTrail::class)->record('local.configuration-initialized', $administrator, $administrator, ['service_codes' => array_keys($catalogue), 'source' => 'supplied platform concept']);
        });
        $this->info('Local service catalogue, starter skill categories and brand settings are configured.');
        $this->line('Existing edits and inactive records were preserved.');
        $this->line('Legal pages retain their local development notice. Email uses the configured local capture service.');

        return self::SUCCESS;
    }
}
