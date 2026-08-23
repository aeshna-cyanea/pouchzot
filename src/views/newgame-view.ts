// Newgame-choice screen (species / background / weapon / sprint-map
// select). Spec + traced wire facts: dev-material/newgame-redesign.md.
//
// Layout: the reference's multi-column grid kept as-is in shape, but each
// wire column is a full-width panel in a horizontally swipeable,
// snap-scrolling strip (newgame-model.ts parseGroups keeps the column
// index) — rows get a phone's whole width instead of a third of it, so
// sprite + "a - Gnoll" + full name fit without shrinking. Mid-column
// labels (Zealot, Warrior-mage) stay in their column as sub-headers.
// Suffix-label menus (weapon aptitudes) and single-column menus render
// as plain rows. The sub-items shortcuts sit in a static footer on the
// overlay's own black, pinned only so the long single-column lists keep
// Bksp/random reachable; the armed item's description appears above
// them during the two-tap confirm. Cards (sprite-forward balanced rows,
// the earlier design) survive behind the DEV shape override only.
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
import { parseGroups, balanceRows, pickShape, toItem, type NgcItem, type NgcGroup, type NgcShape } from './newgame-model'

// DEV insurance: override the item shape everywhere (see spec "C→B
// insurance" — every shape must stay one flip away). Driven by
// __dcssNgcShape(); undefined cycles auto → columns → cards → rows.
const SHAPE_CYCLE: Array<NgcShape | 'auto'> = ['auto', 'columns', 'cards', 'rows']
let forceShape: NgcShape | 'auto' = 'auto'
export function setNewgameShape(shape?: NgcShape | 'auto'): NgcShape | 'auto' {
  forceShape = shape ?? SHAPE_CYCLE[(SHAPE_CYCLE.indexOf(forceShape) + 1) % SHAPE_CYCLE.length]
  return forceShape
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

// Row sprites at 1.25× the 32px atlas cell: 40px reads as an icon next
// to 0.85rem text where 32px read as an afterthought. Fractional scales
// are fine (tile-view positions by CELL * scale).
const ROW_SPRITE_SCALE = 1.25

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
  const shape: NgcShape = forceShape === 'auto' ? pickShape(groups, mainItems?.width ?? 1) : forceShape
  // Each grid has its own menu_id (species-main / species-sub); the
  // outer_menu_focus mirror must name the grid the armed button lives in.
  const menuId = (mainItems as { menu_id?: string } | undefined)?.menu_id
  const subMenuId = (subItems as { menu_id?: string } | undefined)?.menu_id

  // #ui-overlay is reused across pushes, and enterLayout's innerHTML wipe
  // never clamps its scrollTop: the clear and the refill happen in one
  // task, so no layout ever runs against an empty container and the
  // offset survives into the next step's content (species scrolled to 297
  // -> background opens at 297). Reset only when the step actually
  // changes — ui-pop re-renders THIS push through the same path
  // (restoreTopLayer -> showUiPush), so returning from `?` or `%` must
  // land where the user left off. The marker lives on the overlay, which
  // outlives the wipe but not the game view, so a fresh view always
  // starts at the top.
  const stepKey = menuId ?? String(msg.title ?? '')
  if (ctx.overlay.dataset.ngcStep !== stepKey) {
    ctx.overlay.dataset.ngcStep = stepKey
    ctx.overlay.scrollTop = 0
  }

  // ---- footer ----
  // The shortcuts are ALWAYS mounted; arming an item only adds its
  // description above them. An earlier revision swapped the two — which
  // stranded the shortcuts behind a tap on whatever empty space the user
  // could find, and the reference shows both at once anyway.
  const dock = document.createElement('div')
  dock.className = 'ngv-foot'

  function buildActions(): HTMLElement {
    const actions = document.createElement('div')
    actions.className = 'ngv-actions'
    // Keep the wire grid: sub-items are always width 2 in practice
    // (species/background/weapon -sub), and reading order runs across
    // then down. Capped at 2 — a wider grid would ellipsise to nothing
    // at phone widths, so its extra columns fold into column 2.
    const subCols = Math.min(Math.max(subItems?.width ?? 1, 1), 2)
    if (subCols === 2) actions.classList.add('ngv-actions-2')
    const subButtons = [...(subItems?.buttons ?? [])]
      .sort((a, b) => ((a.y ?? 0) - (b.y ?? 0)) || ((a.x ?? 0) - (b.x ?? 0)))
    for (const btn of subButtons) {
      const a = document.createElement(spectating ? 'span' : 'button')
      a.className = 'ngv-action'
      // Explicit column + auto row flow reproduces the wire placement
      // even when the last row is short (species-sub: "? - Help" alone).
      a.style.gridColumn = String(Math.min(btn.x ?? 0, subCols - 1) + 1)
      // Leading whitespace is the server's own column alignment, NOT
      // stray padding: newgame.cc hardcodes "    * - ", "    ! - ",
      // "Space - ", "  Tab - " so every dash in the right column lands
      // on col 6. The weapon menu's builder does NOT pad (newgame.cc:1802
      // "* - Random weapon" vs "Bksp - Return to character menu"), so its
      // right column is ragged — on the desktop too. Looks like an upstream
      // oversight rather than intent, but we render whatever arrives
      // verbatim rather than re-aligning client-side. Kept literal by
      // white-space:pre on .ngv-action.
      const raw = String(btn.label ?? btn.labels?.[0] ?? '').trimEnd()
      a.innerHTML = dcssToHtml(raw)
      // text-overflow paints its ellipsis in the BLOCK's color, not the
      // inner markup span's — without this it comes out as the UA's
      // buttontext (near-black on the dark dock) instead of brown.
      a.style.color = labelColor(raw)
      // Same two-tap contract as the main items: first tap arms (outline +
      // the wire description in the footer), second tap sends. A one-tap
      // "! - Random character" or "Tab - <previous character>" next to a
      // two-tap species list was the inconsistency; and these carry
      // descriptions on the wire precisely so a preview can show them.
      const item = toItem(btn)
      a.dataset.hotkey = itemHotkeyAttr(item)
      a.dataset.menuId = subMenuId ?? ''
      itemByEl.set(a, item)
      if (!spectating) a.addEventListener('click', () => onItemTap(a, item))
      actions.appendChild(a)
    }
    return actions
  }

  // The standing tap hint lives in the slack between the columns and the
  // footer (a flex spacer in the wrap), centred in whatever space the
  // screen leaves — not in the footer, where it read as a footer heading.
  // Shown only while nothing is armed; the armed description takes over
  // in the footer.
  const hint = document.createElement('div')
  hint.className = 'ngv-hint'
  hint.textContent = spectating ? '' : 'Tap to preview, tap again to confirm.'

  // item = the armed item's description above the shortcuts, null = just
  // the shortcuts (and the hint back in the gap).
  function renderDock(item: NgcItem | null): void {
    hint.hidden = item !== null
    if (item) {
      const head = document.createElement('div')
      head.className = 'ngv-desc'
      head.innerHTML =
        `<strong>${escHtml(item.name)}</strong>` +
        (item.description ? `<br>${escHtml(item.description)}` : '') +
        (spectating ? '' : '<br><em class="ngv-confirm">Tap again to confirm.</em>')
      dock.replaceChildren(head, actions)
    } else {
      dock.replaceChildren(actions)
    }
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
      // Server-driven focus (initial focus, arrow keys, the watched
      // player's cursor) may land in a column the strip has scrolled
      // off — bring it in. 'nearest' on both axes so a focus already on
      // screen moves nothing. Guarded: happy-dom lacks it.
      el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    }
  }

  function disarm(): void {
    armedEl = null
    setHighlight(null)
    renderDock(null)
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
    renderDock(item)
    // Mirror our cursor to spectators. Server type-checks both fields;
    // skip when the push carried no menu_id (ancient servers). Sub-item
    // buttons stamp their own grid's id (data-menu-id); main items use
    // the main grid's.
    const gridId = el.dataset.menuId ?? menuId
    if (typeof item.hotkey === 'number' && gridId) {
      ctx.send({ msg: 'outer_menu_focus', hotkey: item.hotkey, menu_id: gridId })
    }
    ctx.focusView()
  }

  // Built once (after the selection state it registers into) and
  // re-parented on every footer render, so the shortcut buttons keep
  // their identity (and their listeners) across arm/disarm.
  const actions = buildActions()

  // Row = sprite + name. The "a - " hotkey prefix is dropped (touch has
  // no letters to press; physical keyboards still work via the document
  // key handler) — the brown sub-item shortcuts below keep theirs, since
  // the key IS the content there. The white/lightgrey/darkgrey
  // recommendation colour rides the wire label's leading tag.
  function buildRow(item: NgcItem): HTMLButtonElement {
    const row = document.createElement('button')
    row.className = 'ngv-row'
    row.dataset.hotkey = itemHotkeyAttr(item)
    row.appendChild(spriteOrBlank(loader, item.tiles as TileRef[], ROW_SPRITE_SCALE))
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
    return row
  }

  function sectionHeader(label: string, cls = 'ngv-sec-h'): HTMLElement {
    const h = document.createElement('div')
    h.className = cls
    h.textContent = label
    return h
  }

  // Columns: one snap panel per wire column, groups rendered back into
  // their authored column in y order (a column's first label is its
  // header, later labels are sub-headers). The next panel's edge peeking
  // in is the swipe affordance (CSS sizes panels to content, bounded so
  // one never fills the strip).
  function buildColumns(): HTMLElement {
    const block = document.createElement('div')
    block.className = 'ngv-colblock'
    const strip = document.createElement('div')
    strip.className = 'ngv-strip'
    const byCol = new Map<number, NgcGroup[]>()
    for (const g of groups) byCol.set(g.col, [...(byCol.get(g.col) ?? []), g])
    const cols = [...byCol.keys()].sort((a, b) => a - b)
    for (const c of cols) {
      const panel = document.createElement('div')
      panel.className = 'ngv-col'
      let first = true
      for (const g of byCol.get(c)!) {
        if (g.label) panel.appendChild(sectionHeader(g.label, first ? 'ngv-col-h' : 'ngv-sec-h'))
        first = false
        for (const item of g.items) panel.appendChild(buildRow(item))
      }
      strip.appendChild(panel)
    }
    block.appendChild(strip)
    return block
  }

  // ---- main grid ----
  const grids = document.createElement('div')
  grids.className = 'ngv-groups'
  if (shape === 'columns') grids.appendChild(buildColumns())
  for (const group of shape === 'columns' ? [] : groups) {
    if (group.label) grids.appendChild(sectionHeader(group.label))
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
          name.className = 'ngv-card-name'
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
      for (const item of group.items) grids.appendChild(buildRow(item))
    }
  }
  wrap.appendChild(grids)
  wrap.appendChild(hint)

  // Tap on empty space (between cards, section headers) = cancel the
  // two-tap arm and bring the shortcuts back.
  wrap.addEventListener('click', ev => {
    if (!(ev.target as HTMLElement).closest('[data-hotkey]')) disarm()
  })

  renderDock(null)
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
    renderDock(spectating && item ? item : null)
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
