// Fig. 1, "the path so far", drawn like a railway map. The B.Sc. is the trunk; the engineering track branches
// off it at the first job and the research tracks at the thesis. Projects are stations on their track, job roles
// are brackets under the engineering track. Time runs left to right on wide screens and top to bottom on phones.
// Every position is computed from the data: there is no physics and nothing to drag.
import { TRACKS, SPANS, NODES, AXIS, AXIS_BREAK, TICKS, type Track, type TrackId, type PathNode, type PathSpan } from './data'

/** Must match the `@media (max-width: 760px)` block in styles.css that makes the map tall. */
export const VERTICAL_QUERY = '(max-width: 760px)'

const NS = 'http://www.w3.org/2000/svg'
const R = 8 // station radius
const BEND = 14 // radius of the rounded bend where a track branches off another
const SELECTED_TEXT_SCALE = 1.15 // selected labels are larger and bold; reserve room for that
const V_TEXT_SCALE = 1.08 // the same allowance on phones, where selected labels only move sideways
// wide screens
const GUTTER = 150 // track names sit left of the time axis
const END_PAD = 36 // room for arrowheads after the last year
const TOP = 46 // first track row
const ROW = 62 // distance between track rows
const ROLE_DROP = 46 // role brackets sit this far below the engineering track
const AXIS_H = 30 // year labels along the bottom
const MIN_GAP_H = 26 // stations on one track never get closer than this
// phones
const V_TOP = 56
const V_END = 40
const COL_GAP = 28 // between the engineering, education and research columns
const BRACKET_X = 8 // role brackets run down the left edge
const MIN_GAP_V = 26
const MIN_GAP_V2 = 40 // when either neighbour has a two-line label

const SWEEP = 2.4 // seconds the draw-in takes to cross the whole timeline

type Side = 'above' | 'below' | 'left' | 'right'

interface Station extends PathNode {
  isSpan: false
  el: SVGGElement
  txt: SVGTextElement
  lines: 1 | 2 // phones may wrap a long label onto two lines
  x: number
  y: number
}
interface SpanItem extends PathSpan {
  isSpan: true
  el: SVGGElement
  hit: SVGPathElement
  main: SVGPathElement
  inner: SVGPathElement
  arrow: SVGPathElement
  caps: [SVGRectElement, SVGCircleElement] // start square, end junction
  txt: SVGTextElement
}
type Item = Station | SpanItem
interface TrackView {
  t: Track
  g: SVGGElement
  rail: SVGPathElement
  cap: SVGRectElement
  arrow: SVGPathElement
  note: SVGTextElement
  name: SVGTextElement
  cross: number // row (wide screens) or column (phones)
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag)
  for (const k in attrs) e.setAttribute(k, String(attrs[k]))
  return e
}
function attrs(e: SVGElement, a: Record<string, string | number>) {
  for (const k in a) e.setAttribute(k, typeof a[k] === 'number' ? (a[k] as number).toFixed(1) : String(a[k]))
}
const f = (n: number) => n.toFixed(1)
/** x/y that centre a square start marker on (cx, cy). */
const centred = (r: SVGRectElement, cx: number, cy: number) => {
  const h = r.width.baseVal.value / 2
  return { x: cx - h, y: cy - h }
}

/** Distance along the time axis as a fraction (0–1), following the non-linear AXIS knots. */
function warp(year: number) {
  const total = AXIS[AXIS.length - 1][1]
  if (year <= AXIS[0][0]) return 0
  for (let i = 0; i < AXIS.length - 1; i++) {
    const [y0, p0] = AXIS[i], [y1, p1] = AXIS[i + 1]
    if (year <= y1) return (p0 + ((year - y0) / (y1 - y0)) * (p1 - p0)) / total
  }
  return 1
}

/** Draw-in timing as CSS variables: --d is when the sweep reaches `from`, --t how long it takes to reach `to`. */
function sweep(g: SVGElement, from: number, to?: number | null) {
  g.style.setProperty('--d', `${(warp(from) * SWEEP).toFixed(2)}s`)
  if (to !== undefined) g.style.setProperty('--t', `${(((to === null ? 1 : warp(to)) - warp(from)) * SWEEP).toFixed(2)}s`)
}

