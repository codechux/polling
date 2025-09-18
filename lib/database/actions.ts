'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase'
import { validateCreatePollData, validateSubmitVoteData, validateUpdatePollData } from './validation'
import { PollService, VoteService, PollOptionService } from './services'
import { withErrorHandling, AppError, ErrorType } from '@/lib/utils/error-handler'

// Types
type AuthenticatedUser = User

// Authentication helper
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new AppError('Authentication required', ErrorType.AUTHENTICATION, 401)
  }
  
  return user
}

// Optional authentication helper (for anonymous operations)
export async function getOptionalUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

// Server Actions
export const createPoll = withErrorHandling(async (formData: FormData) => {
  // Get authenticated user
  const user = await getAuthenticatedUser()
  
  // Validate form data
  const validatedData = validateCreatePollData(formData)
  
  // Generate unique share token
  const shareToken = crypto.randomUUID()
  
  // Create poll using service
  const poll = await PollService.create({
    title: validatedData.title,
    description: validatedData.description || null,
    creator_id: user.id,
    share_token: shareToken,
    expires_at: validatedData.expiresAt?.toISOString() || null,
    allow_multiple_votes: validatedData.allowMultiple,
    is_anonymous: false
  })

  // Create poll options using service
  const optionsData = validatedData.options.map((text: string, index: number) => ({
    poll_id: poll.id,
    text,
    order_index: index
  }))
  
  await PollOptionService.createMany(optionsData)

  revalidatePath('/dashboard')
  redirect(`/polls/${shareToken}`)
})

export const submitVote = withErrorHandling(async (formData: FormData) => {
  // Validate form data
  const validatedData = validateSubmitVoteData(formData)
  
  // Get optional user for authenticated voting
  const user = await getOptionalUser()
  
  // Submit vote using service
  await VoteService.create({
    poll_id: validatedData.pollId,
    option_id: validatedData.optionId,
    voter_id: user?.id || null,
    voter_ip: null // Could be populated from request headers if needed
  })
  
  // Get poll for revalidation
  const poll = await PollService.findById(validatedData.pollId)
  
  if (poll) {
    revalidatePath(`/polls/${poll.share_token}`)
  }
  
  return { success: true }
})

export const updatePoll = withErrorHandling(async (pollId: string, formData: FormData) => {
  // Get authenticated user
  const user = await getAuthenticatedUser()
  
  // Validate form data
  const validatedData = validateUpdatePollData(formData)
  
  // Verify poll ownership before updating
  const existingPoll = await PollService.findById(pollId)
  if (!existingPoll || existingPoll.creator_id !== user.id) {
    throw new AppError('Poll not found or access denied', ErrorType.AUTHORIZATION, 403)
  }
  
  // Update poll using service
  await PollService.update(pollId, {
    title: validatedData.title,
    description: validatedData.description || null,
    expires_at: validatedData.expiresAt?.toISOString() || null,
    allow_multiple_votes: validatedData.allowMultiple
  })
  
  revalidatePath('/dashboard')
  revalidatePath(`/polls/${existingPoll.share_token}`)
  
  return { success: true }
})

export const deletePoll = withErrorHandling(async (pollId: string) => {
  // Get authenticated user
  const user = await getAuthenticatedUser()
  
  // Verify poll ownership before deleting
  const existingPoll = await PollService.findById(pollId)
  if (!existingPoll || existingPoll.creator_id !== user.id) {
    throw new AppError('Poll not found or access denied', ErrorType.AUTHORIZATION, 403)
  }
  
  // Delete poll using service (cascade will handle options and votes)
  await PollService.delete(pollId)
  
  revalidatePath('/dashboard')
  
  return { success: true }
})

export const getUserPolls = withErrorHandling(async () => {
  // Get authenticated user
  const user = await getAuthenticatedUser()
  
  // Get user polls using service
  const polls = await PollService.findByUserId(user.id)
  
  return polls
})