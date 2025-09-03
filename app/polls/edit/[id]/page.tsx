import { notFound, redirect } from 'next/navigation'
import { updatePoll, getAuthenticatedUser, getSupabaseClient } from '@/lib/database/actions'
import type { Poll } from '@/lib/database/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface EditPollPageProps {
  params: Promise<{ id: string }>
}

// Optimized poll fetching for edit operations
async function getEditablePoll(pollId: string, userId: string): Promise<Pick<Poll, 'id' | 'title' | 'description' | 'is_active' | 'creator_id' | 'share_token'> | null> {
  try {
    const supabase = await getSupabaseClient()
    
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
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Poll</h1>
        <p className="text-muted-foreground mt-2">
          Update your poll details. Note: You cannot modify poll options after creation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Poll Details</CardTitle>
          <CardDescription>
            Make changes to your poll information below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleUpdatePoll} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Poll Title *</Label>
              <Input
                id="title"
                name="title"
                defaultValue={poll.title}
                placeholder="Enter your poll question"
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={poll.description || ''}
                placeholder="Add more context to your poll..."
                maxLength={1000}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={poll.is_active}
              />
              <Label htmlFor="isActive" className="text-sm font-medium">
                Poll is active (users can vote)
              </Label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" className="flex-1">
                Update Poll
              </Button>
              <Button type="button" variant="outline" asChild className="flex-1">
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Poll Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              value={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/polls/${poll.share_token}`}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/polls/${poll.share_token}`)
              }}
            >
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}