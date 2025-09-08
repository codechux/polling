'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import type { Poll } from '@/lib/database/types'

interface EditPollFormProps {
  poll: Pick<Poll, 'id' | 'title' | 'description' | 'is_active'>
}

export default function EditPollForm({ poll }: EditPollFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch(`/api/polls/${poll.id}`, {
        method: 'PUT',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Poll updated successfully!')
        router.push('/dashboard')
        router.refresh()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Update poll error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Poll Title *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={poll.title}
          placeholder="Enter your poll question"
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={poll.description || ''}
          placeholder="Add more context to your poll..."
          maxLength={1000}
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          name="isActive"
          defaultChecked={poll.is_active}
        />
        <Label htmlFor="isActive" className="text-sm font-medium">
          Poll is active (users can vote)
        </Label>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Updating...' : 'Update Poll'}
        </Button>
        <Button type="button" variant="outline" asChild className="flex-1" disabled={isSubmitting}>
          <a href="/dashboard">Cancel</a>
        </Button>
      </div>
    </form>
  )
}
