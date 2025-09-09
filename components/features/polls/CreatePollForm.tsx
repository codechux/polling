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
import { createPoll } from '@/lib/database/actions'
import { createPollSchema } from '@/lib/database/validation'

// Custom form schema for the UI (different from server validation)
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  options: z.array(
    z.object({
      value: z.string().min(1, 'Option cannot be empty').max(500, 'Option must be less than 500 characters')
    })
  ).min(2, 'Poll must have at least 2 options').max(20, 'Poll cannot have more than 20 options'),
  duration: z.number().min(0.5).max(365),
  allowMultipleVotes: z.boolean()
})

type FormData = z.infer<typeof formSchema>

function CreatePollFormComponent() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      options: [{ value: '' }, { value: '' }],
      duration: 7,
      allowMultipleVotes: false
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options'
  })

  // Memoize submit handler to prevent unnecessary re-renders
  const onSubmit = useCallback(async (data: FormData) => {
    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('title', data.title)
      if (data.description) {
        formData.append('description', data.description)
      }
      
      // Add options as separate form entries
      data.options.forEach((option: { value: string }) => {
        formData.append('options', option.value)
      })
      
      // Convert duration to expiration date
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + data.duration)
      formData.append('expiresAt', expiresAt.toISOString())
      
      formData.append('allowMultiple', data.allowMultipleVotes.toString())
      
      await createPoll(formData)
      toast.success('Poll created successfully!')
    } catch (error) {
      console.error('Error creating poll:', error)
      if (error instanceof Error) {
        if (error.message.includes('validation')) {
          try {
            const validationErrors = JSON.parse(error.message.replace('Validation failed: ', '')) as Record<string, string>
            Object.entries(validationErrors).forEach(([field, message]) => {
              if (field in formSchema.shape && typeof message === 'string') {
                setError(field as keyof FormData, {
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
        toast.error('Failed to create poll. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [router])

  // Memoize option handlers to prevent unnecessary re-renders
  const addOption = useCallback(() => {
    if (fields.length < 20) {
      append({ value: '' })
    }
  }, [fields.length, append])

  const removeOption = useCallback((index: number) => {
    if (fields.length > 2) {
      remove(index)
    }
  }, [fields.length, remove])

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Poll</CardTitle>
          <CardDescription>
            Create an engaging poll and share it with others to collect their opinions.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Poll Title *</Label>
              <Input
                id="title"
                placeholder="What's your question?"
                {...register('title')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add more context to your poll..."
                {...register('description')}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Poll Options *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  disabled={fields.length >= 20}
                >
                  Add Option
                </Button>
              </div>
              
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        {...register(`options.${index}.value`)}
                        className={errors.options?.[index]?.value ? 'border-red-500' : ''}
                      />
                      {errors.options?.[index]?.value && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors.options[index]?.value?.message}
                        </p>
                      )}
                    </div>
                    {fields.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              {errors.options && (
                <p className="text-sm text-red-500">{errors.options.message}</p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days) *</Label>
              <Input
                id="duration"
                type="number"
                min="0.5"
                max="365"
                step="0.5"
                {...register('duration', { valueAsNumber: true })}
                className={errors.duration ? 'border-red-500' : ''}
              />
              {errors.duration && (
                <p className="text-sm text-red-500">{errors.duration.message}</p>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <Label>Poll Settings</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowMultipleVotes">Allow Multiple Votes</Label>
                  <p className="text-sm text-muted-foreground">
                    Let users select multiple options
                  </p>
                </div>
                <Switch
                  id="allowMultipleVotes"
                  {...register('allowMultipleVotes')}
                />
              </div>
              

            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Poll'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

// Export memoized component to prevent unnecessary re-renders
export const CreatePollForm = memo(CreatePollFormComponent)