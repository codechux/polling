'use client'

import { useState, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { submitVote } from '@/lib/database/actions'

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
  title: string
  description?: string
}

function VoteFormComponent({ 
  pollId, 
  shareToken, 
  options, 
  allowMultipleVotes, 
  title, 
  description 
}: VoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const router = useRouter()

  // Memoize handlers to prevent unnecessary re-renders
  const handleOptionChange = useCallback((optionId: string, checked: boolean) => {
    if (allowMultipleVotes) {
      setSelectedOptions(prev => 
        checked 
          ? [...prev, optionId]
          : prev.filter(id => id !== optionId)
      )
    } else {
      setSelectedOptions(checked ? [optionId] : [])
    }
  }, [allowMultipleVotes])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
      
      // Add selected options
      selectedOptions.forEach(optionId => {
        formData.append('optionIds', optionId)
      })
      
      await submitVote(formData)
      toast.success('Vote submitted successfully!')
      router.push(`/polls/${shareToken}/results`)
    } catch (error) {
      console.error('Error submitting vote:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to submit vote. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [pollId, shareToken, selectedOptions, router])

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">
                {allowMultipleVotes ? 'Select one or more options:' : 'Select one option:'}
              </Label>
              
              {options.map((option) => (
                <div key={option.id} className="flex items-center space-x-3">
                  <input
                    type={allowMultipleVotes ? 'checkbox' : 'radio'}
                    id={option.id}
                    name={allowMultipleVotes ? undefined : 'selectedOption'}
                    checked={selectedOptions.includes(option.id)}
                    onChange={(e) => handleOptionChange(option.id, e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <Label 
                    htmlFor={option.id} 
                    className="flex-1 text-sm font-normal cursor-pointer"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
            
            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting || selectedOptions.length === 0}
                className="w-full"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Vote'}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}

// Export memoized component to prevent unnecessary re-renders
export const VoteForm = memo(VoteFormComponent)