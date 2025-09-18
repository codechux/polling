'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { createDiscussionThread } from '@/lib/database/actions/discussion-threads'
import { toast } from 'sonner'
import { Loader2, MessageSquare } from 'lucide-react'
import type { CreateDiscussionThreadData } from '@/lib/database/types'

interface DiscussionThreadFormProps {
  pollId: string
  parentId?: string | null
  placeholder?: string
  onSuccess?: () => void
  onCancel?: () => void
  isReply?: boolean
  className?: string
}

export function DiscussionThreadForm({
  pollId,
  parentId = null,
  placeholder = "Share your thoughts on this poll...",
  onSuccess,
  onCancel,
  isReply = false,
  className = ""
}: DiscussionThreadFormProps) {
  const [content, setContent] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      toast.error('Please enter a comment')
      return
    }

    if (content.trim().length > 2000) {
      toast.error('Comment must be 2000 characters or less')
      return
    }

    const data: CreateDiscussionThreadData = {
      poll_id: pollId,
      parent_id: parentId,
      content: content.trim()
    }

    startTransition(async () => {
      try {
        await createDiscussionThread(data)
        setContent('')
        toast.success(isReply ? 'Reply posted!' : 'Comment posted!')
        onSuccess?.()
      } catch (error) {
        console.error('Error creating discussion thread:', error)
        toast.error('Failed to post comment. Please try again.')
      }
    })
  }

  const handleCancel = () => {
    setContent('')
    onCancel?.()
  }

  const characterCount = content.length
  const isOverLimit = characterCount > 2000
  const isNearLimit = characterCount > 1800

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{isReply ? 'Reply to comment' : 'Add a comment'}</span>
            </div>
            
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              className={`min-h-[100px] resize-none ${
                isOverLimit ? 'border-destructive focus-visible:ring-destructive' : ''
              }`}
              disabled={isPending}
            />
            
            <div className="flex justify-between items-center text-xs">
              <span 
                className={`${
                  isOverLimit 
                    ? 'text-destructive' 
                    : isNearLimit 
                    ? 'text-yellow-600' 
                    : 'text-muted-foreground'
                }`}
              >
                {characterCount}/2000 characters
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={isPending || !content.trim() || isOverLimit}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {isReply ? 'Post Reply' : 'Post Comment'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}