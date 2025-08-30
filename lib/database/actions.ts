'use server'

import { createSupabaseServerClient } from '../supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { PollInsert, PollOptionInsert, VoteInsert } from './types'

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

// Server Actions
export async function createPoll(formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Parse and validate form data
    const rawData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
      options: formData.getAll('options') as string[],
      expiresAt: formData.get('expiresAt') ? new Date(formData.get('expiresAt') as string) : undefined,
      allowMultipleVotes: formData.get('allowMultipleVotes') === 'true',
      isAnonymous: formData.get('isAnonymous') === 'true'
    }

    const validatedData = createPollSchema.parse(rawData)

    // Create poll
    const pollData: PollInsert = {
      title: validatedData.title,
      description: validatedData.description,
      creator_id: user.id,
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

    revalidatePath('/dashboard')
    redirect(`/polls/${poll.share_token}`)
  } catch (error) {
    console.error('Create poll error:', error)
    throw error
  }
}

export async function submitVote(formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Parse and validate form data
    const rawData = {
      pollId: formData.get('pollId') as string,
      optionId: formData.get('optionId') as string,
      shareToken: formData.get('shareToken') as string || undefined
    }

    const validatedData = voteSchema.parse(rawData)

    // Get current user (optional for anonymous voting)
    const { data: { user } } = await supabase.auth.getUser()

    // Prepare vote data
    const voteData: VoteInsert = {
      poll_id: validatedData.pollId,
      option_id: validatedData.optionId,
      voter_id: user?.id || null,
      voter_ip: null // Will be set by database trigger or application logic
    }

    const { error: voteError } = await supabase
      .from('votes')
      .insert(voteData)

    if (voteError) {
      throw new Error(`Failed to submit vote: ${voteError.message}`)
    }

    // Revalidate the poll page to show updated results
    if (validatedData.shareToken) {
      revalidatePath(`/polls/${validatedData.shareToken}`)
    }
  } catch (error) {
    console.error('Submit vote error:', error)
    throw error
  }
}

export async function updatePoll(pollId: string, formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Parse form data
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const isActive = formData.get('isActive') === 'true'

    // Validate data
    if (!title || title.length > 200) {
      throw new Error('Invalid title')
    }

    // Update poll
    const { error: updateError } = await supabase
      .from('polls')
      .update({
        title,
        description: description || null,
        is_active: isActive
      })
      .eq('id', pollId)
      .eq('creator_id', user.id) // Ensure user owns the poll

    if (updateError) {
      throw new Error(`Failed to update poll: ${updateError.message}`)
    }

    revalidatePath('/dashboard')
    revalidatePath(`/polls/${pollId}`)
  } catch (error) {
    console.error('Update poll error:', error)
    throw error
  }
}

export async function deletePoll(pollId: string) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Delete poll (cascade will handle options and votes)
    const { error: deleteError } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId)
      .eq('creator_id', user.id) // Ensure user owns the poll

    if (deleteError) {
      throw new Error(`Failed to delete poll: ${deleteError.message}`)
    }

    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Delete poll error:', error)
    throw error
  }
}

export async function getUserPolls() {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('Authentication required')
    }

    // Fetch user's polls with vote counts
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
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })

    if (pollsError) {
      throw new Error(`Failed to fetch polls: ${pollsError.message}`)
    }

    // Transform the data to include vote counts
    const pollsWithCounts = polls?.map(poll => ({
      ...poll,
      voteCount: Array.isArray(poll.votes) ? poll.votes.length : 0,
      status: poll.is_active && (!poll.expires_at || new Date(poll.expires_at) > new Date()) ? 'active' : 'ended'
    })) || []

    return pollsWithCounts
  } catch (error) {
    console.error('Get user polls error:', error)
    throw error
  }
}