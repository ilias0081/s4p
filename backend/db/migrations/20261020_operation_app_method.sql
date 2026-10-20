BEGIN;

ALTER TABLE s4p.operations
  ADD COLUMN app_id uuid REFERENCES s4p.apps(id),
  ADD COLUMN app_method text;

COMMIT;
