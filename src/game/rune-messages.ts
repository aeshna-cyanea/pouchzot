// Rune facts parsed from game text — wire messages (for the anonymous
// counters, src/counter.ts, and the crypt's per-character collection) and
// morgue dumps. Pure functions so the phrasing contracts are testable
// without the game view. Both phrasings verified identical in 0.34.1 and
// trunk; a future rewording silently breaks the match, so the tests pin the
// exact source-derived forms.

// The game_ended win blurb carries the rune count as "... and 3 runes"
// (hiscores.cc runes_gems_desc: "... %s %d rune%s", "and" on wins). A gems
// clause ("... and 2 gems") can follow, hence anchoring on the word. Returns
// undefined on a miss — the caller omits the value rather than sending 0,
// which double4 documents as "unknown".
export function parseWinRuneCount(message?: string): number | undefined {
  const m = message?.match(/(?:and|with) (\d+) runes?\b/)
  return m ? Number(m[1]) : undefined
}

// One pickup message per grab (items.cc _get_rune: "You pick up the %s rune
// and feel its power.", rune names all single words). Returns the rune name,
// null on no match. Matching the contiguous phrase keeps same-turn joined
// lines from false-positiving — examine/floor sightings ("You see here…")
// and the milestone's "found the golden rune" wording don't match. DCSS
// colour tags are stripped first so markup inside a joined line can't split
// the phrase.
export function parseRunePickup(text: string): string | null {
  const m = text.replace(/<\/?[a-z][^>]*>/gi, '')
    .match(/You pick up the (\w+) rune and feel its power/)
  return m ? m[1] : null
}

// The Orb pickup (items.cc _get_orb: "You pick up the Orb of Zot!", MSGCH_ORB).
// The Orb can't be dropped, so possession is one-way for the life of the
// character — no drop line to watch.
export function isOrbPickup(text: string): boolean {
  return text.includes('You pick up the Orb of Zot!')
}

// The morgue's rune line (output.cc _status_mut_rune_list):
//   }: 15/15 runes: decaying, slimy, silver, golden, iron, obsidian, icy, bone,
//   abyssal, demonic, glowing, magical, fiery, dark, gossamer
// linebreak_string wraps it at 80 cols — only at spaces, and the list's
// spaces all follow commas, so a wrapped chunk always ends with ',' and the
// next line is its continuation. The list is comma_separated_line(…, ", ",
// ", ") — the LAST separator is ", " too, so there is no "and" to strip. The
// line is emitted ONLY when runes were
// collected (no "0/15" form), so absence = none. The `}` prefix is
// command_to_string(CMD_DISPLAY_RUNES) — a user keymap can rename it, hence
// any short prefix. Returns the adjectives in the engine's rune_type enum
// order (the morgue lists them by enum, not by pickup); an empty list means
// no rune line.
export function parseMorgueRunes(text: string): string[] {
  const lines = text.split('\n')
  const i = lines.findIndex((l) => /^\S{1,3}: \d+\/\d+ runes?: /.test(l))
  if (i < 0) return []
  let list = lines[i].replace(/^\S{1,3}: \d+\/\d+ runes?: /, '').trimEnd()
  for (let j = i + 1; list.endsWith(',') && j < lines.length; j++) list += ' ' + lines[j].trimEnd()
  return list.split(',').map((s) => s.trim()).filter(Boolean)
}
