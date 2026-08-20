// Newgame-choice screen (species / background / weapon / sprint-map
// select). Spec + traced wire facts: dev-material/newgame-redesign.md.
//
// Layout: the desktop 3-column grid reflows into vertical labeled section
// bands (newgame-model.ts parseGroups). Tile-bearing single-label menus
// render as sprite cards in balanced rows; suffix-label menus (weapon
// aptitudes) and text-only menus render as rows. A pinned bottom dock
// holds the sub-items shortcuts (the enter-and-repeat flow: Tab / ! / +
// must never require scrolling a 2.5-screen list) and swaps to the
// armed item's description during the two-tap confirm.
//
// Focus vs arming are distinct states on purpose: the server emits an
// initial button_focus right after the push and re-emits on server-side
// arrow navigation, so inbound focus only moves the highlight — arming
// (description + tap-again-to-confirm) is strictly a local tap. If focus
// armed, the initial focus would bury the shortcuts dock and a single
// stray tap on the pre-focused item would start the game.
import type { TileLoader } from '../game/tiles/tile-loader'
import { renderTiles, dollTileSpec, type TileRef, CELL } from '../game/tiles/tile-view'
import { dcssToHtml, escHtml, uiColor, DCSS_COLOR_MAP } from '../game/dcss-colors'
import { stripDcss } from './overlay-body'
import type { OverlayScreenCtx, UiPushMsg } from './game-overlays'
import { parseGroups, balanceRows, pickShape, type NgcItem } from './newgame-model'

// DEV insurance: force the row item-shape everywhere (the B fallback of
// the bakeoff — see spec "C→B insurance"). Toggled by __dcssNgcRows().
let forceRows = false
export function setNewgameRows(on?: boolean): boolean {
  forceRows = on ?? !forceRows
  return forceRows
}

// Live focus sink for the current render; game-view's ui-state handler
// routes type:"newgame-choice" here. Reference parity: lookup is by
// hotkey across both grids, menu_id ignored (ui-layouts.js:920-929).
let activeFocus: ((hotkey: number, fromClient: boolean) => void) | null = null
export function applyNewgameFocus(buttonFocus: number, fromClient: boolean): void {
  activeFocus?.(buttonFocus, fromClient)
}

function sendHotkey(ctx: OverlayScreenCtx, hotkey: string | number | undefined): void {
  if (typeof hotkey === 'number') {
    // Non-printable (Bksp=8, Tab=9, Esc=27) must go via {key, keycode};
    // {input, text} is for printable chars only.
    if (hotkey < 32 || hotkey === 127) ctx.send({ msg: 'key', keycode: hotkey })
    else ctx.send({ msg: 'input', text: String.fromCharCode(hotkey) })
  } else if (hotkey) {
    ctx.send({ msg: 'input', text: String(hotkey) })
  }
}

// Effective text color of a wire label ("<darkgrey>i - Artificer"):
// recommended/restricted state rides in the leading color tag
// (newgame.cc: white / lightgrey / darkgrey), and the crawl binary never
// closes tags, so the first tag colors the whole label.
function labelColor(rawLabel: string): string {
  const m = /^\s*<(\w+)>/.exec(rawLabel)
  return (m && DCSS_COLOR_MAP[m[1].toLowerCase()]) || DCSS_COLOR_MAP.lightgrey
}

function itemHotkeyAttr(item: NgcItem): string {
  return String(typeof item.hotkey === 'number'
    ? item.hotkey
    : (item.hotkey ? item.hotkey.charCodeAt(0) : 0))
}

function spriteOrBlank(loader: TileLoader | null, tiles: TileRef[], scale: number): HTMLElement {
  if (tiles.length > 0) return renderTiles(loader, tiles, scale)
  const blank = document.createElement('span')
  blank.className = 'ngv-blank'
  blank.style.width = blank.style.height = `${CELL * scale}px`
  return blank
}

