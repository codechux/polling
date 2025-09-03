'use server'

import { createSupabaseServerClient } from '../supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { PollInsert, PollOptionInsert, VoteInsert } from './types'
import type { User } from '@supabase/supabase-js'

// Types
type AuthenticatedUser = User
type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
type ActionResult<T = void> = Promise<{ success: true; data?: T } | { success: false; error: string }>

// Validation result types
type CreatePollData = z.infer<typeof createPollSchema>
type VoteData = z.infer<typeof voteSchema>
type UpdatePollData = z.infer<typeof updatePollSchema>

// Database operation result types
type PollWithToken = {
  id: string
  share_token: string
  title: string
  description: string | null
  creator_id: string
  created_at: string
  expires_at: string | null
  allow_multiple_votes: boolean
  is_anonymous: boolean
  is_active: boolean
  updated_at: string
}

type UserPollSummary = {
  id: string
  title: string
  description: string | null
  created_at: string
  expires_at: string | null
  is_active: boolean
  share_token: string
  voteCount: number
  status: 'active' | 'ended'
}

// Centralized Supabase client creation
async function getSupabaseClient(): Promise<SupabaseClient> {
  return await createSupabaseServerClient()
}

// Authentication helper
async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await getSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Authentication required')
  }
  
  return user
}

// Optional authentication helper (for anonymous operations)
async function getOptionalUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
}

// Validation schemas
const createPollSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  options: z.array(z.string().min(1, 'Option cannot be empty').max(500, 'Option must be 500 characters or less')).min(2, 'At least 2 options required').max(20, 'Maximum 20 options allowed'),
  expiresAt: z.date().optional(),
  allowMultipleVotes: z.boolean().default(false),
  isAnonymous: z.boolean().default(false)
})

const voteSchema = z.object({
  pollId: z.string().uuid('Invalid poll ID'),
  optionId: z.string().uuid('Invalid option ID'),
  shareToken: z.string().optional()
})

const updatePollSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional(),
  isActive: z.boolean()
})

// Validation helpers
function validateCreatePollData(formData: FormData) {
  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string || undefined,
    options: formData.getAll('options') as string[],
    expiresAt: formData.get('expiresAt') ? new Date(formData.get('expiresAt') as string) : undefined,
    allowMultipleVotes: formData.get('allowMultipleVotes') === 'true',
    isAnonymous: formData.get('isAnonymous') === 'true'
  }
  
  return createPollSchema.parse(rawData)
}

function validateVoteData(formData: FormData) {
  const rawData = {
    pollId: formData.get('pollId') as string,
    optionId: formData.get('optionId') as string,
    shareToken: formData.get('shareToken') as string || undefined
  }
  
  return voteSchema.parse(rawData)
}

function validateUpdatePollData(formData: FormData) {
  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string || undefined,
    isActive: formData.get('isActive') === 'true'
  }
  
  return updatePollSchema.parse(rawData)
}

// Standardized error handling
function handleActionError(error: unknown, operation: string): never {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
  console.error(`${operation} error:`, error)
  throw new Error(errorMessage)
}

// Modular poll operations
async function createPollInDatabase(validatedData: CreatePollData, userId: string): Promise<PollWithToken> {
  const supabase = await getSupabaseClient()
  
  // Create poll
  const pollData: PollInsert = {
    title: validatedData.title,
    description: validatedData.description,
    creator_id: userId,
    expires_at: validatedData.expiresAt?.toISOString(),
    allow_multiple_votes: validatedData.allowMultipleVotes,
    is_anonymous: validatedData.isAnonymous
  }

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert(pollData)
    .select()
    .single()

  if (pollError) {
    throw new Error(`Failed to create poll: ${pollError.message}`)
  }

  // Create poll options
  const optionsData: PollOptionInsert[] = validatedData.options.map((text, index) => ({
    poll_id: poll.id,
    text,
    order_index: index
  }))

  const { error: optionsError } = await supabase
    .from('poll_options')
    .insert(optionsData)

  if (optionsError) {
    throw new Error(`Failed to create poll options: ${optionsError.message}`)
  }

  return poll
}

