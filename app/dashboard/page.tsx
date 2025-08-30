import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtectedRoute }  from "@/components/protected-route";
import { getUserPolls } from "@/lib/database/actions";
import { formatDistanceToNow } from "date-fns";
import { DeletePollButton } from "@/components/delete-poll-button";
import { ErrorBoundary } from "@/components/error-boundary";

async function DashboardContent() {
  try {
    const polls = await getUserPolls();
    
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold ml-5 md:block hidden">Dashboard</h1>
          <Button asChild className="mx-auto md:m-0">
            <Link href="/polls/create">Create New Poll</Link>
          </Button>
        </div>
        
        {polls.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-xl font-semibold mb-2">No polls yet</h2>
              <p className="text-muted-foreground mb-4">
                Create your first poll to get started!
              </p>
              <Button asChild>
                <Link href="/polls/create">Create Your First Poll</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {polls.map((poll) => (
              <Card key={poll.id}>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{poll.title}</CardTitle>
                  <CardDescription>
                    Created {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {poll.voteCount} {poll.voteCount === 1 ? 'vote' : 'votes'}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      poll.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {poll.status === "active" ? "Active" : "Ended"}
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
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center py-12">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2 text-destructive">Unable to load polls</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred while loading your polls.'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
  