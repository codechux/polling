import { createSupabaseServerClient } from '@/lib/supabase'
import type { Vote, VoteInsert } from '../types'

export class VoteService {
  private static async getSupabaseClient() {
    return await createSupabaseServerClient()
  }

  static async create(voteData: VoteInsert): Promise<Vote> {
    const supabase = await this.getSupabaseClient()
    
    const { data, error } = await supabase
      .from('votes')
      .insert(voteData)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create vote: ${error.message}`)
    }
    
    return data
  }

  static async findByPollAndUser(pollId: string, userId?: string, voterIp?: string): Promise<Vote[]> {
    const supabase = await this.getSupabaseClient()
    
    let query = supabase
      .from('votes')
      .select('*')
      .eq('poll_id', pollId)
    
    if (userId) {
      query = query.eq('voter_id', userId)
    } else if (voterIp) {
      query = query.eq('voter_ip', voterIp)
    } else {
      return [] // No identifier provided
    }
    
    const { data, error } = await query
    
    if (error) {
      throw new Error(`Failed to fetch votes: ${error.message}`)
    }
    
    return data || []
  }

  static async hasUserVoted(pollId: string, userId?: string, voterIp?: string): Promise<boolean> {
    const votes = await this.findByPollAndUser(pollId, userId, voterIp)
    return votes.length > 0
  }

  static async deleteByPollAndUser(pollId: string, userId?: string, voterIp?: string): Promise<void> {
    const supabase = await this.getSupabaseClient()
    
    let query = supabase
      .from('votes')
      .delete()
      .eq('poll_id', pollId)
    
    if (userId) {
      query = query.eq('voter_id', userId)
    } else if (voterIp) {
      query = query.eq('voter_ip', voterIp)
    } else {
      throw new Error('Either userId or voterIp must be provided')
    }
    
    const { error } = await query
    
    if (error) {
      throw new Error(`Failed to delete votes: ${error.message}`)
    }
  }

  static async getVoteCountsByOption(pollId: string): Promise<Record<string, number>> {
    const supabase = await this.getSupabaseClient()
    
    const { data: votes, error } = await supabase
      .from('votes')
      .select('option_id')
      .eq('poll_id', pollId)
    
    if (error) {
      throw new Error(`Failed to fetch vote counts: ${error.message}`)
    }
    
    const voteCountMap: Record<string, number> = votes.reduce((acc, vote) => {
      acc[vote.option_id] = (acc[vote.option_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return voteCountMap
  }

  static async getTotalVotes(pollId: string): Promise<number> {
    const supabase = await this.getSupabaseClient()
    
    const { count, error } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('poll_id', pollId)
    
    if (error) {
      throw new Error(`Failed to count votes: ${error.message}`)
    }
    
    return count || 0
  }

  static async getUniqueVoters(pollId: string): Promise<{ userVoters: number; anonymousVoters: number }> {
    const supabase = await this.getSupabaseClient()
    
    // Count unique user voters
    const { data: userVotes, error: userError } = await supabase
      .from('votes')
      .select('voter_id')
      .eq('poll_id', pollId)
      .not('voter_id', 'is', null)
    
    if (userError) {
      throw new Error(`Failed to count user votes: ${userError.message}`)
    }
    
    // Count unique anonymous voters (by voter_ip)
    const { data: anonymousVotes, error: anonymousError } = await supabase
      .from('votes')
      .select('voter_ip')
      .eq('poll_id', pollId)
      .is('voter_id', null)
      .not('voter_ip', 'is', null)
    
    if (anonymousError) {
      throw new Error(`Failed to count anonymous votes: ${anonymousError.message}`)
    }
    
    const uniqueUsers = new Set(userVotes.map(v => v.voter_id)).size
    const uniqueAnonymous = new Set(anonymousVotes.map(v => v.voter_ip)).size
    
    return {
      userVoters: uniqueUsers,
      anonymousVoters: uniqueAnonymous
    }
  }
}