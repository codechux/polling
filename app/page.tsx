import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, Share2, QrCode } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Create & Share Polls
            <span className="text-blue-600 dark:text-blue-400"> Instantly</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Build engaging polls, collect responses, and share results with QR codes. 
            Perfect for events, classrooms, and team decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link href="/polls/create">Create Your First Poll</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
              <Link href="/polls">Browse Polls</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Real-time Results</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Watch votes come in live with instant result updates
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <QrCode className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>QR Code Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate QR codes for easy poll access at events
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Anonymous Voting</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Allow anonymous participation or require authentication
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Share2 className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <CardTitle>Easy Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Share polls via links, QR codes, or social media
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Join thousands of users creating engaging polls every day
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-3">
            <Link href="/auth/signup">Sign Up Free</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
