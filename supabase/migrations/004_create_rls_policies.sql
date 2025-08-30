-- Enable Row Level Security on all tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLLS TABLE POLICIES
-- =============================================

-- Policy: Users can view all active polls
CREATE POLICY "Anyone can view active polls" ON polls
    FOR SELECT
    USING (is_active = true);

-- Policy: Users can view their own polls (including inactive ones)
CREATE POLICY "Users can view their own polls" ON polls
    FOR SELECT
    USING (auth.uid() = creator_id);

-- Policy: Authenticated users can create polls
CREATE POLICY "Authenticated users can create polls" ON polls
    FOR INSERT
    WITH CHECK (auth.uid() = creator_id AND auth.uid() IS NOT NULL);

-- Policy: Users can update their own polls
CREATE POLICY "Users can update their own polls" ON polls
    FOR UPDATE
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- Policy: Users can delete their own polls
CREATE POLICY "Users can delete their own polls" ON polls
    FOR DELETE
    USING (auth.uid() = creator_id);

-- =============================================
-- POLL_OPTIONS TABLE POLICIES
-- =============================================

-- Policy: Anyone can view options for active polls
CREATE POLICY "Anyone can view options for active polls" ON poll_options
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_options.poll_id 
            AND polls.is_active = true
        )
    );

-- Policy: Users can view options for their own polls
CREATE POLICY "Users can view options for their own polls" ON poll_options
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_options.poll_id 
            AND polls.creator_id = auth.uid()
        )
    );

-- Policy: Users can create options for their own polls
CREATE POLICY "Users can create options for their own polls" ON poll_options
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_options.poll_id 
            AND polls.creator_id = auth.uid()
        )
    );

-- Policy: Users can update options for their own polls
CREATE POLICY "Users can update options for their own polls" ON poll_options
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_options.poll_id 
            AND polls.creator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_options.poll_id 
            AND polls.creator_id = auth.uid()
        )
    );

-- Policy: Users can delete options for their own polls
CREATE POLICY "Users can delete options for their own polls" ON poll_options
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_options.poll_id 
            AND polls.creator_id = auth.uid()
        )
    );

-- =============================================
-- VOTES TABLE POLICIES
-- =============================================

-- Policy: Anyone can view vote counts (aggregated data)
-- Note: This allows viewing votes but applications should aggregate them
CREATE POLICY "Anyone can view votes for active polls" ON votes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = votes.poll_id 
            AND polls.is_active = true
        )
    );

-- Policy: Poll creators can view all votes for their polls
CREATE POLICY "Poll creators can view votes for their polls" ON votes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = votes.poll_id 
            AND polls.creator_id = auth.uid()
        )
    );

-- Policy: Users can view their own votes
CREATE POLICY "Users can view their own votes" ON votes
    FOR SELECT
    USING (auth.uid() = voter_id);

-- Policy: Anyone can vote on active polls (authenticated or anonymous)
CREATE POLICY "Anyone can vote on active polls" ON votes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = votes.poll_id 
            AND polls.is_active = true
            AND (polls.expires_at IS NULL OR polls.expires_at > NOW())
        )
    );

-- Policy: Users can delete their own votes (for polls that allow vote changes)
CREATE POLICY "Users can delete their own votes" ON votes
    FOR DELETE
    USING (
        auth.uid() = voter_id
        AND EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = votes.poll_id 
            AND polls.is_active = true
        )
    );

-- Policy: Poll creators can delete votes from their polls (moderation)
CREATE POLICY "Poll creators can delete votes from their polls" ON votes
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = votes.poll_id 
            AND polls.creator_id = auth.uid()
        )
    );

-- =============================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =============================================

-- Function to check if a user can access a poll via share token
CREATE OR REPLACE FUNCTION can_access_poll_by_token(poll_share_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM polls 
        WHERE share_token = poll_share_token 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION can_access_poll_by_token(TEXT) TO authenticated, anon;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON POLICY "Anyone can view active polls" ON polls IS 
    'Allows public access to view active polls for voting and sharing';

COMMENT ON POLICY "Anyone can vote on active polls" ON votes IS 
    'Allows both authenticated and anonymous users to vote on active polls';

COMMENT ON FUNCTION can_access_poll_by_token(TEXT) IS 
    'Security function to validate poll access via share token for QR code sharing';