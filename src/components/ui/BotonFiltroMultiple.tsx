import { useEffect, useRef, useState } from 'react'

/*
  Variante multiselección de BotonCircularExpansible, mismo lenguaje visual (círculo de 40px
  que se expande a píldora, menú desplegable con checkmarks) pero sin cerrar el menú al elegir
  una opción — para filtros como Categoría o Estado, donde el usuario suele marcar varios
  valores seguidos. La etiqueta en reposo/expandido muestra un contador cuando hay selección.
*/

export interface OpcionFiltroMultiple {
  valor: string
  etiqueta: string
}

export function BotonFiltroMultiple({
  etiqueta,
  opciones,
  seleccionados,
  onCambiar,
  icono,
}: {
  etiqueta: string
  opciones: OpcionFiltroMultiple[]
  seleccionados: string[]
  onCambiar: (valores: string[]) => void
  icono?: React.ReactNode
}) {
  const [expandido, setExpandido] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const hayActivos = seleccionados.length > 0

  useEffect(() => {
    if (!menuAbierto) return
    function alClickFuera(e: MouseEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) {
        setMenuAbierto(false)
        setExpandido(false)
      }
    }
    document.addEventListener('mousedown', alClickFuera)
    return () => document.removeEventListener('mousedown', alClickFuera)
  }, [menuAbierto])

  const alternar = (valor: string) =>
    onCambiar(seleccionados.includes(valor) ? seleccionados.filter((v) => v !== valor) : [...seleccionados, valor])

  const textoBoton = hayActivos ? `${etiqueta} (${seleccionados.length})` : etiqueta

  return (
    <div
      ref={contenedorRef}
      className="relative inline-block"
      onMouseEnter={() => setExpandido(true)}
      onMouseLeave={() => {
        if (!menuAbierto) setExpandido(false)
      }}
      onFocus={() => setExpandido(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setExpandido(false)
          setMenuAbierto(false)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && menuAbierto) setMenuAbierto(false)
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (!expandido) {
            setExpandido(true)
            return
          }
          setMenuAbierto((v) => !v)
        }}
        aria-haspopup="listbox"
        aria-expanded={menuAbierto}
        aria-label={expandido ? undefined : textoBoton}
        className={`flex h-10 items-center overflow-hidden rounded-full px-2.5 outline-none transition-[width,background-color] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none focus-visible:ring-4 focus-visible:ring-ambar/40 border ${
          expandido ? 'w-auto max-w-[220px] justify-start gap-2' : 'w-10 justify-center'
        } ${
          hayActivos
            ? 'border-primario/45 bg-primario/[0.16] text-primario'
            : `border-borde text-grafito ${menuAbierto ? 'bg-primario-tint' : expandido ? 'bg-surface-sunken' : 'bg-white'}`
        }`}
      >
        <span className="grid shrink-0 place-items-center">{icono ?? <IconoFiltro />}</span>
        {expandido && <span className="overflow-hidden whitespace-nowrap text-sm font-semibold">{textoBoton}</span>}
      </button>

      {menuAbierto && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={etiqueta}
          className="absolute left-0 top-[calc(100%+8px)] z-20 w-56 overflow-hidden rounded-control border border-borde bg-white py-1.5 shadow-[0_4px_16px_rgba(28,36,64,0.12)]"
        >
          {opciones.map((op) => {
            const marcada = seleccionados.includes(op.valor)
            return (
              <button
                key={op.valor}
                type="button"
                role="option"
                aria-selected={marcada}
                onClick={() => alternar(op.valor)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-grafito transition-colors hover:bg-surface-sunken"
              >
                <span
                  aria-hidden="true"
                  className={`grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors ${
                    marcada ? 'border-primario bg-primario text-white' : 'border-borde bg-white'
                  }`}
                >
                  {marcada && (
                    <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 truncate">{op.etiqueta}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function IconoFiltro() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <path d="M3 5.5h14" />
      <path d="M6 10h8" />
      <path d="M8.5 14.5h3" />
    </svg>
  )
}
