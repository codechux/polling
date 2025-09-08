import { createPoll, submitVote, updatePoll, deletePoll, getUserPolls } from '../../../lib/database/actions'
import { createSupabaseServerClient } from '../../../lib/supabase'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Mock the modules
jest.mock('../../../lib/supabase')
jest.mock('next/cache')
jest.mock('next/navigation')

const mockSupabase = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>

describe('Database Actions', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn()
    }
    
    mockSupabase.mockResolvedValue(mockSupabaseClient)
  })

  describe('createPoll', () => {
    it('should create a poll successfully', async () => {
      // Mock auth.getUser to return a user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      // Mock successful poll creation
      const mockPoll = {
        id: 'poll-123',
        share_token: 'token-123'
      }
      
      // Create mock chains for polls and poll_options
      const pollsChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockPoll,
          error: null
        })
      }
      
      const pollOptionsChain = {
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      }
      
      // Mock the from method to return appropriate chains
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'polls') return pollsChain
        if (table === 'poll_options') return pollOptionsChain
        return pollsChain
      })

      // Create form data
      const formData = new FormData()
      formData.append('title', 'Test Poll')
      formData.append('description', 'Test Description')
      formData.append('options', 'Option 1')
      formData.append('options', 'Option 2')
      formData.append('expiresAt', new Date().toISOString())
      formData.append('allowMultiple', 'false')

      await createPoll(formData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('polls')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('poll_options')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
      expect(mockRedirect).toHaveBeenCalledWith(expect.stringMatching(/\/polls\/[0-9a-f-]{36}/))
    })

    it('should throw error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const formData = new FormData()
      formData.append('title', 'Test Poll')
      formData.append('options', 'Option 1')
      formData.append('options', 'Option 2')

      await expect(createPoll(formData)).rejects.toThrow('Authentication required')
    })

    it('should throw error when title is missing', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const formData = new FormData()
      formData.append('options', 'Option 1')
      formData.append('options', 'Option 2')

      await expect(createPoll(formData)).rejects.toThrow()
    })

    it('should throw error when less than 2 options provided', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const formData = new FormData()
      formData.append('title', 'Test Poll')
      formData.append('options', 'Option 1')

      await expect(createPoll(formData)).rejects.toThrow()
    })
  })

  describe('submitVote', () => {
    it('should submit vote successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      // Create mock chains for both votes and polls tables
      const voteChain = {
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      }
      
      const pollChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { share_token: 'token-123' },
          error: null
        })
      }
      
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'votes') return voteChain
        if (table === 'polls') return pollChain
        return {}
      })

      const formData = new FormData()
      formData.append('pollId', '123e4567-e89b-12d3-a456-426614174000')
      formData.append('optionId', '123e4567-e89b-12d3-a456-426614174001')
      formData.append('shareToken', 'token-123')

      await submitVote(formData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('votes')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/polls/token-123')
    })

    it('should throw error with invalid poll ID', async () => {
      const formData = new FormData()
      formData.append('pollId', 'invalid-id')
      formData.append('optionId', '123e4567-e89b-12d3-a456-426614174001')

      await expect(submitVote(formData)).rejects.toThrow()
    })
  })

  describe('updatePoll', () => {
    it('should update poll successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      // Create a mock chain that handles multiple eq calls
      const updateChain = {
        update: jest.fn(),
        eq: jest.fn()
      }
      
      // Set up the chaining: update returns chain, first eq returns chain, second eq resolves
      updateChain.update.mockReturnValue(updateChain)
      updateChain.eq.mockReturnValueOnce(updateChain).mockResolvedValueOnce({ error: null })
      
      mockSupabaseClient.from.mockReturnValue(updateChain)

      const formData = new FormData()
      formData.append('title', 'Updated Poll Title')
      formData.append('description', 'Updated Description')
      formData.append('isActive', 'true')
      formData.append('options', 'Option 1')
      formData.append('options', 'Option 2')
      formData.append('allowMultiple', 'false')

      await updatePoll('poll-123', formData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('polls')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/polls/poll-123')
    })

    it('should throw error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const formData = new FormData()
      formData.append('title', 'Updated Poll Title')

      await expect(updatePoll('poll-123', formData)).rejects.toThrow('Authentication required')
    })
  })

  describe('deletePoll', () => {
    it('should delete poll successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      // Create a mock chain that handles multiple eq calls
      const deleteChain = {
        delete: jest.fn(),
        eq: jest.fn()
      }
      
      // Set up the chaining: delete returns chain, first eq returns chain, second eq resolves
      deleteChain.delete.mockReturnValue(deleteChain)
      deleteChain.eq.mockReturnValueOnce(deleteChain).mockResolvedValueOnce({ error: null })
      
      mockSupabaseClient.from.mockReturnValue(deleteChain)

      await deletePoll('poll-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('polls')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
    })

    it('should throw error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      await expect(deletePoll('poll-123')).rejects.toThrow('Authentication required')
    })
  })

  describe('getUserPolls', () => {
    it('should fetch user polls successfully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      
      const mockPolls = [
        {
          id: 'poll-1',
          title: 'Poll 1',
          description: 'Description 1',
          created_at: '2023-01-01T00:00:00Z',
          expires_at: futureDate.toISOString(),
          is_active: true,
          share_token: 'token-1',
          votes: [{ count: 5 }]
        }
      ]

      // Create a specific mock for this test
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPolls,
          error: null
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getUserPolls()

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('votes')
      expect(result[0].votes[0]).toHaveProperty('count', 5)
      expect(result[0]).toHaveProperty('is_active', true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('polls')
    })

    it('should throw error when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      await expect(getUserPolls()).rejects.toThrow('Authentication required')
    })

    it('should handle polls with no votes', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const mockPolls = [
        {
          id: 'poll-1',
          title: 'Poll 1',
          description: 'Description 1',
          created_at: '2023-01-01T00:00:00Z',
          expires_at: null,
          is_active: true,
          share_token: 'token-1',
          votes: []
        }
      ]

      // Create a specific mock for this test
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPolls,
          error: null
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getUserPolls()

      expect(result[0]).toHaveProperty('votes')
      expect(result[0].votes).toEqual([])
    })

    it('should mark expired polls as ended', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      })

      const mockPolls = [
        {
          id: 'poll-1',
          title: 'Poll 1',
          description: 'Description 1',
          created_at: '2023-01-01T00:00:00Z',
          expires_at: '2020-01-01T00:00:00Z', // Expired
          is_active: true,
          share_token: 'token-1',
          votes: [{ count: 0 }]
        }
      ]

      // Create a specific mock for this test
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPolls,
          error: null
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getUserPolls()

      expect(result[0]).toHaveProperty('expires_at', '2020-01-01T00:00:00Z')
      expect(result[0].expires_at).not.toBeNull()
      expect(new Date(result[0].expires_at!) < new Date()).toBe(true)
    })
  })
})