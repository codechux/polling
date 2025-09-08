import { z } from 'zod'

// Validation schemas
export const createPollSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options are required').max(10, 'Maximum 10 options allowed'),
  allowMultiple: z.boolean().default(false),
  expiresAt: z.date().optional()
})

export const voteSchema = z.object({
  pollId: z.string().uuid('Invalid poll ID'),
  optionId: z.string().uuid('Invalid option ID')
})

export const updatePollSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options are required').max(10, 'Maximum 10 options allowed'),
  allowMultiple: z.boolean().default(false),
  expiresAt: z.date().optional()
})

// Validation helpers
export function validateCreatePollData(formData: FormData) {
  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string || undefined,
    options: formData.getAll('options') as string[],
    allowMultiple: formData.get('allowMultiple') === 'true',
    expiresAt: formData.get('expiresAt') ? new Date(formData.get('expiresAt') as string) : undefined
  }
  
  return createPollSchema.parse(rawData)
}

export function validateSubmitVoteData(formData: FormData) {
  const rawData = {
    pollId: formData.get('pollId') as string,
    optionId: formData.get('optionId') as string,
  }
  
  return voteSchema.parse(rawData)
}

export function validateUpdatePollData(formData: FormData) {
  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string || undefined,
    options: formData.getAll('options') as string[],
    allowMultiple: formData.get('allowMultiple') === 'true',
    expiresAt: formData.get('expiresAt') ? new Date(formData.get('expiresAt') as string) : undefined
  }
  
  return updatePollSchema.parse(rawData)
}