// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeStorage } from './test/fake-storage'

vi.stubGlobal('localStorage', fakeStorage())

import { setPref } from './prefs'
import {
  clampMsglogFontSize, DPAD_SIZE_MAX, initUiScale, KEYBOARD_BUTTON_SIZE_MIN,
  MSGLOG_FONT_SIZE_MAX, MSGLOG_FONT_SIZE_MIN, MSGLOG_LINE_STOPS, nearestStop,
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
  })

  it('defaults sit dead-center of every stop table', () => {
    for (const stops of [MSGLOG_LINE_STOPS]) {
      expect(stops.length % 2).toBe(1)
    }
    expect(MSGLOG_LINE_STOPS[(MSGLOG_LINE_STOPS.length - 1) / 2]).toBe(4)
  })
})

describe('clampMsglogFontSize', () => {
  it('preserves values within range', () => {
    expect(clampMsglogFontSize(0.72)).toBe(0.72)
    expect(clampMsglogFontSize(0.65)).toBe(0.65)
    expect(clampMsglogFontSize(0.85)).toBe(0.85)
  })

  it('clamps values outside range', () => {
    expect(clampMsglogFontSize(0.5)).toBe(MSGLOG_FONT_SIZE_MIN)
    expect(clampMsglogFontSize(1.2)).toBe(MSGLOG_FONT_SIZE_MAX)
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
    setPref('msglogFont', 0.72)
    setPref('buttonSize', 2.37)
    setPref('modifierRowMatch', true)
    expect(rootVar('--pz-dpad')).toBe('3.73rem')
    expect(rootVar('--pz-msglog-lines')).toBe('6')
    expect(rootVar('--pz-msglog-font')).toBe('0.72rem')
    expect(rootVar('--pz-button-size')).toBe('2.37rem')
    expect(rootVar('--pz-modifier-size')).toBe('2.37rem')
  })

  it('clamps continuous sizes and snaps discrete hand-edited values', () => {
    localStorage.setItem('pocketzot:prefs', JSON.stringify({
      dpadSize: 7, buttonSize: 0, msglogFont: 1.5, msglogLines: 4.4,
    }))
    initUiScale()
    expect(rootVar('--pz-dpad')).toBe(`${DPAD_SIZE_MAX}rem`)
    expect(rootVar('--pz-button-size')).toBe(`${KEYBOARD_BUTTON_SIZE_MIN}rem`)
    expect(rootVar('--pz-msglog-font')).toBe(`${MSGLOG_FONT_SIZE_MAX}rem`)
    expect(rootVar('--pz-msglog-lines')).toBe('4')
  })
})
