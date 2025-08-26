import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="max-w-3xl text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Create and Share Polls <span className="text-primary">Instantly</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Get real-time feedback from your audience with our easy-to-use polling platform.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/polls">Browse Polls</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/signin">Get Started</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
