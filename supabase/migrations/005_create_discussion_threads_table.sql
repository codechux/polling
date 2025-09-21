-- Create discussion_threads table for poll discussions
CREATE TABLE IF NOT EXISTS discussion_threads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES discussion_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT discussion_threads_content_length CHECK (length(trim(content)) > 0),
    CONSTRAINT discussion_threads_no_self_parent CHECK (id != parent_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_discussion_threads_poll_id ON discussion_threads(poll_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_parent_id ON discussion_threads(parent_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_user_id ON discussion_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_created_at ON discussion_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_threads_poll_created ON discussion_threads(poll_id, created_at DESC);

-- Create composite index for efficient thread queries
CREATE INDEX IF NOT EXISTS idx_discussion_threads_poll_parent_created 
ON discussion_threads(poll_id, parent_id, created_at DESC) 
WHERE is_deleted = FALSE;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_discussion_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_discussion_threads_updated_at
    BEFORE UPDATE ON discussion_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_discussion_threads_updated_at();

-- Enable Row Level Security
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discussion_threads

-- Policy: Users can view all non-deleted discussion threads
CREATE POLICY "Users can view discussion threads" ON discussion_threads
    FOR SELECT
    USING (is_deleted = FALSE);

-- Policy: Authenticated users can create discussion threads
CREATE POLICY "Authenticated users can create discussion threads" ON discussion_threads
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND user_id = auth.uid()
        AND is_deleted = FALSE
    );

-- Policy: Users can update their own discussion threads (content only)
CREATE POLICY "Users can update own discussion threads" ON discussion_threads
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() 
        AND is_deleted = FALSE
    );

-- Policy: Users can soft delete their own discussion threads
CREATE POLICY "Users can delete own discussion threads" ON discussion_threads
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND is_deleted = TRUE
    );

-- Create a view for discussion threads with user information
CREATE OR REPLACE VIEW discussion_threads_with_users AS
SELECT 
    dt.id,
    dt.poll_id,
    dt.parent_id,
    dt.user_id,
    dt.content,
    dt.created_at,
    dt.updated_at,
    dt.is_deleted,
    -- User profile information (from auth.users metadata)
    COALESCE(
        (au.raw_user_meta_data->>'full_name')::text,
        (au.raw_user_meta_data->>'name')::text,
        split_part(au.email, '@', 1)
    ) as user_name,
    au.email as user_email,
    (au.raw_user_meta_data->>'avatar_url')::text as user_avatar_url
FROM discussion_threads dt
JOIN auth.users au ON dt.user_id = au.id
WHERE dt.is_deleted = FALSE;

-- Grant permissions on the view
GRANT SELECT ON discussion_threads_with_users TO authenticated;

-- Add comment to document the table
COMMENT ON TABLE discussion_threads IS 'Stores threaded discussion comments for polls with nested reply support';
COMMENT ON COLUMN discussion_threads.poll_id IS 'Reference to the poll this discussion thread belongs to';
COMMENT ON COLUMN discussion_threads.parent_id IS 'Reference to parent comment for nested replies (NULL for top-level comments)';
COMMENT ON COLUMN discussion_threads.content IS 'The discussion thread content (max 2000 characters)';
COMMENT ON COLUMN discussion_threads.is_deleted IS 'Soft delete flag to preserve thread structure';