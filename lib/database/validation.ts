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

/**
 * Retrieves a string value for a given key from a FormData object.
 *
 * Returns the string when the entry exists and is a string; returns `null` if the entry is missing or not a string.
 *
 * @param formData - The FormData to read from.
 * @param key - The key of the entry to retrieve.
 * @returns The string value for `key`, or `null` if absent or non-string.
 */
function getFormDataString(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  return typeof value === 'string' ? value : null
}

/**
 * Returns all string values for a given key from a FormData object.
 *
 * Non-string entries (e.g., File objects) are filtered out; if no string values exist, an empty array is returned.
 *
 * @param formData - The FormData to read from.
 * @param key - The form field name whose values should be returned.
 * @returns An array of string values for the specified key.
 */
function getFormDataStringArray(formData: FormData, key: string): string[] {
  const values = formData.getAll(key)
  return values.filter((value): value is string => typeof value === 'string')
}

/**
 * Reads a FormData entry and returns true only if its value is the exact string `'true'`.
 *
 * Treats any other value — including `null`, `'false'`, empty string, or different casing — as `false`.
 *
 * @param key - The FormData field name to read.
 * @returns `true` if the field's value is the string `'true'`; otherwise `false`.
 */
function getFormDataBoolean(formData: FormData, key: string): boolean {
  const value = formData.get(key)
  return value === 'true'
}

/**
 * Parse a date string from FormData and return a Date or undefined.
 *
 * Looks up the value for `key` in `formData` and returns a Date when the value is a valid date string.
 * Returns `undefined` if the field is missing or cannot be parsed as a valid date.
 *
 * @param formData - Source FormData containing the field.
 * @param key - Field name to read from `formData`.
 * @returns A Date if the field exists and is valid; otherwise `undefined`.
 */
function getFormDataDate(formData: FormData, key: string): Date | undefined {
  const value = getFormDataString(formData, key)
  if (!value) return undefined
  
  const date = new Date(value)
  return isNaN(date.getTime()) ? undefined : date
}

/**
 * Validates and parses poll creation data from a FormData submission.
 *
 * Extracts `title`, `description`, `options`, `allowMultiple`, and `expiresAt` using type-safe helpers,
 * requires a non-empty `title`, and validates the assembled object against `createPollSchema`.
 *
 * @returns The validated poll creation data.
 * @throws Error If `title` is missing or if schema validation fails.
 */
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

/**
 * Validate and parse vote submission data from a FormData object.
 *
 * Extracts `pollId` and `optionId` from `formData`, ensures both are present,
 * and validates the resulting object against `voteSchema`.
 *
 * @param formData - FormData containing `pollId` and `optionId` fields
 * @returns The parsed and validated vote object from `voteSchema`
 * @throws Error if `pollId` or `optionId` is missing
 */
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

/**
 * Validate and parse FormData for updating a poll.
 *
 * Extracts `title`, `description`, `options`, `allowMultiple`, and `expiresAt` from the provided
 * FormData, requires `title` to be present, and returns the result of `updatePollSchema.parse`.
 *
 * @param formData - FormData containing poll fields (keys: 'title', 'description', 'options', 'allowMultiple', 'expiresAt')
 * @returns The validated update-poll object produced by `updatePollSchema.parse`
 * @throws Error if `title` is missing
 */
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