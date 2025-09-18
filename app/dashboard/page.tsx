import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProtectedRoute }  from "@/components/protected-route";
import { getUserPolls } from "@/lib/database/actions";
import { PollCard } from "@/components/features/polls/PollCard";
import { ErrorBoundary } from "@/components/error-boundary";
import { ErrorFallback } from "@/components/ui/error-fallback";
import { handleServerError } from "@/lib/utils/error-handler";
import { Plus, BarChart3 } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

async function DashboardContent() {
  try {
    const polls = await getUserPolls();
    
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Polls</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage and track your polls
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/polls/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Poll
            </Link>
          </Button>
        </div>

        {polls.length === 0 ? (
          <Card className="text-center py-8 sm:py-12">
            <CardContent className="px-4 sm:px-6">
              <div className="mx-auto max-w-sm">
                <BarChart3 className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No polls yet</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-6">
                  Get started by creating your first poll to collect opinions and feedback.
                </p>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/polls/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Poll
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
      <ErrorFallback 
        title="Unable to load polls"
        message={appError.userMessage}
      />
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
  