import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function CreatePoll() {
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Poll</CardTitle>
          <CardDescription>Set up your question and options</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="question">Poll Question</Label>
                <Input id="question" placeholder="What is your favorite...?" />
              </div>
              
              <div>
                <Label>Poll Options</Label>
                <div className="grid gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <Input placeholder="Option 1" />
                    <Button variant="outline" size="icon" type="button">+</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Option 2" />
                    <Button variant="outline" size="icon" type="button">+</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Option 3" />
                    <Button variant="outline" size="icon" type="button">+</Button>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="duration">Poll Duration</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">1 week</option>
                  <option value="30">1 month</option>
                </select>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/polls">Cancel</Link>
          </Button>
          <Button>Create Poll</Button>
        </CardFooter>
      </Card>
    </div>
  );
}