export function initMap(svg: SVGSVGElement, detail: HTMLElement, initialId?: string) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const verticalMq = matchMedia(VERTICAL_QUERY)

  let W = 0, H = 0, vertical = false
  let a0 = 0, a1 = 0 // where the time axis starts and ends, in px
  let selected: Item | null = null

  const gAxis = el('g', { class: 'axis' }), gTracks = el('g'), gSpans = el('g'), gNodes = el('g')
  svg.append(gAxis, gTracks, gSpans, gNodes)

  // ---- tracks (the education track's rails are drawn by the B.Sc. span, so it can be selected) ----
  const tracks = new Map<TrackId, TrackView>()
  for (const t of TRACKS) {
    const g = el('g', { class: `track ${t.kind}` })
    sweep(g, t.from, t.to)
    const rail = el('path', { class: 'rail', pathLength: 1 }), cap = el('rect', { class: 'cap', width: 8, height: 8 }), arrow = el('path', { class: 'arrow' })
    const note = el('text', { class: 'note' }), name = el('text', { class: 'track-name' })
    note.textContent = t.branch?.label ?? ''
    name.textContent = t.label
    if (t.kind !== 'edu') g.append(rail, cap, arrow, note)
    g.append(name)
    gTracks.append(g)
    tracks.set(t.id, { t, g, rail, cap, arrow, note, name, cross: 0 })
  }
  const trackOf = (n: PathNode) => tracks.get(n.track)!

  // ---- spans: the degree and the job roles ----
  const spans: SpanItem[] = SPANS.map(d => {
    const g = el('g', { class: `span ${d.kind}`, tabindex: 0, role: 'button', 'aria-label': `${d.label}, ${d.when}` })
    sweep(g, d.from, d.to)
    const hit = el('path', { class: 'hit' }), main = el('path', { class: 'main', pathLength: 1 }), inner = el('path', { class: 'inner', pathLength: 1 })
    const arrow = el('path', { class: 'arrow' }), txt = el('text')
    const caps: [SVGRectElement, SVGCircleElement] = [el('rect', { class: 'cap', width: 11, height: 11 }), el('circle', { class: 'cap', r: 6 })]
    g.append(hit, main, inner, arrow, ...(d.kind === 'edu' ? caps : []), txt)
    gSpans.append(g)
    return { ...d, isSpan: true as const, el: g, hit, main, inner, arrow, caps, txt }
  })
  const spanById = new Map(spans.map(s => [s.id, s]))

  // ---- stations: projects ----
  const nodes: Station[] = NODES.map(d => {
    if (!tracks.has(d.track)) throw new Error(`Fig. 1: ${d.id} is on unknown track ${d.track}`)
    if (d.within && !spanById.has(d.within)) throw new Error(`Fig. 1: ${d.id} is within unknown span ${d.within}`)
    const kind = tracks.get(d.track)!.t.kind === 'eng' ? 'work' : 'research'
    const g = el('g', { class: `node ${kind}`, tabindex: 0, role: 'button', 'aria-label': `${d.label}, ${d.when}` })
    sweep(g, d.year)
    const txt = el('text')
    g.append(
      el('circle', { class: 'hit', r: R + 10 }), // larger invisible touch target
      el('circle', { class: 'halo', r: R + 7 }),
      el('circle', { class: 'ring', r: R + 11 }), // dashed registration ring, shown only when selected
      el('circle', { class: 'dot', r: R }),
      txt,
    )
    gNodes.append(g)
    return { ...d, isSpan: false as const, el: g, txt, lines: 1 as 1 | 2, x: 0, y: 0 }
  })
  const items: Item[] = [...spans, ...nodes]
  const byId = new Map<string, Item>(items.map(m => [m.id, m]))

  const along = (year: number) => a0 + warp(year) * (a1 - a0)
  const measure = (t: SVGTextElement, s: string) => { t.textContent = s; return t.getComputedTextLength() }
  /** Sets a station's label, optionally wrapped onto two lines at the space nearest the middle; returns its width. */
  function setLabel(n: Station, text: string, wrap: boolean) {
    n.txt.replaceChildren()
    const words = text.split(' ')
    if (!wrap || words.length < 2) { n.lines = 1; n.txt.textContent = text; return n.txt.getComputedTextLength() }
    let cut = 1
    for (let i = 1, best = Infinity; i < words.length; i++) {
      const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length)
      if (d < best) { best = d; cut = i }
    }
    n.lines = 2
    return Math.max(...[words.slice(0, cut).join(' '), words.slice(cut).join(' ')].map((line, i) => {
      const t = el('tspan', { dy: i ? '1.15em' : '0' })
      t.textContent = line
      n.txt.append(t)
      return t.getComputedTextLength()
    }))
  }
  const setSide = (n: Station, side: Side) => {
    for (const s of ['above', 'below', 'left', 'right']) n.el.classList.toggle(s, s === side)
  }

  // ---------------------------------------------------------------- layout

  /** Rows on wide screens; on phones, columns sized so the longest labels fit on either side. */
  function placeTracks() {
    if (!vertical) {
      TRACKS.forEach((t, i) => { tracks.get(t.id)!.cross = TOP + i * ROW + (t.kind === 'research' ? 0 : 10) })
      for (const n of nodes) setLabel(n, n.label, false)
      return
    }
    const eng = nodes.filter(n => trackOf(n).t.kind === 'eng'), res = nodes.filter(n => trackOf(n).t.kind !== 'eng')
    // Try full labels, then short ones; if both sides still don't fit, wrap the widest label onto two lines,
    // then the next widest, and so on, stopping as soon as everything fits.
    let short = false
    const wrapped = new Set<Station>(), width = new Map<Station, number>()
    const layoutFor = () => {
      for (const n of nodes) width.set(n, setLabel(n, short && n.short ? n.short : n.label, wrapped.has(n)) * V_TEXT_SCALE)
      const left = Math.max(0, ...eng.map(n => width.get(n)!)), right = Math.max(0, ...res.map(n => width.get(n)!))
      const xE = BRACKET_X + 12 + left + R + 8
      const xR = xE + COL_GAP * 2
      return { xE, xR, spare: W - 4 - (xR + R + 8 + right) }
    }
    let cols = layoutFor()
    if (cols.spare < 0) { short = true; cols = layoutFor() }
    while (cols.spare < 0) {
      const next = nodes.filter(n => !wrapped.has(n) && (short && n.short ? n.short : n.label).includes(' '))
        .sort((p, q) => width.get(q)! - width.get(p)!)[0]
      if (!next) break
      wrapped.add(next)
      cols = layoutFor()
    }
    const shift = Math.max(0, cols.spare / 2) // centre the columns in whatever room is left
    const xE = cols.xE + shift, xU = xE + COL_GAP, xR = cols.xR + shift
    for (const tv of tracks.values()) tv.cross = tv.t.kind === 'eng' ? xE : tv.t.kind === 'edu' ? xU : xR
  }

  /** Puts stations on their track at their year, nudging apart any that would sit on top of each other. */
  function placeStations() {
    const lanes = new Map<number, Station[]>()
    for (const n of nodes) {
      const cross = trackOf(n).cross, pos = along(n.year)
      if (vertical) { n.x = cross; n.y = pos } else { n.x = pos; n.y = cross }
      const lane = lanes.get(cross) ?? []
      lane.push(n); lanes.set(cross, lane)
    }
    for (const lane of lanes.values()) {
      lane.sort((p, q) => p.year - q.year)
      for (let i = 1; i < lane.length; i++) {
        const a = lane[i - 1], b = lane[i]
        if (vertical) b.y = Math.max(b.y, a.y + (a.lines === 2 || b.lines === 2 ? MIN_GAP_V2 : MIN_GAP_V))
        else b.x = Math.max(b.x, a.x + MIN_GAP_H)
      }
    }
  }

  /** Labels: beside stations on phones; on wide screens under them, flipping above when two would collide. */
  function placeLabels() {
    if (vertical) {
      for (const n of nodes) {
        const left = trackOf(n).t.kind === 'eng', x = left ? -(R + 8) : R + 8
        // a two-line label is centred on the dot: first line a little above, second below
        attrs(n.txt, { x, y: n.lines === 2 ? -3 : 5, 'text-anchor': left ? 'end' : 'start' })
        for (const t of n.txt.querySelectorAll('tspan')) t.setAttribute('x', f(x))
        setSide(n, left ? 'left' : 'right')
      }
      return
    }
    for (const tv of tracks.values()) {
      const lane = nodes.filter(n => n.track === tv.t.id).sort((p, q) => p.x - q.x)
      let lastBelow = -Infinity, lastAbove = -Infinity
      for (const n of lane) {
        const w = n.txt.getComputedTextLength() * SELECTED_TEXT_SCALE
        // keep the label inside the map: centred under the dot unless that would cross an edge
        const l = Math.max(GUTTER - 20, Math.min(n.x - w / 2, W - 4 - w))
        let side: Side = 'below'
        if (l < lastBelow + 10) side = l >= lastAbove + 10 ? 'above' : 'below'
        if (side === 'below') lastBelow = l + w; else lastAbove = l + w
        attrs(n.txt, { x: l + w / 2 - n.x, y: side === 'below' ? R + 18 : -(R + 10), 'text-anchor': 'middle' })
        setSide(n, side)
      }
    }
  }

  function drawAxis() {
    gAxis.replaceChildren()
    const tick = (p: number, label: string, cls = 'tick') => {
      const g = el('g', { class: cls }), t = el('text')
      t.textContent = label
      if (vertical) {
        g.append(el('line', { x1: 0, x2: W, y1: f(p), y2: f(p) }))
        attrs(t, { x: W - 4, y: p - 5, 'text-anchor': 'end' })
      } else {
        g.append(el('line', { x1: f(p), x2: f(p), y1: 8, y2: H - AXIS_H }))
        attrs(t, { x: p, y: H - 10, 'text-anchor': 'middle' })
      }
      if (label === '≈') g.firstChild?.remove() // the break has no gridline
      g.append(t)
      gAxis.append(g)
    }
    for (const y of TICKS) tick(along(y), String(y))
    tick(along(AXIS_BREAK), '≈', 'tick break')
  }

  function drawTracks() {
    for (const tv of tracks.values()) {
      const { t, cross: c } = tv
      attrs(tv.name, vertical ? { visibility: 'hidden' } : { visibility: 'visible', x: 16, y: c + 4 })
      if (t.kind === 'edu') continue
      const s = along(t.from), e = t.to === null ? a1 : along(t.to)
      let d: string
      if (t.branch) {
        // leave the parent track with a rounded 90° bend, then run along this track's own row or column
        const p = tracks.get(t.branch.from)!.cross, dir = Math.sign(c - p)
        d = vertical
          ? `M${f(p)},${f(s)} H${f(c - dir * BEND)} Q${f(c)},${f(s)} ${f(c)},${f(s + BEND)} V${f(e)}`
          : `M${f(s)},${f(p)} V${f(c - dir * BEND)} Q${f(s)},${f(c)} ${f(s + BEND)},${f(c)} H${f(e)}`
        attrs(tv.note, vertical ? { visibility: 'hidden' } : { visibility: 'visible', x: s + 7, y: (p + c) / 2 + 4 })
        attrs(tv.cap, { visibility: 'hidden' })
      } else {
        d = vertical ? `M${f(c)},${f(s)} V${f(e)}` : `M${f(s)},${f(c)} H${f(e)}`
        // on phones all research tracks share one column, so their separate start caps would just be noise
        attrs(tv.cap, vertical ? { visibility: 'hidden' } : { visibility: 'visible', ...centred(tv.cap, s, c) })
      }
      tv.rail.setAttribute('d', d)
      tv.arrow.setAttribute('d', t.to !== null ? '' : vertical
        ? `M${f(c - 6)},${f(e)} L${f(c)},${f(e + 11)} L${f(c + 6)},${f(e)} Z`
        : `M${f(e)},${f(c - 6)} L${f(e + 11)},${f(c)} L${f(e)},${f(c + 6)} Z`)
    }
  }

  function drawSpans() {
    const engCross = [...tracks.values()].find(tv => tv.t.kind === 'eng')!.cross
    for (const sp of spans) {
      const s = along(sp.from), e = sp.to === null ? a1 : along(sp.to)
      let d: string
      if (sp.kind === 'edu') {
        const c = [...tracks.values()].find(tv => tv.t.span === sp.id)!.cross
        d = vertical ? `M${f(c)},${f(s)} V${f(e)}` : `M${f(s)},${f(c)} H${f(e)}`
        attrs(sp.caps[0], vertical ? centred(sp.caps[0], c, s) : centred(sp.caps[0], s, c))
        attrs(sp.caps[1], vertical ? { cx: c, cy: e } : { cx: e, cy: c })
        const full = measure(sp.txt, sp.label)
        if (vertical) {
          if (c + 12 + full > W - 4 && sp.short) sp.txt.textContent = sp.short
          attrs(sp.txt, { x: c + 12, y: s + 5, 'text-anchor': 'start' })
        } else {
          if (full > e - s + 40 && sp.short) sp.txt.textContent = sp.short
          attrs(sp.txt, { x: (s + e) / 2, y: c - 12, 'text-anchor': 'middle' })
        }
        sp.arrow.setAttribute('d', '')
      } else {
        const open = sp.to === null
        if (vertical) {
          const x = BRACKET_X
          d = open ? `M${f(x + 6)},${f(s)} H${f(x)} V${f(e)}` : `M${f(x + 6)},${f(s)} H${f(x)} V${f(e)} H${f(x + 6)}`
          sp.arrow.setAttribute('d', open ? `M${f(x - 4)},${f(e)} L${f(x)},${f(e + 9)} L${f(x + 4)},${f(e)} Z` : '')
          sp.txt.textContent = sp.short ?? sp.label
          attrs(sp.txt, { x: x + 10, y: s + 4, 'text-anchor': 'start' })
        } else {
          const y = engCross + ROLE_DROP
          d = open ? `M${f(s)},${f(y - 6)} V${f(y)} H${f(e)}` : `M${f(s)},${f(y - 6)} V${f(y)} H${f(e)} V${f(y - 6)}`
          sp.arrow.setAttribute('d', open ? `M${f(e)},${f(y - 4)} L${f(e + 9)},${f(y)} L${f(e)},${f(y + 4)} Z` : '')
          // the label hangs under the bracket from its start, so short brackets (Associate SE) stay visible
          sp.txt.textContent = sp.label
          attrs(sp.txt, { x: s, y: y + 17, 'text-anchor': 'start' })
        }
      }
      for (const p of [sp.hit, sp.main, sp.inner]) p.setAttribute('d', d)
    }
  }

  function layout() {
    const r = svg.getBoundingClientRect()
    if (!r.width || !r.height) return
    W = r.width; H = r.height; vertical = verticalMq.matches
    svg.classList.toggle('vertical', vertical)
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    if (vertical) { a0 = V_TOP; a1 = H - V_END } else { a0 = GUTTER; a1 = W - END_PAD }
    placeTracks()
    placeStations()
    placeLabels()
    drawAxis()
    drawTracks()
    drawSpans()
    for (const n of nodes) n.el.setAttribute('transform', `translate(${f(n.x)},${f(n.y)})`)
  }

  // ---------------------------------------------------------------- hover and selection

  /** Hover/keyboard focus: spotlight the item itself (and the selected one, so it stays legible) and fade the rest. */
  function focusOn(item: Item | null) {
    svg.classList.toggle('focus', !!item)
    for (const m of items) m.el.classList.toggle('dim', !!item && m !== item && m !== selected)
    for (const tv of tracks.values()) tv.g.classList.toggle('dim', !!item)
  }

  function select(item: Item, fromUser: boolean) {
    selected = item
    for (const m of items) m.el.classList.toggle('sel', m === item)

    detail.replaceChildren()
    const add = <K extends keyof HTMLElementTagNameMap>(tag: K, text: string, cls?: string) => {
      const e = document.createElement(tag)
      e.textContent = text
      if (cls) e.className = cls
      detail.append(e)
      return e
    }
    add('p', item.when, 'k'); add('h3', item.label); add('p', item.text)
    const ul = add('ul', '', 'pts')
    for (const t of item.pts) { const li = document.createElement('li'); li.textContent = t; ul.append(li) }

    // On phones the detail panel sits below a tall map; bring it into view so the tap visibly does something.
    if (fromUser && vertical) detail.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' })
  }

  for (const item of items) {
    const g = item.el
    g.addEventListener('click', () => select(item, true))
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(item, true) } })
    g.addEventListener('mouseenter', () => focusOn(item))
    g.addEventListener('mouseleave', () => focusOn(null))
    // keyboard focus acts like hover; focus that comes from a click or tap doesn't
    g.addEventListener('focus', () => { if (g.matches(':focus-visible')) focusOn(item) })
    g.addEventListener('blur', () => focusOn(null))
  }

  // Draw-in: hidden (.intro) until the map first scrolls into view, then time sweeps across it once (.play).
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    svg.classList.add('intro')
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      svg.classList.replace('intro', 'play')
    }, { threshold: 0.3 })
    io.observe(svg)
  }

  new ResizeObserver(layout).observe(svg)
  // label widths change once the web fonts arrive
  document.fonts?.ready.then(layout)

  // Nothing is selected until the visitor picks something; until then the panel just says how to use the map.
  const first = initialId ? byId.get(initialId) : undefined
  if (first) select(first, false)
  else {
    const hint = document.createElement('p')
    hint.className = 'hint'
    hint.textContent = 'Select a station, a role or the degree on the map to read about it here.'
    detail.replaceChildren(hint)
  }
}
