/**
 * Tests for PollService focusing on the diffed implementation.
 * Framework: Uses the project's configured test runner (Jest or Vitest) with TS support.
 * - Mocks '@/lib/supabase' createSupabaseServerClient
 * - Mocks VoteService.getVoteCountsByOption
 *
 * The tests cover: create, findById, findByShareToken, findWithResults, findByUserId, update, delete, getRecentPolls, getStats.
 */

import { describe, it, expect, beforeEach, vi as _vi } from 'vitest' // Vitest re-export; in Jest this will be ignored at runtime if not used
// Use whichever global is present: vi (Vitest) or jest (Jest)
const viLike: any = (global as any).vi ?? (global as any).jest ?? _vi

// Module under test
import { PollService } from '@/lib/database/services/poll.service'

// Mock '@/lib/supabase' factory and return a chainable stub
viLike.mock('@/lib/supabase', () => {
  // We'll build a fresh stub per test via factory below
  const state: any = { supabase: null }
  return {
    createSupabaseServerClient: viLike.fn(async () => state.supabase),
    __setSupabaseClient: (client: any) => { state.supabase = client },
    __getState: () => state,
  }
})

// Mock VoteService.getVoteCountsByOption
viLike.mock('@/lib/database/services/vote.service', () => ({
  VoteService: {
    getVoteCountsByOption: viLike.fn(),
  },
}))
import { createSupabaseServerClient, __setSupabaseClient } from '@/lib/supabase'
import { VoteService } from '@/lib/database/services/vote.service'

// Types used in tests (lightweight shims)
type Poll = {
  id: string
  title: string
  created_at?: string
  expires_at?: string | null
  is_active?: boolean
  share_token?: string
  [k: string]: any
}
type PollOption = { id: string; poll_id?: string; text: string; order_index?: number; created_at?: string }
type SupabaseResponse<T> = Promise<{ data: T; error: null } | { data: any; error: { message: string; code?: string } }>

// Helper to build a chainable Supabase query stub for a given terminal response
const makeBuilder = (terminal: any, callSpies?: Record<string, any>) => {
  const spies = {
    from: viLike.fn(),
    select: viLike.fn(),
    insert: viLike.fn(),
    update: viLike.fn(),
    delete: viLike.fn(),
    eq: viLike.fn(),
    order: viLike.fn(),
    limit: viLike.fn(),
    single: viLike.fn(),
  }
  const builder: any = {
    select: spies.select.mockReturnThis(),
    insert: spies.insert.mockReturnThis(),
    update: spies.update.mockReturnThis(),
    delete: spies.delete.mockReturnThis(),
    eq: spies.eq.mockReturnThis(),
    order: spies.order.mockReturnThis(),
    limit: spies.limit.mockImplementation((n: number) => {
      builder.__limit = n
      return terminal.limitReturnsBuilder ? builder : terminal
    }),
    single: spies.single.mockResolvedValue(terminal),
    __limit: undefined as number | undefined,
  }
  const supabase = {
    from: spies.from.mockImplementation((_table: string) => builder),
    __spies: spies,
    __builder: builder,
    __terminal: terminal,
  }
  // allow test access to spies if requested
  if (callSpies) Object.assign(callSpies, spies)
  return supabase
}

beforeEach(() => {
  viLike.clearAllMocks()
})

describe('PollService.create', () => {
  it('creates a poll and returns the created row', async () => {
    const poll: Poll = { id: 'p1', title: 'My Poll' }
    const supabase = makeBuilder(Promise.resolve({ data: poll, error: null }))
    __setSupabaseClient(supabase)
    const result = await PollService.create({ title: 'My Poll' } as any)
    expect(result).toEqual(poll)
    expect((supabase as any).__spies.from).toHaveBeenCalledWith('polls')
    expect((supabase as any).__builder.insert).toHaveBeenCalled()
    expect((supabase as any).__builder.select).toHaveBeenCalled()
    expect((supabase as any).__builder.single).toHaveBeenCalled()
  })

  it('throws on insert error with message', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: { message: 'boom' } }))
    __setSupabaseClient(supabase)
    await expect(PollService.create({ title: 'X' } as any)).rejects.toThrow('Failed to create poll: boom')
  })
})

