import { createSupabaseServerClient } from '../supabase'
import type { Poll, PollOption, Vote } from './types'

// Extended types for queries with joined data
export type PollWithOptions = Poll & {
  poll_options: PollOption[]
  vote_count?: number
}

export type PollWithResults = Poll & {
  poll_options: (PollOption & {
    vote_count: number
  })[]
  total_votes: number
}

export type UserPollSummary = {
  id: string
  title: string
  created_at: string
  expires_at: string | null
  is_active: boolean
  total_votes: number
  share_token: string
}

// Query functions
export async function getPollByShareToken(shareToken: string): Promise<PollWithOptions | null> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: poll, error } = await supabase
      .from('polls')
      .select(`
        *,
        poll_options (
          id,
          text,
          order_index,
          created_at
        )
      `)
      .eq('share_token', shareToken)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error fetching poll by share token:', error)
      return null
    }

    return poll as PollWithOptions
  } catch (error) {
    console.error('Error in getPollByShareToken:', error)
    return null
  }
}

export async function getPollWithResults(shareToken: string): Promise<PollWithResults | null> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // First get the poll with options
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select(`
        *,
        poll_options (
          id,
          text,
          order_index,
          created_at
        )
      `)
      .eq('share_token', shareToken)
      .single()

    if (pollError || !poll) {
      console.error('Error fetching poll:', pollError)
      return null
    }

    // Get vote counts for each option
    const { data: voteCounts, error: voteError } = await supabase
      .from('votes')
      .select('option_id')
      .eq('poll_id', poll.id)

    if (voteError) {
      console.error('Error fetching vote counts:', voteError)
      return null
    }

    // Count votes per option
    const voteCountMap = voteCounts.reduce((acc, vote) => {
      acc[vote.option_id] = (acc[vote.option_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Add vote counts to options
    const optionsWithCounts = poll.poll_options.map(option => ({
      ...option,
      vote_count: voteCountMap[option.id] || 0
    }))

    const totalVotes = voteCounts.length

    return {
      ...poll,
      poll_options: optionsWithCounts,
      total_votes: totalVotes
    } as PollWithResults
  } catch (error) {
    console.error('Error in getPollWithResults:', error)
    return null
  }
}

export async function getUserPolls(userId: string): Promise<UserPollSummary[]> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: polls, error } = await supabase
      .from('polls')
      .select(`
        id,
        title,
        created_at,
        expires_at,
        is_active,
        share_token
      `)
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user polls:', error)
      return []
    }

    // Get vote counts for each poll
    const pollsWithCounts = await Promise.all(
      polls.map(async (poll) => {
        const { count } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('poll_id', poll.id)

        return {
          ...poll,
          total_votes: count || 0
        }
      })
    )

    return pollsWithCounts
  } catch (error) {
    console.error('Error in getUserPolls:', error)
    return []
  }
}

export async function getRecentPolls(limit: number = 10): Promise<PollWithOptions[]> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: polls, error } = await supabase
      .from('polls')
      .select(`
        *,
        poll_options (
          id,
          text,
          order_index,
          created_at
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent polls:', error)
      return []
    }

    return polls as PollWithOptions[]
  } catch (error) {
    console.error('Error in getRecentPolls:', error)
    return []
  }
}

export async function checkUserVoted(pollId: string, userId?: string, voterIp?: string): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient()
    
    let query = supabase
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('poll_id', pollId)

    if (userId) {
      query = query.eq('voter_id', userId)
    } else if (voterIp) {
      query = query.eq('voter_ip', voterIp)
    } else {
      return false
    }

    const { count, error } = await query

    if (error) {
      console.error('Error checking if user voted:', error)
      return false
    }

    return (count || 0) > 0
  } catch (error) {
    console.error('Error in checkUserVoted:', error)
    return false
  }
}

export async function getPollStats(pollId: string) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get total votes
    const { count: totalVotes } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('poll_id', pollId)

    // Get unique voters (for authenticated votes)
    const { count: uniqueVoters } = await supabase
      .from('votes')
      .select('voter_id', { count: 'exact', head: true })
      .eq('poll_id', pollId)
      .not('voter_id', 'is', null)

    // Get votes over time (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: recentVotes } = await supabase
      .from('votes')
      .select('created_at')
      .eq('poll_id', pollId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    return {
      totalVotes: totalVotes || 0,
      uniqueVoters: uniqueVoters || 0,
      recentVotes: recentVotes || []
    }
  } catch (error) {
    console.error('Error in getPollStats:', error)
    return {
      totalVotes: 0,
      uniqueVoters: 0,
      recentVotes: []
    }
  }
}