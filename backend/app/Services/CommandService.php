<?php

namespace App\Services;

use App\Models\IdempotencyRequest;
use Illuminate\Support\Facades\DB;

class CommandService
{
    public function run(string $scope, string $key, string $route, array $payload, callable $action): array
    {
        abort_unless(preg_match('/^[a-f0-9-]{36}$/i', $key), 422, 'A UUID Idempotency-Key is required.');
        $hash = hash('sha256', json_encode([$route, $this->canonical($payload)], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($scope, $key, $route, $hash, $action) {
            $kh = hash('sha256', $key);
            DB::select('SELECT pg_advisory_xact_lock(hashtextextended(?,0))', [$scope.':'.$kh]);
            $row = IdempotencyRequest::where('actor_scope', $scope)->where('key_hash', $kh)->first();
            if ($row) {
                abort_unless(hash_equals($row->request_hash, $hash), 409, 'Idempotency key was used with different data.');
                abort_unless($row->status === 'COMPLETED', 409, 'Command is still processing.');

                return $row->response_summary;
            }
            $row = IdempotencyRequest::create(['actor_scope' => $scope, 'key_hash' => $kh, 'request_hash' => $hash, 'route' => $route, 'expires_at' => now()->addDays(7)]);
            $result = $action();
            $row->update(['status' => 'COMPLETED', 'response_status' => 200, 'response_summary' => $result]);

            return $result;
        }, 3);
    }

    private function canonical(array $data): array
    {
        if (! array_is_list($data)) {
            ksort($data);
        }foreach ($data as &$v) {
            if (is_array($v)) {
                $v = $this->canonical($v);
            }
        }

        return $data;
    }
}