describe('PollService.findById', () => {
  it('returns poll when found', async () => {
    const poll: Poll = { id: 'p2', title: 'Found' }
    const supabase = makeBuilder(Promise.resolve({ data: poll, error: null }))
    __setSupabaseClient(supabase)
    await expect(PollService.findById('p2')).resolves.toEqual(poll)
    expect((supabase as any).__builder.select).toHaveBeenCalledWith('*')
    expect((supabase as any).__builder.eq).toHaveBeenCalledWith('id', 'p2')
  })

  it('returns null when not found (PGRST116)', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: { message: 'Not found', code: 'PGRST116' } }))
    __setSupabaseClient(supabase)
    await expect(PollService.findById('missing')).resolves.toBeNull()
  })

  it('throws on other errors', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: { message: 'db down', code: 'XX' } }))
    __setSupabaseClient(supabase)
    await expect(PollService.findById('x')).rejects.toThrow('Failed to fetch poll: db down')
  })
})

describe('PollService.findByShareToken', () => {
  it('returns poll with options when found and active', async () => {
    const poll: any = { id: 'p3', title: 'T', poll_options: [{ id: 'o1', text: 'A' }] }
    const supabase = makeBuilder(Promise.resolve({ data: poll, error: null }))
    __setSupabaseClient(supabase)
    const res = await PollService.findByShareToken('sh1')
    expect(res).toEqual(poll)
    expect((supabase as any).__builder.eq).toHaveBeenCalledWith('share_token', 'sh1')
    // ensure active filter applied
    expect((supabase as any).__builder.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('returns null when not found (PGRST116)', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: { message: 'nf', code: 'PGRST116' } }))
    __setSupabaseClient(supabase)
    await expect(PollService.findByShareToken('nope')).resolves.toBeNull()
  })

  it('throws on other errors', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: { message: 'bad', code: 'XX' } }))
    __setSupabaseClient(supabase)
    await expect(PollService.findByShareToken('bad')).rejects.toThrow('Failed to fetch poll: bad')
  })
})

describe('PollService.findWithResults', () => {
  it('returns null when poll not found (PGRST116)', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: { message: 'nf', code: 'PGRST116' } }))
    __setSupabaseClient(supabase)
    await expect(PollService.findWithResults('tok')).resolves.toBeNull()
  })

  it('merges vote counts and totals correctly', async () => {
    const poll: any = {
      id: 'p4',
      title: 'T4',
      poll_options: [
        { id: 'o1', text: 'A' },
        { id: 'o2', text: 'B' },
        { id: 'o3', text: 'C' },
      ],
    }
    const supabase = makeBuilder(Promise.resolve({ data: poll, error: null }))
    __setSupabaseClient(supabase)
    ;(VoteService.getVoteCountsByOption as any).mockResolvedValue({ o1: 2, o3: 5 }) // no entry for o2 -> 0
    const res: any = await PollService.findWithResults('tok')
    expect(VoteService.getVoteCountsByOption).toHaveBeenCalledWith('p4')
    const counts = res.poll_options.map((o: any) => [o.id, o.vote_count])
    expect(counts).toEqual([['o1', 2], ['o2', 0], ['o3', 5]])
    expect(res.total_votes).toBe(7)
  })

  it('throws on poll fetch error (non-116)', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: { message: 'ouch', code: 'XX' } }))
    __setSupabaseClient(supabase)
    await expect(PollService.findWithResults('x')).rejects.toThrow('Failed to fetch poll: ouch')
  })
})

