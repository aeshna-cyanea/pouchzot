// Rune facts parsed from wire text, for the anonymous counters
// (src/counter.ts). Pure functions so the phrasing contracts are testable
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
