// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeStorage } from './test/fake-storage'

vi.stubGlobal('localStorage', fakeStorage())

import { getPref, setPref } from './prefs'

const KEY = 'pocketzot:prefs'

beforeEach(() => {
  localStorage.clear()
})

describe('prefs defaults', () => {
  it('serves defaults on an empty store', () => {
    expect(getPref('monsterListMode')).toBe('full')
    expect(getPref('loginSprites')).toBe(true)
  })
})

describe('stored preferences', () => {
  it('merges current stored values over the defaults', () => {
    localStorage.setItem(KEY, JSON.stringify({ monsterListMode: 'collapsed' }))
    expect(getPref('monsterListMode')).toBe('collapsed')
    expect(getPref('loginSprites')).toBe(true)
  })

  it('preserves an existing value when writing an unrelated pref', () => {
    localStorage.setItem(KEY, JSON.stringify({ monsterListMode: 'collapsed' }))
    setPref('loginSprites', false)
    expect(getPref('monsterListMode')).toBe('collapsed')
    expect(getPref('loginSprites')).toBe(false)
  })
})
