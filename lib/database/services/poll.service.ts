import { createSupabaseServerClient } from '@/lib/supabase'
import type { Poll, PollOption, PollInsert, PollUpdate } from '../types'
import type { PollWithOptions, PollWithResults, UserPollSummary } from '../../types/poll'
import { VoteService } from './vote.service'

export class PollService {
  private static async getSupabaseClient() {
    return await createSupabaseServerClient()
  }

  static async create(pollData: PollInsert): Promise<Poll> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('polls')
      .insert(pollData)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create poll: ${error.message}`)
    }
    
    return data
  }

  static async findById(id: string): Promise<Poll | null> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to fetch poll: ${error.message}`)
    }
    
    return data
  }

  static async findByShareToken(shareToken: string): Promise<PollWithOptions | null> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
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
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to fetch poll: ${error.message}`)
    }
    
    return data as PollWithOptions
  }

  static async findWithResults(shareToken: string): Promise<PollWithResults | null> {
    const supabase = await this.getSupabaseClient()
    
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select(`
        *,
        poll_options (
          id,
          poll_id,
          text,
          order_index,
          created_at
        )
      `)
      .eq('share_token', shareToken)
      .single()
    
    if (pollError) {
      if (pollError.code === 'PGRST116') return null
      throw new Error(`Failed to fetch poll: ${pollError.message}`)
    }
    
    if (!poll) {
      return null
    }

    // Get vote counts for each option using the existing service method
    const voteCountMap = await VoteService.getVoteCountsByOption(poll.id) as Record<string, number>
    
    // Add vote counts to poll options
    const pollWithResults = {
      ...poll,
      poll_options: poll.poll_options?.map(option => ({
        ...option,
        vote_count: voteCountMap[option.id] || 0
      })) || [],
      total_votes: Object.values(voteCountMap).reduce((sum, count) => sum + count, 0)
    }

    return pollWithResults as PollWithResults
  }

  static async findByUserId(userId: string): Promise<UserPollSummary[]> {
    const supabase = await this.getSupabaseClient()
    
    // Optimized query: get polls with vote counts in a single query using aggregation
    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select(`
        id,
        title,
        created_at,
        expires_at,
        is_active,
        share_token,
        votes:votes(count)
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
    
    if (pollsError) {
      throw new Error(`Failed to fetch user polls: ${pollsError.message}`)
    }
    
    // Transform the data to include total_votes
    return polls.map(poll => ({
      id: poll.id,
      title: poll.title,
      created_at: poll.created_at,
      expires_at: poll.expires_at,
      is_active: poll.is_active,
      share_token: poll.share_token,
      total_votes: poll.votes?.[0]?.count || 0
    }))
  }

  static async update(id: string, pollData: PollUpdate): Promise<Poll> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('polls')
      .update(pollData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to update poll: ${error.message}`)
    }
    
    return data
  }

  static async delete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient()
    
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', id)
    
    if (error) {
      throw new Error(`Failed to delete poll: ${error.message}`)
    }
  }

  static async getRecentPolls(limit: number = 10): Promise<PollWithOptions[]> {
    const supabase = await this.getSupabaseClient()
    
    // Optimized query with proper indexing on is_active and created_at
    const { data, error } = await supabase
      .from('polls')
      .select(`
        *,
        poll_options (
          id,
          poll_id,
          text,
          order_index,
          created_at
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      throw new Error(`Failed to fetch recent polls: ${error.message}`)
    }
    
    return data as PollWithOptions[]
  }

  static async getStats(pollId: string) {
    const supabase = await this.getSupabaseClient()
    
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('id', pollId)
      .single()
    
    if (pollError) {
      throw new Error(`Failed to fetch poll: ${pollError.message}`)
    }
    
    const { data: votes, error: voteError } = await supabase
      .from('votes')
      .select('created_at')
      .eq('poll_id', pollId)
    
    if (voteError) {
      throw new Error(`Failed to fetch votes: ${voteError.message}`)
    }
    
    return {
      poll,
      totalVotes: votes.length,
      votesOverTime: votes.map(vote => vote.created_at)
    }
  }
}