<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

class VerifyPlatformBackup extends Command
{
    protected $signature = 'devmasters:verify-backup {directory : Directory returned by devmasters:backup}';

    protected $description = 'Restore a backup to a disposable database and verify every referenced object and foreign key';

    public function handle(): int
    {
        $directory = rtrim($this->argument('directory'), '/');
        $database = 'devmasters_restore_'.Str::lower(Str::random(16));
        $connection = config('database.connections.pgsql');
        $created = false;
        try {
            $manifest = json_decode(file_get_contents($directory.'/manifest.json'), true, flags: JSON_THROW_ON_ERROR);
            if (($manifest['status'] ?? '') !== 'COMPLETED' || ! hash_equals($manifest['database_sha256'], hash_file('sha256', $directory.'/database.dump'))) {
                throw new \RuntimeException('Incomplete or corrupted database dump.');
            }
            $binary = (new ExecutableFinder)->find('pg_restore');
            if (! $binary) {
                throw new \RuntimeException('pg_restore is unavailable.');
            }
            DB::statement('CREATE DATABASE "'.$database.'"');
            $created = true;
            $process = new Process([$binary, '--host='.$connection['host'], '--port='.$connection['port'], '--username='.$connection['username'], '--dbname='.$database, '--no-owner', '--no-privileges', '--exit-on-error', $directory.'/database.dump'], env: ['PGPASSWORD' => (string) $connection['password'], 'PGSSLMODE' => $connection['sslmode'] ?? 'prefer']);
            $process->setTimeout(300)->mustRun();
            config(['database.connections.backup_verification' => array_replace($connection, ['database' => $database])]);
            $restored = DB::connection('backup_verification');
            if ($restored->select("SELECT conname FROM pg_constraint WHERE contype='f' AND NOT convalidated")) {
                throw new \RuntimeException('Restore contains unvalidated foreign keys.');
            }
            $count = 0;
            foreach ($restored->table('document_versions')->orderBy('id')->cursor() as $version) {
                $object = $manifest['objects'][$version->id] ?? null;
                if (! $object || ! preg_match('#^objects/[a-f0-9-]{36}$#i', $object['file']) || $object['object_key'] !== $version->object_key || ! hash_equals($version->sha256, hash_file('sha256', $directory.'/'.$object['file']))) {
                    throw new \RuntimeException('Private file reference or checksum failed.');
                }
                $count++;
            }
            $this->info('Restore verified: '.$count.' private file versions; all foreign keys validated.');

            return self::SUCCESS;
        } catch (\Throwable $exception) {
            report($exception);
            $this->error('Backup verification failed; inspect the application log. The live database was not replaced.');

            return self::FAILURE;
        } finally {
            DB::purge('backup_verification');
            if ($created) {
                DB::statement('DROP DATABASE "'.$database.'"');
            }
        }
    }
}
