# Polling App

A modern, responsive polling application built with Next.js that allows users to create, share, and vote on polls with QR code integration.

## Features

### 🗳️ Core Functionality
- **Create Polls**: Build custom polls with multiple options and descriptions
- **Real-time Voting**: Instant vote counting and result updates
- **Poll Management**: Edit, activate/deactivate, and delete your polls
- **QR Code Sharing**: Generate QR codes for easy poll sharing
- **Secure Authentication**: User registration and login with Supabase Auth
- **Discussion Threads**: Engage in threaded conversations on each poll with nested replies

### 💬 Discussion Threads
The application includes a comprehensive discussion system that allows users to:

- **Threaded Comments**: Create nested discussion threads on any poll
- **Real-time Updates**: See new comments and replies instantly with Supabase real-time
- **User Authentication**: Only authenticated users can participate in discussions
- **Nested Replies**: Support for multi-level comment threading
- **Mobile Responsive**: Optimized discussion interface for all device sizes
- **Moderation Ready**: Built with user permissions and content management in mind

#### Discussion Features
- **Comment Creation**: Add top-level comments to any poll
- **Reply System**: Reply to existing comments with proper threading
- **User Attribution**: All comments show author information and timestamps
- **Real-time Sync**: Comments appear instantly across all connected clients
- **Responsive Design**: Touch-friendly interface optimized for mobile devices

### 📱 Mobile Responsive Design
The application is fully optimized for mobile devices with:

- **Responsive Navigation**: Mobile-friendly hamburger menu with smooth animations
- **Adaptive Layouts**: Flexible grid systems that adjust from mobile to desktop
- **Touch-Optimized Forms**: Mobile-first form design with proper spacing and typography
- **Responsive Cards**: Poll cards that stack vertically on mobile and grid on desktop
- **Mobile-First Typography**: Scalable text sizes (sm:text-base, sm:text-lg, etc.)
- **Flexible Spacing**: Responsive padding and margins (px-4 sm:px-6, py-4 sm:py-6)
- **Optimized Buttons**: Full-width buttons on mobile, auto-width on desktop

#### Mobile Responsive Components
- **Navigation Bar**: Collapsible menu with mobile hamburger toggle
- **Dashboard**: Responsive poll grid (1 column mobile → 2-3 columns desktop)
- **Poll Forms**: Stack vertically on mobile with touch-friendly inputs
- **Vote Interface**: Mobile-optimized voting with clear result visualization
- **Poll Cards**: Responsive layout with proper mobile spacing
- **Discussion Threads**: Mobile-optimized comment interface with touch-friendly interactions

### 🛠️ Technical Features
- **Next.js App Router**: Modern routing with server components
- **Supabase Integration**: PostgreSQL database with real-time subscriptions
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS**: Utility-first styling with responsive design
- **shadcn/ui Components**: Consistent, accessible UI components

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd polling-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # User dashboard
│   ├── polls/            # Poll-related pages
│   └── page.tsx          # Home page
├── components/           # Reusable components
│   ├── ui/              # shadcn/ui components
│   ├── features/        # Feature-specific components
│   │   ├── polls/       # Poll-related components
│   │   └── discussions/ # Discussion thread components
│   └── shared/          # Shared utility components
├── lib/                 # Utilities and configurations
│   ├── database/        # Supabase client and actions
│   │   ├── actions/     # Server actions for data mutations
│   │   └── types.ts     # Database type definitions
│   └── supabase.ts     # Supabase configuration
└── public/             # Static assets
```

## Mobile Responsiveness Implementation

The application uses Tailwind CSS's responsive design system with breakpoints:
- **Mobile**: Default styles (< 640px)
- **Small**: `sm:` prefix (≥ 640px)
- **Medium**: `md:` prefix (≥ 768px)
- **Large**: `lg:` prefix (≥ 1024px)

### Key Responsive Patterns Used:
- `flex-col sm:flex-row` - Stack vertically on mobile, horizontally on desktop
- `w-full sm:w-auto` - Full width on mobile, auto on desktop
- `px-4 sm:px-6` - Smaller padding on mobile, larger on desktop
- `text-sm sm:text-base` - Smaller text on mobile, larger on desktop
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` - Responsive grid layouts

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Language**: TypeScript
- **State Management**: React Server Components + Client Components

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Supabase Documentation](https://supabase.com/docs) - learn about Supabase features
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - learn about utility-first CSS
- [shadcn/ui Documentation](https://ui.shadcn.com/) - learn about the component library

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
