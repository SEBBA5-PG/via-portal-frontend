import { useEffect, useRef, useState } from 'react'

/*
  Campo de fecha + hora con calendario desplegable, inspirado en el DatePickerTime de shadcn
  que compartió el usuario — pero hecho a mano: este proyecto no tiene shadcn/radix/
  @internationalized-date instalados (ver package.json), e incorporar toda esa base solo para
  un campo sería desproporcionado. Mismo resultado (botón con la fecha elegida + popover con
  calendario navegable por mes, más un input de hora aparte) con los primitivos que ya usa el
  resto del portal (BotonCircularExpansible, SelectorTerritorio: popover posicionado igual).

  El valor entra/sale como string "AAAA-MM-DDTHH:mm", igual que el <input type="datetime-local">
  que reemplaza — así el resto de MisionFormPage.tsx no cambia de forma.
*/

const DIAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function parseValor(v: string): { fecha: Date | null; hora: string } {
  if (!v) return { fecha: null, hora: '' }
  const [f, h] = v.split('T')
  const [y, m, d] = f.split('-').map(Number)
  if (!y || !m || !d) return { fecha: null, hora: h ?? '' }
  return { fecha: new Date(y, m - 1, d), hora: h ?? '' }
}

function aValor(fecha: Date, hora: string): string {
  const f = `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`
  return `${f}T${hora || '00:00'}`
}

export function SelectorFechaHora({
  etiqueta,
  value,
  onChange,
  disabled,
  ayuda,
}: {
  etiqueta: string
  value: string
  onChange: (valor: string) => void
  disabled?: boolean
  ayuda?: string
}) {
  const { fecha, hora } = parseValor(value)
  const [abierto, setAbierto] = useState(false)
  const [mesVisible, setMesVisible] = useState(() => fecha ?? new Date())
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function alClickFuera(e: MouseEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClickFuera)
    return () => document.removeEventListener('mousedown', alClickFuera)
  }, [abierto])

  const primerDia = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1)
  const inicioGrilla = new Date(primerDia)
  inicioGrilla.setDate(primerDia.getDate() - primerDia.getDay())
  const dias = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicioGrilla)
    d.setDate(inicioGrilla.getDate() + i)
    return d
  })

  return (
    <div className="flex flex-col gap-2 text-left">
      <span className="font-heading text-sm font-bold text-grafito">{etiqueta}</span>
      {/* `min-w-0` en ambos hijos evita que el botón de fecha empuje al de hora fuera de la
          columna (observación 6: "no se acople") — sin eso, un ancho fijo hacía que el par
          no cupiera en la mitad del grid del paso y se encimara con el campo vecino. */}
      <div className="flex flex-wrap items-stretch gap-2.5">
        <div ref={contenedorRef} className="relative min-w-0 flex-1 basis-40">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            className="flex h-12 w-full min-w-0 items-center gap-2 rounded-full border-[1.5px] border-borde/40 bg-fondo/[0.05] px-4 text-sm text-grafito outline-none transition focus:border-primario focus:ring-4 focus:ring-ambar/30 disabled:opacity-60"
          >
            <span className="grid shrink-0 place-items-center text-texto-suave" aria-hidden="true">
              <IconoCalendario />
            </span>
            <span className={`flex-1 truncate text-left ${fecha ? '' : 'text-texto-suave/70'}`}>
              {fecha ? fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Elegir fecha'}
            </span>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
              <path d="M5 7.5l5 5 5-5" />
            </svg>
          </button>

          {abierto && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-72 rounded-[16px] border border-borde bg-white p-4 shadow-[0_4px_16px_rgba(28,36,64,0.14)]">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Mes anterior"
                  onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() - 1, 1))}
                  className="grid size-7 place-items-center rounded-full text-texto-suave outline-none transition-colors hover:bg-surface-sunken focus-visible:ring-4 focus-visible:ring-ambar/40"
                >
                  ‹
                </button>
                <span className="font-heading text-sm font-bold text-grafito">
                  {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
                </span>
                <button
                  type="button"
                  aria-label="Mes siguiente"
                  onClick={() => setMesVisible(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 1))}
                  className="grid size-7 place-items-center rounded-full text-texto-suave outline-none transition-colors hover:bg-surface-sunken focus-visible:ring-4 focus-visible:ring-ambar/40"
                >
                  ›
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-texto-suave">
                {DIAS.map((d) => (
                  <span key={d} className="py-1">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {dias.map((d) => {
                  const delMes = d.getMonth() === mesVisible.getMonth()
                  const seleccionado = fecha !== null && d.toDateString() === fecha.toDateString()
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      onClick={() => {
                        onChange(aValor(d, hora || '08:00'))
                        setAbierto(false)
                      }}
                      className={`grid size-8 place-items-center rounded-full text-xs outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ambar/40 ${
                        seleccionado
                          ? 'bg-primario font-bold text-white'
                          : delMes
                            ? 'text-grafito hover:bg-surface-sunken'
                            : 'text-texto-tenue/50'
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="relative min-w-0 flex-1 basis-28">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-texto-suave" aria-hidden="true">
            <IconoReloj />
          </span>
          <input
            type="time"
            aria-label={`Hora de ${etiqueta.toLowerCase()}`}
            value={hora}
            disabled={disabled}
            onChange={(e) => onChange(aValor(fecha ?? new Date(), e.target.value))}
            className="h-12 w-full min-w-0 rounded-full border-[1.5px] border-borde/40 bg-fondo/[0.05] py-0 pl-9 pr-3 text-sm text-grafito outline-none transition focus:border-primario focus:ring-4 focus:ring-ambar/30 disabled:opacity-60"
          />
        </div>
      </div>
      {ayuda && <p className="text-sm text-texto-suave">{ayuda}</p>}
    </div>
  )
}

function IconoCalendario() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="12" rx="2.5" />
      <path d="M3 8.5h14" />
      <path d="M7 2.5v3M13 2.5v3" />
    </svg>
  )
}

function IconoReloj() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5V10l2.5 1.5" />
    </svg>
  )
}
