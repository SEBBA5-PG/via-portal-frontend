import type { ReactNode } from 'react'
import { ViaLogo } from './ViaLogo'

interface Props {
  titulo: string
  subtitulo?: ReactNode
  // Indicador de puntos del flujo (login: 2 pasos, recuperación: 4).
  paso?: { actual: number; total: number }
  onVolver?: () => void
  onCerrar?: () => void
  // Botón principal y secundarios: en móvil bajan al pie de la pantalla, al alcance del
  // pulgar; en tablet y escritorio siguen al contenido.
  acciones?: ReactNode
  children?: ReactNode
}

// Estructura del kit CRM de Figma (nodo 9077:792): formulario sobre blanco a la izquierda y
// panel de marca a la derecha, este último solo en escritorio. El logo vive en la columna
// blanca porque su capa principal es café oscuro y se pierde sobre el azul marino.
export function AuthLayout({ titulo, subtitulo, paso, onVolver, onCerrar, acciones, children }: Props) {
  return (
    <div className="min-h-dvh bg-marino lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <main className="flex min-h-dvh flex-col bg-fondo text-grafito lg:rounded-r-2xl">
        <header className="grid h-16 grid-cols-[3rem_1fr_3rem] items-center px-3 sm:px-6 lg:h-20 lg:px-10">
          <div>
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
        </header>

        <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:justify-center sm:pb-16">
          <ViaLogo className="mb-8 h-10 self-start lg:mb-10 lg:h-12" />
          <h1 className="font-heading text-[1.75rem] font-extrabold leading-9 tracking-tight sm:text-[2rem] sm:leading-[2.625rem]">
            {titulo}
          </h1>
          {subtitulo && <p className="mt-3 text-sm leading-[1.3125rem] text-texto-suave">{subtitulo}</p>}
          {children && <div className="mt-8 sm:mt-10">{children}</div>}
          {acciones && <div className="mt-auto flex flex-col gap-3 pt-8 sm:mt-10 sm:pt-0">{acciones}</div>}
        </div>
      </main>

      <PanelMarca />
    </div>
  )
}

function BotonIcono({ etiqueta, onClick, children }: { etiqueta: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className="grid size-11 place-items-center rounded-full text-xl text-grafito outline-none transition hover:bg-borde/70 focus-visible:ring-4 focus-visible:ring-ambar/40"
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

// Solo escritorio. Decorativo: un tablero abstracto, sin cifras — ninguna métrica aquí es real.
function PanelMarca() {
  return (
    <aside aria-hidden="true" className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
      <div className="absolute -right-32 -top-40 size-[30rem] rounded-full bg-primario/60 blur-3xl" />
      <div className="absolute -bottom-48 -left-24 size-[26rem] rounded-full bg-ambar/10 blur-3xl" />
      <div className="relative max-w-md">
        <p className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-ambar">Portal administrativo</p>
        <p className="mt-4 font-heading text-3xl font-extrabold leading-tight text-white">
          Gestión y seguimiento de la app VIA
        </p>
        <p className="mt-3 text-sm leading-6 text-white/65">
          Uso, operación y datos de Conexión Huila 2027 en un solo lugar.
        </p>
        <TableroAbstracto />
      </div>
    </aside>
  )
}

function TableroAbstracto() {
  const barras = [38, 62, 48, 80, 56, 92, 70]
  return (
    <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="size-2.5 rounded-full bg-white/20" />
        <span className="ml-3 h-2 w-24 rounded-full bg-white/15" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-white/[0.06] p-3">
            <div className="h-1.5 w-10 rounded-full bg-white/20" />
            <div className={`mt-3 h-3 w-14 rounded-full ${i === 0 ? 'bg-ambar/80' : 'bg-white/35'}`} />
          </div>
        ))}
      </div>
      <div className="mt-5 flex h-28 items-end gap-2 rounded-xl bg-white/[0.04] p-3">
        {barras.map((alto, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-md ${i === 5 ? 'bg-ambar/80' : 'bg-white/20'}`}
            style={{ height: `${alto}%` }}
          />
        ))}
      </div>
      <div className="mt-5 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 ${i === 1 ? 'bg-white/[0.08] ring-1 ring-ambar/50' : ''}`}
          >
            <span className="size-7 rounded-full bg-white/15" />
            <span className="h-2 flex-1 rounded-full bg-white/15" />
            <span className="h-2 w-10 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  )
}
