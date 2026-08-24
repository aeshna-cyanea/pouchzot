import './style.css'
import { initApp } from './app'
import { initUiScale } from './ui-scale'
import { maybeMountSafeAreaProbe } from './safe-area-probe'
import { registerServiceWorker } from './sw/register'
import { count } from './counter'
import { consumeStaleShellHeal } from './util/self-heal'

const appEl = document.getElementById('app')
if (!appEl) throw new Error('#app element not found')

// Before the first view mounts, so nothing lays out at stock size first.
initUiScale()
initApp(appEl)
maybeMountSafeAreaProbe()
registerServiceWorker()
count('boot') // boot rows self-attach the W/C environment letters (counter.ts)
if (consumeStaleShellHeal()) count('stale-heal')
// __dcssCardDemo() — character-card gallery from fixtures (views/card-demo.ts).
// Dynamic import inside the DEV branch: the chunk isn't emitted in prod.
if (import.meta.env.DEV) void import('./views/card-demo').then((m) => m.installCardDemo())
