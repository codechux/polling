import { NextResponse } from 'next/server'
import {
  getAuthenticatedUser,
  createPoll,
  getUserPolls,
} from '@/lib/database/actions'
import { validateCreatePollData } from '@/lib/database/validation'

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    const formData = await request.formData()
    const validatedData = validateCreatePollData(formData)
    const poll = await createPoll(formData)
    return NextResponse.json({ success: true, data: poll })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 })
  }
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    const polls = await getUserPolls()
    return NextResponse.json({ success: true, data: polls })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 401 })
  }
}
