import { useEffect } from 'react'
import './ascenso-playas.css'
import { PLAYAS, gradienteDe } from './playas'
import { usePlayaActiva } from './usePlayaActiva'

const INTERVALO_MS = 6000

/**
 * Tamaño de la ilustración. Los assets son 804×1194 con ~48% de relleno transparente
 * vertical, así que la isla visible es aproximadamente la mitad de este alto. Se limita por
 * las tres dimensiones a la vez para que en móvil no se desborde de lado y en pantallas muy
 * anchas no se pixele (el asset original no da para más de ~1700px de alto).
 */
const ALTO_ISLA = 'min(150vh, 200vw, 1700px)'

/**
 * Velo. Se mantiene deliberadamente mínimo: un primer intento oscurecía todo el centro y
 * apagaba la ilustración justo donde más se mira. La separación entre isla y fondo la
 * resuelve el propio gradiente (ver `gradienteDe`), no el velo, así que aquí solo quedan las
 * dos zonas donde hace falta de verdad.
 */
const VELO = [
  // Piso local detrás del logo. Es el único punto donde el velo es imprescindible: la card
  // es opaca y se defiende sola, pero el logo va sobre el fondo desnudo y es bicolor fijo de
  // marca (café oscuro + crema), así que sin un tono constante detrás uno de sus dos tonos
  // se pierde en algún punto del recorrido — la crema contra Huila (#EAECEE), el café contra
  // Café (#6B3A1F). Se mantiene angosto para no apagar la ilustración.
  'radial-gradient(ellipse 34% 26% at 50% 12%, rgba(18, 12, 8, 0.62) 0%, rgba(18, 12, 8, 0.3) 55%, rgba(18, 12, 8, 0) 80%)',
  // Viñeta de borde: da profundidad y evita que el color de la playa llegue plano al canto
  // de la pantalla. No toca el centro, donde vive la isla.
  'radial-gradient(ellipse 88% 78% at 50% 46%, rgba(18, 12, 8, 0) 48%, rgba(18, 12, 8, 0.5) 100%)',
].join(', ')

/**
 * El fondo del login: un ascenso en loop por las 7 playas, cambiando de ilustración y de
 * paleta a la vez. Decorativo puro — todo el subárbol va aria-hidden, nunca entra al árbol
 * de accesibilidad ni al tab order.
 */
export function AscensoPlayas() {
  const { indice, previo } = usePlayaActiva(PLAYAS.length, INTERVALO_MS)

  // Precargar la siguiente para que la transición no muestre un hueco. Solo la siguiente:
  // al primer pintado se piden dos ilustraciones, no las siete.
  useEffect(() => {
    const siguiente = new Image()
    siguiente.src = PLAYAS[(indice + 1) % PLAYAS.length].src
  }, [indice])

  return (
    <div className="ascenso-playas fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* Las 7 capas de color viven montadas y solo intercambian opacidad: las custom
          properties no interpolan sin @property y background-image no es interpolable, así
          que el cross-fade entre capas persistentes es lo que sí transiciona. Siete divs sin
          contenido no cuestan nada — a diferencia de las ilustraciones, no piden red. */}
      {PLAYAS.map((playa, i) => (
        <div
          key={playa.nivel}
          className="absolute inset-0 transition-opacity duration-[1400ms] ease-in-out"
          style={{ background: gradienteDe(playa), opacity: i === indice ? 1 : 0 }}
        />
      ))}

      {/* ap-encuadre sube la isla con padding inferior: centra en el área restante en vez de
          en el viewport completo, sin gastar el transform del contenedor (lo usa ap-flota). */}
      <div className="ap-encuadre absolute inset-0 grid place-items-center">
        <div
          className="ap-flota relative"
          style={{ height: ALTO_ISLA, aspectRatio: '804 / 1194' }}
        >
          {previo !== null && (
            <img
              key={`sale-${previo}`}
              src={PLAYAS[previo].src}
              alt=""
              draggable={false}
              className="ap-isla ap-sale"
            />
          )}
          <img
            key={`entra-${indice}`}
            src={PLAYAS[indice].src}
            alt=""
            draggable={false}
            className="ap-isla ap-entra"
          />
        </div>
      </div>

      <div className="absolute inset-0" style={{ background: VELO }} />
    </div>
  )
}
