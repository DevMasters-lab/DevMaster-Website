<?php

namespace App\Services;

use App\Enums\ExportFormat;
use App\Enums\ExportType;
use App\Enums\OfferStatus;
use App\Enums\PlacementStatus;
use App\Enums\RequestStatus;
use App\Models\CompanyRequest;
use App\Models\ExpertOffer;
use App\Models\ExportJob;
use App\Models\Placement;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;

class ExportService
{
    public function request(User $actor, array $input): ExportJob
    {
        Gate::forUser($actor)->authorize('reports.export');
        $data = Validator::make($input, [
            'export_type' => ['required', Rule::enum(ExportType::class)],
            'format' => ['required', Rule::enum(ExportFormat::class)],
            'filters' => ['sometimes', 'array:status,from,to,search'],
            'filters.status' => ['nullable', 'string', 'max:40'],
            'filters.from' => ['nullable', 'date_format:Y-m-d'],
            'filters.to' => ['nullable', 'date_format:Y-m-d', Rule::when(! empty($input['filters']['from']), 'after_or_equal:filters.from')],
            'filters.search' => ['nullable', 'string', 'max:200'],
        ])->validate();
        $this->authorizeDomain($actor, $data['export_type']);
        $filters = array_filter($data['filters'] ?? [], fn ($value): bool => $value !== null && $value !== '');
        if (isset($filters['status'])) {
            $enum = match ($data['export_type']) {
                'REQUESTS' => RequestStatus::class,
                'OFFERS' => OfferStatus::class,
                'PLACEMENTS' => PlacementStatus::class,
            };
            abort_unless($enum::tryFrom($filters['status']) !== null, 422, 'This status is not valid for the selected report.');
        }

        return DB::transaction(function () use ($actor, $data, $filters): ExportJob {
            $job = ExportJob::create(['requested_by_user_id' => $actor->id, 'export_type' => $data['export_type'], 'format' => $data['format'], 'filters' => $filters]);
            app(BusinessEvents::class)->record('report.export', 'export_job', $job->id, $actor, data: ['export_job_id' => $job->id]);

            return $job;
        });
    }

    public function generate(ExportJob $job): void
    {
        Gate::forUser($job->requestedByUser)->authorize('reports.export');
        $this->authorizeDomain($job->requestedByUser, $job->export_type);
        $lock = Cache::lock('export:'.$job->id, 240);
        abort_unless($lock->get(), 409, 'This export is already being generated.');
        $output = null;
        try {
            $job->refresh();
            if ($job->status === 'COMPLETED') {
                return;
            }
            $job->update(['status' => 'RUNNING', 'started_at' => now(), 'error_message' => null]);
            [$query, $fields] = $this->query($job);
            $temporary = tempnam(sys_get_temp_dir(), 'dm-export-');
            $output = $temporary.'.'.strtolower($job->format);
            rename($temporary, $output);
            if ($job->format === 'XLSX') {
                $writer = new Writer;
                $writer->openToFile($output);
                try {
                    $writer->addRow(Row::fromValues($fields));
                    foreach ($query->cursor() as $record) {
                        $writer->addRow(Row::fromValues($this->values($record, $fields)));
                    }
                } finally {
                    $writer->close();
                }
            } else {
                $stream = fopen($output, 'wb');
                try {
                    fputcsv($stream, $fields, ',', '"', '');
                    foreach ($query->cursor() as $record) {
                        fputcsv($stream, $this->values($record, $fields), ',', '"', '');
                    }
                } finally {
                    fclose($stream);
                }
            }
            $file = new UploadedFile($output, 'devmasters-'.strtolower($job->export_type).'.'.strtolower($job->format), $job->format === 'XLSX' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv', null, true);
            DB::transaction(function () use ($job, $file): void {
                $version = app(DocumentService::class)->upload($file, 'EXPORT', $job->requestedByUser);
                $job->update(['status' => 'COMPLETED', 'completed_at' => now(), 'output_document_version_id' => $version->id, 'expires_at' => now()->addDay()]);
            });
        } catch (\Throwable $exception) {
            $job->update(['status' => 'FAILED', 'completed_at' => now(), 'error_message' => 'Export failed; inspect worker logs.']);
            throw $exception;
        } finally {
            if ($output !== null) {
                @unlink($output);
            }
            $lock->release();
        }
    }

    private function authorizeDomain(User $actor, string $type): void
    {
        Gate::forUser($actor)->authorize(match ($type) {
            'REQUESTS' => 'requests.manage', 'OFFERS' => 'offers.prepare', 'PLACEMENTS' => 'placements.manage',
        });
    }

    /** @return array{0: Builder, 1: list<string>} */
    private function query(ExportJob $job): array
    {
        [$model, $fields, $dateColumn, $searchColumns] = match ($job->export_type) {
            'REQUESTS' => [CompanyRequest::class, ['reference_no', 'request_type', 'title', 'submitted_company_name', 'status', 'submitted_at'], 'submitted_at', ['reference_no', 'title', 'submitted_company_name']],
            'OFFERS' => [ExpertOffer::class, ['reference_no', 'request_id', 'expert_profile_id', 'status', 'created_at'], 'created_at', ['reference_no']],
            'PLACEMENTS' => [Placement::class, ['id', 'company_name_snapshot', 'status', 'starts_on', 'ends_on', 'created_at'], 'created_at', ['company_name_snapshot']],
        };
        $filters = $job->filters;
        $query = $model::query()->select($fields)->orderBy('id');
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['from'])) {
            $query->whereDate($dateColumn, '>=', $filters['from']);
        }
        if (isset($filters['to'])) {
            $query->whereDate($dateColumn, '<=', $filters['to']);
        }
        if (isset($filters['search'])) {
            $query->where(function (Builder $query) use ($searchColumns, $filters): void {
                foreach ($searchColumns as $column) {
                    $query->orWhere($column, 'ilike', '%'.$filters['search'].'%');
                }
            });
        }

        return [$query, $fields];
    }

    private function values(Model $record, array $fields): array
    {
        return array_map(function (string $field) use ($record): string {
            $value = $record->getAttribute($field);
            $value = $value instanceof \DateTimeInterface ? (str_ends_with($field, '_on') ? $value->format('Y-m-d') : $value->format(DATE_ATOM)) : (string) $value;

            return preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
        }, $fields);
    }
}
