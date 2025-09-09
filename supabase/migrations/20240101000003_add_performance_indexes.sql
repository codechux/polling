-- Add performance indexes for optimized queries

-- Index for polls table - frequently queried columns
CREATE INDEX IF NOT EXISTS idx_polls_created_by_created_at 
ON polls(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_polls_is_active_created_at 
ON polls(is_active, created_at DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_polls_share_token 
ON polls(share_token) 
WHERE share_token IS NOT NULL;

-- Index for votes table - for aggregation queries
CREATE INDEX IF NOT EXISTS idx_votes_poll_id 
ON votes(poll_id);

CREATE INDEX IF NOT EXISTS idx_votes_option_id 
ON votes(option_id);

-- Index for poll_options table
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id_order 
ON poll_options(poll_id, order_index);

-- Composite index for user authentication queries
CREATE INDEX IF NOT EXISTS idx_polls_created_by_is_active 
ON polls(created_by, is_active);

-- Add comments for documentation
COMMENT ON INDEX idx_polls_created_by_created_at IS 'Optimizes getUserPolls query';
COMMENT ON INDEX idx_polls_is_active_created_at IS 'Optimizes getRecentPolls query';
COMMENT ON INDEX idx_polls_share_token IS 'Optimizes findByShareToken and findWithResults queries';
COMMENT ON INDEX idx_votes_poll_id IS 'Optimizes vote count aggregation queries';
COMMENT ON INDEX idx_votes_option_id IS 'Optimizes vote count by option queries';
COMMENT ON INDEX idx_poll_options_poll_id_order IS 'Optimizes poll options retrieval with proper ordering';
COMMENT ON INDEX idx_polls_created_by_is_active IS 'Optimizes user poll filtering queries';