export function showNewgameChoice(ctx: OverlayScreenCtx, msg: UiPushMsg): void {
  // First call: enterLayout wipes+hides menuControls; the game-view caller
  // rebuilds the Esc bar after us (game-view dispatch), so nothing here
  // may run after that ordering is violated.
  ctx.enterLayout({ touch: false })

  const loader = ctx.getLoader()
  const spectating = ctx.isSpectating()

  const wrap = document.createElement('div')
  wrap.className = 'ngv-wrap'
  ctx.overlay.appendChild(wrap)

  // Title block: stacked, doll leading when present (weapon screen /
  // random-combo carry one; species/background don't — send_doll trace).
  const titleEl = document.createElement('div')
  titleEl.className = 'ngv-title'
  if (msg.doll?.length) {
    const dollEl = renderTiles(loader, dollTileSpec({ doll: msg.doll }), 1)
    dollEl.classList.add('ngv-doll')
    titleEl.appendChild(dollEl)
  }
  const titleText = document.createElement('div')
  if (msg.title) {
    const line = document.createElement('div')
    line.innerHTML = dcssToHtml(msg.title)
    titleText.appendChild(line)
  }
  // prompt is only sent on the weapon screen; the reference drops it on
  // dollless screens — we render it whenever present.
  if (msg.prompt) {
    const line = document.createElement('div')
    line.className = 'ngv-prompt'
    line.innerHTML = dcssToHtml(msg.prompt)
    titleText.appendChild(line)
  }
  titleEl.appendChild(titleText)
  if (titleText.childElementCount > 0 || msg.doll?.length) wrap.appendChild(titleEl)

  const mainItems = msg['main-items']
  const subItems = msg['sub-items']
  const groups = mainItems ? parseGroups(mainItems) : []
  const shape = forceRows ? 'rows' : pickShape(groups, mainItems?.width ?? 1)
  const menuId = (mainItems as { menu_id?: string } | undefined)?.menu_id

  // ---- dock (pinned; two states) ----
  const dock = document.createElement('div')
  dock.className = 'ngv-dock'

  function dockShortcuts(): void {
    dock.textContent = ''
    if (!spectating) {
      const hint = document.createElement('div')
      hint.className = 'ngv-hint'
      hint.textContent = 'Tap to preview, tap again to confirm.'
      dock.appendChild(hint)
    }
    const actions = document.createElement('div')
    actions.className = 'ngv-actions'
    for (const btn of subItems?.buttons ?? []) {
      const a = document.createElement(spectating ? 'span' : 'button')
      a.className = 'ngv-action'
      // Wire labels carry column-alignment padding ("<brown>    * - Random
      // species") — meaningless once the desktop grid is gone.
      const raw = String(btn.label ?? btn.labels?.[0] ?? '')
        .trim().replace(/^(<\w+>)\s+/, '$1')
      a.innerHTML = dcssToHtml(raw)
      if (!spectating) {
        a.addEventListener('click', () => {
          sendHotkey(ctx, btn.hotkey)
          ctx.focusView()
        })
      }
      actions.appendChild(a)
    }
    dock.appendChild(actions)
  }

  function dockDescription(item: NgcItem): void {
    dock.textContent = ''
    const d = document.createElement('div')
    d.className = 'ngv-desc'
    d.innerHTML =
      `<strong>${escHtml(item.name)}</strong>` +
      (item.description ? `<br>${escHtml(item.description)}` : '') +
      (spectating ? '' : '<br><em class="ngv-confirm">Tap again to confirm; tap elsewhere to cancel.</em>')
    dock.appendChild(d)
  }

  // ---- selection state (all local to this render; restoreTopLayer
  // re-runs the whole function, so nothing survives a re-push) ----
  let highlightEl: HTMLElement | null = null
  let armedEl: HTMLElement | null = null
  const itemByEl = new Map<HTMLElement, NgcItem>()

  function setHighlight(el: HTMLElement | null): void {
    if (highlightEl) highlightEl.classList.remove('ngv-sel')
    highlightEl = el
    if (el) {
      const item = itemByEl.get(el)
      // Reference selection border = the wire highlight_colour (web build
      // emits 1 blue / 2 green / 7 lightgrey).
      el.style.setProperty('--ngv-sel-color', uiColor(item?.highlightColour ?? 15))
      el.classList.add('ngv-sel')
    }
  }

  function disarm(): void {
    armedEl = null
    setHighlight(null)
    dockShortcuts()
  }

  function onItemTap(el: HTMLElement, item: NgcItem): void {
    if (spectating) return
    if (armedEl === el) {
      sendHotkey(ctx, item.hotkey)
      ctx.focusView()
      return
    }
    armedEl = el
    setHighlight(el)
    dockDescription(item)
    // Mirror our cursor to spectators. Server type-checks both fields;
    // skip when the push carried no menu_id (ancient servers).
    if (typeof item.hotkey === 'number' && menuId) {
      ctx.send({ msg: 'outer_menu_focus', hotkey: item.hotkey, menu_id: menuId })
    }
    ctx.focusView()
  }

  // ---- main grid ----
  const grids = document.createElement('div')
  grids.className = 'ngv-groups'
  for (const group of groups) {
    if (group.label) {
      const h = document.createElement('div')
      h.className = 'ngv-sec-h'
      h.textContent = group.label
      grids.appendChild(h)
    }
    if (shape === 'cards') {
      let offset = 0
      for (const rowSize of balanceRows(group.items.length)) {
        const row = document.createElement('div')
        row.className = 'ngv-card-row'
        for (const item of group.items.slice(offset, offset + rowSize)) {
          const card = document.createElement('button')
          card.className = 'ngv-card'
          card.dataset.hotkey = itemHotkeyAttr(item)
          card.appendChild(spriteOrBlank(loader, item.tiles as TileRef[], 2))
          const name = document.createElement('span')
          name.textContent = item.name
          name.style.color = labelColor(item.rawLabel)
          card.appendChild(name)
          itemByEl.set(card, item)
          card.addEventListener('click', () => onItemTap(card, item))
          row.appendChild(card)
        }
        grids.appendChild(row)
        offset += rowSize
      }
    } else {
      for (const item of group.items) {
        const row = document.createElement('button')
        row.className = 'ngv-row'
        row.dataset.hotkey = itemHotkeyAttr(item)
        row.appendChild(spriteOrBlank(loader, item.tiles as TileRef[], 1))
        const name = document.createElement('span')
        name.className = 'ngv-row-name'
        name.textContent = item.name
        name.style.color = labelColor(item.rawLabel)
        row.appendChild(name)
        if (item.suffix) {
          const suffix = document.createElement('span')
          suffix.className = 'ngv-row-suffix'
          suffix.textContent = item.suffix
          suffix.style.color = labelColor(item.rawLabel)
          row.appendChild(suffix)
        }
        itemByEl.set(row, item)
        row.addEventListener('click', () => onItemTap(row, item))
        grids.appendChild(row)
      }
    }
  }
  wrap.appendChild(grids)

  // Tap on empty space (between cards, section headers) = cancel the
  // two-tap arm and bring the shortcuts back.
  wrap.addEventListener('click', ev => {
    if (!(ev.target as HTMLElement).closest('[data-hotkey]')) disarm()
  })

  dockShortcuts()
  ctx.overlay.appendChild(dock)

  // Inbound focus (initial focus on open, server-side arrow nav, the
  // watched player's moves when spectating). Playing: highlight only —
  // never arms, never hides the shortcuts (own echoes arrive with
  // from_client:true and are skipped, reference parity). Spectating:
  // apply everything incl. from_client:true and show the description.
  activeFocus = (hotkey, fromClient) => {
    if (!ctx.overlay.contains(dock)) return // stale render
    if (!spectating && fromClient) return
    const el = ctx.overlay.querySelector<HTMLElement>(`[data-hotkey="${hotkey}"]`)
    if (!el) return
    armedEl = null
    setHighlight(el)
    const item = itemByEl.get(el)
    if (spectating && item) dockDescription(item)
    else dockShortcuts()
  }

  ctx.focusView()
}

