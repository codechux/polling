import { createSupabaseServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VoteForm } from '@/components/vote-form'
import { DiscussionThreadList } from '@/components/features/discussions'
import { getDiscussionThreads } from '@/lib/database/actions/discussion-threads'
import { getOptionalUser } from '@/lib/database/actions'
import type { DiscussionThreadWithReplies } from '@/lib/database/types'

interface PollPageProps {
  params: Promise<{
    token: string
  }>
}

interface Poll {
  id: string
  title: string
  description: string | null
  created_at: string
  expires_at: string | null
  creator_id: string
  is_active: boolean
  allow_multiple_votes: boolean
  is_anonymous: boolean
  share_token: string
}

interface PollOption {
  id: string
  poll_id: string
  text: string
  order_index: number
  vote_count: number
}

interface Vote {
  id: string
  poll_id: string
  option_id: string
  voter_id: string | null
  created_at: string
}

export default async function PollPage({ params }: PollPageProps) {
  const { token } = await params
  const supabase = await createSupabaseServerClient()
  
  // Get current user (optional - for discussion threads)
  const user = await getOptionalUser()
  
  // Get poll by share token
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('*')
    .eq('share_token', token)
    .single()

  if (pollError || !poll) {
    notFound()
  }

  // Get poll options
  const { data: options, error: optionsError } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', poll.id)
    .order('order_index')

  if (optionsError) {
    throw new Error('Failed to load poll options')
  }

  // Get vote counts for all options in a single query (optimized)
  const { data: voteCounts } = await supabase
    .from('votes')
    .select('option_id')
    .in('option_id', (options || []).map(o => o.id))
  
  // Create vote count map
  const voteCountMap = (voteCounts || []).reduce((acc, vote) => {
    acc[vote.option_id] = (acc[vote.option_id] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Add vote counts to options
  const optionsWithCounts = (options || []).map(option => ({
    ...option,
    vote_count: voteCountMap[option.id] || 0
  }))

  const totalVotes = optionsWithCounts.reduce((sum, option) => sum + option.vote_count, 0)

  // Check if poll is expired
  const isExpired = poll.expires_at ? new Date(poll.expires_at) < new Date() : false
  const canVote = poll.is_active && !isExpired

  // Get discussion threads for this poll
  let discussionThreads: DiscussionThreadWithReplies[] = []
  try {
    discussionThreads = await getDiscussionThreads(poll.id)
  } catch (error) {
    console.error('Error loading discussion threads:', error)
    // Continue without discussions if there's an error
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 px-4 max-w-4xl">
      <div className="space-y-6 sm:space-y-8">
        {/* Poll Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-xl sm:text-2xl">{poll.title}</CardTitle>
            {poll.description && (
              <CardDescription className="text-sm sm:text-base">{poll.description}</CardDescription>
            )}
            <div className="text-xs sm:text-sm text-muted-foreground flex flex-col sm:flex-row gap-1 sm:gap-4">
              <span>Total votes: {totalVotes}</span>
              {poll.expires_at && (
                <span>
                  Expires: {new Date(poll.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {canVote ? (
              <VoteForm 
                pollId={poll.id}
                shareToken={poll.share_token}
                options={optionsWithCounts}
                allowMultipleVotes={poll.allow_multiple_votes}
              />
            ) : (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center text-sm sm:text-base text-muted-foreground">
                  {isExpired ? 'This poll has expired' : 'This poll is not active'}
                </div>
                
                {/* Show results */}
                <div className="space-y-3 sm:space-y-4">
                  {optionsWithCounts.map((option) => {
                    const percentage = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0
                    return (
                      <div key={option.id} className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                          <span className="text-sm sm:text-base font-medium">{option.text}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {option.vote_count} votes ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                          <div
                            className="bg-blue-600 h-2 sm:h-3 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Discussion Threads */}
        <div className="max-w-2xl mx-auto">
          <DiscussionThreadList
            pollId={poll.id}
            currentUserId={user?.id}
            initialThreads={discussionThreads}
            showForm={true}
          />
        </div>
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: PollPageProps) {
  const { token } = await params
  const supabase = await createSupabaseServerClient()
  
  const { data: poll } = await supabase
    .from('polls')
    .select('title, description')
    .eq('share_token', token)
    .single()

  return {
    title: poll?.title ? `${poll.title} - Poll` : 'Poll',
    description: poll?.description || 'Vote on this poll'
  }
}