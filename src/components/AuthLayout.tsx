import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FondoConexiones } from './FondoConexiones'
import { ViaLogo } from './ViaLogo'

interface Props {
  // Línea pequeña arriba del título (p. ej. "Bienvenido") — opcional, solo la usa la
  // pantalla de entrada al flujo (feedback 2026-09-12: dar más jerarquía/aire a la carta).
  saludo?: string
  titulo: string
  subtitulo?: ReactNode
  // Indicador de puntos del flujo (login: 2 pasos, recuperación: 5).
  paso?: { actual: number; total: number }
  onVolver?: () => void
  onCerrar?: () => void
  // Botón principal y secundarios de cada paso.
  acciones?: ReactNode
  children?: ReactNode
  // 'amplio': el paso lleva CasillasDigitos — la tarjeta crece para que las casillas
  // aprovechen el espacio y no se salgan de ella (feedback 2026-09-12).
  ancho?: 'normal' | 'amplio'
}

// Q-1251/Q-1252: una sola tarjeta en vidrio ("glass", revisión "premium" 2026-09-12)
// centrada sobre el fondo animado de nodos, que se monta una sola vez a pantalla completa
// y actúa como la piel fija de todo el flujo de acceso — cédula, PIN, 2FA y recuperación
// comparten este mismo fondo sin remontarlo. El ancho de la tarjeta anima con una transición
// CSS normal (no con `layout` de motion): `layout` interpola el resize con una transformación
// de escala interna que "estira" visualmente todo lo de adentro mientras dura la animación
// —incluido el logo, aunque nunca cambie de tamaño en el código— y eso fue justo el efecto
// que se sentía brusco (feedback 2026-09-12). El contenido de cada paso sí usa
// `AnimatePresence` para un cruce de opacidad/posición, pero en modo "wait" (secuencial, no
// superpuesto) y con una duración más larga, para que se sienta pausado y ordenado.
export function AuthLayout({ saludo, titulo, subtitulo, paso, onVolver, onCerrar, acciones, children, ancho = 'normal' }: Props) {
  const conCabecera = Boolean(onVolver || onCerrar || paso)

  return (
    <div className="min-h-dvh bg-fondo-acceso">
      <FondoConexiones />
      <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
        <div
          className={`relative w-full overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-b from-[#faf6ee]/[0.08] to-[#faf6ee]/[0.03] shadow-[0_40px_90px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.14)_inset] backdrop-blur-[18px] backdrop-saturate-[1.2] transition-[max-width] duration-700 ease-in-out ${
            ancho === 'amplio' ? 'max-w-[34rem]' : 'max-w-[26rem]'
          }`}
        >
          {/* Glow de esquina: solo degradado, sin filter:blur — un filter sobre un
              descendiente de un elemento con overflow-hidden + backdrop-filter no siempre
              se recorta bien (algunos navegadores dejan un borde recto/puntudo asomando
              sobre la esquina redondeada). El degradado ya trae su propia caída suave y
              respeta el radio de la carta sin ese problema. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-1/3 -top-1/3 h-2/3 w-2/3 rounded-full opacity-70"
            style={{
              background:
                'radial-gradient(circle, rgba(72,150,230,0.55) 0%, rgba(72,150,230,0.32) 30%, rgba(72,150,230,0.12) 55%, rgba(72,150,230,0.03) 75%, transparent 90%)',
            }}
          />
          {/* El logo NUNCA se remonta entre pasos (feedback 2026-09-12: era la pieza que más
              se notaba "saltando" al cambiar de paso, porque vivía dentro del bloque con
              key={titulo} de abajo). Vive fuera de AnimatePresence, así que permanece fijo en
              su lugar durante toda la sesión de acceso — solo el contenido de cada paso
              (título, subtítulo, campos, acciones) hace crossfade. */}
          <div className="relative flex flex-col items-center px-7 pt-12 sm:px-9 sm:pt-14">
            <ViaLogo className="mb-8 h-16 sm:h-20" esquema="oscuro" />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={titulo}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              className="paso-acceso relative flex flex-col items-center px-7 pb-12 text-center sm:px-9 sm:pb-14"
            >
              {conCabecera && (
                <div className="mb-6 grid w-full grid-cols-[2.75rem_1fr_2.75rem] items-center">
                  <div className="flex justify-start">
                    {onVolver && (
                      <BotonIcono etiqueta="Volver" onClick={onVolver}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 10H4" />
                          <path d="M9 5l-5 5 5 5" />
                        </svg>
                      </BotonIcono>
                    )}
                  </div>
                  <div className="flex justify-center">{paso && <IndicadorPaso {...paso} />}</div>
                  <div className="flex justify-end">
                    {onCerrar && (
                      <BotonIcono etiqueta="Cancelar y volver al inicio de sesión" onClick={onCerrar}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 5l10 10" />
                          <path d="M15 5L5 15" />
                        </svg>
                      </BotonIcono>
                    )}
                  </div>
                </div>
              )}

              {saludo && <p className="mb-1.5 text-sm font-bold text-texto-suave">{saludo}</p>}
              <h1 className="font-heading text-2xl font-extrabold leading-8 tracking-tight text-grafito">{titulo}</h1>
              {subtitulo && <p className="mt-3 text-sm leading-[1.3125rem] text-texto-suave">{subtitulo}</p>}
              {children && <div className="mt-8 w-full text-left">{children}</div>}
              {acciones && <div className="mt-8 flex w-full flex-col gap-3">{acciones}</div>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Mismo tratamiento sólido y con volumen que el botón principal (Button variante
// "ejecutivo"): avanzar y retroceder comparten el mismo lenguaje de color/profundidad.
function BotonIcono({ etiqueta, onClick, children }: { etiqueta: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className="grid size-11 place-items-center rounded-full bg-gradient-to-b from-[#f7f5f1] to-[#e6e3dc] text-xl text-[#14181f] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_-2px_3px_rgba(0,0,0,0.10)_inset,0_-5px_8px_rgba(0,0,0,0.18)_inset,0_10px_22px_rgba(0,0,0,0.45)] outline-none transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-px focus-visible:ring-4 focus-visible:ring-ambar/40"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}

function IndicadorPaso({ actual, total }: { actual: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="sr-only">
        Paso {actual} de {total}
      </span>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`h-1.5 rounded-full transition-all ${
            i + 1 === actual ? 'w-5 bg-grafito' : i + 1 < actual ? 'w-1.5 bg-grafito/40' : 'w-1.5 bg-texto-suave/25'
          }`}
        />
      ))}
    </div>
  )
}
