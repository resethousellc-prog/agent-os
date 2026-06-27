-- PRE-FLIGHT: Ensure trigger_set_updated_at() exists
-- Already exists in staffarmy-prod but create defensively.

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
