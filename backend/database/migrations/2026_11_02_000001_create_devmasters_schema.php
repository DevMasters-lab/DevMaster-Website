<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            throw new RuntimeException('DevMasters requires PostgreSQL; SQLite cannot verify its integrity rules.');
        }
        DB::unprepared(file_get_contents(database_path('schema/domain.sql')));
        DB::unprepared(file_get_contents(database_path('schema/integrity.sql')));
        DB::unprepared(file_get_contents(database_path('schema/framework.sql')));
    }

    public function down(): void
    {
        throw new RuntimeException('Historical evidence is protected. Use a disposable database for reset; restore backups for recovery.');
    }
};
