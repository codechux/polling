'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { DiscussionThreadForm } from './DiscussionThreadForm'
import { updateDiscussionThread, deleteDiscussionThread } from '@/lib/database/actions/discussion-threads'
import { toast } from 'sonner'
import { 
  MessageSquare, 
  Reply, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Loader2,
  User
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import type { DiscussionThreadWithReplies } from '@/lib/database/types'

interface DiscussionThreadItemProps {
  thread: DiscussionThreadWithReplies
  currentUserId?: string | undefined
  pollId: string
  level?: number
  onReplySuccess?: (() => void) | undefined
}

export function DiscussionThreadItem({
  thread,
  currentUserId,
  pollId,
  level = 0,
  onReplySuccess
}: DiscussionThreadItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(thread.content)
  const [isPending, startTransition] = useTransition()

  const isOwner = currentUserId === thread.user_id
  const maxLevel = 3 // Maximum nesting level
  const canReply = level < maxLevel

  const handleReplySuccess = () => {
    setShowReplyForm(false)
    onReplySuccess?.()
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditContent(thread.content)
  }

  const handleSaveEdit = () => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty')
      return
    }

    if (editContent.trim().length > 2000) {
      toast.error('Comment must be 2000 characters or less')
      return
    }

    startTransition(async () => {
      try {
        await updateDiscussionThread(thread.id, { content: editContent.trim() })
        setIsEditing(false)
        toast.success('Comment updated!')
        onReplySuccess?.() // Refresh the thread list
      } catch (error) {
        console.error('Error updating thread:', error)
        toast.error('Failed to update comment')
      }
    })
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(thread.content)
  }

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return
    }

    startTransition(async () => {
      try {
        await deleteDiscussionThread(thread.id)
        toast.success('Comment deleted!')
        onReplySuccess?.() // Refresh the thread list
      } catch (error) {
        console.error('Error deleting thread:', error)
        toast.error('Failed to delete comment')
      }
    })
  }

  const getUserInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  const getUserDisplayName = (name: string | null, email: string | null) => {
    return name || email?.split('@')[0] || 'Anonymous User'
  }

  return (
    <div className={`${level > 0 ? 'ml-4 sm:ml-8 md:ml-12' : ''}`}>
      <Card className="mb-4">
        <CardContent className="p-4 sm:p-6">
          {/* Thread Header */}
          <div className="flex items-start gap-3 mb-3">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
              <AvatarImage src={thread.user_avatar_url || undefined} />
              <AvatarFallback className="text-xs sm:text-sm">
                {getUserInitials(thread.user_name, thread.user_email)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm sm:text-base truncate">
                    {getUserDisplayName(thread.user_name, thread.user_email)}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleEdit} disabled={isPending}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={handleDelete} 
                        disabled={isPending}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Thread Content */}
          <div className="ml-11 sm:ml-13">
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px] resize-none"
                  disabled={isPending}
                />
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={handleSaveEdit}
                    disabled={isPending || !editContent.trim() || editContent.trim().length > 2000}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm sm:text-base text-foreground whitespace-pre-wrap break-words mb-3">
                  {thread.content}
                </p>
                
                {/* Thread Actions */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {canReply && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReplyForm(!showReplyForm)}
                      className="h-auto p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Reply className="mr-1 h-4 w-4" />
                      Reply
                    </Button>
                  )}
                  
                  {thread.replyCount && thread.replyCount > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reply Form */}
      {showReplyForm && canReply && (
        <div className="mb-4 ml-4 sm:ml-8 md:ml-12">
          <DiscussionThreadForm
            pollId={pollId}
            parentId={thread.id}
            placeholder="Write a reply..."
            onSuccess={handleReplySuccess}
            onCancel={() => setShowReplyForm(false)}
            isReply={true}
          />
        </div>
      )}

      {/* Replies */}
      {thread.replies && thread.replies.length > 0 && (
        <div className="space-y-0">
          {thread.replies.map((reply) => (
            <DiscussionThreadItem
              key={reply.id}
              thread={reply}
              currentUserId={currentUserId}
              pollId={pollId}
              level={level + 1}
              onReplySuccess={onReplySuccess}
            />
          ))}
        </div>
      )}
    </div>
  )
}