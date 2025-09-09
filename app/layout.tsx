'use client'

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Navigation } from "@/components/layout/Navigation";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "Polling App",
//   description: "Create and participate in polls",
/**
 * Root HTML layout for the application.
 *
 * Renders the top-level document structure including the HTML and body tags,
 * applies the Inter font class to the body, and wraps page content with
 * authentication and UI infrastructure.
 *
 * The layout provides:
 * - AuthProvider: authentication context for descendants
 * - Navigation: site navigation bar
 * - main: container for the route's `children`
 * - Toaster: global toast notification UI
 *
 * @param children - Page content to be rendered inside the layout's `<main>` element.
 * @returns The root JSX element containing the full app layout.
 */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <AuthProvider>
          <Navigation />
          <main>{children}</main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
