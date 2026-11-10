-- Cross-record identity consistency (C03-C14).
ALTER TABLE contacts ADD UNIQUE(id, organization_id);
ALTER TABLE company_requests ADD CHECK(contact_id IS NULL OR organization_id IS NOT NULL), ADD FOREIGN KEY(contact_id,organization_id) REFERENCES contacts(id,organization_id);
ALTER TABLE candidates ADD UNIQUE(id,request_id,expert_profile_id), ADD UNIQUE(request_id,expert_profile_id);
ALTER TABLE request_roles ADD UNIQUE(id,request_id);
ALTER TABLE expert_offers ADD UNIQUE(id,request_id,expert_profile_id), ADD FOREIGN KEY(candidate_id,request_id,expert_profile_id) REFERENCES candidates(id,request_id,expert_profile_id), ADD FOREIGN KEY(request_role_id,request_id) REFERENCES request_roles(id,request_id), ADD CHECK(status <> 'SUPERSEDED');
ALTER TABLE offer_versions ADD UNIQUE(id,offer_id), ADD UNIQUE(offer_id,version_no);
ALTER TABLE expert_offers ADD FOREIGN KEY(current_version_id,id) REFERENCES offer_versions(id,offer_id);
ALTER TABLE offer_responses ADD UNIQUE(id,offer_version_id);
ALTER TABLE selection_decisions ADD UNIQUE(id,offer_id), ADD UNIQUE(id,offer_id,offer_version_id,accepted_response_id), ADD UNIQUE(offer_id,decision_no), ADD FOREIGN KEY(offer_version_id,offer_id) REFERENCES offer_versions(id,offer_id), ADD FOREIGN KEY(accepted_response_id,offer_version_id) REFERENCES offer_responses(id,offer_version_id), ADD FOREIGN KEY(supersedes_decision_id,offer_id) REFERENCES selection_decisions(id,offer_id);
ALTER TABLE placements ADD FOREIGN KEY(offer_id,request_id,expert_profile_id) REFERENCES expert_offers(id,request_id,expert_profile_id), ADD FOREIGN KEY(offer_version_id,offer_id) REFERENCES offer_versions(id,offer_id), ADD FOREIGN KEY(accepted_response_id,offer_version_id) REFERENCES offer_responses(id,offer_version_id), ADD FOREIGN KEY(selection_decision_id,offer_id,offer_version_id,accepted_response_id) REFERENCES selection_decisions(id,offer_id,offer_version_id,accepted_response_id);
ALTER TABLE notifications ADD UNIQUE(id,outbox_event_id), ADD UNIQUE(recipient_user_id,outbox_event_id,notification_type);
ALTER TABLE delivery_attempts ADD FOREIGN KEY(notification_id,outbox_event_id) REFERENCES notifications(id,outbox_event_id), ADD UNIQUE(outbox_event_id,delivery_key,attempt_no);
ALTER TABLE document_versions ADD UNIQUE(document_id,version_no), ADD UNIQUE(bucket_name,object_key);
ALTER TABLE public_pages ADD UNIQUE(slug,locale);
ALTER TABLE notification_templates ADD UNIQUE(template_key,channel,locale,version_no), ADD CHECK(NOT is_active OR published_at IS NOT NULL), ADD CHECK(channel <> 'EMAIL' OR subject IS NOT NULL);
ALTER TABLE idempotency_requests ADD UNIQUE(actor_scope,key_hash);
CREATE UNIQUE INDEX one_response_decision ON offer_responses(offer_version_id) WHERE response_type <> 'COMMENT';
CREATE UNIQUE INDEX one_selected_cycle ON selection_decisions(offer_id) WHERE decision = 'SELECTED';
CREATE UNIQUE INDEX one_primary_contact ON contacts(organization_id) WHERE is_primary;
CREATE UNIQUE INDEX one_primary_cv ON expert_documents(expert_profile_id) WHERE is_primary_cv;
CREATE UNIQUE INDEX one_active_template ON notification_templates(template_key,channel,locale) WHERE is_active;
ALTER TABLE contacts ADD CHECK(NULLIF(trim(email),'') IS NOT NULL OR NULLIF(trim(phone),'') IS NOT NULL);
ALTER TABLE expert_documents ADD CHECK(NOT is_primary_cv OR purpose = 'CV');
ALTER TABLE company_requests ADD CHECK(status NOT IN ('CLOSED','CANCELLED') OR closed_at IS NOT NULL), ADD CHECK(expected_end_on IS NULL OR expected_start_on IS NULL OR expected_end_on >= expected_start_on);
ALTER TABLE public_pages ADD CHECK(status <> 'PUBLISHED' OR published_at IS NOT NULL);
ALTER TABLE export_jobs ADD CHECK(status <> 'COMPLETED' OR output_document_version_id IS NOT NULL);
ALTER TABLE request_activities ADD CHECK((actor_type='USER')=(actor_user_id IS NOT NULL));
ALTER TABLE audit_events ADD CHECK((actor_type='USER')=(actor_user_id IS NOT NULL));
ALTER TABLE availabilities ADD CHECK(hours_per_week BETWEEN 0 AND 168), ADD CHECK(ends_on IS NULL OR ends_on >= starts_on);
ALTER TABLE placements ADD CHECK(ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on), ADD CHECK(actual_end_on IS NULL OR starts_on IS NULL OR actual_end_on >= starts_on);
ALTER TABLE offer_versions ADD CHECK(ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on), ADD CHECK(compensation_amount >= 0), ADD CHECK(currency IS NULL OR currency ~ '^[A-Z]{3}$'), ADD CHECK(rate_basis <> 'OTHER' OR NULLIF(trim(rate_basis_detail),'') IS NOT NULL), ADD CHECK(issued_at IS NULL OR (NULLIF(trim(role_title),'') IS NOT NULL AND NULLIF(trim(scope),'') IS NOT NULL AND NULLIF(trim(payment_terms),'') IS NOT NULL AND NULLIF(trim(terms),'') IS NOT NULL AND NULLIF(trim(payer_name_snapshot),'') IS NOT NULL AND compensation_amount IS NOT NULL AND currency IS NOT NULL AND rate_basis IS NOT NULL AND payer_type IS NOT NULL AND expires_at IS NOT NULL AND expires_at > issued_at AND issued_by_user_id IS NOT NULL AND terms_hash IS NOT NULL));
ALTER TABLE offer_responses ADD CHECK(channel='PORTAL' OR NULLIF(trim(evidence_summary),'') IS NOT NULL);
ALTER TABLE consent_records ADD CHECK(channel <> 'STAFF_RECORDED' OR (recorded_by_user_id IS NOT NULL AND NULLIF(trim(evidence_summary),'') IS NOT NULL));
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE availabilities ADD CONSTRAINT no_overlapping_availability EXCLUDE USING gist(expert_profile_id WITH =, daterange(starts_on,ends_on,'[]') WITH &&);
-- Maintain counters for every SQL write, not just Eloquent writes.
CREATE FUNCTION maintain_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=clock_timestamp(); NEW.record_version=OLD.record_version+1; RETURN NEW; END $$;
DO $$ DECLARE t record; c record; BEGIN
 FOR t IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='record_version' AND table_name <> 'audit_events' LOOP
  EXECUTE format('ALTER TABLE %I ADD CHECK(record_version > 0)',t.table_name);
  EXECUTE format('CREATE TRIGGER maintain_record BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION maintain_record()',t.table_name);
 END LOOP;
 FOR c IN SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('version_no','decision_no','attempt_no','headcount') LOOP EXECUTE format('ALTER TABLE %I ADD CHECK(%I > 0)',c.table_name,c.column_name); END LOOP;
 FOR c IN SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('years_experience','size_bytes','publish_attempts') LOOP EXECUTE format('ALTER TABLE %I ADD CHECK(%I >= 0)',c.table_name,c.column_name); END LOOP;
