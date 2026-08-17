// Anonymous usage events, one per type per page load, posted to the app's
// own origin. No identifiers, no payload beyond the event name. Design
// notes in dev-material.
// stale-heal: this page load exists because the stale-shell rescue reloaded
// a broken session (util/self-heal.ts consumeStaleShellHeal) — each heal
// also implies one extra 'boot' beacon for the same user intent.
export type CountedEvent = 'boot' | 'play' | 'spectate' | 'play-offline' | 'stale-heal'
export interface CountFlags { ascii?: boolean }

const sent = new Set<CountedEvent>()

export function count(event: CountedEvent, flags: CountFlags = {}): void {
  if (import.meta.env.DEV || sent.has(event)) return
  sent.add(event)
  try {
    // flag letters mirror the endpoint's ?f= allowlist
    const f = flags.ascii ? 'A' : ''
    const pwa = new URLSearchParams(location.search).get('src') === 'pwa'
    navigator.sendBeacon(
      `/api/e?e=${event}${f ? `&f=${f}` : ''}${pwa ? '&src=pwa' : ''}`)
  } catch {
    // counting must never affect the app
  }
}
