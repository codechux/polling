import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProtectedRoute }  from "@/components/protected-route";
import { getUserPolls } from "@/lib/database/actions";
import { PollCard } from "@/components/features/polls/PollCard";
import { ErrorBoundary } from "@/components/error-boundary";
import { handleServerError } from "@/lib/utils/error-handler";

// Force dynamic rendering
export const dynamic = 'force-dynamic'

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
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    const appError = handleServerError(error)
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center py-12">
          <CardContent>
            <h2 className="text-xl font-semibold mb-2 text-destructive">Unable to load polls</h2>
            <p className="text-muted-foreground mb-4">
              {appError.userMessage}
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
  