'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { deletePoll } from '@/lib/database/actions'

interface DeletePollButtonProps {
  pollId: string
  pollTitle: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showIcon?: boolean
  className?: string
}

/**
 * Button that opens a confirmation dialog to delete a poll.
 *
 * Renders a trigger button (with optional icon) that opens an AlertDialog. When confirmed it calls the `deletePoll` action for `pollId`, shows success/error toasts, refreshes the Next.js router, and disables interactions while the deletion is in progress.
 *
 * @param pollId - ID of the poll to delete.
 * @param pollTitle - Human-readable poll title shown in the confirmation dialog.
 * @param variant - Button variant (defaults to `'destructive'`).
 * @param size - Button size (defaults to `'default'`).
 * @param showIcon - Whether to render the trash icon on the button (defaults to `true`).
 * @param className - Optional additional CSS class names applied to the trigger button.
 * @returns A React element rendering the delete button and confirmation dialog.
 */
export function DeletePollButton({ 
  pollId, 
  pollTitle, 
  variant = 'destructive', 
  size = 'default',
  showIcon = true,
  className 
}: DeletePollButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      await deletePoll(pollId)
      toast.success('Poll deleted successfully')
      router.refresh()
    } catch (error) {
      console.error('Error deleting poll:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to delete poll. Please try again.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          disabled={isDeleting}
        >
          {showIcon && <Trash2 className="h-4 w-4" />}
          {size !== 'icon' && (
            <span className={showIcon ? 'ml-2' : ''}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </span>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Poll</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{pollTitle}"? This action cannot be undone.
            All votes and poll data will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Poll'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}