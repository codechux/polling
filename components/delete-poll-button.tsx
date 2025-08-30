'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { deletePoll } from '@/lib/database/actions'
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

export function DeletePollButton({ pollId, pollTitle }: DeletePollButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await deletePoll(pollId)
      toast.success('Poll deleted successfully')
    } catch (error) {
      console.error('Delete poll error:', error)
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

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