<?php

namespace Tests\Feature;

use App\Services\DocumentService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

#[Group('native')]
class NativeStorageBackupTest extends TestCase
{
    public function test_real_s3_scanning_and_postgresql_restore_preserve_private_file_bytes(): void
    {
        if (getenv('RUN_NATIVE_INTEGRATION') !== '1') {
            $this->markTestSkipped('Run with RUN_NATIVE_INTEGRATION=1 and the native S3/ClamAV services.');
        }
        $this->assertStringEndsWith('_test', config('database.connections.pgsql.database'));
        $file = UploadedFile::fake()->createWithContent('native-test.pdf', "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF");

        $version = app(DocumentService::class)->upload($file, 'OTHER');
        app(DocumentService::class)->scan($version);

        $this->assertSame('CLEAN', $version->refresh()->scan_status);
        $this->assertSame($version->sha256, hash('sha256', Storage::disk('private')->get($version->object_key)));
        $base = storage_path('framework/testing/native-backups');
        $this->artisan('devmasters:backup', ['--directory' => $base])->assertSuccessful();
        $directories = glob($base.'/*/manifest.json');
        usort($directories, fn (string $first, string $second): int => filemtime($second) <=> filemtime($first));
        $this->artisan('devmasters:verify-backup', ['directory' => dirname($directories[0])])->assertSuccessful();
    }
}
