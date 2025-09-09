// biome-ignore-all lint/suspicious/noThenProperty: Tests require adding `then` to objects to simulate thenable behavior for Supabase query builders.
/**
 * Test framework and library: Jest (TypeScript) style with describe/it/expect and jest.fn mocks.
 * If the project uses Vitest, this file remains compatible with minimal changes (vi.fn/vi.mock).
 *
 * Coverage focus: VoteService behaviors for create, findByPollAndUser, hasUserVoted,
 * deleteByPollAndUser, getVoteCountsByOption, getTotalVotes, getUniqueVoters.
 * We mock the Supabase client returned by createSupabaseServerClient.
 */

import { VoteService } from '@/lib/database/services/vote.service'

// Mock the Supabase server client module
jest.mock('@/lib/supabase', () => ({
  createSupabaseServerClient: jest.fn(),
}))

import { createSupabaseServerClient } from '@/lib/supabase'

type SupabaseResult<T> = { data?: T | null; error?: { message: string } | null; count?: number | null }
type ThenableResult<T> = { then: (res: (v: SupabaseResult<T>) => void) => Promise<void> }

// Helper to build a thenable so that "await query" works on the builder (mimics Supabase postgrest builder)
const toThenable = <T>(result: SupabaseResult<T>): ThenableResult<T> => ({
  then: (resolve) => Promise.resolve().then(() => resolve(result)),
})

/**
 * Build a chainable query builder with overridable behavior per test.
 * Each method either returns the same builder (for chaining) or a thenable/promise at the end of the chain,
 * consistent with how VoteService consumes it.
 */
const makeBuilder = (overrides?: Partial<Record<string, any>>) => {
  // default no-op functions; will be overridden per-test
  const builder: any = {
    __kind: 'builder',
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
  }
  // Allow awaiting on the builder in paths where VoteService does "await query"
  builder.then = jest.fn() // Will be replaced per test when needed
  // Apply per-test overrides
  if (overrides) {
    Object.assign(builder, overrides)
  }
  return builder
}

const makeSupabase = (builder: any) => ({
  from: jest.fn().mockImplementation(() => builder),
})

const asThenable = <T>(builder: any, result: SupabaseResult<T>) => {
  builder.then = jest.fn().mockImplementation((resolve: (v: SupabaseResult<T>) => void) =>
    Promise.resolve().then(() => resolve(result))
  )
  return builder
}