async function submitVoteToDatabase(validatedData: VoteData, userId: string | null): Promise<void> {
  const supabase = await getSupabaseClient()
  
  const voteData: VoteInsert = {
    poll_id: validatedData.pollId,
    option_id: validatedData.optionId,
    voter_id: userId,
    voter_ip: null // Will be set by database trigger or application logic
  }

  const { error: voteError } = await supabase
    .from('votes')
    .insert(voteData)

  if (voteError) {
    throw new Error(`Failed to submit vote: ${voteError.message}`)
  }
}

async function updatePollInDatabase(pollId: string, validatedData: UpdatePollData, userId: string): Promise<void> {
  const supabase = await getSupabaseClient()
  
  const { error: updateError } = await supabase
    .from('polls')
    .update({
      title: validatedData.title,
      description: validatedData.description || null,
      is_active: validatedData.isActive
    })
    .eq('id', pollId)
    .eq('creator_id', userId) // Ensure user owns the poll

  if (updateError) {
    throw new Error(`Failed to update poll: ${updateError.message}`)
  }
}

async function deletePollFromDatabase(pollId: string, userId: string) {
  const supabase = await getSupabaseClient()
  
  const { error: deleteError } = await supabase
    .from('polls')
    .delete()
    .eq('id', pollId)
    .eq('creator_id', userId) // Ensure user owns the poll

  if (deleteError) {
    throw new Error(`Failed to delete poll: ${deleteError.message}`)
  }
}

async function getUserPollsFromDatabase(userId: string): Promise<UserPollSummary[]> {
  const supabase = await getSupabaseClient()
  
  const { data: polls, error: pollsError } = await supabase
    .from('polls')
    .select(`
      id,
      title,
      description,
      created_at,
      expires_at,
      is_active,
      share_token,
      votes:votes(count)
    `)
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })

  if (pollsError) {
    throw new Error(`Failed to fetch polls: ${pollsError.message}`)
  }

  // Transform the data to include vote counts
  const pollsWithCounts = polls?.map(poll => ({
    ...poll,
    voteCount: Array.isArray(poll.votes) ? poll.votes.length : 0,
    status: (poll.is_active && (!poll.expires_at || new Date(poll.expires_at) > new Date()) ? 'active' : 'ended') as 'active' | 'ended'
  })) || []

  return pollsWithCounts
}

// Server Actions
export async function createPoll(formData: FormData) {
  try {
    const user = await getAuthenticatedUser()
    const validatedData = validateCreatePollData(formData)
    const poll = await createPollInDatabase(validatedData, user.id)
    
    revalidatePath('/dashboard')
    redirect(`/polls/${poll.share_token}`)
  } catch (error) {
    handleActionError(error, 'Create poll')
  }
}

export async function submitVote(formData: FormData) {
  try {
    const user = await getOptionalUser()
    const validatedData = validateVoteData(formData)
    await submitVoteToDatabase(validatedData, user?.id || null)
    
    // Revalidate the poll page to show updated results
    if (validatedData.shareToken) {
      revalidatePath(`/polls/${validatedData.shareToken}`)
    }
  } catch (error) {
    handleActionError(error, 'Submit vote')
  }
}

export async function updatePoll(pollId: string, formData: FormData) {
  try {
    const user = await getAuthenticatedUser()
    const validatedData = validateUpdatePollData(formData)
    await updatePollInDatabase(pollId, validatedData, user.id)
    
    revalidatePath('/dashboard')
    revalidatePath(`/polls/${pollId}`)
  } catch (error) {
    handleActionError(error, 'Update poll')
  }
}

export async function deletePoll(pollId: string) {
  try {
    const user = await getAuthenticatedUser()
    await deletePollFromDatabase(pollId, user.id)
    
    revalidatePath('/dashboard')
  } catch (error) {
    handleActionError(error, 'Delete poll')
  }
}

export async function getUserPolls() {
  try {
    const user = await getAuthenticatedUser()
    return await getUserPollsFromDatabase(user.id)
  } catch (error) {
    handleActionError(error, 'Get user polls')
  }
}