// "Do you want to play this combination?" confirm after picking a fully
// random character (newgame-random-combo). Carries a doll of the rolled
// character — same header treatment as the weapon screen.
export function showRandomCombo(ctx: OverlayScreenCtx, msg: UiPushMsg): void {
  const title = stripDcss(msg.prompt ?? msg.title ?? '')
  ctx.renderOverlay(title, () => {
    if (msg.doll?.length) {
      const dollEl = renderTiles(ctx.getLoader(), dollTileSpec({ doll: msg.doll }), 2)
      dollEl.classList.add('tile')
      const header = ctx.overlay.querySelector('.overlay-title')
      header?.insertBefore(dollEl, header.firstChild)
    }
    const bodyEl = document.createElement('div')
    bodyEl.className = 'overlay-body fg7'
    bodyEl.textContent = 'Do you want to play this combination?'
    ctx.overlay.appendChild(bodyEl)

    const bar = document.createElement('div')
    bar.className = 'overlay-footer overlay-actions'
    const choices: Array<{ key: string; label: string }> = [
      { key: 'Y', label: 'Yes (Y)' },
      { key: 'n', label: 'Reroll (n)' },
      { key: 'q', label: 'Quit (q)' },
    ]
    for (const c of choices) {
      const btn = document.createElement('button')
      btn.className = 'action-btn'
      btn.textContent = c.label
      btn.addEventListener('click', () => {
        ctx.send({ msg: 'input', text: c.key })
        ctx.focusView()
      })
      bar.appendChild(btn)
    }
    ctx.overlay.appendChild(bar)
  })
}