END $$;
CREATE FUNCTION immutable_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Historical evidence is append-only' USING ERRCODE='23514'; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['offer_responses','selection_decisions','expert_reviews','consent_records','request_activities','outreach_records','audit_events','offer_response_evidence'] LOOP EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION immutable_history()',t); END LOOP; END $$;
CREATE FUNCTION protect_offer_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Offer versions cannot be deleted' USING ERRCODE='23514'; END IF;
 IF OLD.issued_at IS NOT NULL AND (to_jsonb(NEW)-ARRAY['status','updated_at','record_version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','updated_at','record_version']) THEN RAISE EXCEPTION 'Issued terms are immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_offer_version BEFORE UPDATE OR DELETE ON offer_versions FOR EACH ROW EXECUTE FUNCTION protect_offer_version();
CREATE FUNCTION protect_offer_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM offer_versions WHERE offer_id=OLD.id AND issued_at IS NOT NULL) AND ROW(NEW.request_id,NEW.expert_profile_id,NEW.candidate_id,NEW.request_role_id) IS DISTINCT FROM ROW(OLD.request_id,OLD.expert_profile_id,OLD.candidate_id,OLD.request_role_id) THEN RAISE EXCEPTION 'Issued offer identity is frozen' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER protect_offer_identity BEFORE UPDATE ON expert_offers FOR EACH ROW EXECUTE FUNCTION protect_offer_identity();
CREATE FUNCTION guard_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 PERFORM 1 FROM expert_offers WHERE id=NEW.offer_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM placements WHERE offer_id=NEW.offer_id) THEN RAISE EXCEPTION 'Placement freezes the offer cycle' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER guard_revision BEFORE INSERT ON offer_versions FOR EACH ROW EXECUTE FUNCTION guard_revision();
CREATE FUNCTION protect_attachment() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE v uuid; BEGIN
 v=CASE WHEN TG_OP='DELETE' THEN OLD.offer_version_id ELSE NEW.offer_version_id END;
 PERFORM 1 FROM offer_versions WHERE id=v FOR UPDATE;
 IF EXISTS(SELECT 1 FROM offer_versions WHERE id=v AND issued_at IS NOT NULL) OR (TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM offer_versions WHERE id=OLD.offer_version_id AND issued_at IS NOT NULL)) THEN RAISE EXCEPTION 'Issued attachments are immutable' USING ERRCODE='23514'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER protect_attachment BEFORE INSERT OR UPDATE OR DELETE ON offer_documents FOR EACH ROW EXECUTE FUNCTION protect_attachment();
