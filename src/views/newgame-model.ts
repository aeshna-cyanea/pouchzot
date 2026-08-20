// Pure view-model for the newgame-choice screen (spec:
// dev-material/newgame-redesign.md). Parses the wire grid into labeled
// groups and picks the phone layout; rendering lives in newgame-view.ts.
//
// The wire `main-items` is a desktop grid: buttons at (x, y) under column
// headers, with additional labels at arbitrary mid-column positions
// (background screen: Zealot at (0, ~6), Warrior-mage at (1, ~5)). The
// phone layout flattens it column-major — each label starts a group, and
// a column's buttons belong to the nearest label above them — which
// reproduces the desktop reading order (Warrior, Zealot, Adventurer,
// Warrior-mage, Mage) as vertical section bands.
import type { NewgameButton, NewgameItems } from './game-overlays'
import { stripDcss } from './overlay-body'

export interface NgcItem {
  hotkey: string | number | undefined
  // Display name: label text without markup and without the "a - " hotkey
  // prefix (letters aren't shown — phones have no keys; physical keyboards
  // still work via the document key handler).
  name: string
  rawLabel: string
  // Second label entry (weapon menu aptitude column, e.g. "(+2 apt)").
  suffix: string
  description: string
  // Effective label color is darkgrey = not recommended for the current
  // selection; dims text and sprite.
  dim: boolean
  highlightColour: number | undefined
  tiles: Array<{ t: number; tex: number; ymax?: number }>
}

export interface NgcGroup {
  label?: string
  items: NgcItem[]
}

// Leading color tag of a DCSS-markup string, or null when text precedes
// any tag (i.e. the default color applies).
function leadingColor(label: string): string | null {
  const m = /^\s*<(\w+)>/.exec(label)
  return m ? m[1].toLowerCase() : null
}

// Strip the "K - " hotkey-display prefix the server bakes into labels
// ("a - Gnoll", "A - Mummy"). Only a single short token counts — a name
// containing " - " deeper in is left alone.
export function displayName(plainLabel: string): string {
  return plainLabel.replace(/^\S{1,4} - /, '').trim()
}

export function toItem(btn: NewgameButton): NgcItem {
  const labels = btn.labels ?? (btn.label !== undefined ? [btn.label] : [])
  const raw = String(labels[0] ?? '')
  return {
    hotkey: btn.hotkey,
    name: displayName(stripDcss(raw).trim()),
    rawLabel: raw,
    suffix: labels.length >= 2 ? stripDcss(String(labels[1])).trim() : '',
    description: btn.description ?? '',
    dim: leadingColor(raw) === 'darkgrey',
    highlightColour: btn.highlight_colour,
    tiles: btn.tile ?? [],
  }
}

// Column-major grouping. Labels at any (x, y) delimit groups within their
// column; buttons above a column's first label form an unlabeled leading
// group; label rows with no buttons beneath produce no group.
export function parseGroups(items: NewgameItems): NgcGroup[] {
  const width = items.width ?? 1
  const labels = items.labels ?? []
  const buttons = items.buttons ?? []
  const groups: NgcGroup[] = []

  for (let x = 0; x < width; x++) {
    const colLabels = labels
      .filter(l => l.x === x)
      .sort((a, b) => a.y - b.y)
    const colButtons = buttons
      .filter(b => (b.x ?? 0) === x)
      .sort((a, b) => ((a.y ?? 0) - (b.y ?? 0)))
    let li = 0
    let current: NgcGroup | null = null
    for (const btn of colButtons) {
      const by = btn.y ?? 0
      while (li < colLabels.length && by > colLabels[li].y) {
        current = { label: stripDcss(colLabels[li].label).trim(), items: [] }
        groups.push(current)
        li++
      }
      if (!current) {
        current = { items: [] }
        groups.push(current)
      }
      current.items.push(toItem(btn))
    }
  }
  return groups.filter(g => g.items.length > 0)
}

// Even row distribution for the card grid: rows = ceil(n/max), sizes
// differing by at most one, larger rows first. 9→[3,3,3], 10→[4,3,3],
// 5→[3,2]. Avoids the 4-4-1 orphan without hardcoding today's roster
// sizes (section counts are wire data and shift across versions).
export function balanceRows(n: number, max = 4): number[] {
  if (n <= 0) return []
  const rows = Math.ceil(n / max)
  const base = Math.floor(n / rows)
  const extra = n % rows
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0))
}

// Cards for tile-bearing multi-column menus (species, backgrounds); rows
// for everything the desktop already laid out as a single-column list
// (weapon menu width 1, sprint/tutorial map menu width 1 — their names
// are long and their suffixes want a row), whenever a suffix column
// exists, or when nothing carries a tile (text-only menus, ancient
// servers). A partially tiled card set still gets cards — items without
// a tile render a blank sprite slot.
export function pickShape(groups: NgcGroup[], width = 1): 'cards' | 'rows' {
  const items = groups.flatMap(g => g.items)
  if (items.length === 0 || width <= 1) return 'rows'
  if (items.some(i => i.suffix)) return 'rows'
  return items.some(i => i.tiles.length > 0) ? 'cards' : 'rows'
}
