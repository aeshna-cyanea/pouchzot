// Size prefs (settings sliders) applied as CSS variables on the document
// root: --pz-dpad, --pz-msglog-lines, --pz-msglog-font, and touch button size.
// each with the stock value as var() fallback (#touch-controls --tc-dpad,
// #game-view --msglog-font / --msglog-h), so the stylesheet alone renders
// correctly and this module only ever overrides. A mounted game view needs no
// listener of its own: changing --tc-dpad or --msglog-h resizes #map-grid's
// content box, and the ResizeObserver in game-view.ts refits the map.

import { getPrefs, UI_SCALE_CHANGED_EVENT } from './prefs'

// Continuous size limits. Keep every min/max in this one block:
// settings consumes them for range bounds and apply() uses the same values to
// protect against stale or hand-edited stored prefs.
export const DPAD_SIZE_MIN = 1.4  // rem
export const DPAD_SIZE_MAX = 5  // rem
export const KEYBOARD_BUTTON_SIZE_MIN = 1.4  // rem
export const KEYBOARD_BUTTON_SIZE_MAX = 5    // rem
export const MSGLOG_FONT_SIZE_MIN = 0.65  // rem
export const MSGLOG_FONT_SIZE_MAX = 0.85  // rem

// Message-log line count remains discrete; its default sits in the center.
export const MSGLOG_LINE_STOPS = [2, 3, 4, 5, 6]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function clampDpadSize(value: number): number {
  return clamp(value, DPAD_SIZE_MIN, DPAD_SIZE_MAX)
}

export function clampKeyboardButtonSize(value: number): number {
  return clamp(value, KEYBOARD_BUTTON_SIZE_MIN, KEYBOARD_BUTTON_SIZE_MAX)
}

export function clampMsglogFontSize(value: number): number {
  return clamp(value, MSGLOG_FONT_SIZE_MIN, MSGLOG_FONT_SIZE_MAX)
}

// Snap discrete message-log prefs to a legal stop. Ties go low.
export function nearestStop(stops: readonly number[], v: number): number {
  let best = stops[0]
  for (const s of stops) if (Math.abs(s - v) < Math.abs(best - v)) best = s
  return best
}

function apply(): void {
  const s = document.documentElement.style
  const p = getPrefs()  // one storage read for all size-related prefs
  s.setProperty('--pz-dpad', `${clampDpadSize(p.dpadSize)}rem`)
  s.setProperty('--pz-msglog-lines', String(nearestStop(MSGLOG_LINE_STOPS, p.msglogLines)))
  s.setProperty('--pz-msglog-font', `${clampMsglogFontSize(p.msglogFont)}rem`)
  s.setProperty('--pz-button-size', `${clampKeyboardButtonSize(p.buttonSize)}rem`)
  s.setProperty('--pz-modifier-size', p.modifierRowMatch
    ? `${clampKeyboardButtonSize(p.buttonSize)}rem` : `${KEYBOARD_BUTTON_SIZE_MIN}rem`)
}

// Called once at boot (main.ts), before the first view mounts; setPref fires
// UI_SCALE_CHANGED_EVENT on any later change and apply() re-runs.
export function initUiScale(): void {
  // The preview reserves the range's upper bound, not a discrete stop.
  document.documentElement.style.setProperty('--pz-dpad-max', `${DPAD_SIZE_MAX}rem`)
  apply()
  window.addEventListener(UI_SCALE_CHANGED_EVENT, apply)
}
