import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { consumeStaleShellHeal, staleShellReloadOnce } from './self-heal'
import { fakeStorage } from '../test/fake-storage'

// location is stubbed whole: the helper reads href and calls replace, and
// happy-dom's navigation throws rather than navigating.
function stubLocation(href = 'https://pocketzot.app/'): string[] {
  const replaced: string[] = []
  vi.stubGlobal('location', { href, replace: (u: string) => replaced.push(u) })
  return replaced
}

describe('staleShellReloadOnce', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', fakeStorage())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reloads on first call and reports it', () => {
    const replaced = stubLocation()
    expect(staleShellReloadOnce()).toBe(true)
    expect(replaced).toEqual(['https://pocketzot.app/'])
  })

  it('is once per session: the second call declines', () => {
    const replaced = stubLocation()
    expect(staleShellReloadOnce()).toBe(true)
    expect(staleShellReloadOnce()).toBe(false)
    expect(replaced).toHaveLength(1)
  })

  it('appends the requested params (offline boot heals into the offline lobby)', () => {
    const replaced = stubLocation('https://pocketzot.app/?perf=1')
    expect(staleShellReloadOnce({ offline: '1' })).toBe(true)
    expect(replaced[0]).toBe('https://pocketzot.app/?perf=1&offline=1')
  })

  it('a reported heal (latch "2") still counts as latched for the reload guard', () => {
    const replaced = stubLocation()
    sessionStorage.setItem('pocketzot:stale-shell-reloaded', '2')
    expect(staleShellReloadOnce()).toBe(false)
    expect(replaced).toEqual([])
  })

  it('never reloads when the loop guard cannot be written', () => {
    // No sessionStorage latch = no way to stop a reload loop, so no reload.
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    })
    const replaced = stubLocation()
    expect(staleShellReloadOnce()).toBe(false)
    expect(replaced).toEqual([])
  })
})

describe('consumeStaleShellHeal', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', fakeStorage())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports a heal exactly once, then the latch stays for the reload guard', () => {
    stubLocation()
    expect(consumeStaleShellHeal()).toBe(false) // no heal happened
    expect(staleShellReloadOnce()).toBe(true)   // the heal reload
    expect(consumeStaleShellHeal()).toBe(true)  // recovered page reports it
    expect(consumeStaleShellHeal()).toBe(false) // later loads: already reported
    expect(staleShellReloadOnce()).toBe(false)  // reload guard still latched
  })

  it('never reports without storage', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('denied') },
    })
    expect(consumeStaleShellHeal()).toBe(false)
  })
})
