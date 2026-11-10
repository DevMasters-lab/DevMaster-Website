<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentService
{
    public function upload(UploadedFile $file, string $type, ?User $user = null, ?Document $document = null): DocumentVersion
    {
        return DB::transaction(function () use ($file, $type, $user, $document) {
            if ($document) {
                $document = Document::lockForUpdate()->findOrFail($document->id);
            } else {
                $document = Document::create(['title' => basename($file->getClientOriginalName()), 'document_type' => $type, 'created_by_user_id' => $user?->id]);
            }
            $key = 'quarantine/'.Str::uuid();
            $stream = fopen($file->getRealPath(), 'rb');
            try {
                Storage::disk('private')->put($key, $stream);
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }
            $v = DocumentVersion::create(['document_id' => $document->id, 'version_no' => (DocumentVersion::where('document_id', $document->id)->max('version_no') ?? 0) + 1, 'original_filename' => basename($file->getClientOriginalName()), 'bucket_name' => config('filesystems.disks.private.bucket'), 'object_key' => $key, 'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize(), 'sha256' => hash_file('sha256', $file->getRealPath()), 'uploaded_by_user_id' => $user?->id]);
            app(BusinessEvents::class)->record('document.scan', 'document_version', $v->id, $user, data: ['document_version_id' => $v->id]);

            return $v;
        });
    }

    public function scan(DocumentVersion $v): void
    {
        $socket = @stream_socket_client('tcp://'.config('devmasters.clamav_host').':'.config('devmasters.clamav_port'), $errno, $error, 15);
        if (! $socket) {
            throw new \RuntimeException('Malware scanner unavailable.');
        }
        stream_set_timeout($socket, 120);
        fwrite($socket, "zINSTREAM\0");
        $stream = Storage::disk('private')->readStream($v->object_key);
        try {
            while (! feof($stream)) {
                $chunk = fread($stream, 8192);
                fwrite($socket, pack('N', strlen($chunk)).$chunk);
            }fwrite($socket, pack('N', 0));
            $result = stream_get_contents($socket);
        } finally {
            fclose($stream);
            fclose($socket);
        }
        if (! str_contains($result, 'OK') && ! str_contains($result, 'FOUND')) {
            throw new \RuntimeException('Scanner returned no definitive result.');
        }
        $limit = str_contains($result, 'Heuristics.Limits.Exceeded');
        $v->update(['scan_status' => $limit ? 'ERROR' : (str_contains($result, 'FOUND') ? 'INFECTED' : 'CLEAN'), 'scanned_at' => now(), 'scan_message' => $limit ? 'Scanner limits exceeded; file remains quarantined.' : (str_contains($result, 'FOUND') ? 'Malware detected.' : 'Scan passed.')]);
    }
}
