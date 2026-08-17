// Stale-shell self-heal: one reload, once per session.
//
// iOS home-screen apps can relaunch from a cached copy of the start document
// that is many deploys old (observed live 2026-08-17, testproj: a crash
// relaunch resurrected a weeks-old shell whose engine.worker chunk hash had
// rotated off the origin — 404 — after the SW generation flip deleted the
// old precache). The service worker's no-skipWaiting lifecycle guarantees a
// *live* page can always import its own chunks; a resurrected stale document
// is the one client that contract cannot cover, so the recovery lives here,
// in the client: a real navigation. Network-first serves the current
// deploy's HTML; offline, the active SW falls back to its own
// generation-pinned shell (sw.js cachedShell) — self-consistent either way.
//
// Once per session: the latch (sessionStorage — survives the reload, dies
// with the app) makes a reload loop impossible. If the latch can't be
// written there is no loop guard, so no reload — the caller falls through
// to its visible-error path instead.
// Latch values: '1' = a heal reload happened, not yet counted; '2' = the
// recovered page reported it (consumeStaleShellHeal). ANY value means
// latched — the SW's rescue script (classify.js) uses the same key and
// semantics, so keep the two in lockstep.
const KEY = 'pocketzot:stale-shell-reloaded'

export function staleShellReloadOnce(params?: Record<string, string>): boolean {
  try {
    if (sessionStorage.getItem(KEY) !== null) return false
    sessionStorage.setItem(KEY, '1')
  } catch {
    return false
  }
  const url = new URL(location.href)
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v)
  location.replace(url.toString())
  return true
}

// True exactly once per healed session: the recovered page calls this at
// boot to learn "this load exists because a stale shell was rescued" and
// count it (main.ts → count('stale-heal') — the wild-population regression
// alarm for the rescue, since iOS discards the underlying crash reports and
// the healed UX is a 2 s flash nobody reports). Flips '1' → '2' so later
// loads in the session don't recount; the reload guard reads any value as
// latched, so once-per-session reload semantics are untouched.
export function consumeStaleShellHeal(): boolean {
  try {
    if (sessionStorage.getItem(KEY) !== '1') return false
    sessionStorage.setItem(KEY, '2')
    return true
  } catch {
    return false
  }
}
