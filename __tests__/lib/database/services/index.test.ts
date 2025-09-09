/**
 * Tests for lib/database/services/index.ts barrel exports.
 *
 * Framework: Jest (TypeScript). If the repository uses Vitest, these tests should still be compatible
 * with minimal changes (e.g., import { describe, it, expect } from 'vitest').
 *
 * This suite verifies:
 *  - The barrel re-exports PollService, VoteService, and PollOptionService.
 *  - The re-exported bindings are identical (===) to the direct module exports.
 *  - Basic shape checks on the exported classes/functions (constructor or callable presence).
 */

// Prefer relative import from this test location to the source barrel to avoid relying on path aliases.
// From __tests__/lib/database/services → ../../../../lib/database/services
import * as Barrel from '../../../../lib/database/services'

// Direct imports from underlying modules to compare identity with barrel re-exports.
import { PollService as DirectPollService } from '../../../../lib/database/services/poll.service'
import { VoteService as DirectVoteService } from '../../../../lib/database/services/vote.service'
import { PollOptionService as DirectPollOptionService } from '../../../../lib/database/services/poll-option.service'

describe('lib/database/services barrel exports', () => {
  it('should export PollService, VoteService, and PollOptionService', () => {
    // Presence
    expect(Barrel).toHaveProperty('PollService')
    expect(Barrel).toHaveProperty('VoteService')
    expect(Barrel).toHaveProperty('PollOptionService')

    // Truthy
    expect(Barrel.PollService).toBeTruthy()
    expect(Barrel.VoteService).toBeTruthy()
    expect(Barrel.PollOptionService).toBeTruthy()
  })

  it('should re-export exact bindings (identity) to underlying modules', () => {
    expect(Barrel.PollService).toBe(DirectPollService)
    expect(Barrel.VoteService).toBe(DirectVoteService)
    expect(Barrel.PollOptionService).toBe(DirectPollOptionService)
  })

  it('should have sensible shapes for exported services', () => {
    // If classes: typeof === 'function' and name matches.
    // If factory functions: still typeof === 'function'.
    expect(typeof Barrel.PollService).toBe('function')
    expect(typeof Barrel.VoteService).toBe('function')
    expect(typeof Barrel.PollOptionService).toBe('function')

    // Name checks (robust but non-failing if minified; keep as informational expectations).
    // Only check if names exist to avoid environment-specific minification failures.
    if ('name' in Barrel.PollService) {
      expect(Barrel.PollService.name).toMatch(/PollService/i)
    }
    if ('name' in Barrel.VoteService) {
      expect(Barrel.VoteService.name).toMatch(/VoteService/i)
    }
    if ('name' in Barrel.PollOptionService) {
      expect(Barrel.PollOptionService.name).toMatch(/Poll.*Option.*Service/i)
    }
  })

  it('barrel module should not include unexpected exports (stability check)', () => {
    // Allow only the three known exports.
    const allowed = new Set(['PollService', 'VoteService', 'PollOptionService'])
    const actual = Object.keys(Barrel).sort()
    // Filter out default and __esModule if present in transpiled output
    const filtered = actual.filter((k) => !['default', '__esModule'].includes(k))
    filtered.forEach((k) => {
      expect(allowed.has(k)).toBeTruthy()
    })
  })
})