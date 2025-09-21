'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase'
import { withErrorHandling, AppError, ErrorType } from '@/lib/utils/error-handler'
import type { 
  DiscussionThreadInsert, 
  DiscussionThreadUpdate, 
  DiscussionThreadWithUser,
  DiscussionThreadWithReplies,
  CreateDiscussionThreadData,
  UpdateDiscussionThreadData
} from '@/lib/database/types'

// Authentication helper
async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new AppError('Authentication required', ErrorType.AUTHENTICATION, 401)
  }
  
  return user
}

// Validation helpers
function validateDiscussionThreadContent(content: string): string {
  const trimmedContent = content.trim()
  
  if (!trimmedContent) {
    throw new AppError('Comment content is required', ErrorType.VALIDATION, 400)
  }
  
  if (trimmedContent.length > 2000) {
    throw new AppError('Comment content must be 2000 characters or less', ErrorType.VALIDATION, 400)
  }
  
  return trimmedContent
}

function validatePollId(pollId: string): string {
  if (!pollId || typeof pollId !== 'string') {
    throw new AppError('Valid poll ID is required', ErrorType.VALIDATION, 400)
  }
  return pollId
}

function validateThreadId(threadId: string): string {
  if (!threadId || typeof threadId !== 'string') {
    throw new AppError('Valid thread ID is required', ErrorType.VALIDATION, 400)
  }
  return threadId
}

// Server Actions

/**
 * Create a new discussion thread (comment or reply)
 */
export const createDiscussionThread = withErrorHandling(async (data: CreateDiscussionThreadData) => {
  const user = await getAuthenticatedUser()
  const supabase = await createSupabaseServerClient()
  
  // Validate input data
  const validatedPollId = validatePollId(data.poll_id)
  const validatedContent = validateDiscussionThreadContent(data.content)
  
  // Validate parent thread exists if this is a reply
  if (data.parent_id) {
    const { data: parentThread, error: parentError } = await supabase
      .from('discussion_threads')
      .select('id, poll_id')
      .eq('id', data.parent_id)
      .eq('is_deleted', false)
      .single()
    
    if (parentError || !parentThread) {
      throw new AppError('Parent comment not found', ErrorType.NOT_FOUND, 404)
    }
    
    if (parentThread.poll_id !== validatedPollId) {
      throw new AppError('Parent comment does not belong to this poll', ErrorType.VALIDATION, 400)
    }
  }
  
  // Verify poll exists
  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .select('id')
    .eq('id', validatedPollId)
    .single()
  
  if (pollError || !poll) {
    throw new AppError('Poll not found', ErrorType.NOT_FOUND, 404)
  }
  
  // Create the discussion thread
  const threadData: DiscussionThreadInsert = {
    poll_id: validatedPollId,
    parent_id: data.parent_id || null,
    user_id: user.id,
    content: validatedContent,
    is_deleted: false
  }
  
  const { data: newThread, error } = await supabase
    .from('discussion_threads')
    .insert(threadData)
    .select()
    .single()
  
  if (error) {
    throw new AppError('Failed to create comment', ErrorType.DATABASE, 500)
  }
  
  // Get poll share token for revalidation
  const { data: pollData } = await supabase
    .from('polls')
    .select('share_token')
    .eq('id', validatedPollId)
    .single()
  
  if (pollData?.share_token) {
    revalidatePath(`/polls/${pollData.share_token}`)
  }
  
  return newThread
})

/**
 * Get discussion threads for a poll with user information
 */
export const getDiscussionThreads = withErrorHandling(async (pollId: string): Promise<DiscussionThreadWithReplies[]> => {
  const supabase = await createSupabaseServerClient()
  
  const validatedPollId = validatePollId(pollId)
  
  // Get all threads for the poll using the view
  const { data: threads, error } = await supabase
    .from('discussion_threads_with_users')
    .select('*')
    .eq('poll_id', validatedPollId)
    .order('created_at', { ascending: true })
  
  if (error) {
    throw new AppError('Failed to fetch comments', ErrorType.DATABASE, 500)
  }
  
  // Organize threads into a hierarchical structure
  const threadMap = new Map<string, DiscussionThreadWithReplies>()
  const topLevelThreads: DiscussionThreadWithReplies[] = []
  
  // First pass: create all thread objects
  threads.forEach(thread => {
    const threadWithReplies: DiscussionThreadWithReplies = {
      ...thread,
      replies: [],
      replyCount: 0
    }
    threadMap.set(thread.id, threadWithReplies)
  })
  
  // Second pass: organize into hierarchy
  threads.forEach(thread => {
    const threadWithReplies = threadMap.get(thread.id)!
    
    if (thread.parent_id) {
      // This is a reply
      const parentThread = threadMap.get(thread.parent_id)
      if (parentThread) {
        parentThread.replies!.push(threadWithReplies)
        parentThread.replyCount = (parentThread.replyCount || 0) + 1
      }
    } else {
      // This is a top-level thread
      topLevelThreads.push(threadWithReplies)
    }
  })
  
  return topLevelThreads
})

/**
 * Update a discussion thread (edit content or soft delete)
 */
export const updateDiscussionThread = withErrorHandling(async (threadId: string, data: UpdateDiscussionThreadData) => {
  const user = await getAuthenticatedUser()
  const supabase = await createSupabaseServerClient()
  
  const validatedThreadId = validateThreadId(threadId)
  
  // Verify thread exists and user owns it
  const { data: existingThread, error: fetchError } = await supabase
    .from('discussion_threads')
    .select('id, user_id, poll_id, content')
    .eq('id', validatedThreadId)
    .eq('is_deleted', false)
    .single()
  
  if (fetchError || !existingThread) {
    throw new AppError('Comment not found', ErrorType.NOT_FOUND, 404)
  }
  
  if (existingThread.user_id !== user.id) {
    throw new AppError('You can only edit your own comments', ErrorType.AUTHORIZATION, 403)
  }
  
  // Prepare update data
  const updateData: DiscussionThreadUpdate = {}
  
  if (data.content !== undefined) {
    updateData.content = validateDiscussionThreadContent(data.content)
  }
  
  if (data.is_deleted !== undefined) {
    updateData.is_deleted = data.is_deleted
  }
  
  // Update the thread
  const { data: updatedThread, error } = await supabase
    .from('discussion_threads')
    .update(updateData)
    .eq('id', validatedThreadId)
    .select()
    .single()
  
  if (error) {
    throw new AppError('Failed to update comment', ErrorType.DATABASE, 500)
  }
  
  // Get poll share token for revalidation
  const { data: pollData } = await supabase
    .from('polls')
    .select('share_token')
    .eq('id', existingThread.poll_id)
    .single()
  
  if (pollData?.share_token) {
    revalidatePath(`/polls/${pollData.share_token}`)
  }
  
  return updatedThread
})

/**
 * Soft delete a discussion thread
 */
export const deleteDiscussionThread = withErrorHandling(async (threadId: string) => {
  return updateDiscussionThread(threadId, { is_deleted: true })
})

/**
 * Get discussion thread count for a poll
 */
export const getDiscussionThreadCount = withErrorHandling(async (pollId: string): Promise<number> => {
  const supabase = await createSupabaseServerClient()
  
  const validatedPollId = validatePollId(pollId)
  
  const { count, error } = await supabase
    .from('discussion_threads')
    .select('*', { count: 'exact', head: true })
    .eq('poll_id', validatedPollId)
    .eq('is_deleted', false)
  
  if (error) {
    throw new AppError('Failed to fetch comment count', ErrorType.DATABASE, 500)
  }
  
  return count || 0
})