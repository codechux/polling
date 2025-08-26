import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data for polls
const mockPolls = [
  { id: 1, title: "Favorite Programming Language", votes: 120, created: "2 days ago" },
  { id: 2, title: "Best Frontend Framework", votes: 85, created: "1 week ago" },
  { id: 3, title: "Most Anticipated Tech of 2024", votes: 64, created: "3 days ago" },
];

export default function PollsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Available Polls</h1>
        <Button asChild>
          <Link href="/polls/create">Create New Poll</Link>
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockPolls.map((poll) => (
          <Card key={poll.id}>
            <CardHeader>
              <CardTitle>{poll.title}</CardTitle>
              <CardDescription>Created {poll.created}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{poll.votes} votes so far</p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/polls/${poll.id}`}>View Poll</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}