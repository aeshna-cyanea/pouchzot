// Programmatic "screenshot" export of fixed-width server screens — the `%`
// character overview ("character card"), CRT pages like the skills menu, the
// end-of-game screen. Phones can't show the server's 80-column layout whole,
// so sharing renders the screen at its native width into an offscreen canvas
// and hands the PNG to the share sheet. One walker (htmlToRuns) feeds the
// renderer: CRT `txt` line HTML is walked directly, and DCSS-markup bodies go
// through the existing dcssToHtml first — called on the whole body in ONE
// pass, so the engine's opens-only colour switches
// (formatted_string::to_colour_string; see the propagateDarkgreyColor note in
// overlay-body.ts) persist across newlines, as a terminal would have painted
// them. game-view.ts owns the trigger chip and decides which screens are
// exportable.
import { DCSS_COLOR_MAP, uiColor } from '../game/dcss-colors'
import { downloadPackFile } from '../offline/save-transfer'

// One coloured segment of a fixed-width screen line. `fg`/`bg` are hex
// strings; absent = the renderer's defaults (lightgrey on the app background).
export interface DcssRun {
  text: string
  fg?: string
  bg?: string
}

// Inline styles read back through CSSStyleDeclaration come out rgb()-form in
// browsers but hex in happy-dom; pin one spelling so adjacent-run merging (and
// tests) compare equal regardless of environment.
function cssColorHex(value: string): string {
  const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(value)
  if (!m) return value
  return '#' + m.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
}

// Parse screen HTML into per-line coloured runs, splitting on newline text.
// Colour sources, both inherited through nesting: CRT span classes fg0–15 /
// bg0–15 (same palette as uiColor; bg0 means "no background" — DCSS assumes a
// black terminal — so it's dropped, mirroring the `#crt-display .bg0` rule in
// style.css) and dcssToHtml's inline `style="color:…"` spans.
export function htmlToRuns(html: string): DcssRun[][] {
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  const lines: DcssRun[][] = [[]]
  const emit = (text: string, fg: string | undefined, bg: string | undefined): void => {
    text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([])
      if (!part) return
      const line = lines[lines.length - 1]
      const prev = line[line.length - 1]
      if (prev && prev.fg === fg && prev.bg === bg) prev.text += part
      else line.push({ text: part, ...(fg !== undefined ? { fg } : {}), ...(bg !== undefined ? { bg } : {}) })
    })
  }
  const walk = (node: Node, fg: string | undefined, bg: string | undefined): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      emit(node.textContent ?? '', fg, bg)
      return
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      for (const cls of el.classList) {
        const m = /^(fg|bg)(\d+)$/.exec(cls)
        if (!m) continue
        if (m[1] === 'fg') fg = uiColor(Number(m[2]))
        else bg = Number(m[2]) === 0 ? undefined : uiColor(Number(m[2]))
      }
      if (el.style?.color) fg = cssColorHex(el.style.color)
    }
    node.childNodes.forEach((child) => walk(child, fg, bg))
  }
  tpl.content.childNodes.forEach((child) => walk(child, undefined, undefined))
  return lines
}

// Filename fragment from an overlay title or heading line ("Overview of the
// Dungeon" → "overview-of-the-dungeon"), capped at a hyphen boundary so a
// full `%` heading ("Name the Title (Species Class)  Turns: …") stays a
// filename, not a sentence.
export function screenSlug(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  if (slug.length <= 40) return slug || 'screen'
  const cut = slug.lastIndexOf('-', 40)
  return cut > 0 ? slug.slice(0, cut) : slug.slice(0, 40)
}

// Export geometry. The font matches --font-mono / --crt-line-height in
// style.css so exports read like the in-app CRT, just at full terminal width.
const FONT_PX = 14
const LINE_H = Math.round(FONT_PX * 1.2)
const PAD = 20
const SCALE = 2

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

// Render coloured run lines onto a canvas at the screen's own column count.
// Column starts are computed as run-length × cell width (not measured text
// advance), so a stray non-monospace glyph inside one run can't skew the
// alignment of everything after it. Returns null when 2d canvas is
// unavailable (test DOMs).
export function renderScreenCanvas(lines: DcssRun[][], caption?: string): HTMLCanvasElement | null {
  const rows = lines.slice()
  while (rows.length > 0 && rows[rows.length - 1].every((r) => !r.text.trim())) rows.pop()
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const font = `${FONT_PX}px ${cssVar('--font-mono', 'monospace')}`
  ctx.font = font
  const cell = ctx.measureText('0').width
  const cols = Math.max(20, ...rows.map((r) => r.reduce((n, run) => n + run.text.length, 0)))
  const capH = caption ? Math.round(FONT_PX * 1.8) : 0
  const cssW = Math.ceil(PAD * 2 + cols * cell)
  const cssH = PAD * 2 + rows.length * LINE_H + capH
  canvas.width = cssW * SCALE
  canvas.height = cssH * SCALE
  // Resizing reset all context state — scale and font go back on after.
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = cssVar('--bg', '#0a0908')
  ctx.fillRect(0, 0, cssW, cssH)
  ctx.font = font
  ctx.textBaseline = 'middle'
  rows.forEach((runs, row) => {
    const yTop = PAD + row * LINE_H
    let x = PAD
    for (const run of runs) {
      const w = run.text.length * cell
      if (run.bg) {
        ctx.fillStyle = run.bg
        ctx.fillRect(x, yTop, w, LINE_H)
      }
      x += w
    }
    x = PAD
    for (const run of runs) {
      ctx.fillStyle = run.fg ?? DCSS_COLOR_MAP.lightgrey
      ctx.fillText(run.text, x, yTop + LINE_H / 2)
      x += run.text.length * cell
    }
  })
  if (caption) {
    ctx.font = `${Math.round(FONT_PX * 0.85)}px ${cssVar('--font-mono', 'monospace')}`
    ctx.fillStyle = DCSS_COLOR_MAP.darkgrey
    ctx.textAlign = 'right'
    ctx.fillText(caption, PAD + cols * cell, PAD + rows.length * LINE_H + capH / 2)
  }
  return canvas
}

// Render and hand off: the share sheet where files are shareable (iOS PWA —
// save to Photos, send to Discord/Messages), else the plain download path.
// Resolves once the handoff happened; a user-cancelled share sheet counts as
// done, not as a fallback trigger.
export async function exportScreenPng(lines: DcssRun[][], slug: string): Promise<boolean> {
  const canvas = renderScreenCanvas(lines, 'pocketzot.app')
  if (!canvas) return false
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return false
  const file = new File([blob], `pocketzot-${slug}-${new Date().toISOString().slice(0, 10)}.png`, { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return true
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return true
      // Real share failure (not a dismissal) — fall through to download.
    }
  }
  downloadPackFile(file)
  return true
}
