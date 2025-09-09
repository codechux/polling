import { createSupabaseServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VoteForm } from '@/components/vote-form'

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

/**
 * Server-side React page that renders a poll by its share token.
 *
 * Fetches the poll (by `params.token`) and its options and vote records from the database,
 * aggregates vote counts per option, and renders either a voting form (if the poll is active
 * and not expired) or the poll results with percentages and progress bars.
 *
 * If the poll is not found or an error occurs while loading the poll, this function calls
 * `notFound()` (producing a 404). If loading poll options fails, it throws `Error('Failed to load poll options')`.
 *
 * @param params - A promise-resolved object containing `token`, the poll's share token used to look up the poll.
 */
export default async function PollPage({ params }: PollPageProps) {
  const { token } = await params
  const supabase = await createSupabaseServerClient()
  
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

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{poll.title}</CardTitle>
          {poll.description && (
            <CardDescription>{poll.description}</CardDescription>
          )}
          <div className="text-sm text-muted-foreground">
            Total votes: {totalVotes}
            {poll.expires_at && (
              <span className="ml-4">
                Expires: {new Date(poll.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {canVote ? (
            <VoteForm 
              pollId={poll.id}
              shareToken={poll.share_token}
              options={optionsWithCounts}
              allowMultipleVotes={poll.allow_multiple_votes}
            />
          ) : (
            <div className="space-y-4">
              <div className="text-center text-muted-foreground">
                {isExpired ? 'This poll has expired' : 'This poll is not active'}
              </div>
              
              {/* Show results */}
              <div className="space-y-2">
                {optionsWithCounts.map((option) => {
                  const percentage = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0
                  return (
                    <div key={option.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{option.text}</span>
                        <span>{option.vote_count} votes ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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