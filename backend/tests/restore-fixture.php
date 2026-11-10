<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\Support\WorkflowFixture;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! str_ends_with(config('database.connections.pgsql.database'), '_test')) {
    throw new RuntimeException('Restore fixtures are test-database only.');
}
try {
    DB::transaction(function () use ($argv) {
        $f = WorkflowFixture::make();
        $file = WorkflowFixture::file($f);
        Storage::disk('private')->put($file->object_key, 'test');
        file_put_contents($argv[1], json_encode(['user_id' => $f['user']->id, 'version_id' => $file->id, 'key' => $file->object_key, 'sha256' => $file->sha256]));
    });

} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage());
    exit(1);
}
