'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DiscussionThreadForm } from './DiscussionThreadForm'
import { DiscussionThreadItem } from './DiscussionThreadItem'
import { getDiscussionThreads } from '@/lib/database/actions/discussion-threads'
import { MessageSquare, Loader2, RefreshCw } from 'lucide-react'
import type { DiscussionThreadWithReplies } from '@/lib/database/types'

interface DiscussionThreadListProps {
  pollId: string
  currentUserId?: string | undefined
  initialThreads?: DiscussionThreadWithReplies[]
  showForm?: boolean
}

export function DiscussionThreadList({
  pollId,
  currentUserId,
  initialThreads = [],
  showForm = true
}: DiscussionThreadListProps) {
  const [threads, setThreads] = useState<DiscussionThreadWithReplies[]>(initialThreads)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showNewThreadForm, setShowNewThreadForm] = useState(false)

  const loadThreads = async () => {
    setIsLoading(true)
    try {
      const fetchedThreads = await getDiscussionThreads(pollId)
      setThreads(fetchedThreads)
    } catch (error) {
      console.error('Error loading discussion threads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    startTransition(async () => {
      await loadThreads()
    })
  }

  const handleThreadSuccess = () => {
    setShowNewThreadForm(false)
    // Refresh threads after successful creation/update
    startTransition(async () => {
      await loadThreads()
    })
  }

  // Load threads on mount if no initial threads provided
  useEffect(() => {
    if (initialThreads.length === 0) {
      loadThreads()
    }
  }, [pollId])

  const threadCount = threads.reduce((count, thread) => {
    return count + 1 + (thread.replyCount || 0)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
              Discussion
              {threadCount > 0 && (
                <span className="text-sm sm:text-base text-muted-foreground font-normal">
                  ({threadCount} {threadCount === 1 ? 'comment' : 'comments'})
                </span>
              )}
            </CardTitle>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isPending || isLoading}
                className="flex-shrink-0"
              >
                {isPending || isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              
              {showForm && currentUserId && (
                <Button
                  onClick={() => setShowNewThreadForm(!showNewThreadForm)}
                  size="sm"
                  className="flex-shrink-0"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Add Comment</span>
                  <span className="sm:hidden">Comment</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {showForm && currentUserId && showNewThreadForm && (
          <CardContent className="pt-0">
            <DiscussionThreadForm
              pollId={pollId}
              onSuccess={handleThreadSuccess}
              onCancel={() => setShowNewThreadForm(false)}
            />
          </CardContent>
        )}
      </Card>

      {/* Loading State */}
      {isLoading && threads.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading discussion...</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && threads.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No comments yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to share your thoughts on this poll!
            </p>
            {showForm && currentUserId && !showNewThreadForm && (
              <Button onClick={() => setShowNewThreadForm(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Start Discussion
              </Button>
            )}
            {!currentUserId && (
              <p className="text-sm text-muted-foreground">
                Sign in to join the discussion
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Thread List */}
      {threads.length > 0 && (
        <div className="space-y-0">
          {threads.map((thread) => (
            <DiscussionThreadItem
              key={thread.id}
              thread={thread}
              currentUserId={currentUserId}
              pollId={pollId}
              onReplySuccess={handleThreadSuccess}
            />
          ))}
        </div>
      )}

      {/* Authentication Prompt */}
      {!currentUserId && threads.length > 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-medium mb-2">Join the Discussion</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to add your comments and replies to this poll discussion.
            </p>
            <Button variant="outline" size="sm">
              Sign In to Comment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}