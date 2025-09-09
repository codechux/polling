'use client'

import { useState, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
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
import { toast } from 'sonner'

interface DeletePollButtonProps {
  pollId: string
  pollTitle: string
}

function DeletePollButtonComponent({ pollId, pollTitle }: DeletePollButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  
  // Memoize the delete handler to prevent unnecessary re-renders
  const handleDelete = useCallback(async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success('Poll deleted successfully')
        router.refresh()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Delete poll error:', error)
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }, [pollId, router])

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isDeleting}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Poll</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{pollTitle}"? This action cannot be undone and will permanently remove the poll and all its votes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Export memoized component to prevent unnecessary re-renders
export const DeletePollButton = memo(DeletePollButtonComponent)