import './styles.css'
import { initMap } from './map'
import { initScroll } from './scroll'

const svg = document.querySelector<SVGSVGElement>('#map')
const detail = document.querySelector<HTMLElement>('#detail')
if (svg && detail) initMap(svg, detail)
const scroll = document.querySelector<HTMLElement>('.scroll')
if (scroll) initScroll(scroll)

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')

// Sections fade up the first time they scroll into view. Ones already on screen are left alone,
// so nothing the visitor can already see ever disappears.
if (!reduceMotion.matches && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target) }
  }, { rootMargin: '0px 0px -10% 0px' })
  for (const s of document.querySelectorAll('section.sec')) {
    if (s.getBoundingClientRect().top < innerHeight) continue
    s.classList.add('reveal')
    io.observe(s)
  }
}

// Theme toggle. The inline script in index.html has already set data-theme before first paint.
const root = document.documentElement
const themeBtn = document.querySelector<HTMLButtonElement>('#theme')
const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
const savedTheme = () => { try { return localStorage.getItem('theme') } catch { return null } }

function applyTheme(theme: string) {
  root.dataset.theme = theme
  // the icon itself is swapped in CSS; this keeps the spoken label and tooltip in step
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  themeBtn?.setAttribute('aria-label', label)
  themeBtn?.setAttribute('title', label)
  themeColor?.setAttribute('content', getComputedStyle(root).getPropertyValue('--paper').trim())
}

applyTheme(root.dataset.theme ?? 'light')
themeBtn?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
  try { localStorage.setItem('theme', next) } catch { /* private mode: the choice just won't persist */ }
  themeBtn.classList.add('turned') // from now on, each icon swap plays its turn-in
  // cross-fade between the old and new page where supported; otherwise switch instantly
  if ('startViewTransition' in document && !reduceMotion.matches) document.startViewTransition(() => applyTheme(next))
  else applyTheme(next)
})
// Until the visitor picks a theme, keep following the OS if it changes while the page is open.
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!savedTheme()) applyTheme(e.matches ? 'dark' : 'light')
})