CREATE FUNCTION protect_snapshots() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME='company_requests' THEN
  IF ROW(NEW.submission_snapshot,NEW.submitted_company_name,NEW.submitted_contact_name,NEW.submitted_email,NEW.submitted_phone) IS DISTINCT FROM ROW(OLD.submission_snapshot,OLD.submitted_company_name,OLD.submitted_contact_name,OLD.submitted_email,OLD.submitted_phone) THEN RAISE EXCEPTION 'Original submission is immutable' USING ERRCODE='23514'; END IF;
 ELSE
  IF NEW.application_snapshot IS DISTINCT FROM OLD.application_snapshot THEN RAISE EXCEPTION 'Original application is immutable' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER protect_snapshot BEFORE UPDATE ON company_requests FOR EACH ROW EXECUTE FUNCTION protect_snapshots();
CREATE TRIGGER protect_snapshot BEFORE UPDATE ON expert_profiles FOR EACH ROW EXECUTE FUNCTION protect_snapshots();
CREATE FUNCTION protect_document_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'File evidence cannot be deleted' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-ARRAY['scan_status','scanned_at','scan_message']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['scan_status','scanned_at','scan_message']) THEN RAISE EXCEPTION 'File metadata is immutable' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER protect_document_version BEFORE UPDATE OR DELETE ON document_versions FOR EACH ROW EXECUTE FUNCTION protect_document_version();
CREATE FUNCTION minimum_children() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME='expert_offers' AND EXISTS(SELECT 1 FROM expert_offers WHERE id=NEW.id AND (current_version_id IS NULL OR NOT EXISTS(SELECT 1 FROM offer_versions WHERE offer_id=NEW.id))) THEN RAISE EXCEPTION 'Offer requires a current version' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='documents' AND EXISTS(SELECT 1 FROM documents WHERE id=NEW.id) AND NOT EXISTS(SELECT 1 FROM document_versions WHERE document_id=NEW.id) THEN RAISE EXCEPTION 'Document requires a version' USING ERRCODE='23514'; END IF; RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER minimum_offer AFTER INSERT OR UPDATE ON expert_offers DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION minimum_children();
CREATE CONSTRAINT TRIGGER minimum_document AFTER INSERT ON documents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION minimum_children();
-- Defense in depth for direct SQL selection and capacity writes.
CREATE FUNCTION guard_selection() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE o expert_offers; v offer_versions; prev selection_decisions; BEGIN
 SELECT * INTO o FROM expert_offers WHERE id=NEW.offer_id;
 PERFORM 1 FROM company_requests WHERE id=o.request_id FOR UPDATE;
 IF o.request_role_id IS NOT NULL THEN PERFORM 1 FROM request_roles WHERE id=o.request_role_id FOR UPDATE; END IF;
 SELECT * INTO o FROM expert_offers WHERE id=NEW.offer_id FOR UPDATE;
 SELECT * INTO v FROM offer_versions WHERE id=NEW.offer_version_id;
 IF o.current_version_id <> v.id OR v.status <> 'ACCEPTED' OR NOT EXISTS(SELECT 1 FROM offer_responses WHERE id=NEW.accepted_response_id AND offer_version_id=v.id AND response_type='ACCEPTED') THEN RAISE EXCEPTION 'Selection requires current exact acceptance' USING ERRCODE='23514'; END IF;
 SELECT * INTO prev FROM selection_decisions WHERE offer_id=o.id ORDER BY decision_no DESC LIMIT 1;
 IF NEW.decision_no <> COALESCE(prev.decision_no,0)+1 OR NEW.supersedes_decision_id IS DISTINCT FROM prev.id OR trim(NEW.reason)='' THEN RAISE EXCEPTION 'Decision must extend latest history with reason' USING ERRCODE='23514'; END IF;
 IF NEW.decision='SELECTED' AND o.request_role_id IS NOT NULL AND (SELECT count(*) FROM placements p JOIN expert_offers eo ON eo.id=p.offer_id WHERE eo.request_role_id=o.request_role_id AND p.status <> 'CANCELLED') >= (SELECT headcount FROM request_roles WHERE id=o.request_role_id) THEN RAISE EXCEPTION 'Role capacity reached' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER guard_selection BEFORE INSERT ON selection_decisions FOR EACH ROW EXECUTE FUNCTION guard_selection();
CREATE FUNCTION guard_placement() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE role_id uuid; BEGIN
 SELECT request_role_id INTO role_id FROM expert_offers WHERE id=NEW.offer_id;
 PERFORM 1 FROM company_requests WHERE id=NEW.request_id FOR UPDATE;
 IF role_id IS NOT NULL THEN PERFORM 1 FROM request_roles WHERE id=role_id FOR UPDATE; END IF;
 IF NOT EXISTS(SELECT 1 FROM selection_decisions WHERE id=NEW.selection_decision_id AND decision='SELECTED') THEN RAISE EXCEPTION 'Placement requires SELECTED decision' USING ERRCODE='23514'; END IF;
 IF role_id IS NOT NULL AND (SELECT count(*) FROM placements p JOIN expert_offers o ON o.id=p.offer_id WHERE o.request_role_id=role_id AND p.status <> 'CANCELLED') >= (SELECT headcount FROM request_roles WHERE id=role_id) THEN RAISE EXCEPTION 'Role capacity reached' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER guard_placement BEFORE INSERT ON placements FOR EACH ROW EXECUTE FUNCTION guard_placement();
