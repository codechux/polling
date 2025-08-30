# Database Setup Guide

This guide will help you set up the Supabase database schema for the Polling App.

## Prerequisites

- A Supabase account and project
- Supabase CLI installed (optional but recommended)
- Node.js and npm/yarn installed

## Quick Setup

### 1. Environment Variables

1. Copy the environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### 2. Database Schema Setup

You have two options to set up the database schema:

#### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Run migrations:
   ```bash
   supabase db push
   ```

#### Option B: Manual Setup via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each migration file in order:
   - `supabase/migrations/001_create_polls_table.sql`
   - `supabase/migrations/002_create_poll_options_table.sql`
   - `supabase/migrations/003_create_votes_table.sql`
   - `supabase/migrations/004_create_rls_policies.sql`

## Database Schema Overview

### Tables

#### `polls`
- Stores poll information (title, description, settings)
- Each poll has a unique `share_token` for public access
- Includes expiration and voting settings

#### `poll_options`
- Stores the options for each poll
- Linked to polls via `poll_id` foreign key
- Ordered by `order_index`

#### `votes`
- Stores individual votes
- Supports both authenticated and anonymous voting
- Includes validation to prevent duplicate votes

### Security Features

#### Row Level Security (RLS)
All tables have RLS enabled with policies that:
- Allow public read access to active polls
- Restrict write access to poll creators
- Allow voting on active polls
- Protect user privacy for anonymous polls

#### Data Validation
- Polls must have 2-20 options
- Votes are validated against poll settings
- Expired polls cannot receive new votes

## Usage Examples

### Creating a Poll
```typescript
import { createPoll } from '@/lib/database/actions'

// Use in a Server Action
export async function handleCreatePoll(formData: FormData) {
  await createPoll(formData)
}
```

### Fetching Poll Data
```typescript
import { getPollWithResults } from '@/lib/database/queries'

// Use in a Server Component
export default async function PollPage({ params }: { params: { token: string } }) {
  const poll = await getPollWithResults(params.token)
  // Render poll...
}
```

### Submitting a Vote
```typescript
import { submitVote } from '@/lib/database/actions'

// Use in a Server Action
export async function handleVote(formData: FormData) {
  await submitVote(formData)
}
```

## Development Workflow

### Making Schema Changes

1. Create a new migration file in `supabase/migrations/`
2. Use the naming convention: `XXX_description.sql`
3. Test the migration locally
4. Apply to production using `supabase db push`

### Local Development

1. Start the Supabase local development stack:
   ```bash
   supabase start
   ```

2. Your local Supabase will be available at:
   - API: `http://localhost:54321`
   - Dashboard: `http://localhost:54323`

3. Update your `.env.local` to use local URLs during development

## Troubleshooting

### Common Issues

1. **Migration fails**: Check that previous migrations have been applied
2. **RLS blocking queries**: Ensure you're using the correct Supabase client (server vs browser)
3. **Type errors**: Regenerate types with `supabase gen types typescript`

### Regenerating Types

If you make schema changes, update the TypeScript types:

```bash
supabase gen types typescript --local > lib/database/types.ts
```

## Production Deployment

1. Ensure all migrations are applied to your production database
2. Verify RLS policies are working correctly
3. Test with both authenticated and anonymous users
4. Monitor database performance and add indexes as needed

## Support

For issues with this setup:
1. Check the Supabase documentation
2. Review the migration files for any syntax errors
3. Ensure your Supabase project has the required permissions

---

**Note**: This database schema supports the core polling functionality including user authentication, poll creation, voting, and real-time updates. The RLS policies ensure data security while maintaining the flexibility needed for both public and private polls.