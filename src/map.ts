// The path map, "the path so far", drawn like an old survey map. The B.Sc. is the trunk (a double road); the engineering
// track branches off it at the first job and the research tracks at the thesis. Each track is a trail of footprints
// up to today and a dashed road after it. Projects are town marks on their track, job roles are brackets beside the
// engineering track. Time runs left to right on wide screens and top to bottom on phones.
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
const ROLE_RISE = 46 // role brackets sit this far above the engineering track (the top row)
const ROLE_ROOM = 40 // the engineering row moves down this much to make room for them
const ENG_GAP = 24 // extra room under engineering: its project labels, the "first job" note and the degree's label share it
const AXIS_H = 30 // year labels along the bottom
const MIN_GAP_H = 26 // stations on one track never get closer than this
// phones
const V_TOP = 56
const V_END = 40
const COL_GAP = 28 // between the engineering, education and research columns
const BRACKET_X = 8 // role brackets run down the left edge
const MIN_GAP_V = 26
const MIN_GAP_V2 = 40 // when either neighbour has a two-line label

const STEP = 13 // footprint spacing along a trail
const SCALE_H = 5 // height of the scale-of-years bar

/** Today as a fractional year: where each walked trail turns into the dashed road ahead. */
function todayYear() {
  const d = new Date(), y = d.getFullYear()
  return y + (d.getTime() - new Date(y, 0, 1).getTime()) / (365.25 * 864e5)
}

/** The selected station's wax seal: an organic blob (a few soft lobes, not even teeth). */
const SEAL = Array.from({ length: 72 }, (_, i) => {
  const th = (i / 72) * 2 * Math.PI, r = 10.5 + 0.8 * Math.sin(3 * th + 0.5) + 0.5 * Math.sin(5 * th + 2) + 0.25 * Math.sin(11 * th)
  return `${(r * Math.cos(th)).toFixed(2)},${(r * Math.sin(th)).toFixed(2)}`
}).join(' ')

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
  rail: SVGPathElement // the track's geometry; not drawn itself (see trail and ahead)
  prints: SVGGElement // footprints, from the start up to today
  ahead: SVGPathElement // the dashed road after today
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

// ---- hand inking ----
/** A small wobble keyed to position on the page (not distance along the line), so trails that share a column on
 *  phones wobble identically instead of braiding. */
