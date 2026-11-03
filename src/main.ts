import './styles.css'
import { initMap } from './map'

const svg = document.querySelector<SVGSVGElement>('#map')
const detail = document.querySelector<HTMLElement>('#detail')
if (svg && detail) initMap(svg, detail)
