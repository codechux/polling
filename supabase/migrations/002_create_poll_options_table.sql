-- Create poll_options table
CREATE TABLE IF NOT EXISTS poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (length(text) > 0 AND length(text) <= 500),
    order_index INTEGER NOT NULL CHECK (order_index >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_order ON poll_options(poll_id, order_index);

-- Create unique constraint to prevent duplicate order_index within the same poll
CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_options_unique_order 
    ON poll_options(poll_id, order_index);

-- Add constraint to ensure at least 2 options per poll (enforced at application level)
-- This constraint ensures we don't have orphaned options
ALTER TABLE poll_options ADD CONSTRAINT check_valid_order_index 
    CHECK (order_index >= 0 AND order_index < 100);

-- Create function to validate minimum options per poll
CREATE OR REPLACE FUNCTION validate_poll_options_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if poll has at least 2 options after insert/update
    IF (SELECT COUNT(*) FROM poll_options WHERE poll_id = COALESCE(NEW.poll_id, OLD.poll_id)) < 2 THEN
        -- Only raise error on DELETE, not on INSERT (to allow building up options)
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'A poll must have at least 2 options';
        END IF;
    END IF;
    
    -- Check maximum options limit (prevent spam)
    IF (SELECT COUNT(*) FROM poll_options WHERE poll_id = NEW.poll_id) > 20 THEN
        RAISE EXCEPTION 'A poll cannot have more than 20 options';
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers for validation
CREATE TRIGGER validate_poll_options_on_insert
    AFTER INSERT ON poll_options
    FOR EACH ROW
    EXECUTE FUNCTION validate_poll_options_count();

CREATE TRIGGER validate_poll_options_on_delete
    BEFORE DELETE ON poll_options
    FOR EACH ROW
    EXECUTE FUNCTION validate_poll_options_count();

-- Add comments to the table
COMMENT ON TABLE poll_options IS 'Stores individual options for each poll';
COMMENT ON COLUMN poll_options.order_index IS 'Display order of the option within the poll (0-based)';
COMMENT ON COLUMN poll_options.text IS 'The text content of the poll option';