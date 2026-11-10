<?php

namespace App\Console\Commands;

use App\Services\PlatformHealth;
use Illuminate\Console\Command;

class PlatformDoctor extends Command
{
    protected $signature = 'devmasters:doctor {--write-storage : Verify a private storage round trip with a disposable object}';

    protected $description = 'Check database, Redis, private storage, scanner and local mail connectivity without revealing credentials';

    public function handle(PlatformHealth $health): int
    {
        $checks = $health->checks((bool) $this->option('write-storage'));
        $this->table(['Service', 'Status', 'Detail'], array_map(fn (array $check): array => [$check['name'], $check['healthy'] ? 'OK' : 'FAILED', $check['detail']], $checks));

        return collect($checks)->every('healthy') ? self::SUCCESS : self::FAILURE;
    }
}
