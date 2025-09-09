import type { Poll, PollOption, Vote } from '../database/types'
import type { PollId, UserId, OptionId, ShareToken, DateString } from './common'

// Enhanced poll types with better type safety
export interface PollWithOptions extends Poll {
  poll_options: PollOption[]
}

export interface PollOptionWithVotes extends PollOption {
  vote_count: number
}

export interface PollWithResults extends Omit<Poll, 'poll_options'> {
  poll_options: PollOptionWithVotes[]
  total_votes: number
}

export interface UserPollSummary {
  id: PollId
  title: string
  created_at: DateString
  expires_at: DateString | null
  is_active: boolean
  total_votes: number
  share_token: ShareToken
}

// Poll creation and update types
export interface CreatePollData {
  title: string
  description?: string
  options: string[]
  allowMultiple: boolean
  expiresAt?: Date
}

export interface UpdatePollData {
  title?: string
  description?: string
  options?: string[]
  allowMultiple?: boolean
  expiresAt?: Date
  is_active?: boolean
}

// Vote types
export interface VoteData {
  pollId: PollId
  optionId: OptionId
  userId?: UserId
  voterIp?: string
}

export interface VoteResult {
  success: boolean
  vote?: Vote
  error?: string
}

// Poll statistics
export interface PollStats {
  totalVotes: number
  uniqueVoters: number
  optionStats: OptionStats[]
  createdAt: DateString
  lastVoteAt?: DateString
}

export interface OptionStats {
  id: OptionId
  text: string
  voteCount: number
  percentage: number
}

// Poll filters and sorting
export interface PollFilters {
  isActive?: boolean
  hasExpired?: boolean
  createdBy?: UserId
  createdAfter?: Date
  createdBefore?: Date
  search?: string
}

export type PollSortField = 'created_at' | 'updated_at' | 'title' | 'total_votes' | 'expires_at'

export interface PollSortOptions {
  field: PollSortField
  order: 'asc' | 'desc'
}

// Poll validation types
export interface PollValidationRules {
  title: {
    minLength: number
    maxLength: number
  }
  description: {
    maxLength: number
  }
  options: {
    minCount: number
    maxCount: number
    maxLength: number
  }
  expiration: {
    minHours: number
    maxDays: number
  }
}

// Poll sharing types
export interface PollShareData {
  shareToken: ShareToken
  shareUrl: string
  qrCodeUrl?: string
  expiresAt?: DateString
}

// Poll analytics types
export interface PollAnalytics {
  pollId: PollId
  views: number
  uniqueViews: number
  votes: number
  uniqueVoters: number
  conversionRate: number // votes / views
  peakVotingTime?: DateString
  geographicData?: GeographicVoteData[]
}

export interface GeographicVoteData {
  country: string
  region?: string
  voteCount: number
}

// Poll status types
export type PollStatus = 'draft' | 'active' | 'expired' | 'closed' | 'archived'

export interface PollStatusInfo {
  status: PollStatus
  canVote: boolean
  canEdit: boolean
  canDelete: boolean
  message?: string
}

// Real-time poll updates
export interface PollUpdate {
  type: 'vote_added' | 'vote_removed' | 'poll_updated' | 'poll_closed'
  pollId: PollId
  data: unknown
  timestamp: DateString
}

// Poll permissions
export interface PollPermissions {
  canView: boolean
  canVote: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
  canViewResults: boolean
}

// Export utility type for poll-related components
export type PollComponentProps<T = {}> = T & {
  poll: PollWithOptions | PollWithResults
  permissions?: PollPermissions
  onUpdate?: (poll: Poll) => void
  onError?: (error: string) => void
}