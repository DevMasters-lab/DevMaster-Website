-- Compatibility additions; the 42 domain tables and 442 original columns remain intact.
ALTER TABLE users ADD remember_token varchar(100), ADD app_authentication_secret text, ADD app_authentication_recovery_codes text;
ALTER TABLE roles ADD guard_name varchar(255) NOT NULL DEFAULT 'web', ADD UNIQUE(name,guard_name);
ALTER TABLE permissions ADD name varchar(120), ADD guard_name varchar(255) NOT NULL DEFAULT 'web', ADD UNIQUE(name,guard_name);
ALTER TABLE user_roles ADD model_type varchar(255) NOT NULL DEFAULT 'App\Models\User';
CREATE TABLE model_has_permissions(permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE RESTRICT, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, model_type varchar(255) NOT NULL, PRIMARY KEY(permission_id,user_id,model_type));
CREATE TABLE password_reset_tokens(email varchar(254) PRIMARY KEY, token varchar(255) NOT NULL, created_at timestamptz);
CREATE TABLE failed_jobs(id bigserial PRIMARY KEY, uuid varchar(255) UNIQUE NOT NULL, connection text NOT NULL, queue text NOT NULL, payload text NOT NULL, exception text NOT NULL, failed_at timestamptz NOT NULL DEFAULT now());
