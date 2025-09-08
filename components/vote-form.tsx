'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface PollOption {
  id: string
  text: string
  vote_count: number
}

interface VoteFormProps {
  pollId: string
  shareToken: string
  options: PollOption[]
  allowMultipleVotes: boolean
}

export function VoteForm({ pollId, shareToken, options, allowMultipleVotes }: VoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const router = useRouter()

  const handleOptionChange = (optionId: string, checked: boolean) => {
    if (allowMultipleVotes) {
      setSelectedOptions(prev => 
        checked 
          ? [...prev, optionId]
          : prev.filter(id => id !== optionId)
      )
    } else {
      setSelectedOptions(checked ? [optionId] : [])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedOptions.length === 0) {
      toast.error('Please select at least one option')
      return
    }

    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('pollId', pollId)
      formData.append('shareToken', shareToken)
      
      // Add selected options to FormData
      selectedOptions.forEach(optionId => {
        formData.append('optionId', optionId)
      })
      
      const response = await fetch('/api/polls/vote', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Your vote has been submitted!')
        router.refresh() // Refresh to show updated results
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Vote submission error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit your vote'
      
      // Show user-friendly error messages
      if (errorMessage.includes('Authentication required')) {
        toast.error('Please sign in to vote')
      } else if (errorMessage.includes('already voted')) {
        toast.error('You have already voted on this poll')
      } else if (errorMessage.includes('Poll has expired')) {
        toast.error('This poll has expired and is no longer accepting votes')
      } else if (errorMessage.includes('Poll is not active')) {
        toast.error('This poll is currently not active')
      } else if (errorMessage.includes('Invalid option')) {
        toast.error('Please select a valid option')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.id} className="flex items-center space-x-2">
            <input
              type={allowMultipleVotes ? 'checkbox' : 'radio'}
              name="optionId"
              value={option.id}
              id={`option-${option.id}`}
              className="w-4 h-4"
              checked={selectedOptions.includes(option.id)}
              onChange={(e) => handleOptionChange(option.id, e.target.checked)}
              disabled={isSubmitting}
            />
            <label
              htmlFor={`option-${option.id}`}
              className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {option.text}
            </label>
            <span className="text-sm text-muted-foreground">
              {option.vote_count} votes
            </span>
          </div>
        ))}
      </div>
      
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Vote'}
      </Button>
    </form>
  )
}