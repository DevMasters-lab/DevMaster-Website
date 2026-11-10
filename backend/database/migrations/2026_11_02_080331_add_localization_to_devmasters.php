<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->string('preferred_locale', 2)->nullable());
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_preferred_locale_supported CHECK (preferred_locale IS NULL OR preferred_locale IN ('en','km'))");
        foreach (['services', 'skills', 'notifications'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->jsonb('translations')->default('{}'));
            DB::statement("ALTER TABLE {$name} ADD CONSTRAINT {$name}_translations_object CHECK (jsonb_typeof(translations)='object' AND (translations - 'en' - 'km') = '{}'::jsonb)");
        }
    }

    public function down(): void
    {
        foreach (['services', 'skills', 'notifications'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn('translations'));
        }Schema::table('users', fn (Blueprint $table) => $table->dropColumn('preferred_locale'));
    }
};
