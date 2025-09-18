'use client'

import { useState, useCallback, memo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updatePoll } from '@/lib/database/actions'
import type { Poll, PollOption } from '@/lib/database/types'

// Form schema for editing polls
const editFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  options: z.array(
    z.object({
      id: z.string().optional(),
      value: z.string().min(1, 'Option cannot be empty').max(500, 'Option must be less than 500 characters'),
      isNew: z.boolean()
    })
  ).min(2, 'Poll must have at least 2 options').max(20, 'Poll cannot have more than 20 options'),
  allowMultipleVotes: z.boolean()
})

type EditFormData = z.infer<typeof editFormSchema>

interface EditPollFormProps {
  poll: Poll & { poll_options: PollOption[] }
}

function EditPollFormComponent({ poll }: EditPollFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      title: poll.title,
      description: poll.description || '',
      options: poll.poll_options.map(option => ({
        id: option.id,
        value: option.text,
        isNew: false
      })),
      allowMultipleVotes: poll.allow_multiple_votes
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options'
  })

  const onSubmit = async (data: EditFormData) => {
    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('pollId', poll.id)
      formData.append('title', data.title)
      if (data.description) {
        formData.append('description', data.description)
      }
      
      // Add options with their IDs for existing ones
      data.options.forEach((option) => {
        if (option.id && !option.isNew) {
          formData.append('existingOptions', JSON.stringify({
            id: option.id,
            text: option.value
          }))
        } else {
          formData.append('options', option.value)
        }
      })
      
      formData.append('allowMultiple', data.allowMultipleVotes.toString())
      
      await updatePoll(poll.id, formData)
      toast.success('Poll updated successfully!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Error updating poll:', error)
      if (error instanceof Error) {
        if (error.message.includes('validation')) {
          try {
            const validationErrors = JSON.parse(error.message.replace('Validation failed: ', '')) as Record<string, string>
            Object.entries(validationErrors).forEach(([field, message]) => {
              if (field in editFormSchema.shape && typeof message === 'string') {
                setError(field as keyof EditFormData, {
                  type: 'server',
                  message
                })
              }
            })
          } catch (parseError) {
            console.error('Failed to parse validation errors:', parseError)
            setError('root', {
              type: 'server',
              message: 'Validation failed. Please check your input.'
            })
          }
        } else {
          toast.error(error.message)
        }
      } else {
        toast.error('Failed to update poll. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Memoize handlers to prevent unnecessary re-renders
  const addOption = useCallback(() => {
    if (fields.length < 20) {
      append({ value: '', isNew: true })
    }
  }, [fields.length, append])

  const removeOption = useCallback((index: number) => {
    if (fields.length > 2) {
      remove(index)
    }
  }, [fields.length, remove])

  return (
    <div className="container mx-auto py-4 px-4 sm:py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-xl sm:text-2xl">Edit Poll</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Update your poll details and options.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Poll Title *</Label>
              <Input
                id="title"
                placeholder="What's your question?"
                {...register('title')}
                className={`w-full text-sm sm:text-base ${errors.title ? 'border-red-500' : ''}`}
              />
              {errors.title && (
                <p className="text-xs sm:text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add more context to your poll..."
                {...register('description')}
                className={`w-full text-sm sm:text-base resize-none ${errors.description ? 'border-red-500' : ''}`}
                rows={3}
              />
              {errors.description && (
                <p className="text-xs sm:text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label className="text-sm font-medium">Poll Options *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={fields.length >= 20}
                  className="text-xs sm:text-sm w-full sm:w-auto"
                >
                  Add Option ({fields.length}/20)
                </Button>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        {...register(`options.${index}.value`)}
                        className={`text-sm sm:text-base ${errors.options?.[index]?.value ? 'border-red-500' : ''}`}
                      />
                      {errors.options?.[index]?.value && (
                        <p className="text-xs sm:text-sm text-red-500 mt-1">
                          {errors.options[index]?.value?.message}
                        </p>
                      )}
                    </div>
                    {fields.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeOption(index)}
                        className="shrink-0 h-10 w-10"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              {errors.options && (
                <p className="text-xs sm:text-sm text-red-500">{errors.options.message}</p>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-3 sm:space-y-4">
              <Label className="text-sm font-medium">Poll Settings</Label>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="allowMultipleVotes" className="text-sm font-medium">Allow Multiple Votes</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Let users select multiple options
                  </p>
                </div>
                <Switch
                  id="allowMultipleVotes"
                  {...register('allowMultipleVotes')}
                  className="self-start sm:self-center"
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between px-4 sm:px-6 pb-4 sm:pb-6">
            <Button variant="outline" asChild className="w-full sm:w-auto order-2 sm:order-1">
              <Link href="/dashboard">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto order-1 sm:order-2">
              {isSubmitting ? 'Updating...' : 'Update Poll'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

// Export memoized component to prevent unnecessary re-renders
export default memo(EditPollFormComponent)