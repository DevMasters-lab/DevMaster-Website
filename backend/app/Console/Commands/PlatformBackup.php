<?php

namespace App\Console\Commands;

use App\Models\DocumentVersion;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

class PlatformBackup extends Command
{
    protected $signature = 'devmasters:backup {--directory= : Private destination directory; defaults to storage/app/backups}';

    protected $description = 'Create a PostgreSQL dump and checksum-verified private object backup';

    public function handle(): int
    {
        $base = $this->option('directory') ?: storage_path('app/backups');
        $directory = rtrim($base, '/').'/'.now()->format('Ymd-His').'-'.Str::lower(Str::random(8));
        $connection = config('database.connections.pgsql');
        $manifest = ['schema_version' => 1, 'database' => $connection['database'], 'created_at' => now()->toIso8601String(), 'status' => 'IN_PROGRESS', 'objects' => []];
        try {
            if (! is_dir($directory.'/objects') && ! mkdir($directory.'/objects', 0700, true)) {
                throw new \RuntimeException('Cannot create backup directory.');
            }
            $binary = (new ExecutableFinder)->find('pg_dump');
            if (! $binary) {
                throw new \RuntimeException('pg_dump is unavailable.');
            }
            $process = new Process([$binary, '--host='.$connection['host'], '--port='.$connection['port'], '--username='.$connection['username'], '--dbname='.$connection['database'], '--format=custom', '--no-owner', '--file='.$directory.'/database.dump'], env: ['PGPASSWORD' => (string) $connection['password'], 'PGSSLMODE' => $connection['sslmode'] ?? 'prefer']);
            $process->setTimeout(300)->mustRun();
            foreach (DocumentVersion::orderBy('id')->cursor() as $version) {
                $relative = 'objects/'.$version->id;
                $source = Storage::disk('private')->readStream($version->object_key);
                $target = fopen($directory.'/'.$relative, 'xb');
                try {
                    stream_copy_to_stream($source, $target);
                } finally {
                    fclose($source);
                    fclose($target);
                }
                if (! hash_equals($version->sha256, hash_file('sha256', $directory.'/'.$relative))) {
                    throw new \RuntimeException('Object checksum mismatch: '.$version->id);
                }
                $manifest['objects'][$version->id] = ['object_key' => $version->object_key, 'file' => $relative, 'sha256' => $version->sha256, 'size_bytes' => $version->size_bytes];
                chmod($directory.'/'.$relative, 0600);
            }
            $manifest['database_sha256'] = hash_file('sha256', $directory.'/database.dump');
            $manifest['status'] = 'COMPLETED';
            file_put_contents($directory.'/manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
            chmod($directory.'/manifest.json', 0600);
            chmod($directory.'/database.dump', 0600);
            $this->info('Backup completed: '.$directory);
            $this->line(count($manifest['objects']).' private file versions verified.');

            return self::SUCCESS;
        } catch (\Throwable $exception) {
            report($exception);
            if (is_dir($directory)) {
                $manifest['status'] = 'FAILED';
                file_put_contents($directory.'/manifest.json', json_encode($manifest, JSON_PRETTY_PRINT));
            }
            $this->error('Backup failed. No completed backup was recorded. Check the application log.');

            return self::FAILURE;
        }
    }
}
