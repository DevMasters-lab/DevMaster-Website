<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION protect_snapshots() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME='company_requests' THEN
  IF ROW(NEW.submission_snapshot,NEW.submitted_company_name,NEW.submitted_contact_name,NEW.submitted_email,NEW.submitted_phone) IS DISTINCT FROM ROW(OLD.submission_snapshot,OLD.submitted_company_name,OLD.submitted_contact_name,OLD.submitted_email,OLD.submitted_phone) THEN RAISE EXCEPTION 'Original submission is immutable' USING ERRCODE='23514'; END IF;
 ELSE
  IF NEW.application_snapshot IS DISTINCT FROM OLD.application_snapshot THEN RAISE EXCEPTION 'Original application is immutable' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW;
END $$;

SQL);
    }

    public function down(): void {}
};
