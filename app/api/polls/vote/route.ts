import { NextResponse } from 'next/server'
import { getOptionalUser } from '@/lib/database/actions'
import { validateSubmitVoteData } from '@/lib/database/validation'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const user = await getOptionalUser()
    const formData = await request.formData()
    const validatedData = validateSubmitVoteData(formData)
    
    const supabase = await createSupabaseServerClient()
    
    // Submit vote
    const { error } = await supabase
      .from('votes')
      .insert({
        poll_id: validatedData.pollId,
        option_id: validatedData.optionId,
        voter_id: user?.id || null
      })
    
    if (error) {
      throw new Error(`Failed to submit vote: ${error.message}`)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 })
  }
}
