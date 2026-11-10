<?php

use App\Models\ExpertOffer;
use App\Models\OfferVersion;
use App\Models\User;
use App\Services\OfferService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
[$script,$mode,$offerId,$actorId,$barrier] = $argv;
$deadline = microtime(true) + 15;
while (! file_exists($barrier) && microtime(true) < $deadline) {
    usleep(10000);
}
try {
    $o = ExpertOffer::findOrFail($offerId);
    $u = User::findOrFail($actorId);
    $s = app(OfferService::class);
    if ($mode === 'select') {
        $s->decide($u, $o, ['decision' => 'SELECTED', 'reason' => 'Concurrent capacity test']);
    } elseif ($mode === 'accept') {
        $s->respond($u, OfferVersion::findOrFail($o->current_version_id), ['response_type' => 'ACCEPTED', 'command_id' => (string) Str::uuid()]);
    } else {
        $s->expire($o);
    }
    echo 'COMMITTED';
    exit(0);
} catch (HttpException $e) {
    echo 'CONFLICT:'.$e->getStatusCode();
    exit($e->getStatusCode() === 409 ? 2 : 3);
} catch (Throwable $e) {
    fwrite(STDERR, get_class($e).':'.$e->getMessage());
    exit(4);
}
