import { describe, expect, it } from 'vitest'
import { parseRunePickup, parseWinRuneCount } from './rune-messages'

// Blurb shapes derived from hiscores.cc runes_gems_desc + the whitespace-
// aligned game_ended message format (newline + dot-leader continuation).

describe('parseWinRuneCount', () => {
  it('reads the count from a win blurb', () => {
    expect(parseWinRuneCount(
      'Escaped with the Orb\n             ... and 3 runes on Aug 16, 2026!',
    )).toBe(3)
  })

  it('handles the singular form and a trailing gems clause', () => {
    expect(parseWinRuneCount(
      'Escaped with the Orb\n... and 1 rune\n... and 2 gems (both intact)!',
    )).toBe(1)
  })

  it('reads the non-win "with" form', () => {
    expect(parseWinRuneCount('Annihilated by a smoke demon\n... with 4 runes')).toBe(4)
  })

  it('never reads a gems count as runes', () => {
    expect(parseWinRuneCount('Escaped with the Orb\n... and 2 gems!')).toBeUndefined()
  })

  it('returns undefined on a miss (caller omits, never sends 0)', () => {
    expect(parseWinRuneCount('Escaped with the Orb!')).toBeUndefined()
    expect(parseWinRuneCount(undefined)).toBeUndefined()
  })
})

describe('parseRunePickup', () => {
  it('names the rune from the pickup line', () => {
    expect(parseRunePickup('You pick up the golden rune and feel its power.')).toBe('golden')
  })

  it('matches inside a same-turn joined line and through colour markup', () => {
    expect(parseRunePickup(
      'The hydra dies! You pick up the <magenta>barnacled</magenta> rune '
      + 'and feel its power. You now have 2 runes.',
    )).toBe('barnacled')
  })

  it('ignores floor sightings, examine text, and milestone wording', () => {
    expect(parseRunePickup('You see here the golden rune of Zot.')).toBeNull()
    expect(parseRunePickup('found the golden rune.')).toBeNull()
    expect(parseRunePickup('You now have 3 runes.')).toBeNull()
  })
})
