import { NextResponse } from 'next/server'
import {
  getAuthenticatedUser,
  updatePoll,
  deletePoll,
} from '@/lib/database/actions'
import { validateUpdatePollData } from '@/lib/database/validation'

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    const params = await context.params
    const pollId = params.id
    const formData = await request.formData()
    await updatePoll(pollId, formData)
    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    const params = await context.params
    const pollId = params.id
    await deletePoll(pollId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 })
  }
}
