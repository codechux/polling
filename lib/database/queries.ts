import { createSupabaseServerClient } from '@/lib/supabase'
import type { Poll, PollOption } from './types'
import { PollService, VoteService } from './services'
import type { PollWithOptions, PollWithResults, UserPollSummary } from '../types/poll'

// Query functions
export async function getPollByShareToken(shareToken: string): Promise<PollWithOptions | null> {
  try {
    return await PollService.findByShareToken(shareToken)
  } catch (error) {
    console.error('Error in getPollByShareToken:', error)
    return null
  }
}

export async function getPollWithResults(shareToken: string): Promise<PollWithResults | null> {
  try {
    return await PollService.findWithResults(shareToken)
  } catch (error) {
    console.error('Error in getPollWithResults:', error)
    return null
  }
}

export async function getUserPolls(userId: string): Promise<UserPollSummary[]> {
  try {
    return await PollService.findByUserId(userId)
  } catch (error) {
    console.error('Error in getUserPolls:', error)
    return []
  }
}

export async function getRecentPolls(limit: number = 10): Promise<PollWithOptions[]> {
  try {
    return await PollService.getRecentPolls(limit)
  } catch (error) {
    console.error('Error in getRecentPolls:', error)
    return []
  }
}

export async function checkUserVoted(pollId: string, userId?: string, voterIp?: string): Promise<boolean> {
  try {
    return await VoteService.hasUserVoted(pollId, userId, voterIp)
  } catch (error) {
    console.error('Error in checkUserVoted:', error)
    return false
  }
}

export async function getPollStats(pollId: string) {
  try {
    return await PollService.getStats(pollId)
  } catch (error) {
    console.error('Error in getPollStats:', error)
    return {
      poll: null,
      totalVotes: 0,
      votesOverTime: []
    }
  }
}