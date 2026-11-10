CREATE FUNCTION guard_response() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE v offer_versions; o expert_offers; BEGIN
 SELECT eo.* INTO o FROM expert_offers eo JOIN offer_versions ov ON ov.offer_id=eo.id WHERE ov.id=NEW.offer_version_id FOR UPDATE OF eo;
 SELECT * INTO v FROM offer_versions WHERE id=NEW.offer_version_id FOR UPDATE;
 IF o.current_version_id IS DISTINCT FROM v.id OR v.status<>'ISSUED' OR clock_timestamp() >= v.expires_at THEN RAISE EXCEPTION 'Response requires an unexpired current issued version' USING ERRCODE='23514'; END IF;
 IF NEW.channel='PORTAL' AND NOT EXISTS(SELECT 1 FROM expert_profiles p JOIN users u ON u.id=p.user_id WHERE p.id=o.expert_profile_id AND p.user_id=NEW.recorded_by_user_id AND p.application_status='APPROVED' AND p.network_status='ACTIVE' AND p.activated_at IS NOT NULL AND u.status='ACTIVE') THEN RAISE EXCEPTION 'Portal response actor does not own an activated expert' USING ERRCODE='23514'; END IF;
 NEW.recorded_at=clock_timestamp();IF NEW.channel='PORTAL' THEN NEW.responded_at=NEW.recorded_at; END IF;RETURN NEW;
END $$;
CREATE TRIGGER guard_response BEFORE INSERT ON offer_responses FOR EACH ROW EXECUTE FUNCTION guard_response();
CREATE FUNCTION protect_placement_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Placement history cannot be deleted' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-ARRAY['status','actual_end_on','administrative_notes','updated_at','record_version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','actual_end_on','administrative_notes','updated_at','record_version']) THEN RAISE EXCEPTION 'Placement evidence cannot be rewritten' USING ERRCODE='23514'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER protect_placement_history BEFORE UPDATE OR DELETE ON placements FOR EACH ROW EXECUTE FUNCTION protect_placement_history();
CREATE FUNCTION protect_template() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (OLD.published_at IS NOT NULL AND (to_jsonb(NEW)-ARRAY['is_active','updated_at','record_version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['is_active','updated_at','record_version'])) THEN RAISE EXCEPTION 'Published template content is immutable' USING ERRCODE='23514'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER protect_template BEFORE UPDATE OR DELETE ON notification_templates FOR EACH ROW EXECUTE FUNCTION protect_template();
CREATE INDEX requests_status_received ON company_requests(status,submitted_at DESC);
CREATE INDEX requests_owner_status ON company_requests(owner_user_id,status);
CREATE INDEX experts_application_received ON expert_profiles(application_status,submitted_at);
CREATE INDEX experts_network_status ON expert_profiles(network_status);
CREATE INDEX experts_contact_email ON expert_profiles(contact_email);
CREATE INDEX offers_expert_status ON expert_offers(expert_profile_id,status);
CREATE INDEX offers_request_status ON expert_offers(request_id,status);
CREATE INDEX offers_responsible_status ON expert_offers(responsible_user_id,status);
CREATE INDEX offer_expiry_queue ON offer_versions(status,expires_at);
CREATE INDEX file_scan_queue ON document_versions(scan_status,uploaded_at);
CREATE INDEX notification_inbox ON notifications(recipient_user_id,read_at,created_at DESC);
CREATE INDEX outbox_polling ON outbox_events(status,available_at);
CREATE INDEX outbox_leases ON outbox_events(locked_until);
CREATE INDEX audit_target_history ON audit_events(entity_type,entity_id,occurred_at DESC);
CREATE INDEX audit_actor_history ON audit_events(actor_user_id,occurred_at DESC);
CREATE INDEX consent_history ON consent_records(expert_profile_id,purpose,occurred_at DESC);
CREATE INDEX expert_placement_status ON placements(expert_profile_id,status);
CREATE INDEX request_placement_status ON placements(request_id,status);
CREATE INDEX idempotency_expiry ON idempotency_requests(expires_at);
