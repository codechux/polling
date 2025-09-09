import { NextResponse } from 'next/server'
import {
  getAuthenticatedUser,
  createPoll,
  getUserPolls,
} from '@/lib/database/actions'
import { validateCreatePollData } from '@/lib/database/validation'
import { handleServerError } from '@/lib/utils/error-handler'

/**
 * Handles POST requests to create a new poll for the authenticated user.
 *
 * Validates incoming form data, creates a poll, and returns a JSON response
 * with the created poll on success. Requires an authenticated user.
 *
 * On success: responds with `{ success: true, data: poll }` and a 200-level status.
 * On error: normalizes the error via `handleServerError` and responds with
 * `{ success: false, error: appError.userMessage }` using `appError.statusCode`.
 *
 * @returns A NextResponse containing the JSON result (success with `data` or failure with `error`).
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    const formData = await request.formData()
    const validatedData = validateCreatePollData(formData)
    const poll = await createPoll(formData)
    return NextResponse.json({ success: true, data: poll })
  } catch (error) {
    const appError = handleServerError(error)
    return NextResponse.json(
      { success: false, error: appError.userMessage },
      { status: appError.statusCode }
    )
  }
}

/**
 * GET handler that returns the authenticated user's polls as JSON.
 *
 * Retrieves the current authenticated user, fetches that user's polls, and
 * responds with { success: true, data: polls } on success. On error the thrown
 * error is normalized via `handleServerError` and the response is
 * `{ success: false, error: appError.userMessage }` with the HTTP status set
 * to `appError.statusCode`.
 *
 * @returns A NextResponse with a JSON body containing either the polls on
 * success or a normalized error message and appropriate status code on failure.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    const polls = await getUserPolls()
    return NextResponse.json({ success: true, data: polls })
  } catch (error) {
    const appError = handleServerError(error)
    return NextResponse.json(
      { success: false, error: appError.userMessage },
      { status: appError.statusCode }
    )
  }
}
