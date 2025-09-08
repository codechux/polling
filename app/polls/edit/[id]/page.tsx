import { notFound, redirect } from 'next/navigation'
import { updatePoll, getAuthenticatedUser } from '@/lib/database/actions'
import { createSupabaseServerClient } from '@/lib/supabase'
import type { Poll } from '@/lib/database/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import Link from 'next/link'
import { ArrowLeft, Copy } from 'lucide-react'

interface EditPollPageProps {
  params: Promise<{ id: string }>
}

// Optimized poll fetching for edit operations
async function getEditablePoll(pollId: string, userId: string): Promise<Pick<Poll, 'id' | 'title' | 'description' | 'is_active' | 'creator_id' | 'share_token'> | null> {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data: poll, error } = await supabase
      .from('polls')
      .select('id, title, description, is_active, creator_id, share_token')
      .eq('id', pollId)
      .eq('creator_id', userId)
      .single()

    if (error || !poll) {
      return null
    }

    return poll
  } catch (error) {
    console.error('Error fetching editable poll:', error)
    return null
  }
}

export default async function EditPollPage({ params }: EditPollPageProps) {
  const { id } = await params
  
  // Get authenticated user using centralized helper
  let user
  try {
    user = await getAuthenticatedUser()
  } catch {
    redirect('/auth/signin')
  }

  // Get poll data with optimized query
  const poll = await getEditablePoll(id, user.id)
  
  if (!poll) {
    notFound()
  }

  async function handleUpdatePoll(formData: FormData) {
    'use server'
    await updatePoll(id, formData)
    redirect('/dashboard')
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <div className="mb-6">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Edit Poll</h1>
        <p className="text-muted-foreground mt-2">
          Update your poll settings and manage its status.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Poll Details</CardTitle>
            <CardDescription>
              Modify your poll's title, description, and status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleUpdatePoll} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Poll Title</Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  required
                  defaultValue={poll.title}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={poll.description || ''}
                  className="w-full"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  name="isActive"
                  defaultChecked={poll.is_active}
                />
                <Label htmlFor="isActive">Poll is active</Label>
              </div>

              <Button type="submit" className="w-full">
                Update Poll
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Share Poll</CardTitle>
            <CardDescription>
              Share this link with others to collect votes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                readOnly
                value={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/polls/${poll.share_token}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/polls/${poll.share_token}`)
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}