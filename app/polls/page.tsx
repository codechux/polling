'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PollsPage() {
  return (
    <div className="container mx-auto py-6 sm:py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Public Polls</h1>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/polls/create">Create New Poll</Link>
        </Button>
      </div>
      
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">No polls available</CardTitle>
            <CardDescription className="text-sm sm:text-base">Be the first to create a poll!</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Button asChild className="w-full text-sm sm:text-base">
              <Link href="/polls/create">Create Poll</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}