<?php

use App\Models\DocumentVersion;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
try {
    [$script,$metadata,$objectRoot] = $argv;
    $m = json_decode(file_get_contents($metadata), true);
    $file = DocumentVersion::findOrFail($m['version_id']);
    $user = User::findOrFail($m['user_id']);
    if (! Gate::forUser($user)->allows('view', $file)) {
        throw new RuntimeException('Restored authorization failed.');
    }
    if (! hash_equals($file->sha256, hash_file('sha256', $objectRoot.'/'.$file->object_key))) {
        throw new RuntimeException('Restored object checksum mismatch.');
    }
    $invalid = DB::select("SELECT conname FROM pg_constraint WHERE contype='f' AND NOT convalidated");
    if ($invalid) {
        throw new RuntimeException('Unvalidated foreign keys.');
    }
    config(['filesystems.disks.private.root' => $objectRoot]);
    Storage::forgetDisk('private');
    $response = Storage::disk('private')->download($file->object_key, $file->original_filename, ['Content-Type' => 'application/octet-stream']);
    ob_start();
    $response->sendContent();
    $bytes = ob_get_clean();
    if (hash('sha256', $bytes) !== $file->sha256) {
        throw new RuntimeException('Authorized download checksum mismatch.');
    }echo "AT20 PASS: restored database FKs, ownership and exact private object bytes verified.\n";

} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage());
    exit(1);
}
