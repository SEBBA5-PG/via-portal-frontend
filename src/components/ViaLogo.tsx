import vDark from '../assets/logo/v-dark.svg'
import iDark from '../assets/logo/i-dark.svg'
import aDark from '../assets/logo/a-dark.svg'
import vLight from '../assets/logo/v-light.svg'
import iLight from '../assets/logo/i-light.svg'
import aLight from '../assets/logo/a-light.svg'

interface Fragmento {
  src: string
  inset: string
  skew: number
  // Figma dimensiona el contenedor interno con cqw/cqh + hypot() (para que, tras
  // rotate+skew, el fragmento quede exactamente del tamaño del recorte) — aquí precalculado
  // a % planos respecto a su propio recorte, porque son fijos para este logo (no cambian
  // con el tamaño del render, solo con el ángulo de sesgo: -6.43° vs -18.83°).
  height: string
  width: string
}

// Reconstruido 1:1 desde el nodo Figma 908:3747 (get_design_context): 6 fragmentos
// vectoriales reales (no una imagen rasterizada) — cada letra de "VIA" tiene una capa
// oscura y una clara, desplazadas entre sí, con su propio recorte/rotación/sesgo.
const ROTACION = -6.43
const ANCHO_SESGO_SUAVE = { height: '90.26%', width: '100.63%' } // letras V y A
const ANCHO_SESGO_FUERTE = { height: '98.78%', width: '60%' } // letra I (más angosta)

const FRAGMENTOS: Fragmento[] = [
  { src: vDark, inset: '11.92% 57.27% 1.34% 4.2%', skew: -6.43, ...ANCHO_SESGO_SUAVE },
  { src: iDark, inset: '7.77% 36.64% 9% 40.87%', skew: -18.83, ...ANCHO_SESGO_FUERTE },
  { src: aDark, inset: '0.01% 0.36% 13.23% 61.01%', skew: -6.43, ...ANCHO_SESGO_SUAVE },
  { src: vLight, inset: '12.69% 61.27% 0.1% 0%', skew: -6.43, ...ANCHO_SESGO_SUAVE },
  { src: iLight, inset: '8.52% 40.53% 7.8% 36.85%', skew: -18.83, ...ANCHO_SESGO_FUERTE },
  { src: aLight, inset: '0.71% 4.06% 12.05% 57.1%', skew: -6.43, ...ANCHO_SESGO_SUAVE },
]

export function ViaLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: '173 / 89' }} role="img" aria-label="VIA">
      {FRAGMENTOS.map((f, i) => (
        <div key={i} className="absolute flex items-center justify-center" style={{ inset: f.inset }}>
          <div
            style={{
              height: f.height,
              width: f.width,
              transform: `rotate(${ROTACION}deg) skewX(${f.skew}deg)`,
            }}
          >
            <img src={f.src} alt="" draggable={false} className="block h-full w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