describe('PollService.findByUserId', () => {
  it('maps polls to summaries with total_votes from aggregated votes', async () => {
    const polls = [
      { id: 'a', title: 'A', created_at: 't1', expires_at: null, is_active: true, share_token: 's1', votes: [{ count: 3 }] },
      { id: 'b', title: 'B', created_at: 't2', expires_at: null, is_active: false, share_token: 's2', votes: [] },
      { id: 'c', title: 'C', created_at: 't3', expires_at: null, is_active: true, share_token: 's3' }, // no votes field
    ]
    const terminal = Promise.resolve({ data: polls, error: null })
    // For this chain, there is no .single(); the terminal result should be returned when order() is called last.
    const supabase = makeBuilder(terminal)
    // Adjust builder so that calling order returns terminal result (simulating the end of chain without .single())
    ;(supabase as any).__builder.order = (supabase as any).__spies.order.mockReturnValue(terminal)
    __setSupabaseClient(supabase)
    const res = await PollService.findByUserId('user1')
    expect(res).toEqual([
      { id: 'a', title: 'A', created_at: 't1', expires_at: null, is_active: true, share_token: 's1', total_votes: 3 },
      { id: 'b', title: 'B', created_at: 't2', expires_at: null, is_active: false, share_token: 's2', total_votes: 0 },
      { id: 'c', title: 'C', created_at: 't3', expires_at: null, is_active: true, share_token: 's3', total_votes: 0 },
    ])
    expect((supabase as any).__builder.eq).toHaveBeenCalledWith('created_by', 'user1')
  })

  it('throws on query error', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: { message: 'no', code: 'XX' } }))
    // order returns the terminal error here as well:
    ;(supabase as any).__builder.order = (supabase as any).__spies.order.mockReturnValue(supabase.__terminal)
    __setSupabaseClient(supabase)
    await expect(PollService.findByUserId('u')).rejects.toThrow('Failed to fetch user polls: no')
  })
})

describe('PollService.update', () => {
  it('updates and returns the row', async () => {
    const updated: Poll = { id: 'p5', title: 'New' }
    const supabase = makeBuilder(Promise.resolve({ data: updated, error: null }))
    __setSupabaseClient(supabase)
    const res = await PollService.update('p5', { title: 'New' } as any)
    expect(res).toEqual(updated)
    expect((supabase as any).__builder.update).toHaveBeenCalled()
    expect((supabase as any).__builder.eq).toHaveBeenCalledWith('id', 'p5')
    expect((supabase as any).__builder.single).toHaveBeenCalled()
  })

  it('throws on update error', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: { message: 'fail' } }))
    __setSupabaseClient(supabase)
    await expect(PollService.update('x', { title: 't' } as any)).rejects.toThrow('Failed to update poll: fail')
  })
})

describe('PollService.delete', () => {
  it('deletes without error', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: null }))
    // delete().eq() returns terminal result; simulate chain ending at eq()
    ;(supabase as any).__builder.eq = (supabase as any).__spies.eq.mockReturnValue(Promise.resolve({ error: null }))
    __setSupabaseClient(supabase)
    await expect(PollService.delete('p6')).resolves.toBeUndefined()
    expect((supabase as any).__builder.delete).toHaveBeenCalled()
    expect((supabase as any).__spies.eq).toHaveBeenCalledWith('id', 'p6')
  })

  it('throws on delete error', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: { message: 'cannot' } }))
    ;(supabase as any).__builder.eq = (supabase as any).__spies.eq.mockReturnValue(Promise.resolve({ error: { message: 'cannot' } }))
    __setSupabaseClient(supabase)
    await expect(PollService.delete('p7')).rejects.toThrow('Failed to delete poll: cannot')
  })
})

describe('PollService.getRecentPolls', () => {
  it('returns recent active polls with default limit (10)', async () => {
    const polls: any[] = [{ id: 'p1' }, { id: 'p2' }]
    // For this chain, limit(limit) should return terminal response (no single())
    const terminal = Promise.resolve({ data: polls, error: null })
    const supabase = makeBuilder(terminal)
    // ensure that order returns the builder and limit returns terminal
    ;(supabase as any).__builder.order = (supabase as any).__spies.order.mockReturnThis()
    ;(supabase as any).__builder.limit = (supabase as any).__spies.limit.mockReturnValue(terminal)
    __setSupabaseClient(supabase)
    const res = await PollService.getRecentPolls()
    expect(res).toEqual(polls)
    expect((supabase as any).__builder.eq).toHaveBeenCalledWith('is_active', true)
    expect((supabase as any).__builder.limit).toHaveBeenCalledWith(10)
  })

  it('applies provided limit', async () => {
    const polls: any[] = [{ id: 'p3' }]
    const terminal = Promise.resolve({ data: polls, error: null })
    const supabase = makeBuilder(terminal)
    ;(supabase as any).__builder.order = (supabase as any).__spies.order.mockReturnThis()
    ;(supabase as any).__builder.limit = (supabase as any).__spies.limit.mockReturnValue(terminal)
    __setSupabaseClient(supabase)
    await PollService.getRecentPolls(5)
    expect((supabase as any).__builder.limit).toHaveBeenCalledWith(5)
  })

  it('throws on query error', async () => {
    const terminal = Promise.resolve({ data: null, error: { message: 'oops' } })
    const supabase = makeBuilder(terminal)
    ;(supabase as any).__builder.order = (supabase as any).__spies.order.mockReturnThis()
    ;(supabase as any).__builder.limit = (supabase as any).__spies.limit.mockReturnValue(terminal)
    __setSupabaseClient(supabase)
    await expect(PollService.getRecentPolls()).rejects.toThrow('Failed to fetch recent polls: oops')
  })
})

