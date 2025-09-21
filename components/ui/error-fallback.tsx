'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ErrorFallbackProps {
  title: string
  message: string
  showRetry?: boolean
}

export function ErrorFallback({ title, message, showRetry = true }: ErrorFallbackProps) {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="text-center py-12">
        <CardContent>
          <h2 className="text-xl font-semibold mb-2 text-destructive">{title}</h2>
          <p className="text-muted-foreground mb-4">{message}</p>
          {showRetry && (
            <Button onClick={handleRetry}>
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}