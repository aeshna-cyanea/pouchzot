// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeStorage } from './test/fake-storage'

vi.stubGlobal('localStorage', fakeStorage())

import { setPref } from './prefs'
import {
  DPAD_SIZE_MAX, initUiScale, KEYBOARD_BUTTON_SIZE_MIN,
  MSGLOG_FONT_STOPS, MSGLOG_LINE_STOPS, nearestStop,
} from './ui-scale'

const rootVar = (name: string) => document.documentElement.style.getPropertyValue(name)

beforeEach(() => {
  localStorage.clear()
})

describe('nearestStop', () => {
  it('returns exact matches', () => {
    expect(nearestStop(MSGLOG_LINE_STOPS, 4)).toBe(4)
  })

  it('snaps out-of-table values to the nearest stop', () => {
    expect(nearestStop(MSGLOG_LINE_STOPS, 0)).toBe(2)
    expect(nearestStop(MSGLOG_FONT_STOPS, 0.72)).toBe(0.7)
  })

  it('defaults sit dead-center of every stop table', () => {
    for (const stops of [MSGLOG_LINE_STOPS, MSGLOG_FONT_STOPS]) {
      expect(stops.length % 2).toBe(1)
    }
    expect(MSGLOG_LINE_STOPS[(MSGLOG_LINE_STOPS.length - 1) / 2]).toBe(4)
    expect(MSGLOG_FONT_STOPS[(MSGLOG_FONT_STOPS.length - 1) / 2]).toBe(0.75)
  })
})

describe('initUiScale', () => {
  it('writes the stock values as root CSS variables', () => {
    initUiScale()
    expect(rootVar('--pz-dpad')).toBe('3.5rem')
    expect(rootVar('--pz-msglog-lines')).toBe('4')
    expect(rootVar('--pz-msglog-font')).toBe('0.75rem')
    expect(rootVar('--pz-button-size')).toBe('2rem')
    expect(rootVar('--pz-modifier-size')).toBe(`${KEYBOARD_BUTTON_SIZE_MIN}rem`)
    // worst-case reservation for the settings pad preview
    expect(rootVar('--pz-dpad-max')).toBe(`${DPAD_SIZE_MAX}rem`)
  })

  it('re-applies live when a size pref changes', () => {
    initUiScale()
    setPref('dpadSize', 3.73)
    setPref('msglogLines', 6)
    setPref('msglogFont', 0.65)
    setPref('buttonSize', 2.37)
    setPref('modifierRowMatch', true)
    expect(rootVar('--pz-dpad')).toBe('3.73rem')
    expect(rootVar('--pz-msglog-lines')).toBe('6')
    expect(rootVar('--pz-msglog-font')).toBe('0.65rem')
    expect(rootVar('--pz-button-size')).toBe('2.37rem')
    expect(rootVar('--pz-modifier-size')).toBe('2.37rem')
  })

  it('clamps continuous sizes and snaps discrete hand-edited values', () => {
    localStorage.setItem('pocketzot:prefs', JSON.stringify({
      dpadSize: 7, buttonSize: 0, msglogLines: 4.4,
    }))
    initUiScale()
    expect(rootVar('--pz-dpad')).toBe(`${DPAD_SIZE_MAX}rem`)
    expect(rootVar('--pz-button-size')).toBe(`${KEYBOARD_BUTTON_SIZE_MIN}rem`)
    expect(rootVar('--pz-msglog-lines')).toBe('4')
  })
})