const wobble = (u: number, amp: number) => amp * (0.7 * Math.sin(u / 31) + 0.45 * Math.sin(u / 11.3 + 1.3) + 0.25 * Math.sin(u / 4.7 + 2.1))
function tangent(path: SVGPathElement, s: number, L: number) {
  const a = path.getPointAtLength(Math.max(0, s - 1)), b = path.getPointAtLength(Math.min(L, s + 1))
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  return { nx: -(b.y - a.y) / len, ny: (b.x - a.x) / len, ang: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI }
}
/** A hand-inked copy of `path` between arc lengths s0 and s1; the path's own two ends stay exactly in place. */
function ink(path: SVGPathElement, s0: number, s1: number, amp: number) {
  const L = path.getTotalLength(), out: string[] = []
  for (let s = s0; ; s = Math.min(s1, s + 3)) {
    const p = path.getPointAtLength(s), { nx, ny } = tangent(path, s, L)
    const o = wobble(p.x + p.y, amp) * Math.min(1, s / 12, (L - s) / 12)
    out.push(`${out.length ? 'L' : 'M'}${f(p.x + nx * o)},${f(p.y + ny * o)}`)
    if (s >= s1) break
  }
  return out.join('')
}
/** One footprint (sole + heel) at p, walking along `ang`; alternate feet step to either side, toes turned out. */
function footprint(p: DOMPoint, ang: number, side: 1 | -1) {
  const g = el('g', { class: 'print', transform: `translate(${f(p.x)},${f(p.y)}) rotate(${(ang + side * 7).toFixed(0)}) translate(0,${side * 3.4})` })
  g.append(el('ellipse', { cx: 2, cy: 0, rx: 3.1, ry: 2 }), el('ellipse', { cx: -3.4, cy: 0, rx: 1.8, ry: 1.6 }))
  return g
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
    const rail = el('path', { class: 'rail' }), cap = el('rect', { class: 'cap', width: 8, height: 8 }), arrow = el('path', { class: 'arrow' })
    const prints = el('g', { class: 'prints' }), ahead = el('path', { class: 'ahead' })
    const note = el('text', { class: 'note' }), name = el('text', { class: 'track-name' })
    note.textContent = t.branch?.label ?? ''
    name.textContent = t.label
    if (t.kind !== 'edu') g.append(rail, prints, ahead, cap, arrow, note)
    g.append(name)
    gTracks.append(g)
    tracks.set(t.id, { t, g, rail, prints, ahead, cap, arrow, note, name, cross: 0 })
  }
  const trackOf = (n: PathNode) => tracks.get(n.track)!

  // ---- spans: the degree and the job roles ----
  const spans: SpanItem[] = SPANS.map(d => {
    const g = el('g', { class: `span ${d.kind}`, tabindex: 0, role: 'button', 'aria-label': `${d.label}, ${d.when}` })
    const hit = el('path', { class: 'hit' }), main = el('path', { class: 'main' }), inner = el('path', { class: 'inner' })
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
    const g = el('g', { class: `node ${kind}${d.minor ? ' minor' : ''}`, tabindex: 0, role: 'button', 'aria-label': `${d.label}, ${d.when}` })
    const txt = el('text')
    // a town mark (ring + dot); when selected, a wax seal pressed with the ✦ the detail panel uses for bullets
    const seal = el('g', { class: 'seal' })
    seal.append(
      el('polygon', { class: 'seal-shadow', points: SEAL, transform: 'translate(1,1.6)' }),
      el('polygon', { class: 'seal-wax', points: SEAL }),
      el('circle', { class: 'seal-rim', r: 7.3 }),
      el('path', { class: 'seal-mark', d: 'M0,-4.2 Q0.7,-0.7 4.2,0 Q0.7,0.7 0,4.2 Q-0.7,0.7 -4.2,0 Q-0.7,-0.7 0,-4.2 Z' }),
    )
    g.append(
      el('circle', { class: 'hit', r: R + 10 }), // larger invisible touch target
      el('circle', { class: 'dot', r: d.minor ? 3.6 : 5.5 }), // minor stops are smaller towns
      el('circle', { class: 'town', r: d.minor ? 1.3 : 1.9 }),
      seal,
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
      // one row each, starting low enough for engineering's role brackets above it, with extra room after engineering and before research
      let y = TOP + ROLE_ROOM
      TRACKS.forEach((t, i) => {
        const prev = TRACKS[i - 1]
        if (prev) y += ROW + (prev.kind === 'eng' ? ENG_GAP : 0) + (prev.kind !== 'research' && t.kind === 'research' ? 10 : 0)
        tracks.get(t.id)!.cross = y
      })
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
      const roleStarts = spans.filter(sp => sp.kind === 'role').map(sp => along(sp.from))
      for (const n of nodes) {
        const left = trackOf(n).t.kind === 'eng', x = left ? -(R + 8) : R + 8
        // a two-line label is centred on the dot: first line a little above, second below
        attrs(n.txt, { x, y: n.lines === 2 ? -3 : 5, 'text-anchor': left ? 'end' : 'start' })
        for (const t of n.txt.querySelectorAll('tspan')) t.setAttribute('x', f(x))
        setSide(n, left ? 'left' : 'right')
        // phones have room beside every stop, except where a role bracket's label starts on the same line
        n.el.classList.toggle('quiet', !!n.minor && roleStarts.some(y => Math.abs(n.y - y) < 16))
      }
      return
    }
    // major stops claim label room first; minor stops keep their labels hidden until hovered, focused or selected
    for (const tv of tracks.values()) {
      const lane = nodes.filter(n => n.track === tv.t.id).sort((p, q) => Number(!!p.minor) - Number(!!q.minor) || p.x - q.x)
      const taken: Record<'below' | 'above', [number, number][]> = { below: [], above: [] }
      const free = (side: 'below' | 'above', l: number, r: number) => taken[side].every(([a, b]) => r + 10 <= a || l >= b + 10)
      for (const n of lane) {
        const w = n.txt.getComputedTextLength() * SELECTED_TEXT_SCALE
        // keep the label inside the map: centred under the dot unless that would cross an edge
        const l = Math.max(GUTTER - 20, Math.min(n.x - w / 2, W - 4 - w))
        const side: Side = free('below', l, l + w) ? 'below' : free('above', l, l + w) ? 'above' : 'below'
        const fits = !n.minor && free(side, l, l + w) // minor stops stay unlabelled on wide screens, to keep the rows calm
        n.el.classList.toggle('quiet', !!n.minor && !fits)
        if (fits || !n.minor) taken[side].push([l, l + w])
        attrs(n.txt, { x: l + w / 2 - n.x, y: side === 'below' ? R + 18 : -(R + 10), 'text-anchor': 'middle' })
        setSide(n, side)
      }
    }
  }

  function drawAxis() {
    gAxis.replaceChildren()
    const text = (cls: string, label: string, a: Record<string, string | number>) => {
      const t = el('text', { class: cls }); t.textContent = label; attrs(t, a); return t
    }
    const by = H - AXIS_H + 5 // the scale bar's top edge (wide screens)
    for (const y of TICKS) {
      const p = along(y), g = el('g', { class: 'tick' })
      if (vertical) g.append(el('line', { x1: 0, x2: W, y1: f(p), y2: f(p) }), text('', String(y), { x: W - 4, y: p - 5, 'text-anchor': 'end' }))
      else g.append(el('line', { x1: f(p), x2: f(p), y1: 8, y2: by - 2 }))
      gAxis.append(g)
    }
    gAxis.append(text('tick break', '≈', vertical ? { x: W - 4, y: along(AXIS_BREAK) - 5, 'text-anchor': 'end' } : { x: along(AXIS_BREAK), y: by - 6, 'text-anchor': 'middle' }))

    // today: a faint line across the map where every trail turns into the road ahead
    const now = along(Math.min(todayYear(), AXIS[AXIS.length - 1][0]))
    const today = el('g', { class: 'today' })
    if (vertical) today.append(el('line', { x1: 0, x2: W, y1: f(now), y2: f(now) }), text('', 'today', { x: W - 4, y: now - 5, 'text-anchor': 'end' }))
    else today.append(el('line', { x1: f(now), x2: f(now), y1: 22, y2: f(by - 2) }), text('', 'today', { x: now, y: 15, 'text-anchor': 'middle' }))
    gAxis.append(today)

    // "Terra incognita" past today, in the widest empty lane between the tracks that run on
    const end = (now + a1) / 2
    if (a1 - now > 20) {
      const yr = todayYear(), lo = vertical ? 0 : 22, hi = vertical ? W : by - 2
      const running = [...tracks.values()].filter(tv => tv.t.to === null || tv.t.to > yr)
      // the open role bracket's arrow also runs past today, just above the engineering track
      const lanes = [lo, ...running.map(tv => tv.cross), ...(vertical ? [] : running.filter(tv => tv.t.kind === 'eng').map(tv => tv.cross - ROLE_RISE)), hi].sort((a, b) => a - b)
      let mid = (lo + hi) / 2, gap = 0
      for (let i = 1; i < lanes.length; i++) if (lanes[i] - lanes[i - 1] > gap) { gap = lanes[i] - lanes[i - 1]; mid = (lanes[i] + lanes[i - 1]) / 2 }
      gAxis.append(text('incognita', 'Terra incognita', vertical
        ? { x: f(mid), y: f(end + 4), 'text-anchor': 'middle' }
        : { x: 0, y: 0, 'text-anchor': 'middle', transform: `translate(${f(end + 4)},${f(mid)}) rotate(-90)` }))
    }
    if (vertical) return

    // the scale of years: alternating segments between the year ticks, like an old map's scale bar
    const xs = [...TICKS.map(along), a1], scale = el('g', { class: 'scale' })
    for (let i = 0; i < xs.length - 1; i++) scale.append(el('rect', { class: i % 2 ? 'seg light' : 'seg dark', x: f(xs[i]), y: by, width: f(xs[i + 1] - xs[i]), height: SCALE_H }))
    scale.append(el('rect', { class: 'seg-frame', x: f(xs[0]), y: by, width: f(xs[xs.length - 1] - xs[0]), height: SCALE_H }))
    TICKS.forEach((y, i) => scale.append(text('scale-year', String(y), { x: xs[i], y: by + 16, 'text-anchor': 'middle' })))
    scale.append(text('scale-cap', 'Scale of years', { x: xs[0] - 12, y: by + 6, 'text-anchor': 'end' }))
    gAxis.append(scale)

    // a compass rose in a square frame, in the empty stretch of the research rows before the first one begins
    const research = TRACKS.filter(t => t.kind === 'research'), rows = research.map(t => tracks.get(t.id)!.cross)
    const begins = Math.min(...research.map(t => t.from))
    const cx = (along(TICKS[0]) + along(begins)) / 2 - 20, cy = (Math.min(...rows) + Math.max(...rows)) / 2

    // rhumb lines: 16 winds from the rose's frame out to the map's edges, under everything else on the map
    const rhumbs = el('g', { class: 'rhumbs' })
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8, dx = Math.sin(a), dy = -Math.cos(a)
      const t0 = 44 / Math.max(Math.abs(dx), Math.abs(dy)) // just outside the frame
      const t1 = Math.min(dx > 0 ? (W - cx) / dx : dx < 0 ? -cx / dx : Infinity, dy > 0 ? (by - 2 - cy) / dy : dy < 0 ? (8 - cy) / dy : Infinity)
      rhumbs.append(el('line', { class: i % 2 ? '' : 'wind', x1: f(cx + dx * t0), y1: f(cy + dy * t0), x2: f(cx + dx * t1), y2: f(cy + dy * t1) }))
    }
    gAxis.prepend(rhumbs)

    const rose = el('g', { class: 'compass', transform: `translate(${f(cx)},${f(cy)})` })
    rose.append(el('rect', { class: 'frame', x: -42, y: -42, width: 84, height: 84 }), el('rect', { class: 'frame thin', x: -38, y: -38, width: 76, height: 76 }),
      el('circle', { class: 'ring', r: 24 }), el('circle', { class: 'ring thin', r: 19 }))
    for (const [ang, len, w] of [[45, 17, 3], [135, 17, 3], [225, 17, 3], [315, 17, 3], [0, 31, 4.5], [90, 31, 4.5], [180, 31, 4.5], [270, 31, 4.5]]) {
      const r = el('g', { transform: `rotate(${ang})` })
      r.append(el('path', { class: 'pt dark', d: `M0,0 L0,${-len} L${w},${-w} Z` }), el('path', { class: 'pt light', d: `M0,0 L0,${-len} L${-w},${-w} Z` }))
      rose.append(r)
    }
    rose.append(text('compass-n', 'N', { x: 0, y: -27, 'text-anchor': 'middle' }))
    gAxis.append(rose)
  }

  /** A track's trail: footprints from its start up to today, then a dashed road to its end. */
  function drawTrail(tv: TrackView) {
    const path = tv.rail, L = path.getTotalLength(), end = path.getPointAtLength(L), endC = vertical ? end.y : end.x
    const amp = vertical ? 0.5 : 1
    const sToday = Math.max(0, Math.min(L, L - (endC - along(todayYear())))) // the trail ends in a straight run, so this is exact
    tv.ahead.setAttribute('d', sToday < L - 6 ? ink(path, sToday + 3, L - 3, amp) : '')
    tv.prints.replaceChildren()
    // the bend off the parent track, if any: prints evenly spaced along the curve
    let sRun = L
    while (sRun > 2) { const q = path.getPointAtLength(sRun - 2); if (Math.abs(vertical ? q.x - end.x : q.y - end.y) > 0.05) break; sRun -= 2 }
    let k = 0
    for (let s = 3; s < Math.min(sRun, sToday - 4); s += STEP, k++) tv.prints.append(footprint(path.getPointAtLength(s), tangent(path, s, L).ang, k % 2 ? 1 : -1))
    // the straight run: prints snapped to a grid on the axis, so trails that overlap on phones print in the same spots
    for (let c = a0 + Math.ceil((endC - (L - sRun) + 4 - a0) / STEP) * STEP; ; c += STEP) {
      const s = L - (endC - c)
      if (s > sToday - 4) break
      tv.prints.append(footprint(path.getPointAtLength(s), vertical ? 90 : 0, Math.round((c - a0) / STEP) % 2 ? 1 : -1))
    }
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
      drawTrail(tv)
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
          attrs(sp.txt, { x: x + 10, y: s - 5, 'text-anchor': 'start' }) // just above the bracket's start, clear of its first project
        } else {
          const y = engCross - ROLE_RISE
          d = open ? `M${f(s)},${f(y + 6)} V${f(y)} H${f(e)}` : `M${f(s)},${f(y + 6)} V${f(y)} H${f(e)} V${f(y + 6)}`
          sp.arrow.setAttribute('d', open ? `M${f(e)},${f(y - 4)} L${f(e + 9)},${f(y)} L${f(e)},${f(y + 4)} Z` : '')
          // the label sits on the bracket from its start, so short brackets (Associate SE) stay visible
          sp.txt.textContent = sp.label
          attrs(sp.txt, { x: s, y: y - 6, 'text-anchor': 'start' })
        }
      }
      // the hit area keeps the exact line; what's drawn is hand-inked (both strokes of the degree's road alike)
      sp.hit.setAttribute('d', d)
      const inked = ink(sp.hit, 0, sp.hit.getTotalLength(), vertical ? 0.5 : 1)
      sp.main.setAttribute('d', inked); sp.inner.setAttribute('d', inked)
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
