import { createSupabaseServerClient } from '@/lib/supabase'
import type { Poll, PollOption } from './types'
import { PollService, VoteService } from './services'
import type { PollWithOptions, PollWithResults, UserPollSummary } from '../types/poll'

/**
 * Retrieve a poll (including its options) by its share token.
 *
 * @param shareToken - Public share token that identifies the poll
 * @returns The poll with its options, or `null` if the poll is not found or an error occurs
 */
export async function getPollByShareToken(shareToken: string): Promise<PollWithOptions | null> {
  try {
    return await PollService.findByShareToken(shareToken)
  } catch (error) {
    console.error('Error in getPollByShareToken:', error)
    return null
  }
}

/**
 * Retrieve a poll (including its options and vote counts) by its share token.
 *
 * @param shareToken - Public share token that identifies the poll
 * @returns The PollWithResults for the given token, or `null` if not found or an error occurs
 */
export async function getPollWithResults(shareToken: string): Promise<PollWithResults | null> {
  try {
    return await PollService.findWithResults(shareToken)
  } catch (error) {
    console.error('Error in getPollWithResults:', error)
    return null
  }
}

/**
 * Fetches a summary list of polls created by the specified user.
 *
 * Returns an array of UserPollSummary for the given userId. If an error occurs while retrieving data, an empty array is returned.
 *
 * @param userId - ID of the user whose polls should be retrieved
 * @returns A promise that resolves to an array of UserPollSummary (empty on error)
 */
export async function getUserPolls(userId: string): Promise<UserPollSummary[]> {
  try {
    return await PollService.findByUserId(userId)
  } catch (error) {
    console.error('Error in getUserPolls:', error)
    return []
  }
}

/**
 * Fetches the most recently created polls, including their options.
 *
 * @param limit - Maximum number of polls to return. Defaults to `10`.
 * @returns An array of `PollWithOptions` ordered by recency. Returns an empty array on error.
 */
export async function getRecentPolls(limit: number = 10): Promise<PollWithOptions[]> {
  try {
    return await PollService.getRecentPolls(limit)
  } catch (error) {
    console.error('Error in getRecentPolls:', error)
    return []
  }
}

/**
 * Returns whether a given user (or IP) has already voted in a poll.
 *
 * @param pollId - The poll's unique identifier.
 * @param userId - Optional authenticated user ID to check for an existing vote.
 * @param voterIp - Optional voter IP to check for an existing vote when `userId` is not available.
 * @returns `true` if a vote exists for the provided `userId` or `voterIp` in the poll; otherwise `false`.
 */
export async function checkUserVoted(pollId: string, userId?: string, voterIp?: string): Promise<boolean> {
  try {
    return await VoteService.hasUserVoted(pollId, userId, voterIp)
  } catch (error) {
    console.error('Error in checkUserVoted:', error)
    return false
  }
}

/**
 * Fetch aggregated statistics for a poll.
 *
 * Calls PollService.getStats(pollId) and returns the service result. On error it returns a safe default:
 * `{ poll: null, totalVotes: 0, votesOverTime: [] }`.
 *
 * @param pollId - Identifier of the poll to retrieve statistics for.
 * @returns An object with `poll` (the poll data or `null`), `totalVotes` (number), and `votesOverTime` (array, empty on error).
 */
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