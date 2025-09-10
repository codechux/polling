'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { DeletePollButton } from '@/components/delete-poll-button'

interface Poll {
  id: string
  title: string
  description?: string | null
  created_at: string
  is_active: boolean
  share_token: string
  total_votes?: number
}

interface PollCardProps {
  poll: Poll
}

const PollCardComponent = ({ poll }: PollCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="line-clamp-2">{poll.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          Poll created {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {poll.total_votes || 0} {(poll.total_votes || 0) === 1 ? 'vote' : 'votes'}
          </p>
          <span className={`text-xs px-2 py-1 rounded-full ${
            poll.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}>
            {poll.is_active ? "Active" : "Ended"}
          </span>
        </div>
        {poll.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {poll.description}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/polls/${poll.share_token}`}>View Results</Link>
        </Button>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/polls/edit/${poll.id}`}>Edit</Link>
          </Button>
          <DeletePollButton pollId={poll.id} pollTitle={poll.title} />
        </div>
      </CardFooter>
    </Card>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const PollCard = memo(PollCardComponent)