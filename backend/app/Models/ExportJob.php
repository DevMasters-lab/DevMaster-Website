<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExportJob extends DomainModel
{
    protected $table = 'export_jobs';

    protected function casts(): array
    {
        return ['filters' => 'array', 'started_at' => 'immutable_datetime', 'completed_at' => 'immutable_datetime', 'expires_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function requestedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function outputDocumentVersion(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class, 'output_document_version_id');
    }
}
