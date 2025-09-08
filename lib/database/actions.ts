'use server'

import { createSupabaseServerClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { validateCreatePollData, validateSubmitVoteData, validateUpdatePollData } from './validation'

// Types
type AuthenticatedUser = User

// Authentication helper
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Authentication required')
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
export async function createPoll(formData: FormData) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser()
    
    // Validate form data
    const validatedData = validateCreatePollData(formData)
    
    const supabase = await createSupabaseServerClient()
    
    // Generate unique share token
    const shareToken = crypto.randomUUID()
    
    // Create poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        title: validatedData.title,
        description: validatedData.description,
        creator_id: user.id,
        share_token: shareToken,
        expires_at: validatedData.expiresAt?.toISOString(),
        allow_multiple_votes: validatedData.allowMultiple,
        is_anonymous: false
      })
      .select()
      .single()

    if (pollError) {
      throw new Error(`Failed to create poll: ${pollError.message}`)
    }

    // Create poll options
     const { error: optionsError } = await supabase
       .from('poll_options')
       .insert(
         validatedData.options.map((text: string, index: number) => ({
           poll_id: poll.id,
           text,
           order_index: index
         }))
       )

    if (optionsError) {
      throw new Error(`Failed to create poll options: ${optionsError.message}`)
    }

    revalidatePath('/dashboard')
    redirect(`/polls/${shareToken}`)
  } catch (error) {
    console.error('Create poll error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create poll'
    throw new Error(errorMessage)
  }
}

export async function submitVote(formData: FormData) {
  try {
    // Validate form data
    const validatedData = validateSubmitVoteData(formData)
    
    const supabase = await createSupabaseServerClient()
    
    // Submit vote
    const { error } = await supabase
      .from('votes')
      .insert({
        poll_id: validatedData.pollId,
        option_id: validatedData.optionId,
        voter_id: null
      })
    
    if (error) {
      throw new Error(`Failed to submit vote: ${error.message}`)
    }
    
    // Get poll share token for revalidation
    const { data: poll } = await supabase
      .from('polls')
      .select('share_token')
      .eq('id', validatedData.pollId)
      .single()
    
    if (poll) {
      revalidatePath(`/polls/${poll.share_token}`)
    }
    
    return { success: true }
  } catch (error) {
    console.error('Submit vote error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit vote'
    throw new Error(errorMessage)
  }
}

export async function updatePoll(pollId: string, formData: FormData) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser()
    
    // Validate form data
    const validatedData = validateUpdatePollData(formData)
    
    const supabase = await createSupabaseServerClient()
    
    // Update poll
    const { error } = await supabase
      .from('polls')
      .update({
        title: validatedData.title,
        description: validatedData.description,
        expires_at: validatedData.expiresAt?.toISOString(),
        allow_multiple_votes: validatedData.allowMultiple
      })
      .eq('id', pollId)
      .eq('creator_id', user.id)
    
    if (error) {
      throw new Error(`Failed to update poll: ${error.message}`)
    }
    
    revalidatePath('/dashboard')
    revalidatePath(`/polls/${pollId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Update poll error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update poll'
    throw new Error(errorMessage)
  }
}

export async function deletePoll(pollId: string) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser()
    
    const supabase = await createSupabaseServerClient()
    
    // Delete poll (cascade will handle options and votes)
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId)
      .eq('creator_id', user.id)
    
    if (error) {
      throw new Error(`Failed to delete poll: ${error.message}`)
    }
    
    revalidatePath('/dashboard')
    
    return { success: true }
  } catch (error) {
    console.error('Delete poll error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete poll'
    throw new Error(errorMessage)
  }
}

export async function getUserPolls() {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser()
    
    const supabase = await createSupabaseServerClient()
    
    const { data: polls, error } = await supabase
      .from('polls')
      .select(`
        id,
        title,
        description,
        created_at,
        expires_at,
        is_active,
        share_token,
        votes(count)
      `)
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to get user polls: ${error.message}`)
    }
    
    return polls
  } catch (error) {
    console.error('Get user polls error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get user polls'
    throw new Error(errorMessage)
  }
}