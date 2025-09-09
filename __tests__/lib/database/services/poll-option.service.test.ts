/* 
  Test framework: Jest (TypeScript). 
  - We mock '@/lib/supabase' factory to return a configurable stub client per test.
  - Focus: CRUD paths, edge cases, error bubbling, not-found handling (PGRST116), reorder/updateMany workflows, and vote counting.
*/

import { jest } from '@jest/globals'

// IMPORTANT: ensure this path matches the service implementation location in the repo.
// If the service file resides elsewhere, update the import accordingly.
import { PollOptionService } from '@/lib/database/services/poll-option.service'

// Mock the Supabase server client factory used by the service
jest.unstable_mockModule('@/lib/supabase', () => {
  return {
    createSupabaseServerClient: jest.fn(() => makeSupabaseStub()),
  }
})

// Re-import after mocking to bind mocks
const { createSupabaseServerClient } = await import('@/lib/supabase')

// Types that mirror what's used by the service
type PollOption = {
  id: string
  poll_id: string
  text: string
  order_index: number
}
type PollOptionInsert = Omit<PollOption, 'id'>
type PollOptionUpdate = Partial<Omit<PollOption, 'id'>>

// Helper to construct a chainable Supabase stub. We expose knobs on globalThis to override per test.
type SupabaseResult<T = any> = { data?: T; error?: { message: string; code?: string }; count?: number }

// Builders -------------------------
function rowAction<T = any>(initial: SupabaseResult<T> = {}) {
  const state: SupabaseResult<T> = { ...initial }
  const api = {
    insert: jest.fn((payload: any) => api),
    update: jest.fn((payload: any) => api),
    delete: jest.fn(() => api),
    select: jest.fn((sel?: any, opts?: any) => {
      // set count/head passthrough for votes counting
      if (opts && typeof opts === 'object') {
        // no-op for stub purposes
      }
      return api
    }),
    single: jest.fn(() => api),
    eq: jest.fn((col: string, val: any) => api),
    order: jest.fn((_col: string, _opts?: any) => api),

    // terminal readouts accessor used by tests to override
    __set: (result: SupabaseResult<T>) => {
      state.data = result.data as any
      state.error = result.error
      ;(state as any).count = (result as any).count
      return api
    },
    // used by the service after chains resolve
    get data() { return state.data as any },
    get error() { return state.error },
    get count() { return (state as any).count as any },
  }
  return api
}

function fromTableRouter() {
  // Table-specific builders we may reuse across calls
  const byTable: Record<string, ReturnType<typeof rowAction>> = {}
  return {
    from: jest.fn((table: string) => {
      if (!byTable[table]) {
        byTable[table] = rowAction()
      }
      return byTable[table]
    }),
    __table: (name: string) => byTable[name] || null,
  }
}

function makeSupabaseStub() {
  const router = fromTableRouter()
  return {
    ...router,
  }
}

// Utilities for fixtures
const optionA: PollOption = { id: 'opt-1', poll_id: 'poll-1', text: 'A', order_index: 0 }
const optionB: PollOption = { id: 'opt-2', poll_id: 'poll-1', text: 'B', order_index: 1 }

// Reset mocks helper
function resetSupabaseMock() {
  jest.resetModules()
}

