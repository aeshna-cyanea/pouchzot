// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { htmlToRuns, screenSlug } from './screen-export'
import { dcssToHtml, uiColor, DCSS_COLOR_MAP } from '../game/dcss-colors'

describe('htmlToRuns', () => {
  // CRT `txt` line HTML: server-generated spans classed fgN/bgN.
  it('maps fgN classes to palette colours', () => {
    expect(htmlToRuns('<span class="fg14">Skills</span>')).toEqual([
      [{ text: 'Skills', fg: uiColor(14) }],
    ])
  })

  it('keeps coloured backgrounds but drops bg0 (terminal "no background")', () => {
    expect(htmlToRuns(
      '<span class="fg15 bg2">sel</span><span class="fg7 bg0">rest</span>',
    )).toEqual([
      [{ text: 'sel', fg: uiColor(15), bg: uiColor(2) }, { text: 'rest', fg: uiColor(7) }],
    ])
  })

  it('leaves bare text at the renderer default', () => {
    expect(htmlToRuns('plain')).toEqual([[{ text: 'plain' }]])
  })

  it('inherits colour through nested elements', () => {
    expect(htmlToRuns('<span class="fg9">a<b>b</b></span>')).toEqual([
      [{ text: 'ab', fg: uiColor(9) }],
    ])
  })

  it('splits lines on newlines, merges same-style fragments, keeps empty lines empty', () => {
    // The CRT caller joins raw rows with \n before parsing.
    expect(htmlToRuns('a<span>b</span>\n')).toEqual([
      [{ text: 'ab' }],
      [],
    ])
  })

  it('decodes entities to text (&nbsp; stays U+00A0)', () => {
    expect(htmlToRuns('a &lt; b&nbsp;c')).toEqual([[{ text: 'a < b\u00a0c' }]])
  })

  // DCSS-markup bodies arrive via dcssToHtml, called on the WHOLE body in one
  // pass — so its inline-style spans reach the walker, and colour behavior
  // (escapes, nesting, unknown tags) is dcssToHtml's own, not re-implemented.
  it('reads dcssToHtml inline-style colours', () => {
    expect(htmlToRuns(dcssToHtml('<lightblue>Head</lightblue> plain'))).toEqual([
      [{ text: 'Head', fg: DCSS_COLOR_MAP.lightblue }, { text: ' plain' }],
    ])
  })

  it('carries an open colour switch across newlines', () => {
    // formatted_string::to_colour_string emits opens-only switches; one
    // whole-body dcssToHtml call keeps the span open over the line break.
    expect(htmlToRuns(dcssToHtml('<lightblue>Head\nstill</lightblue> plain'))).toEqual([
      [{ text: 'Head', fg: DCSS_COLOR_MAP.lightblue }],
      [{ text: 'still', fg: DCSS_COLOR_MAP.lightblue }, { text: ' plain' }],
    ])
  })

  it('restores the enclosing colour when a nested tag closes', () => {
    expect(htmlToRuns(dcssToHtml('<red>a<white>b</white>c</red>'))).toEqual([[
      { text: 'a', fg: DCSS_COLOR_MAP.red },
      { text: 'b', fg: DCSS_COLOR_MAP.white },
      { text: 'c', fg: DCSS_COLOR_MAP.red },
    ]])
  })

  it('round-trips << escapes and bare > and & through the HTML form', () => {
    expect(htmlToRuns(dcssToHtml('a << b > c & d'))).toEqual([[{ text: 'a < b > c & d' }]])
  })

  it('emits blank lines as empty run arrays', () => {
    expect(htmlToRuns(dcssToHtml('a\n\nb'))).toEqual([
      [{ text: 'a' }], [], [{ text: 'b' }],
    ])
  })
})

describe('screenSlug', () => {
  it('kebab-cases a title', () => {
    expect(screenSlug('Overview of the Dungeon')).toBe('overview-of-the-dungeon')
  })

  it('falls back for empty or symbol-only titles', () => {
    expect(screenSlug('')).toBe('screen')
    expect(screenSlug('  —  ')).toBe('screen')
  })

  it('caps long headings at a hyphen boundary', () => {
    expect(screenSlug('tdpma the Firebug (Deep Elf Fire Elementalist)  Turns: 505'))
      .toBe('tdpma-the-firebug-deep-elf-fire')
  })
})
