-- Generated from the supplied v1 dictionary. Reviewed integrity SQL is separate.
CREATE TYPE user_status AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DISABLED');
CREATE TYPE request_type AS ENUM ('INVITE_US_TO_BID', 'HIRE_OUR_TEAM');
CREATE TYPE request_status AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED', 'MATCHING', 'ON_HOLD', 'CLOSED', 'CANCELLED');
CREATE TYPE work_mode AS ENUM ('REMOTE', 'ONSITE', 'HYBRID');
CREATE TYPE request_role_status AS ENUM ('OPEN', 'FILLED', 'CANCELLED');
CREATE TYPE actor_type AS ENUM ('USER', 'PUBLIC', 'SYSTEM');
CREATE TYPE request_activity_type AS ENUM ('SUBMITTED', 'NOTE', 'CLARIFICATION', 'STATUS_CHANGED', 'OWNER_ASSIGNED', 'CRM_LINKED');
CREATE TYPE application_status AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CORRECTIONS_REQUIRED', 'APPROVED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE network_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE expert_review_decision AS ENUM ('APPROVED', 'REJECTED', 'CORRECTIONS_REQUIRED');
CREATE TYPE skill_proficiency AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
CREATE TYPE availability_status AS ENUM ('AVAILABLE', 'LIMITED', 'UNAVAILABLE');
CREATE TYPE consent_purpose AS ENUM ('NETWORK_PARTICIPATION', 'CV_SHARING');
CREATE TYPE consent_action AS ENUM ('GRANTED', 'WITHDRAWN');
CREATE TYPE consent_channel AS ENUM ('PUBLIC_FORM', 'PORTAL', 'STAFF_RECORDED');
CREATE TYPE candidate_status AS ENUM ('SHORTLISTED', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'REMOVED');
CREATE TYPE outreach_channel AS ENUM ('EMAIL', 'PHONE', 'PORTAL', 'IN_PERSON');
CREATE TYPE interest_result AS ENUM ('INTERESTED', 'NOT_INTERESTED', 'NO_RESPONSE');
CREATE TYPE offer_status AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'DECLINED', 'CHANGES_REQUESTED', 'EXPIRED', 'WITHDRAWN', 'SUPERSEDED');
CREATE TYPE rate_basis AS ENUM ('HOUR', 'DAY', 'MONTH', 'FIXED', 'OTHER');
CREATE TYPE payer_type AS ENUM ('DEVMASTERS', 'REQUESTING_COMPANY', 'OTHER');
CREATE TYPE offer_response_type AS ENUM ('ACCEPTED', 'DECLINED', 'CHANGES_REQUESTED', 'COMMENT');
CREATE TYPE response_channel AS ENUM ('PORTAL', 'EMAIL', 'PHONE', 'IN_PERSON');
CREATE TYPE selection_result AS ENUM ('SELECTED', 'NOT_SELECTED');
CREATE TYPE placement_status AS ENUM ('CONFIRMED', 'ACTIVE', 'ENDED', 'CANCELLED');
CREATE TYPE document_type AS ENUM ('CV', 'CERTIFICATE', 'REQUEST_FILE', 'OFFER_ATTACHMENT', 'RESPONSE_EVIDENCE', 'EXPORT', 'OTHER');
CREATE TYPE document_status AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE scan_status AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'ERROR');
CREATE TYPE expert_document_purpose AS ENUM ('CV', 'CERTIFICATE', 'OTHER');
CREATE TYPE outbox_status AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED');
CREATE TYPE delivery_channel AS ENUM ('EMAIL', 'SMS');
CREATE TYPE delivery_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'UNKNOWN');
CREATE TYPE page_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE idempotency_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');
CREATE TYPE export_type AS ENUM ('REQUESTS', 'OFFERS', 'PLACEMENTS');
CREATE TYPE export_format AS ENUM ('CSV', 'XLSX');
CREATE TYPE export_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TABLE users (
  "id" uuid NOT NULL,
  "email" varchar(254) NOT NULL UNIQUE,
  "display_name" varchar(200) NOT NULL,
  "password_hash" text,
  "phone" varchar(32),
  "status" user_status NOT NULL DEFAULT 'INVITED',
  "email_verified_at" timestamptz(3),
  "phone_verified_at" timestamptz(3),
  "last_login_at" timestamptz(3),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE roles (
  "id" uuid NOT NULL,
  "code" varchar(64) NOT NULL UNIQUE,
  "name" varchar(120) NOT NULL,
  "description" text,
  "is_system" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE permissions (
  "id" uuid NOT NULL,
  "code" varchar(120) NOT NULL UNIQUE,
  "module" varchar(64) NOT NULL,
  "description" text NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE TABLE user_roles (
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "granted_by_user_id" uuid,
  "granted_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);
CREATE TABLE role_permissions (
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "granted_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE sessions (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "session_family_id" uuid NOT NULL,
  "refresh_token_hash" varchar(128) NOT NULL UNIQUE,
  "rotated_from_session_id" uuid UNIQUE,
  "expires_at" timestamptz(3) NOT NULL,
  "last_used_at" timestamptz(3),
  "revoked_at" timestamptz(3),
  "revocation_reason" varchar(120),
  "client_description" varchar(300),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE organizations (
  "id" uuid NOT NULL,
  "organization_code" varchar(40) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "registration_number" varchar(100),
  "website" varchar(500),
  "address" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE contacts (
  "id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "full_name" varchar(200) NOT NULL,
  "job_title" varchar(150),
  "email" varchar(254),
  "phone" varchar(32),
  "is_primary" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE company_requests (
  "id" uuid NOT NULL,
  "reference_no" varchar(40) NOT NULL UNIQUE,
  "request_type" request_type NOT NULL,
  "organization_id" uuid,
  "contact_id" uuid,
  "submitted_company_name" varchar(255) NOT NULL,
  "submitted_contact_name" varchar(200) NOT NULL,
  "submitted_email" varchar(254) NOT NULL,
  "submitted_phone" varchar(32),
  "title" varchar(255) NOT NULL,
  "requirements" text NOT NULL,
  "submission_snapshot" jsonb NOT NULL,
  "expected_start_on" date,
  "expected_end_on" date,
  "response_due_at" timestamptz(3),
  "status" request_status NOT NULL DEFAULT 'SUBMITTED',
  "owner_user_id" uuid,
  "submitted_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" timestamptz(3),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE request_roles (
  "id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "role_title" varchar(200) NOT NULL,
  "scope" text,
  "headcount" integer NOT NULL DEFAULT 1,
  "work_mode" work_mode,
  "location_text" varchar(255),
  "status" request_role_status NOT NULL DEFAULT 'OPEN',
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE request_activities (
  "id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "actor_type" actor_type NOT NULL,
  "activity_type" request_activity_type NOT NULL,
  "body" text,
  "from_status" request_status,
  "to_status" request_status,
  "occurred_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE TABLE expert_profiles (
  "id" uuid NOT NULL,
  "user_id" uuid UNIQUE,
  "expert_code" varchar(40) NOT NULL UNIQUE,
  "full_name" varchar(200) NOT NULL,
  "contact_email" varchar(254) NOT NULL,
  "contact_phone" varchar(32),
  "professional_title" varchar(200),
  "biography" text,
  "location_text" varchar(255),
  "application_status" application_status NOT NULL DEFAULT 'SUBMITTED',
  "network_status" network_status NOT NULL DEFAULT 'PENDING',
  "application_snapshot" jsonb NOT NULL,
  "submitted_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approved_at" timestamptz(3),
  "activated_at" timestamptz(3),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE expert_reviews (
  "id" uuid NOT NULL,
  "expert_profile_id" uuid NOT NULL,
  "reviewer_user_id" uuid NOT NULL,
  "decision" expert_review_decision NOT NULL,
  "comments" text,
  "feedback_to_expert" text,
  "reviewed_profile_snapshot" jsonb NOT NULL,
  "reviewed_document_refs" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "reviewed_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE TABLE skills (
  "id" uuid NOT NULL,
  "code" varchar(80) NOT NULL UNIQUE,
  "name" varchar(150) NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE expert_skills (
  "expert_profile_id" uuid NOT NULL,
  "skill_id" uuid NOT NULL,
  "proficiency" skill_proficiency,
  "years_experience" numeric(4,1),
  "notes" text,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (expert_profile_id, skill_id)
);
CREATE TABLE availabilities (
  "id" uuid NOT NULL,
  "expert_profile_id" uuid NOT NULL,
  "starts_on" date NOT NULL,
  "ends_on" date,
  "status" availability_status NOT NULL,
  "hours_per_week" numeric(5,2),
  "notes" text,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE consent_records (
  "id" uuid NOT NULL,
  "expert_profile_id" uuid NOT NULL,
  "purpose" consent_purpose NOT NULL,
  "policy_version" varchar(60) NOT NULL,
  "policy_text_snapshot" text NOT NULL,
  "action" consent_action NOT NULL,
  "channel" consent_channel NOT NULL,
  "recorded_by_user_id" uuid,
  "evidence_summary" text,
  "occurred_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE TABLE candidates (
  "id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "expert_profile_id" uuid NOT NULL,
  "shortlisted_by_user_id" uuid NOT NULL,
  "status" candidate_status NOT NULL DEFAULT 'SHORTLISTED',
  "internal_notes" text,
  "shortlisted_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE outreach_records (
  "id" uuid NOT NULL,
  "candidate_id" uuid NOT NULL,
  "staff_user_id" uuid NOT NULL,
  "channel" outreach_channel NOT NULL,
  "summary" text NOT NULL,
  "interest_result" interest_result,
  "contacted_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "follow_up_at" timestamptz(3),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE TABLE expert_offers (
  "id" uuid NOT NULL,
  "reference_no" varchar(40) NOT NULL UNIQUE,
  "request_id" uuid NOT NULL,
  "expert_profile_id" uuid NOT NULL,
  "candidate_id" uuid NOT NULL,
  "request_role_id" uuid,
  "responsible_user_id" uuid NOT NULL,
  "status" offer_status NOT NULL DEFAULT 'DRAFT',
  "current_version_id" uuid UNIQUE,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE offer_versions (
  "id" uuid NOT NULL,
  "offer_id" uuid NOT NULL,
  "version_no" integer NOT NULL,
  "status" offer_status NOT NULL DEFAULT 'DRAFT',
  "role_title" varchar(200),
  "scope" text,
  "work_mode" work_mode,
  "location_text" varchar(255),
  "starts_on" date,
  "ends_on" date,
  "compensation_amount" numeric(18,2),
  "currency" varchar(3),
  "rate_basis" rate_basis,
  "rate_basis_detail" varchar(200),
  "payer_type" payer_type,
  "payer_name_snapshot" varchar(255),
  "payment_terms" text,
  "terms" text,
  "expires_at" timestamptz(3),
  "issued_at" timestamptz(3),
  "issued_by_user_id" uuid,
  "terms_hash" varchar(64),
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE offer_responses (
  "id" uuid NOT NULL,
  "offer_version_id" uuid NOT NULL,
  "response_type" offer_response_type NOT NULL,
  "comments" text,
  "channel" response_channel NOT NULL,
  "recorded_by_user_id" uuid NOT NULL,
  "responded_at" timestamptz(3) NOT NULL,
  "recorded_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "evidence_summary" text,
  "command_id" uuid NOT NULL UNIQUE,
  PRIMARY KEY (id)
);
CREATE TABLE selection_decisions (
  "id" uuid NOT NULL,
  "offer_id" uuid NOT NULL,
  "offer_version_id" uuid NOT NULL,
  "accepted_response_id" uuid NOT NULL,
  "decision_no" integer NOT NULL,
  "decision" selection_result NOT NULL,
  "decided_by_user_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "supersedes_decision_id" uuid UNIQUE,
  "decided_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE TABLE placements (
  "id" uuid NOT NULL,
  "offer_id" uuid NOT NULL UNIQUE,
  "offer_version_id" uuid NOT NULL UNIQUE,
  "accepted_response_id" uuid NOT NULL UNIQUE,
  "selection_decision_id" uuid NOT NULL UNIQUE,
  "request_id" uuid NOT NULL,
  "expert_profile_id" uuid NOT NULL,
  "company_name_snapshot" varchar(255) NOT NULL,
  "starts_on" date,
  "ends_on" date,
  "actual_end_on" date,
  "status" placement_status NOT NULL DEFAULT 'CONFIRMED',
  "administrative_notes" text,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE documents (
  "id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "document_type" document_type NOT NULL,
  "created_by_user_id" uuid,
  "status" document_status NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE document_versions (
  "id" uuid NOT NULL,
  "document_id" uuid NOT NULL,
  "version_no" integer NOT NULL,
  "original_filename" varchar(255) NOT NULL,
  "bucket_name" varchar(100) NOT NULL,
  "object_key" varchar(700) NOT NULL,
  "object_version_id" varchar(255),
  "mime_type" varchar(150) NOT NULL,
  "size_bytes" bigint NOT NULL,
  "sha256" varchar(64) NOT NULL,
  "scan_status" scan_status NOT NULL DEFAULT 'PENDING',
  "scanned_at" timestamptz(3),
  "scan_message" text,
  "uploaded_by_user_id" uuid,
  "uploaded_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE TABLE expert_documents (
  "expert_profile_id" uuid NOT NULL,
  "document_id" uuid NOT NULL,
  "purpose" expert_document_purpose NOT NULL,
  "is_primary_cv" boolean NOT NULL DEFAULT false,
  "linked_by_user_id" uuid,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (expert_profile_id, document_id)
);
CREATE TABLE request_documents (
  "request_id" uuid NOT NULL,
  "document_id" uuid NOT NULL,
  "label" varchar(150),
  "linked_by_user_id" uuid,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id, document_id)
);
CREATE TABLE offer_documents (
  "offer_version_id" uuid NOT NULL,
  "document_version_id" uuid NOT NULL,
  "label" varchar(150),
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (offer_version_id, document_version_id)
);
CREATE TABLE notifications (
  "id" uuid NOT NULL,
  "recipient_user_id" uuid NOT NULL,
  "outbox_event_id" uuid NOT NULL,
  "notification_type" varchar(80) NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "action_path" varchar(500),
  "read_at" timestamptz(3),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE TABLE outbox_events (
  "id" uuid NOT NULL,
  "event_type" varchar(100) NOT NULL,
  "aggregate_type" varchar(80) NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "aggregate_version" integer,
  "deduplication_key" varchar(200) NOT NULL UNIQUE,
  "payload" jsonb NOT NULL,
  "status" outbox_status NOT NULL DEFAULT 'PENDING',
  "available_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_until" timestamptz(3),
  "publish_attempts" integer NOT NULL DEFAULT 0,
  "published_at" timestamptz(3),
  "last_error" text,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE delivery_attempts (
  "id" uuid NOT NULL,
  "outbox_event_id" uuid NOT NULL,
  "notification_id" uuid,
  "notification_template_id" uuid,
  "delivery_key" varchar(200) NOT NULL,
  "channel" delivery_channel NOT NULL,
  "recipient_address" varchar(254) NOT NULL,
  "attempt_no" integer NOT NULL,
  "status" delivery_status NOT NULL DEFAULT 'PENDING',
  "provider" varchar(60) NOT NULL,
  "provider_message_id" varchar(255),
  "attempted_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" timestamptz(3),
  "error_code" varchar(100),
  "error_message" text,
  PRIMARY KEY (id)
);
CREATE TABLE audit_events (
  "id" uuid NOT NULL,
  "actor_user_id" uuid,
  "actor_type" actor_type NOT NULL,
  "action" varchar(120) NOT NULL,
  "entity_type" varchar(80) NOT NULL,
  "entity_id" uuid,
  "record_version" integer,
  "reason" text,
  "change_summary" jsonb,
  "correlation_id" uuid NOT NULL,
  "occurred_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE TABLE request_role_skills (
  "request_role_id" uuid NOT NULL,
  "skill_id" uuid NOT NULL,
  "is_required" boolean NOT NULL DEFAULT true,
  "minimum_proficiency" skill_proficiency,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_role_id, skill_id)
);
CREATE TABLE offer_response_evidence (
  "offer_response_id" uuid NOT NULL,
  "document_version_id" uuid NOT NULL,
  "label" varchar(200),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (offer_response_id, document_version_id)
);
CREATE TABLE services (
  "id" uuid NOT NULL,
  "code" varchar(80) NOT NULL UNIQUE,
  "name" varchar(200) NOT NULL,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE request_services (
  "request_id" uuid NOT NULL,
  "service_id" uuid NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id, service_id)
);
CREATE TABLE public_pages (
  "id" uuid NOT NULL,
  "slug" varchar(150) NOT NULL,
  "locale" varchar(12) NOT NULL DEFAULT 'en',
  "title" varchar(255) NOT NULL,
  "body_markdown" text NOT NULL,
  "status" page_status NOT NULL DEFAULT 'DRAFT',
  "published_at" timestamptz(3),
  "updated_by_user_id" uuid NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE notification_templates (
  "id" uuid NOT NULL,
  "template_key" varchar(100) NOT NULL,
  "version_no" integer NOT NULL,
  "channel" delivery_channel NOT NULL,
  "locale" varchar(12) NOT NULL DEFAULT 'en',
  "subject" varchar(255),
  "body" text NOT NULL,
  "variables_schema" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_active" boolean NOT NULL DEFAULT false,
  "published_at" timestamptz(3),
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE system_settings (
  "id" uuid NOT NULL,
  "key" varchar(120) NOT NULL UNIQUE,
  "value" jsonb NOT NULL,
  "description" text NOT NULL,
  "updated_by_user_id" uuid NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE idempotency_requests (
  "id" uuid NOT NULL,
  "actor_scope" varchar(128) NOT NULL,
  "key_hash" varchar(64) NOT NULL,
  "request_hash" varchar(64) NOT NULL,
  "route" varchar(200) NOT NULL,
  "status" idempotency_status NOT NULL DEFAULT 'IN_PROGRESS',
  "resource_type" varchar(80),
  "resource_id" uuid,
  "response_status" integer,
  "response_summary" jsonb,
  "lease_expires_at" timestamptz(3),
  "expires_at" timestamptz(3) NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
CREATE TABLE export_jobs (
  "id" uuid NOT NULL,
  "requested_by_user_id" uuid NOT NULL,
  "export_type" export_type NOT NULL,
  "format" export_format NOT NULL DEFAULT 'CSV',
  "filters" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" export_status NOT NULL DEFAULT 'PENDING',
  "output_document_version_id" uuid UNIQUE,
  "started_at" timestamptz(3),
  "completed_at" timestamptz(3),
  "expires_at" timestamptz(3),
  "error_message" text,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "record_version" integer NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
);
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_user_roles_user_id ON user_roles (user_id);
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_user_roles_role_id ON user_roles (role_id);
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_granted_by_user_id FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_user_roles_granted_by_user_id ON user_roles (granted_by_user_id);
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_role_permissions_role_id ON role_permissions (role_id);
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_permission_id FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_role_permissions_permission_id ON role_permissions (permission_id);
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_sessions_user_id ON sessions (user_id);
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_rotated_from_session_id FOREIGN KEY (rotated_from_session_id) REFERENCES sessions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_sessions_rotated_from_session_id ON sessions (rotated_from_session_id);
ALTER TABLE organizations ADD CONSTRAINT fk_organizations_created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_organizations_created_by_user_id ON organizations (created_by_user_id);
ALTER TABLE contacts ADD CONSTRAINT fk_contacts_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_contacts_organization_id ON contacts (organization_id);
ALTER TABLE contacts ADD CONSTRAINT fk_contacts_created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_contacts_created_by_user_id ON contacts (created_by_user_id);
ALTER TABLE company_requests ADD CONSTRAINT fk_company_requests_organization_id FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_company_requests_organization_id ON company_requests (organization_id);
ALTER TABLE company_requests ADD CONSTRAINT fk_company_requests_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_company_requests_contact_id ON company_requests (contact_id);
ALTER TABLE company_requests ADD CONSTRAINT fk_company_requests_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_company_requests_owner_user_id ON company_requests (owner_user_id);
ALTER TABLE request_roles ADD CONSTRAINT fk_request_roles_request_id FOREIGN KEY (request_id) REFERENCES company_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_request_roles_request_id ON request_roles (request_id);
ALTER TABLE request_activities ADD CONSTRAINT fk_request_activities_request_id FOREIGN KEY (request_id) REFERENCES company_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_request_activities_request_id ON request_activities (request_id);
ALTER TABLE request_activities ADD CONSTRAINT fk_request_activities_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_request_activities_actor_user_id ON request_activities (actor_user_id);
ALTER TABLE expert_profiles ADD CONSTRAINT fk_expert_profiles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_profiles_user_id ON expert_profiles (user_id);
ALTER TABLE expert_reviews ADD CONSTRAINT fk_expert_reviews_expert_profile_id FOREIGN KEY (expert_profile_id) REFERENCES expert_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_reviews_expert_profile_id ON expert_reviews (expert_profile_id);
ALTER TABLE expert_reviews ADD CONSTRAINT fk_expert_reviews_reviewer_user_id FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_reviews_reviewer_user_id ON expert_reviews (reviewer_user_id);
ALTER TABLE expert_skills ADD CONSTRAINT fk_expert_skills_expert_profile_id FOREIGN KEY (expert_profile_id) REFERENCES expert_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_skills_expert_profile_id ON expert_skills (expert_profile_id);
ALTER TABLE expert_skills ADD CONSTRAINT fk_expert_skills_skill_id FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_skills_skill_id ON expert_skills (skill_id);
ALTER TABLE availabilities ADD CONSTRAINT fk_availabilities_expert_profile_id FOREIGN KEY (expert_profile_id) REFERENCES expert_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_availabilities_expert_profile_id ON availabilities (expert_profile_id);
ALTER TABLE consent_records ADD CONSTRAINT fk_consent_records_expert_profile_id FOREIGN KEY (expert_profile_id) REFERENCES expert_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_consent_records_expert_profile_id ON consent_records (expert_profile_id);
ALTER TABLE consent_records ADD CONSTRAINT fk_consent_records_recorded_by_user_id FOREIGN KEY (recorded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_consent_records_recorded_by_user_id ON consent_records (recorded_by_user_id);
ALTER TABLE candidates ADD CONSTRAINT fk_candidates_request_id FOREIGN KEY (request_id) REFERENCES company_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_candidates_request_id ON candidates (request_id);
ALTER TABLE candidates ADD CONSTRAINT fk_candidates_expert_profile_id FOREIGN KEY (expert_profile_id) REFERENCES expert_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_candidates_expert_profile_id ON candidates (expert_profile_id);
ALTER TABLE candidates ADD CONSTRAINT fk_candidates_shortlisted_by_user_id FOREIGN KEY (shortlisted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_candidates_shortlisted_by_user_id ON candidates (shortlisted_by_user_id);
ALTER TABLE outreach_records ADD CONSTRAINT fk_outreach_records_candidate_id FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_outreach_records_candidate_id ON outreach_records (candidate_id);
ALTER TABLE outreach_records ADD CONSTRAINT fk_outreach_records_staff_user_id FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_outreach_records_staff_user_id ON outreach_records (staff_user_id);
ALTER TABLE expert_offers ADD CONSTRAINT fk_expert_offers_request_id FOREIGN KEY (request_id) REFERENCES company_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_offers_request_id ON expert_offers (request_id);
ALTER TABLE expert_offers ADD CONSTRAINT fk_expert_offers_expert_profile_id FOREIGN KEY (expert_profile_id) REFERENCES expert_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_offers_expert_profile_id ON expert_offers (expert_profile_id);
ALTER TABLE expert_offers ADD CONSTRAINT fk_expert_offers_candidate_id FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_offers_candidate_id ON expert_offers (candidate_id);
ALTER TABLE expert_offers ADD CONSTRAINT fk_expert_offers_request_role_id FOREIGN KEY (request_role_id) REFERENCES request_roles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_offers_request_role_id ON expert_offers (request_role_id);
ALTER TABLE expert_offers ADD CONSTRAINT fk_expert_offers_responsible_user_id FOREIGN KEY (responsible_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_offers_responsible_user_id ON expert_offers (responsible_user_id);
ALTER TABLE expert_offers ADD CONSTRAINT fk_expert_offers_current_version_id FOREIGN KEY (current_version_id) REFERENCES offer_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_offers_current_version_id ON expert_offers (current_version_id);
ALTER TABLE offer_versions ADD CONSTRAINT fk_offer_versions_offer_id FOREIGN KEY (offer_id) REFERENCES expert_offers(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_offer_versions_offer_id ON offer_versions (offer_id);
ALTER TABLE offer_versions ADD CONSTRAINT fk_offer_versions_issued_by_user_id FOREIGN KEY (issued_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_offer_versions_issued_by_user_id ON offer_versions (issued_by_user_id);
ALTER TABLE offer_versions ADD CONSTRAINT fk_offer_versions_created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_offer_versions_created_by_user_id ON offer_versions (created_by_user_id);
ALTER TABLE offer_responses ADD CONSTRAINT fk_offer_responses_offer_version_id FOREIGN KEY (offer_version_id) REFERENCES offer_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_offer_responses_offer_version_id ON offer_responses (offer_version_id);
ALTER TABLE offer_responses ADD CONSTRAINT fk_offer_responses_recorded_by_user_id FOREIGN KEY (recorded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_offer_responses_recorded_by_user_id ON offer_responses (recorded_by_user_id);
ALTER TABLE selection_decisions ADD CONSTRAINT fk_selection_decisions_offer_id FOREIGN KEY (offer_id) REFERENCES expert_offers(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_selection_decisions_offer_id ON selection_decisions (offer_id);
ALTER TABLE selection_decisions ADD CONSTRAINT fk_selection_decisions_offer_version_id FOREIGN KEY (offer_version_id) REFERENCES offer_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_selection_decisions_offer_version_id ON selection_decisions (offer_version_id);
ALTER TABLE selection_decisions ADD CONSTRAINT fk_selection_decisions_accepted_response_id FOREIGN KEY (accepted_response_id) REFERENCES offer_responses(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_selection_decisions_accepted_response_id ON selection_decisions (accepted_response_id);
ALTER TABLE selection_decisions ADD CONSTRAINT fk_selection_decisions_decided_by_user_id FOREIGN KEY (decided_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_selection_decisions_decided_by_user_id ON selection_decisions (decided_by_user_id);
ALTER TABLE selection_decisions ADD CONSTRAINT fk_selection_decisions_supersedes_decision_id FOREIGN KEY (supersedes_decision_id) REFERENCES selection_decisions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_selection_decisions_supersedes_decision_id ON selection_decisions (supersedes_decision_id);
ALTER TABLE placements ADD CONSTRAINT fk_placements_offer_id FOREIGN KEY (offer_id) REFERENCES expert_offers(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_placements_offer_id ON placements (offer_id);
ALTER TABLE placements ADD CONSTRAINT fk_placements_offer_version_id FOREIGN KEY (offer_version_id) REFERENCES offer_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_placements_offer_version_id ON placements (offer_version_id);
ALTER TABLE placements ADD CONSTRAINT fk_placements_accepted_response_id FOREIGN KEY (accepted_response_id) REFERENCES offer_responses(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_placements_accepted_response_id ON placements (accepted_response_id);
ALTER TABLE placements ADD CONSTRAINT fk_placements_selection_decision_id FOREIGN KEY (selection_decision_id) REFERENCES selection_decisions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_placements_selection_decision_id ON placements (selection_decision_id);
ALTER TABLE placements ADD CONSTRAINT fk_placements_request_id FOREIGN KEY (request_id) REFERENCES company_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_placements_request_id ON placements (request_id);
ALTER TABLE placements ADD CONSTRAINT fk_placements_expert_profile_id FOREIGN KEY (expert_profile_id) REFERENCES expert_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_placements_expert_profile_id ON placements (expert_profile_id);
ALTER TABLE placements ADD CONSTRAINT fk_placements_created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_placements_created_by_user_id ON placements (created_by_user_id);
ALTER TABLE documents ADD CONSTRAINT fk_documents_created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_documents_created_by_user_id ON documents (created_by_user_id);
ALTER TABLE document_versions ADD CONSTRAINT fk_document_versions_document_id FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_document_versions_document_id ON document_versions (document_id);
ALTER TABLE document_versions ADD CONSTRAINT fk_document_versions_uploaded_by_user_id FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_document_versions_uploaded_by_user_id ON document_versions (uploaded_by_user_id);
ALTER TABLE expert_documents ADD CONSTRAINT fk_expert_documents_expert_profile_id FOREIGN KEY (expert_profile_id) REFERENCES expert_profiles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_documents_expert_profile_id ON expert_documents (expert_profile_id);
ALTER TABLE expert_documents ADD CONSTRAINT fk_expert_documents_document_id FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_documents_document_id ON expert_documents (document_id);
ALTER TABLE expert_documents ADD CONSTRAINT fk_expert_documents_linked_by_user_id FOREIGN KEY (linked_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_expert_documents_linked_by_user_id ON expert_documents (linked_by_user_id);
ALTER TABLE request_documents ADD CONSTRAINT fk_request_documents_request_id FOREIGN KEY (request_id) REFERENCES company_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_request_documents_request_id ON request_documents (request_id);
ALTER TABLE request_documents ADD CONSTRAINT fk_request_documents_document_id FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_request_documents_document_id ON request_documents (document_id);
ALTER TABLE request_documents ADD CONSTRAINT fk_request_documents_linked_by_user_id FOREIGN KEY (linked_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_request_documents_linked_by_user_id ON request_documents (linked_by_user_id);
ALTER TABLE offer_documents ADD CONSTRAINT fk_offer_documents_offer_version_id FOREIGN KEY (offer_version_id) REFERENCES offer_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_offer_documents_offer_version_id ON offer_documents (offer_version_id);
ALTER TABLE offer_documents ADD CONSTRAINT fk_offer_documents_document_version_id FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_offer_documents_document_version_id ON offer_documents (document_version_id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_recipient_user_id FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_notifications_recipient_user_id ON notifications (recipient_user_id);
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_outbox_event_id FOREIGN KEY (outbox_event_id) REFERENCES outbox_events(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_notifications_outbox_event_id ON notifications (outbox_event_id);
ALTER TABLE delivery_attempts ADD CONSTRAINT fk_delivery_attempts_outbox_event_id FOREIGN KEY (outbox_event_id) REFERENCES outbox_events(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_delivery_attempts_outbox_event_id ON delivery_attempts (outbox_event_id);
ALTER TABLE delivery_attempts ADD CONSTRAINT fk_delivery_attempts_notification_id FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_delivery_attempts_notification_id ON delivery_attempts (notification_id);
ALTER TABLE delivery_attempts ADD CONSTRAINT fk_delivery_attempts_notification_template_id FOREIGN KEY (notification_template_id) REFERENCES notification_templates(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_delivery_attempts_notification_template_id ON delivery_attempts (notification_template_id);
ALTER TABLE audit_events ADD CONSTRAINT fk_audit_events_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_audit_events_actor_user_id ON audit_events (actor_user_id);
ALTER TABLE request_role_skills ADD CONSTRAINT fk_request_role_skills_request_role_id FOREIGN KEY (request_role_id) REFERENCES request_roles(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_request_role_skills_request_role_id ON request_role_skills (request_role_id);
ALTER TABLE request_role_skills ADD CONSTRAINT fk_request_role_skills_skill_id FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_request_role_skills_skill_id ON request_role_skills (skill_id);
ALTER TABLE offer_response_evidence ADD CONSTRAINT fk_offer_response_evidence_offer_response_id FOREIGN KEY (offer_response_id) REFERENCES offer_responses(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_offer_response_evidence_offer_response_id ON offer_response_evidence (offer_response_id);
ALTER TABLE offer_response_evidence ADD CONSTRAINT fk_offer_response_evidence_document_version_id FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_offer_response_evidence_document_version_id ON offer_response_evidence (document_version_id);
ALTER TABLE request_services ADD CONSTRAINT fk_request_services_request_id FOREIGN KEY (request_id) REFERENCES company_requests(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_request_services_request_id ON request_services (request_id);
ALTER TABLE request_services ADD CONSTRAINT fk_request_services_service_id FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_request_services_service_id ON request_services (service_id);
ALTER TABLE public_pages ADD CONSTRAINT fk_public_pages_updated_by_user_id FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_public_pages_updated_by_user_id ON public_pages (updated_by_user_id);
ALTER TABLE notification_templates ADD CONSTRAINT fk_notification_templates_created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_notification_templates_created_by_user_id ON notification_templates (created_by_user_id);
ALTER TABLE system_settings ADD CONSTRAINT fk_system_settings_updated_by_user_id FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_system_settings_updated_by_user_id ON system_settings (updated_by_user_id);
ALTER TABLE export_jobs ADD CONSTRAINT fk_export_jobs_requested_by_user_id FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_export_jobs_requested_by_user_id ON export_jobs (requested_by_user_id);
ALTER TABLE export_jobs ADD CONSTRAINT fk_export_jobs_output_document_version_id FOREIGN KEY (output_document_version_id) REFERENCES document_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT;
CREATE INDEX ix_export_jobs_output_document_version_id ON export_jobs (output_document_version_id);
