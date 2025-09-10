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

// Type-safe FormData extraction helpers
function getFormDataString(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return typeof value === 'string' ? value : null
}

function getFormDataStringArray(formData: FormData, key: string): string[] {
  const values = formData.getAll(key)
  return values.filter((value): value is string => typeof value === 'string')
}

function getFormDataBoolean(formData: FormData, key: string): boolean {
  const value = formData.get(key)
  return value === 'true'
}

function getFormDataDate(formData: FormData, key: string): Date | undefined {
  const value = getFormDataString(formData, key)
  if (!value) return undefined
  
  const date = new Date(value)
  return isNaN(date.getTime()) ? undefined : date
}

// Validation helpers with proper type safety
export function validateCreatePollData(formData: FormData) {
  const title = getFormDataString(formData, 'title')
  const description = getFormDataString(formData, 'description')
  const options = getFormDataStringArray(formData, 'options')
  const allowMultiple = getFormDataBoolean(formData, 'allowMultiple')
  const expiresAt = getFormDataDate(formData, 'expiresAt')

  if (!title) {
    throw new Error('Title is required')
  }

  const rawData = {
    title,
    description: description || undefined,
    options,
    allowMultiple,
    expiresAt
  }
  
  return createPollSchema.parse(rawData)
}

export function validateSubmitVoteData(formData: FormData) {
  const pollId = getFormDataString(formData, 'pollId')
  const optionId = getFormDataString(formData, 'optionId')

  if (!pollId || !optionId) {
    throw new Error('Poll ID and Option ID are required')
  }

  const rawData = {
    pollId,
    optionId
  }
  
  return voteSchema.parse(rawData)
}

export function validateUpdatePollData(formData: FormData) {
  const title = getFormDataString(formData, 'title')
  const description = getFormDataString(formData, 'description')
  const options = getFormDataStringArray(formData, 'options')
  const allowMultiple = getFormDataBoolean(formData, 'allowMultiple')
  const expiresAt = getFormDataDate(formData, 'expiresAt')

  if (!title) {
    throw new Error('Title is required')
  }

  const rawData = {
    title,
    description: description || undefined,
    options,
    allowMultiple,
    expiresAt
  }
  
  return updatePollSchema.parse(rawData)
}