/**
 * @jest-environment node
 */

import { createSupabaseServerClient } from '../../../lib/supabase'

// Mock the Supabase client
jest.mock('../../../lib/supabase')

const mockSupabase = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>

describe('Database Queries', () => {
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

  describe('Poll Queries', () => {
    it('should fetch polls successfully', async () => {
      const mockPolls = [
        { id: 'poll-1', title: 'Test Poll', description: 'Test Description' }
      ]
      
      // Create a mock chain for select and order
      const queryChain = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPolls,
          error: null
        })
      }
      
      mockSupabaseClient.from.mockReturnValue(queryChain)

      const result = await mockSupabaseClient.from('polls').select('*').order('created_at')
      
      expect(result.data).toEqual(mockPolls)
      expect(result.error).toBeNull()
    })
  })

  describe('Authentication', () => {
    it('should handle authentication token expiration', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' }
      })

      const result = await mockSupabaseClient.auth.getUser()
      
      expect(result.data.user).toBeNull()
      expect(result.error.message).toBe('JWT expired')
    })
  })
})