-- MIGRATION 016 — allow loop-level improvements (Session 9)
-- Session 9's improvement worker inserts improvements for interaction loops with
-- workflow_id = NULL (loop_id is carried in the suggestions payload). The original
-- improvements.workflow_id is NOT NULL, which would reject those rows. Relax it.

ALTER TABLE improvements ALTER COLUMN workflow_id DROP NOT NULL;
