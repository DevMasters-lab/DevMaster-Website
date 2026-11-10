<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PlatformHealth
{
    public function checks(bool $writeStorage = false): array
    {
        $checks = [];
        foreach ([
            'PostgreSQL' => function (): string {
                $row = DB::selectOne('SELECT current_database() AS name');

                return $row->name.' · '.config('database.connections.pgsql.host').':'.config('database.connections.pgsql.port');
            },
            'Redis' => function (): string {
                Redis::connection()->ping();

                return 'Cache, sessions and queue connection available';
            },
            'Private storage' => function () use ($writeStorage): string {
                $disk = Storage::disk('private');
                if ($writeStorage) {
                    $key = 'health/'.Str::uuid();
                    try {
                        $disk->put($key, 'devmasters-health-check');
                        if ($disk->get($key) !== 'devmasters-health-check') {
                            throw new \RuntimeException('Storage checksum mismatch.');
                        }
                    } finally {
                        $disk->delete($key);
                    }
                } else {
                    $disk->files('health');
                }

                return config('filesystems.disks.private.driver').' · private bucket/filesystem accessible';
            },
            'ClamAV' => function (): string {
                $socket = @stream_socket_client('tcp://'.config('devmasters.clamav_host').':'.config('devmasters.clamav_port'), $number, $error, 3);
                if (! $socket) {
                    throw new \RuntimeException('Scanner unavailable.');
                } try {
                    stream_set_timeout($socket, 3);
                    fwrite($socket, "zPING\0");
                    $result = stream_get_contents($socket);
                    if (! str_contains($result, 'PONG')) {
                        throw new \RuntimeException('Scanner is not ready.');
                    }
                } finally {
                    fclose($socket);
                }

                return 'PONG · stream scanner ready';
            },
            'Email transport' => function (): string {
                $mailer = config('mail.default');
                if ($mailer !== 'smtp') {
                    return $mailer.' configured';
                } $socket = @fsockopen(config('mail.mailers.smtp.host'), config('mail.mailers.smtp.port'), $number, $error, 3);
                if (! $socket) {
                    throw new \RuntimeException('SMTP connection unavailable.');
                } fclose($socket);

                return 'SMTP reachable · no message sent by health check';
            },
        ] as $name => $probe) {
            try {
                $checks[] = ['name' => $name, 'healthy' => true, 'detail' => $probe()];
            } catch (\Throwable $exception) {
                $checks[] = ['name' => $name, 'healthy' => false, 'detail' => 'Unavailable; check local service configuration and logs.'];
            }
        }

        return $checks;
    }
}
