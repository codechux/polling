-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (length(title) > 0 AND length(title) <= 200),
    description TEXT CHECK (length(description) <= 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    allow_multiple_votes BOOLEAN NOT NULL DEFAULT false,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'base64url')
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_polls_creator_id ON polls(creator_id);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON polls(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_polls_is_active ON polls(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_polls_share_token ON polls(share_token);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_polls_updated_at
    BEFORE UPDATE ON polls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure expires_at is in the future when set
ALTER TABLE polls ADD CONSTRAINT check_expires_at_future 
    CHECK (expires_at IS NULL OR expires_at > created_at);

-- Add comment to the table
COMMENT ON TABLE polls IS 'Stores poll information including title, description, and settings';
COMMENT ON COLUMN polls.share_token IS 'Unique token used for sharing polls via URL and QR codes';
COMMENT ON COLUMN polls.allow_multiple_votes IS 'Whether users can vote for multiple options in this poll';
COMMENT ON COLUMN polls.is_anonymous IS 'Whether votes are recorded anonymously (no user ID stored)';