describe('PollService.getStats', () => {
  it('returns poll, totalVotes and votesOverTime', async () => {
    const poll = { id: 'p8', title: 'Stats' }
    // We need two sequential queries on the same client:
    // First .single() for poll; then .select('created_at') for votes
    const pollTerminal = Promise.resolve({ data: poll, error: null })
    const votesList = [{ created_at: '2024-01-01' }, { created_at: '2024-01-02' }]
    const votesTerminal = Promise.resolve({ data: votesList as any, error: null })

    // Build a specialized supabase stub that returns different terminals for successive chains
    const spies: any = {
      from: viLike.fn(),
      select: viLike.fn(),
      eq: viLike.fn(),
      single: viLike.fn(),
    }
    const pollBuilder: any = {
      select: spies.select.mockReturnThis(),
      eq: spies.eq.mockReturnThis(),
      single: spies.single.mockResolvedValue(pollTerminal),
    }
    const votesBuilder: any = {
      select: spies.select.mockReturnThis(),
      eq: spies.eq.mockReturnThis(),
      // No single() for votes; calling eq returns terminal votes response
    }
    const supabase: any = {
      from: spies.from.mockImplementation((table: string) => {
        if (table === 'polls') return pollBuilder
        if (table === 'votes') {
          // For votes: eq should return the terminal object:
          votesBuilder.eq = spies.eq.mockReturnValue(votesTerminal)
          return votesBuilder
        }
        return pollBuilder
      }),
      __spies: spies,
    }

    __setSupabaseClient(supabase)
    const res = await PollService.getStats('p8')

    expect(res.poll).toEqual(poll)
    expect(res.totalVotes).toBe(2)
    expect(res.votesOverTime).toEqual(['2024-01-01', '2024-01-02'])
    expect((supabase as any).__spies.from).toHaveBeenCalledWith('polls')
    expect((supabase as any).__spies.from).toHaveBeenCalledWith('votes')
  })

  it('throws when poll fetch fails', async () => {
    const supabase = makeBuilder(Promise.resolve({ data: null, error: { message: 'bad poll' } }))
    __setSupabaseClient(supabase)
    await expect(PollService.getStats('x')).rejects.toThrow('Failed to fetch poll: bad poll')
  })

  it('throws when votes fetch fails', async () => {
    // First chain (poll) ok:
    const pollTerminal = Promise.resolve({ data: { id: 'p9' }, error: null })
    // Second chain (votes) errors:
    const votesTerminal = Promise.resolve({ data: null, error: { message: 'bad votes' } })

    const spies: any = { from: viLike.fn(), select: viLike.fn(), eq: viLike.fn(), single: viLike.fn() }
    const pollBuilder: any = {
      select: spies.select.mockReturnThis(),
      eq: spies.eq.mockReturnThis(),
      single: spies.single.mockResolvedValue(pollTerminal),
    }
    const votesBuilder: any = {
      select: spies.select.mockReturnThis(),
      eq: spies.eq.mockReturnThis(),
    }
    const supabase: any = {
      from: spies.from.mockImplementation((table: string) => {
        if (table === 'polls') return pollBuilder
        if (table === 'votes') {
          votesBuilder.eq = spies.eq.mockReturnValue(votesTerminal)
          return votesBuilder
        }
        return pollBuilder
      }),
      __spies: spies,
    }

    __setSupabaseClient(supabase)
    await expect(PollService.getStats('p9')).rejects.toThrow('Failed to fetch votes: bad votes')
  })
})