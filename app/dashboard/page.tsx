import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data for user's polls
const userPolls = [
  { id: 1, title: "Favorite Programming Language", votes: 120, created: "2 days ago", status: "active" },
  { id: 2, title: "Best Frontend Framework", votes: 85, created: "1 week ago", status: "active" },
  { id: 3, title: "Most Anticipated Tech of 2024", votes: 64, created: "3 days ago", status: "ended" },
];

export default function Dashboard() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Dashboard</h1>
        <Button asChild>
          <Link href="/polls/create">Create New Poll</Link>
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userPolls.map((poll) => (
          <Card key={poll.id}>
            <CardHeader>
              <CardTitle>{poll.title}</CardTitle>
              <CardDescription>Created {poll.created}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between">
                <p className="text-sm text-muted-foreground">{poll.votes} votes</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  poll.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                }`}>
                  {poll.status === "active" ? "Active" : "Ended"}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href={`/polls/${poll.id}`}>View Results</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/polls/${poll.id}/edit`}>Edit</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}