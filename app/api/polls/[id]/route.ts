import { NextResponse } from 'next/server'
import {
  getAuthenticatedUser,
  updatePoll,
  deletePoll,
} from '@/lib/database/actions'
import { validateUpdatePollData } from '@/lib/database/validation'
import { handleServerError } from '@/lib/utils/error-handler'

/**
 * Updates a poll using form data from the incoming request and returns a JSON result.
 *
 * Authenticates the caller, reads the route `id` from `context.params`, parses form data
 * from `request`, and applies updates via `updatePoll`. On success returns `{ success: true }`.
 * On error the function maps the error with `handleServerError` and returns
 * `{ success: false, error: string }` with the mapped HTTP status code.
 *
 * @param request - The incoming HTTP request; form data used to update the poll.
 * @param context - Route context whose `params` promise resolves to an object containing `id` (the poll identifier).
 * @returns A NextResponse containing a JSON body with `{ success: boolean }` and, on error, an `error` message and an appropriate HTTP status.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    const params = await context.params
    const pollId = params.id
    const formData = await request.formData()
    await updatePoll(pollId, formData)
    return NextResponse.json({ success: true })
  } catch (error) {
    const appError = handleServerError(error)
    return NextResponse.json(
      { success: false, error: appError.userMessage },
      { status: appError.statusCode }
    )
  }
}

/**
 * HTTP DELETE handler that deletes a poll identified by the route `id`.
 *
 * Authenticates the request, reads `id` from `context.params`, calls `deletePoll(id)`,
 * and returns a JSON response. On success responds with `{ success: true }`.
 * On failure converts the error via `handleServerError` and returns
 * `{ success: false, error: string }` with the corresponding HTTP status code.
 *
 * @param context.params - A promise resolving to the route parameters object containing `id`.
 * @returns A NextResponse with a JSON body indicating success or an error message and appropriate status.
 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    const params = await context.params
    const pollId = params.id
    await deletePoll(pollId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const appError = handleServerError(error)
    return NextResponse.json(
      { success: false, error: appError.userMessage },
      { status: appError.statusCode }
    )
  }
}
