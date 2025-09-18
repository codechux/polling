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
    <Card className="h-full flex flex-col">
      <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
        <CardTitle className="line-clamp-2 text-base sm:text-lg">{poll.title}</CardTitle>
        <CardDescription className="line-clamp-2 text-xs sm:text-sm">
          Poll created {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 flex-1">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {poll.total_votes || 0} {(poll.total_votes || 0) === 1 ? 'vote' : 'votes'}
          </p>
          <span className={`text-xs px-2 py-1 rounded-full self-start sm:self-center ${
            poll.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}>
            {poll.is_active ? "Active" : "Ended"}
          </span>
        </div>
        {poll.description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
            {poll.description}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between px-4 sm:px-6 py-4 sm:py-6">
        <Button variant="outline" size="sm" asChild className="w-full sm:w-auto text-xs sm:text-sm">
          <Link href={`/polls/${poll.share_token}`}>View Results</Link>
        </Button>
        <div className="flex gap-1 w-full sm:w-auto">
          <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none text-xs sm:text-sm">
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