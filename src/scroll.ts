// Fig. 1 as a parchment scroll: the figure is a torn sheet with a paper roll on its far edge (the right on wide
// screens, the bottom on phones), and it unrolls the first time it scrolls into view.
//
// Textures are pre-rendered images (src/assets, set in styles.css); this module only draws what depends on the
// sheet's size — its torn outline, the scorched rim that follows it, the drop shadow and the curl into the roll —
// and redraws them when the size changes. The unroll moves the roll and slides a clipping window over the sheet
// with transforms only, so the GPU runs it and scrolling stays smooth.
import { VERTICAL_QUERY } from './map'

const NS = 'http://www.w3.org/2000/svg'
const PAD = 24 // room around the sheet for its shadow, in the shadow SVG

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag)
  for (const k in attrs) e.setAttribute(k, String(attrs[k]))
  return e
}

/** Stable pseudo-random 0–1 per (edge, index), so resizing doesn't reshuffle the whole outline. */
const noise = (edge: number, i: number) => { const x = Math.sin(edge * 127.1 + i * 311.7) * 43758.5453; return x - Math.floor(x) }

/** How far the edge is torn in at point i: small ragged jitter, with an occasional deeper bite. */
function tear(edge: number, i: number) {
  let d = 2.5 + 2 * Math.sin(i * 0.9 + edge) + 1.5 * Math.sin(i * 2.3 + edge * 2) + 2.5 * noise(edge, i)
  if (noise(edge + 10, i) < 0.07) d += 7 + 8 * noise(edge + 20, i)
  return Math.max(0.5, d)
}

/** The torn outline of a W×H sheet, as a path in px. Neighbouring points are averaged so bites read as tears. */
function outline(W: number, H: number) {
  const pts: [number, number][] = [], step = 9
  for (let x = 0; x <= W; x += step) pts.push([x, tear(1, x / step)])
  for (let y = step; y < H; y += step) pts.push([W - tear(2, y / step), y])
  for (let x = W; x >= 0; x -= step) pts.push([x, H - tear(3, x / step)])
  for (let y = H - step; y > 0; y -= step) pts.push([tear(4, y / step), y])
  const n = pts.length
  return 'M' + pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]
    return `${((a[0] + 2 * p[0] + b[0]) / 4).toFixed(1)},${((a[1] + 2 * p[1] + b[1]) / 4).toFixed(1)}`
  }).join('L') + 'Z'
}

export function initScroll(scroll: HTMLElement) {
  const plate = scroll.querySelector<HTMLElement>('.plate')!
  const inner = scroll.querySelector<HTMLElement>('.scroll-inner')!
  const roll = scroll.querySelector<HTMLElement>('.roll')!
  const vertical = matchMedia(VERTICAL_QUERY)

  // the sheet's shadow on the page, behind it; and its scorched rim + curl, over it (both static layers)
  const shadow = el('svg', { class: 'sheet-shadow', 'aria-hidden': 'true' })
  shadow.innerHTML = '<filter id="sheet-blur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>'
  const shadowPath = el('path', { transform: 'translate(3,6)', filter: 'url(#sheet-blur)' })
  shadow.append(shadowPath)
  inner.prepend(shadow)

  const surface = el('svg', { class: 'sheet-surface', 'aria-hidden': 'true' })
  surface.innerHTML = `<defs>
    <linearGradient id="sheet-curl-h" x1="0" x2="1"><stop offset="0" class="curl-0"/><stop offset=".45" class="curl-light"/><stop offset=".75" class="curl-mid"/><stop offset="1" class="curl-dark"/></linearGradient>
    <linearGradient id="sheet-curl-v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="curl-0"/><stop offset=".45" class="curl-light"/><stop offset=".75" class="curl-mid"/><stop offset="1" class="curl-dark"/></linearGradient>
  </defs>`
  // a soft rim from stacked strokes of falling opacity (a blur filter would re-run whenever the sheet resizes)
  const rims = [34, 24, 15, 8].map((w, i) => el('path', { class: `rim rim-${i}`, 'stroke-width': w }))
  const scorch = el('path', { class: 'scorch', 'stroke-width': 2.5 })
  const curl = el('rect', { class: 'curl' })
  surface.append(...rims, scorch, curl)
  plate.append(surface)

  let drawn = ''
  function draw() {
    const W = plate.offsetWidth, H = plate.offsetHeight
    const v = vertical.matches
    if (!W || !H || drawn === `${W}x${H}${v}`) return
    drawn = `${W}x${H}${v}`
    const d = outline(W, H)
    plate.style.clipPath = `path('${d}')`
    for (const p of [...rims, scorch]) p.setAttribute('d', d)
    for (const s of [surface, shadow]) s.setAttribute('width', String(s === shadow ? W + PAD * 2 : W))
    surface.setAttribute('height', String(H)); surface.setAttribute('viewBox', `0 0 ${W} ${H}`)
    shadow.setAttribute('height', String(H + PAD * 2)); shadow.setAttribute('viewBox', `${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}`)
    shadowPath.setAttribute('d', d)
    // the sheet bends up into the roll just before it: catches the light, then falls into its shadow
    const tuck = parseFloat(getComputedStyle(scroll).getPropertyValue('--tuck')) || 46
    const c = v ? { x: 0, y: H - tuck - 42, width: W, height: 44, fill: 'url(#sheet-curl-v)' } : { x: W - tuck - 42, y: 0, width: 44, height: H, fill: 'url(#sheet-curl-h)' }
    for (const k in c) curl.setAttribute(k, String(c[k as keyof typeof c]))
  }
  new ResizeObserver(draw).observe(plate)
  vertical.addEventListener('change', draw)

  // Unroll. The inline script in index.html adds .can-unroll to <html> before first paint when motion is allowed,
  // so the sheet starts rolled up with no flash of the open map; it opens the first time it scrolls into view.
  const open = () => { scroll.classList.remove('unrolling'); scroll.classList.add('open') }
  if (!document.documentElement.classList.contains('can-unroll') || !('IntersectionObserver' in window)) { open(); return }
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return
    io.disconnect()
    // how far the roll travels: from centred on the sheet's near edge (where it waits, rolled up) to its resting
    // place, sticking out past the far edge by --overhang
    const v = vertical.matches, cs = getComputedStyle(scroll)
    const size = v ? scroll.offsetHeight : scroll.offsetWidth
    scroll.style.setProperty('--travel', `${size + parseFloat(cs.getPropertyValue('--overhang')) - parseFloat(cs.getPropertyValue('--roll')) / 2}px`)
    scroll.classList.add('unrolling')
  }, { threshold: 0.15 })
  io.observe(scroll)
  roll.addEventListener('animationend', open)
}
