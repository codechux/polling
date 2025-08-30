'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPoll } from '@/lib/database/actions'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Form validation schema
const createPollSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  options: z.array(
    z.object({
      value: z.string().min(1, 'Option cannot be empty').max(500, 'Option must be less than 500 characters')
    })
  ).min(2, 'Poll must have at least 2 options').max(20, 'Poll cannot have more than 20 options'),
  duration: z.number().min(1).max(365),
  allowMultipleVotes: z.boolean(),
  isAnonymous: z.boolean()
})

type CreatePollFormData = z.infer<typeof createPollSchema>

export default function CreatePollForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<CreatePollFormData>({
    resolver: zodResolver(createPollSchema),
    defaultValues: {
      title: '',
      description: '',
      options: [{ value: '' }, { value: '' }],
      duration: 7,
      allowMultipleVotes: false,
      isAnonymous: false
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options'
  })

  const addOption = () => {
    if (fields.length < 10) {
      append({ value: '' })
    }
  }

  const removeOption = (index: number) => {
    if (fields.length > 2) {
      remove(index)
    }
  }

  const onSubmit = async (data: CreatePollFormData) => {
    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('title', data.title)
      if (data.description) {
        formData.append('description', data.description)
      }
      
      // Calculate expiration date based on duration
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + data.duration)
      formData.append('expiresAt', expiresAt.toISOString())
      
      // Add options to FormData
      data.options.forEach((option) => {
        formData.append('options', option.value)
      })
      
      formData.append('allowMultipleVotes', data.allowMultipleVotes.toString())
      formData.append('isAnonymous', data.isAnonymous.toString())
      
      await createPoll(formData)
      toast.success('Poll created successfully!')
      // The createPoll action handles redirect to the poll page internally
    } catch (error) {
      console.error('Create poll error:', error)
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while creating your poll'
      
      // Show user-friendly error messages
      if (errorMessage.includes('Authentication required')) {
        toast.error('Please sign in to create a poll')
        router.push('/auth/signin')
      } else if (errorMessage.includes('Title is required')) {
        setError('title', { message: 'Poll title is required' })
        toast.error('Please provide a poll title')
      } else if (errorMessage.includes('At least 2 options required')) {
        setError('options', { message: 'Please provide at least 2 options' })
        toast.error('Your poll needs at least 2 options')
      } else if (errorMessage.includes('Maximum 20 options allowed')) {
        setError('options', { message: 'Too many options (maximum 20)' })
        toast.error('Please reduce the number of options to 20 or fewer')
      } else {
        setError('root', {
          type: 'manual',
          message: errorMessage
        })
        toast.error(errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Poll</CardTitle>
          <CardDescription>Set up your question and options for others to vote on</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Poll Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Poll Title *</Label>
              <Input
                id="title"
                placeholder="What is your favorite programming language?"
                {...register('title')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Poll Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Add more details about your poll..."
                {...register('description')}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Poll Options */}
            <div className="space-y-2">
              <Label>Poll Options *</Label>
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      {...register(`options.${index}.value`)}
                      className={errors.options?.[index] ? 'border-red-500' : ''}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeOption(index)}
                      disabled={fields.length <= 2}
                      className="shrink-0"
                    >
                      ×
                    </Button>
                  </div>
                ))}
                {errors.options && (
                  <p className="text-sm text-red-500">
                    {Array.isArray(errors.options) 
                      ? errors.options.find(err => err?.message)?.message
                      : errors.options.message
                    }
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOption}
                  disabled={fields.length >= 20}
                  className="w-full"
                >
                  + Add Option ({fields.length}/20)
                </Button>
              </div>
            </div>

            {/* Poll Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Poll Duration *</Label>
              <select
                id="duration"
                {...register('duration', { valueAsNumber: true })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
              </select>
              {errors.duration && (
                <p className="text-sm text-red-500">{errors.duration.message}</p>
              )}
            </div>

            {/* Poll Settings */}
            <div className="space-y-4">
              <Label>Poll Settings</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowMultipleVotes"
                    {...register('allowMultipleVotes')}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="allowMultipleVotes" className="text-sm font-normal">
                    Allow multiple votes per user
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isAnonymous"
                    {...register('isAnonymous')}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isAnonymous" className="text-sm font-normal">
                    Anonymous voting (hide voter identities)
                  </Label>
                </div>
              </div>
            </div>

            {/* Form Error */}
            {errors.root && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {errors.root.message}
              </div>
            )}

            {/* Form Actions */}
            <CardFooter className="flex justify-between px-0 pt-6">
              <Button variant="outline" asChild disabled={isSubmitting}>
                <Link href="/dashboard">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Poll'}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}