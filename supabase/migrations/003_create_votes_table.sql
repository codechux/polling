-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    voter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    voter_ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_option_id ON votes(option_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id) WHERE voter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_voter_ip ON votes(voter_ip) WHERE voter_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at DESC);

-- Create composite index for vote counting
CREATE INDEX IF NOT EXISTS idx_votes_poll_option ON votes(poll_id, option_id);

-- Add constraint to ensure either voter_id or voter_ip is provided (for anonymous votes)
ALTER TABLE votes ADD CONSTRAINT check_voter_identification 
    CHECK (voter_id IS NOT NULL OR voter_ip IS NOT NULL);

-- Add constraint to ensure option belongs to the poll
CREATE OR REPLACE FUNCTION validate_option_belongs_to_poll()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the option belongs to the specified poll
    IF NOT EXISTS (
        SELECT 1 FROM poll_options 
        WHERE id = NEW.option_id AND poll_id = NEW.poll_id
    ) THEN
        RAISE EXCEPTION 'Option does not belong to the specified poll';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_vote_option_poll
    BEFORE INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION validate_option_belongs_to_poll();

-- Create function to prevent duplicate votes (unless poll allows multiple votes)
CREATE OR REPLACE FUNCTION prevent_duplicate_votes()
RETURNS TRIGGER AS $$
DECLARE
    poll_allows_multiple BOOLEAN;
    existing_vote_count INTEGER;
BEGIN
    -- Get poll settings
    SELECT allow_multiple_votes INTO poll_allows_multiple
    FROM polls WHERE id = NEW.poll_id;
    
    -- If poll doesn't allow multiple votes, check for existing votes
    IF NOT poll_allows_multiple THEN
        -- Check for existing votes by this voter
        IF NEW.voter_id IS NOT NULL THEN
            SELECT COUNT(*) INTO existing_vote_count
            FROM votes 
            WHERE poll_id = NEW.poll_id AND voter_id = NEW.voter_id;
        ELSE
            -- For anonymous votes, check by IP
            SELECT COUNT(*) INTO existing_vote_count
            FROM votes 
            WHERE poll_id = NEW.poll_id AND voter_ip = NEW.voter_ip;
        END IF;
        
        IF existing_vote_count > 0 THEN
            RAISE EXCEPTION 'You have already voted in this poll';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER prevent_duplicate_votes_trigger
    BEFORE INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_votes();

-- Create function to check if poll is still active and not expired
CREATE OR REPLACE FUNCTION validate_poll_active()
RETURNS TRIGGER AS $$
DECLARE
    poll_record RECORD;
BEGIN
    -- Get poll information
    SELECT is_active, expires_at INTO poll_record
    FROM polls WHERE id = NEW.poll_id;
    
    -- Check if poll is active
    IF NOT poll_record.is_active THEN
        RAISE EXCEPTION 'This poll is no longer active';
    END IF;
    
    -- Check if poll has expired
    IF poll_record.expires_at IS NOT NULL AND poll_record.expires_at < NOW() THEN
        RAISE EXCEPTION 'This poll has expired';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER validate_poll_active_trigger
    BEFORE INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION validate_poll_active();

-- Add comments to the table
COMMENT ON TABLE votes IS 'Stores individual votes for poll options';
COMMENT ON COLUMN votes.voter_id IS 'ID of authenticated user who voted (NULL for anonymous votes)';
COMMENT ON COLUMN votes.voter_ip IS 'IP address of voter (used for anonymous vote tracking and spam prevention)';
COMMENT ON COLUMN votes.poll_id IS 'Reference to the poll being voted on';
COMMENT ON COLUMN votes.option_id IS 'Reference to the specific option being voted for';