describe('VoteService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('create', () => {
    it('creates a vote and returns the created record (happy path)', async () => {
      const created = { id: 'v1', poll_id: 'p1', option_id: 'o1', voter_id: 'u1' }
      const builder = makeBuilder({
        // insert().select().single() --> Promise<{data, error}>
        single: jest.fn().mockResolvedValue({ data: created, error: null }),
      })
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      const result = await VoteService.create({
        poll_id: 'p1',
        option_id: 'o1',
        voter_id: 'u1',
        voter_ip: null,
      } as any)

      expect(result).toEqual(created)
      expect(supabase.from).toHaveBeenCalledWith('votes')
      expect(builder.insert).toHaveBeenCalledWith({
        poll_id: 'p1',
        option_id: 'o1',
        voter_id: 'u1',
        voter_ip: null,
      })
      expect(builder.select).toHaveBeenCalled()
      expect(builder.single).toHaveBeenCalled()
    })

    it('throws when Supabase returns an error', async () => {
      const builder = makeBuilder({
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
      })
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      await expect(
        VoteService.create({ poll_id: 'p1', option_id: 'o1' } as any)
      ).rejects.toThrow('Failed to create vote: insert failed')
    })
  })

  describe('findByPollAndUser', () => {
    it('queries by userId when provided', async () => {
      const data = [{ id: '1' }, { id: '2' }]
      const builder = makeBuilder()
      asThenable(builder, { data, error: null })
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      const result = await VoteService.findByPollAndUser('poll-1', 'user-1', undefined)

      expect(result).toEqual(data)
      expect(supabase.from).toHaveBeenCalledWith('votes')
      expect(builder.select).toHaveBeenCalledWith('*')
      expect(builder.eq).toHaveBeenNthCalledWith(1, 'poll_id', 'poll-1')
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'voter_id', 'user-1')
      expect(builder.then).toHaveBeenCalled()
    })

    it('queries by voterIp when userId absent but voterIp provided', async () => {
      const data = [{ id: '1' }]
      const builder = makeBuilder()
      asThenable(builder, { data, error: null })
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      const result = await VoteService.findByPollAndUser('poll-1', undefined, '127.0.0.1')

      expect(result).toEqual(data)
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'voter_ip', '127.0.0.1')
    })

    it('returns [] when neither userId nor voterIp provided (no identifier)', async () => {
      const builder = makeBuilder()
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      const result = await VoteService.findByPollAndUser('poll-1')

      expect(result).toEqual([])
      // It builds initial chain but should not await execution
      expect(builder.then).not.toHaveBeenCalled()
    })

    it('throws when Supabase returns an error for the query', async () => {
      const builder = makeBuilder()
      asThenable(builder, { data: null, error: { message: 'fetch failed' } })
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      await expect(
        VoteService.findByPollAndUser('poll-1', 'user-1')
      ).rejects.toThrow('Failed to fetch votes: fetch failed')
    })

    it('returns [] when Supabase returns null data (defensive)', async () => {
      const builder = makeBuilder()
      asThenable(builder, { data: null, error: null })
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      const result = await VoteService.findByPollAndUser('poll-1', 'user-1')
      expect(result).toEqual([])
    })
  })

  describe('hasUserVoted', () => {
    it('returns true when at least one vote exists', async () => {
      const spy = jest.spyOn(VoteService, 'findByPollAndUser').mockResolvedValue([{} as any])
      const result = await VoteService.hasUserVoted('p1', 'u1')
      expect(result).toBe(true)
      expect(spy).toHaveBeenCalledWith('p1', 'u1', undefined)
    })

    it('returns false when no votes returned', async () => {
      jest.spyOn(VoteService, 'findByPollAndUser').mockResolvedValue([])
      await expect(VoteService.hasUserVoted('p1', undefined, '1.2.3.4')).resolves.toBe(false)
    })
  })

  describe('deleteByPollAndUser', () => {
    it('deletes by userId (happy path)', async () => {
      const builder = makeBuilder({
        then: undefined,
      })
      // "await query" is not used here; instead, VoteService awaits the promise returned by builder after final call
      // In this path, "const { error } = await query"
      builder.then = jest.fn().mockImplementation((resolve: any) =>
        Promise.resolve().then(() => resolve({ error: null }))
      )
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      await expect(VoteService.deleteByPollAndUser('p1', 'u1')).resolves.toBeUndefined()
      expect(supabase.from).toHaveBeenCalledWith('votes')
      expect(builder.delete).toHaveBeenCalled()
      expect(builder.eq).toHaveBeenNthCalledWith(1, 'poll_id', 'p1')
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'voter_id', 'u1')
    })

    it('deletes by voterIp (happy path)', async () => {
      const builder = makeBuilder()
      builder.then = jest.fn().mockImplementation((resolve: any) =>
        Promise.resolve().then(() => resolve({ error: null }))
      )
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      await expect(VoteService.deleteByPollAndUser('p1', undefined, '9.9.9.9')).resolves.toBeUndefined()
      expect(builder.eq).toHaveBeenNthCalledWith(2, 'voter_ip', '9.9.9.9')
    })

    it('throws when neither userId nor voterIp provided', async () => {
      const builder = makeBuilder()
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      await expect(VoteService.deleteByPollAndUser('p1')).rejects.toThrow(
        'Either userId or voterIp must be provided'
      )
      // Ensure no delete execution awaited
      expect(builder.then).not.toHaveBeenCalled()
    })

    it('throws when Supabase delete returns error', async () => {
      const builder = makeBuilder()
      builder.then = jest.fn().mockImplementation((resolve: any) =>
        Promise.resolve().then(() => resolve({ error: { message: 'delete failed' } }))
      )
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      await expect(VoteService.deleteByPollAndUser('p1', 'u1')).rejects.toThrow(
        'Failed to delete votes: delete failed'
      )
    })
  })

  describe('getVoteCountsByOption', () => {
    it('aggregates counts per option_id', async () => {
      const votes = [
        { option_id: 'A' },
        { option_id: 'B' },
        { option_id: 'A' },
        { option_id: 'C' },
        { option_id: 'B' },
      ]
      const builder = makeBuilder()
      asThenable(builder, { data: votes as any, error: null })
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      const result = await VoteService.getVoteCountsByOption('p1')
      expect(result).toEqual({ A: 2, B: 2, C: 1 })
      expect(builder.select).toHaveBeenCalledWith('option_id')
      expect(builder.eq).toHaveBeenCalledWith('poll_id', 'p1')
    })

    it('throws when Supabase returns an error', async () => {
      const builder = makeBuilder()
      asThenable(builder, { data: null, error: { message: 'select failed' } })
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      await expect(VoteService.getVoteCountsByOption('p1')).rejects.toThrow(
        'Failed to fetch vote counts: select failed'
      )
    })
  })

  describe('getTotalVotes', () => {
    it('returns exact count when provided', async () => {
      const builder = makeBuilder()
      asThenable(builder, { count: 7, error: null, data: null })
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      const result = await VoteService.getTotalVotes('p1')
      expect(result).toBe(7)
      expect(builder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    })

    it('returns 0 when count is null', async () => {
      const builder = makeBuilder()
      asThenable(builder, { count: null, error: null, data: null })
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      const result = await VoteService.getTotalVotes('p1')
      expect(result).toBe(0)
    })

    it('throws when Supabase returns an error', async () => {
      const builder = makeBuilder()
      asThenable(builder, { count: null, error: { message: 'count failed' }, data: null })
      const supabase = makeSupabase(builder)
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      await expect(VoteService.getTotalVotes('p1')).rejects.toThrow(
        'Failed to count votes: count failed'
      )
    })
  })

  describe('getUniqueVoters', () => {
    it('returns counts of unique user and anonymous voters (deduplicated)', async () => {
      // First query: userVotes (voter_id not null)
      const userBuilder = makeBuilder()
      asThenable(userBuilder, {
        data: [{ voter_id: 'u1' }, { voter_id: 'u2' }, { voter_id: 'u1' }] as any,
        error: null,
      })
      // Second query: anonymousVotes (voter_id is null, voter_ip not null)
      const anonBuilder = makeBuilder()
      asThenable(anonBuilder, {
        data: [{ voter_ip: '1.1.1.1' }, { voter_ip: '2.2.2.2' }, { voter_ip: '1.1.1.1' }] as any,
        error: null,
      })

      // Our supabase client should return different builders for sequential .from('votes') calls
      const supabase = {
        from: jest
          .fn()
          .mockImplementationOnce(() => userBuilder)
          .mockImplementationOnce(() => anonBuilder),
      } as any
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      const result = await VoteService.getUniqueVoters('p1')
      expect(result).toEqual({ userVoters: 2, anonymousVoters: 2 })

      // Validate query construction
      expect(supabase.from).toHaveBeenCalledTimes(2)
      expect(userBuilder.select).toHaveBeenCalledWith('voter_id')
      expect(userBuilder.eq).toHaveBeenCalledWith('poll_id', 'p1')
      expect(userBuilder.not).toHaveBeenCalledWith('voter_id', 'is', null)

      expect(anonBuilder.select).toHaveBeenCalledWith('voter_ip')
      expect(anonBuilder.eq).toHaveBeenCalledWith('poll_id', 'p1')
      expect(anonBuilder.is).toHaveBeenCalledWith('voter_id', null)
      expect(anonBuilder.not).toHaveBeenCalledWith('voter_ip', 'is', null)
    })

    it('throws when user votes query errors', async () => {
      const userBuilder = makeBuilder()
      asThenable(userBuilder, { data: null, error: { message: 'user err' } })
      const supabase = { from: jest.fn().mockImplementation(() => userBuilder) } as any
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      await expect(VoteService.getUniqueVoters('p1')).rejects.toThrow(
        'Failed to count user votes: user err'
      )
    })

    it('throws when anonymous votes query errors', async () => {
      const userBuilder = makeBuilder()
      asThenable(userBuilder, { data: [], error: null })

      const anonBuilder = makeBuilder()
      asThenable(anonBuilder, { data: null, error: { message: 'anon err' } })

      const supabase = {
        from: jest.fn().mockImplementationOnce(() => userBuilder).mockImplementationOnce(() => anonBuilder),
      } as any
      ;(createSupabaseServerClient as jest.Mock).mockResolvedValue(supabase)

      await expect(VoteService.getUniqueVoters('p1')).rejects.toThrow(
        'Failed to count anonymous votes: anon err'
      )
    })
  })
})