// Because we used ESM-style jest.unstable_mockModule, we should not use beforeAll rebind imports.
// Each test will program the current stub via the mock factory return value.
describe('PollOptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('create: inserts one option, returns created row', async () => {
    const supabase = (createSupabaseServerClient as jest.Mock).mock.results.at(-1)?.value ?? makeSupabaseStub()
    // Program "poll_options" chain to yield created row
    supabase.__table('poll_options')?.__set({ data: optionA })

    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    const result = await PollOptionService.create({
      poll_id: optionA.poll_id,
      text: optionA.text,
      order_index: optionA.order_index,
    } as PollOptionInsert)

    expect(result).toEqual(optionA)

    // verify chaining calls
    const builder = supabase.__table('poll_options')!
    expect(builder.insert).toHaveBeenCalledWith({
      poll_id: 'poll-1', text: 'A', order_index: 0
    });
    expect(builder.select).toHaveBeenCalled();
    expect(builder.single).toHaveBeenCalled();
  })

  test('create: throws on insert error', async () => {
    const supabase = makeSupabaseStub()
    supabase.__table('poll_options')?.__set({ error: { message: 'db down' } })
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    await expect(PollOptionService.create({
      poll_id: 'poll-x', text: 'T', order_index: 0
    } as PollOptionInsert)).rejects.toThrow('Failed to create poll option: db down')
  })

  test('createMany: inserts multiple options, returns rows', async () => {
    const supabase = makeSupabaseStub()
    supabase.__table('poll_options')?.__set({ data: [optionA, optionB] })
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    const result = await PollOptionService.createMany([
      { poll_id: optionA.poll_id, text: optionA.text, order_index: optionA.order_index },
      { poll_id: optionB.poll_id, text: optionB.text, order_index: optionB.order_index },
    ])

    expect(result).toEqual([optionA, optionB])
    const builder = supabase.__table('poll_options')!
    expect(builder.insert).toHaveBeenCalledTimes(1)
    expect(builder.select).toHaveBeenCalled()
  })

  test('findByPollId: returns [] when data is null', async () => {
    const supabase = makeSupabaseStub()
    supabase.__table('poll_options')?.__set({ data: undefined })
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    const result = await PollOptionService.findByPollId('poll-1')
    expect(result).toEqual([])

    const builder = supabase.__table('poll_options')!
    expect(builder.select).toHaveBeenCalledWith('*')
    expect(builder.eq).toHaveBeenCalledWith('poll_id', 'poll-1')
    expect(builder.order).toHaveBeenCalledWith('order_index', { ascending: true });
  })

  test('findByPollId: throws on error', async () => {
    const supabase = makeSupabaseStub()
    supabase.__table('poll_options')?.__set({ error: { message: 'bad select' } })
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    await expect(PollOptionService.findByPollId('poll-1'))
      .rejects.toThrow('Failed to fetch poll options: bad select')
  })

  test('findById: returns null on not found (PGRST116)', async () => {
    const supabase = makeSupabaseStub()
    supabase.__table('poll_options')?.__set({ error: { message: 'not found', code: 'PGRST116' } })
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    const result = await PollOptionService.findById('missing-id')
    expect(result).toBeNull()
  })

  test('findById: throws on other errors', async () => {
    const supabase = makeSupabaseStub()
    supabase.__table('poll_options')?.__set({ error: { message: 'boom', code: 'XYZ' } })
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    await expect(PollOptionService.findById('id-1')).rejects.toThrow('Failed to fetch poll option: boom')
  })

  test('update: updates by id, returns updated row', async () => {
    const supabase = makeSupabaseStub()
    supabase.__table('poll_options')?.__set({ data: { ...optionA, text: 'New' } })
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    const result = await PollOptionService.update('opt-1', { text: 'New' } as PollOptionUpdate)
    expect(result).toEqual({ ...optionA, text: 'New' })
    const builder = supabase.__table('poll_options')!
    expect(builder.update).toHaveBeenCalledWith({ text: 'New' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'opt-1')
  })

  test('update: throws on error', async () => {
    const supabase = makeSupabaseStub()
    supabase.__table('poll_options')?.__set({ error: { message: 'no update' } })
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    await expect(PollOptionService.update('opt-1', { text: 'bad' } as PollOptionUpdate))
      .rejects.toThrow('Failed to update poll option: no update')
  })

  test('delete: deletes by id, no throw on success', async () => {
    const supabase = makeSupabaseStub()
    // no error means success
    supabase.__table('poll_options')?.__set({})
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    await expect(PollOptionService.delete('opt-1')).resolves.toBeUndefined()
    const builder = supabase.__table('poll_options')!
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', 'opt-1')
  })

  test('delete: throws on error', async () => {
    const supabase = makeSupabaseStub()
    supabase.__table('poll_options')?.__set({ error: { message: 'cannot delete' } })
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    await expect(PollOptionService.delete('opt-1'))
      .rejects.toThrow('Failed to delete poll option: cannot delete')
  })

  test('deleteByPollId: deletes by poll id, throws on error', async () => {
    const supabase = makeSupabaseStub()
    // success path
    supabase.__table('poll_options')?.__set({})
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)
    await expect(PollOptionService.deleteByPollId('poll-1')).resolves.toBeUndefined()
    const builder = supabase.__table('poll_options')!
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('poll_id', 'poll-1')

    // failure path
    const supabase2 = makeSupabaseStub()
    supabase2.__table('poll_options')?.__set({ error: { message: 'cannot delete many' } })
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase2)
    await expect(PollOptionService.deleteByPollId('poll-1'))
      .rejects.toThrow('Failed to delete poll options: cannot delete many')
  })

  test('updateMany: deletes existing then creates new in order', async () => {
    // updateMany uses two internal calls:
    // 1) deleteByPollId (requires getSupabaseClient() once)
    // 2) createMany (requires another getSupabaseClient() once)
    // We need the factory to return two different stubs in sequence.
    const supabaseDelete = makeSupabaseStub()
    supabaseDelete.__table('poll_options')?.__set({}) // delete ok
    const supabaseInsert = makeSupabaseStub()
    const newRows = [
      { id: 'x1', poll_id: 'poll-2', text: 'X', order_index: 0 },
      { id: 'x2', poll_id: 'poll-2', text: 'Y', order_index: 1 },
    ]
    supabaseInsert.__table('poll_options')?.__set({ data: newRows })
    ;(createSupabaseServerClient as jest.Mock)
      .mockReturnValueOnce(supabaseDelete)
      .mockReturnValueOnce(supabaseInsert)

    const result = await PollOptionService.updateMany('poll-2', [
      { text: 'X', order_index: 0 },
      { text: 'Y', order_index: 1 },
    ])

    expect(result).toEqual(newRows)
    const insertBuilder = supabaseInsert.__table('poll-options')!
    expect(insertBuilder.insert).toHaveBeenCalledWith([
      { poll_id: 'poll-2', text: 'X', order_index: 0 },
      { poll_id: 'poll-2', text: 'Y', order_index: 1 }
    ]);
  })

  test('reorderOptions: updates order for each id; throws on first error', async () => {
    const pollId = 'poll-1'
    const orderIds = ['opt-1', 'opt-2', 'opt-3']

    // Promise.all over updates; we need each update call to produce an entry in results.
    // We'll simulate first two ok, third error.
    const supabase = makeSupabaseStub()

    // For this operation, service constructs updates via the same supabase stub,
    // so we need each call to .from('poll_options').update(...).eq(...).eq(...) to return a result object
    // with shape { error?: ... }. We emulate by hooking __table('poll_options') state transitions.

    // We'll not rely on internal state; instead, we mock .update to return objects with error fields upon await.
    const table = supabase.__table('poll_options')!
    // Patch methods to return per-call results
    const updateMock = jest.fn()
    const eqMock = jest.fn()
    // chain returns table itself
    ;(table.update as any) = updateMock.mockImplementation((_payload: any) => table)
    ;(table.eq as any) = eqMock.mockImplementation((_col: string, _val: any) => table)

    // Mock Promise.all payload production: PollOptionService collects "results" by awaiting the terminal chain call result.
    // Our stub needs to resolve to objects with error fields; easiest path: after Promise.all(updates), service reads .error from each result.
    // Return values from supabase operations in our stub will be objects with { error?: ... }.
    const callResults: Array<{ error?: { message: string } }> = [{}, {}, { error: { message: 'bad update' } }]
    // Intercept when Promise.all(updates) awaits; we have no direct hook, so instead we override global Promise.all within this test scope.
    const originalAll = Promise.all
    // Monkey-patch Promise.all to inject our fake results
    ;(Promise.all as any) = (promises: any[]) => {
      // Ensure we created as many updates as option ids
      expect(updateMock).toHaveBeenCalledTimes(orderIds.length)
      return Promise.resolve(callResults)
    }

    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    await expect(PollOptionService.reorderOptions(pollId, orderIds))
      .rejects.toThrow('Failed to reorder options: bad update')

    // restore Promise.all
    ;(Promise.all as any) = originalAll
  })

  test('reorderOptions: succeeds when all updates ok', async () => {
    const pollId = 'poll-1'
    const orderIds = ['opt-1', 'opt-2']

    const supabase = makeSupabaseStub()
    const table = supabase.__table('poll_options')!
    ;(table.update as any) = jest.fn(() => table)
    ;(table.eq as any) = jest.fn(() => table)

    const originalAll = Promise.all
    ;(Promise.all as any) = (_promises: any[]) => Promise.resolve([{}, {}])
    ;(createSupabaseServerClient as jest.Mock).mockReturnValueOnce(supabase)

    await expect(PollOptionService.reorderOptions(pollId, orderIds)).resolves.toBeUndefined()

    ;(Promise.all as any) = originalAll
  })

  test('getOptionWithVoteCount: returns option merged with exact vote count', async () => {
    // Two clients are created: one inside getOptionWithVoteCount (for votes) and another via findById.
    const supabaseForVotes = makeSupabaseStub()
    const supabaseForFind = makeSupabaseStub()

    // findById chain should return optionA
    supabaseForFind.__table('poll_options')?.__set({ data: optionA })
    // votes count select should return count: 7
    supabaseForVotes.__table('votes')?.__set({ count: 7 })

    ;(createSupabaseServerClient as jest.Mock)
      .mockReturnValueOnce(supabaseForVotes) // first in getOptionWithVoteCount
      .mockReturnValueOnce(supabaseForFind)  // inside findById

    const result = await PollOptionService.getOptionWithVoteCount('opt-1')
    expect(result).toEqual({ ...optionA, vote_count: 7 })

    const votesBuilder = supabaseForVotes.__table('votes')!
    expect(votesBuilder.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(votesBuilder.eq).toHaveBeenCalledWith('option_id', 'opt-1')
  })

  test('getOptionWithVoteCount: throws if option not found', async () => {
    const supabaseForVotes = makeSupabaseStub()
    const supabaseForFind = makeSupabaseStub()
    // findById returns null via not-found error
    supabaseForFind.__table('poll_options')?.__set({ error: { message: 'nf', code: 'PGRST116' } })
    ;(createSupabaseServerClient as jest.Mock)
      .mockReturnValueOnce(supabaseForVotes)
      .mockReturnValueOnce(supabaseForFind)

    await expect(PollOptionService.getOptionWithVoteCount('missing'))
      .rejects.toThrow('Poll option not found')
  })

  test('getOptionWithVoteCount: throws on votes count error', async () => {
    const supabaseForVotes = makeSupabaseStub()
    const supabaseForFind = makeSupabaseStub()
    supabaseForFind.__table('poll_options')?.__set({ data: optionA })
    supabaseForVotes.__table('votes')?.__set({ error: { message: 'count failed' } })
    ;(createSupabaseServerClient as jest.Mock)
      .mockReturnValueOnce(supabaseForVotes)
      .mockReturnValueOnce(supabaseForFind)

    await expect(PollOptionService.getOptionWithVoteCount('opt-1'))
      .rejects.toThrow('Failed to count votes: count failed')
  })
})