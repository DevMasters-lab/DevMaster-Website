<?php

use App\Services\DocumentService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$keys = [];
$paths = [];
try {
    if (! str_ends_with(config('database.connections.pgsql.database'), '_test')) {
        throw new RuntimeException('Live scan checks require a test database.');
    }DB::beginTransaction();
    $contents = ['CLEAN' => "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF", 'INFECTED' => 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'];
    foreach ($contents as $expected => $bytes) {
        $path = tempnam(sys_get_temp_dir(), 'dm-scan-');
        $paths[] = $path;
        file_put_contents($path, $bytes);
        $upload = new UploadedFile($path, 'scanner-test.pdf', 'application/pdf', null, true);
        $v = app(DocumentService::class)->upload($upload, 'OTHER');
        $keys[] = $v->object_key;
        app(DocumentService::class)->scan($v);
        if ($v->refresh()->scan_status !== $expected) {
            throw new RuntimeException('Unexpected scanner result for '.$expected);
        }echo 'Live ClamAV '.$expected.' check passed.'.PHP_EOL;
    }
    DB::rollBack();
} catch (Throwable $e) {
    if (DB::transactionLevel()) {
        DB::rollBack();
    }fwrite(STDERR, $e->getMessage());
    exit(1);
} finally {
    foreach ($keys as $key) {
        Storage::disk('private')->delete($key);
    }foreach ($paths as $path) {
        @unlink($path);
    }
}
