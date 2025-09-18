'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useAuth } from '@/lib/auth-context'
import { User, LogOut, Settings, BarChart3, Menu } from 'lucide-react'

export function Navigation() {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Polling App</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6">
            <Link 
              href="/polls" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Browse Polls
            </Link>
            {user && (
              <>
                <Link 
                  href="/dashboard" 
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/polls/create" 
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Create Poll
                </Link>
              </>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.user_metadata?.full_name && (
                        <p className="font-medium">{user.user_metadata.full_name}</p>
                      )}
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/polls/create" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Create Poll
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Polling App
                </SheetTitle>
                <SheetDescription>
                  Navigate through the app
                </SheetDescription>
              </SheetHeader>
              
              <div className="flex flex-col gap-4 mt-6">
                {/* Navigation Links */}
                <div className="flex flex-col gap-3">
                  <Link 
                    href="/polls" 
                    className="text-sm font-medium transition-colors hover:text-primary p-2 rounded-md hover:bg-accent"
                    onClick={() => setIsOpen(false)}
                  >
                    Browse Polls
                  </Link>
                  {user && (
                    <>
                      <Link 
                        href="/dashboard" 
                        className="text-sm font-medium transition-colors hover:text-primary p-2 rounded-md hover:bg-accent"
                        onClick={() => setIsOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link 
                        href="/polls/create" 
                        className="text-sm font-medium transition-colors hover:text-primary p-2 rounded-md hover:bg-accent"
                        onClick={() => setIsOpen(false)}
                      >
                        Create Poll
                      </Link>
                    </>
                  )}
                </div>

                {/* User Section */}
                <div className="border-t pt-4 mt-4">
                  {user ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 p-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          {user.user_metadata?.full_name && (
                            <p className="text-sm font-medium">{user.user_metadata.full_name}</p>
                          )}
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="justify-start text-red-600 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          signOut()
                          setIsOpen(false)
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button variant="ghost" asChild className="justify-start">
                        <Link href="/auth/signin" onClick={() => setIsOpen(false)}>
                          Sign In
                        </Link>
                      </Button>
                      <Button asChild className="justify-start">
                        <Link href="/auth/signup" onClick={() => setIsOpen(false)}>
                          Sign Up
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}