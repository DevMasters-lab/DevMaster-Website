<?php

namespace Tests\Feature;

use App\Models\OfferVersion;
use App\Models\Placement;
use App\Services\OfferService;
use Symfony\Component\Process\Process;
use Tests\Support\WorkflowFixture as F;
use Tests\TestCase;

class ConcurrencyTest extends TestCase
{
    private function race(array $commands, int $delayMicros = 0): array
    {
        $barrier = tempnam(sys_get_temp_dir(), 'dm-race-');
        unlink($barrier);
        $processes = [];
        foreach ($commands as [$mode,$offer,$actor]) {
            $p = new Process([PHP_BINARY, base_path('tests/concurrent-worker.php'), $mode, $offer, $actor, $barrier], base_path(), ['DB_DATABASE' => 'devmaster-website_test', 'CACHE_STORE' => 'array', 'APP_ENV' => 'testing']);
            $p->setTimeout(30);
            $p->start();
            $processes[] = $p;
        }if ($delayMicros) {
            usleep($delayMicros);
        }touch($barrier);
        $results = [];
        foreach ($processes as $p) {
            $p->wait();
            $results[] = ['code' => $p->getExitCode(), 'output' => $p->getOutput(), 'error' => $p->getErrorOutput()];
        }unlink($barrier);

        return $results;
    }

    public function test_at12_parallel_selection_serializes_one_person_capacity(): void
    {
        $this->seed();
        $a = F::make();
        $b = F::make($a['admin'], $a['request'], $a['role']);
        foreach ([$a, $b] as $f) {
            $v = F::issue($f);
            F::accept($f, $v);
        }$results = $this->race([['select', $a['offer']->id, $a['admin']->id], ['select', $b['offer']->id, $a['admin']->id]]);
        $codes = array_column($results, 'code');
        sort($codes);
        $this->assertSame([0, 2], $codes, json_encode($results));
        $this->assertSame(1, Placement::where('request_id', $a['request']->id)->where('status', '<>', 'CANCELLED')->count());
    }

    public function test_at08_acceptance_and_expiry_race_produces_one_valid_state(): void
    {
        $this->seed();
        $f = F::make();
        OfferVersion::findOrFail($f['offer']->current_version_id)->update(['expires_at' => now()->addSeconds(2)]);
        $v = F::issue($f);
        $results = $this->race([['accept', $f['offer']->id, $f['user']->id], ['expire', $f['offer']->id, $f['admin']->id]], 1800000);
        $this->assertContains($results[0]['code'], [0, 2], json_encode($results));
        $this->assertSame(0, $results[1]['code'], json_encode($results));
        app(OfferService::class)->expire($f['offer']);
        $this->assertSame($results[0]['code'] === 0 ? 'ACCEPTED' : 'EXPIRED', $v->refresh()->status);
        $this->assertSame(0, Placement::where('offer_id', $f['offer']->id)->count());
    }
}
