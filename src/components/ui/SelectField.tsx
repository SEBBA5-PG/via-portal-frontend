import { useEffect, useId, useRef, useState } from 'react'

interface Opcion {
  valor: string
  etiqueta: string
  deshabilitada?: boolean
}

interface Props {
  etiqueta: string
  opciones: Opcion[]
  ayuda?: string
  error?: string | null
  value?: string
  // Firma "de evento" (`e.target.value`) igual a un <select> nativo, para que ningún caller
  // existente tenga que cambiar — pero por dentro ya no es un <select>: es un botón + panel,
  // mismo lenguaje visual que BotonCircularExpansible/SelectorTerritorio en vez del
  // desplegable brusco y con estilo del sistema operativo que traía el <select> nativo.
  onChange?: (e: { target: { value: string } }) => void
  disabled?: boolean
  id?: string
  className?: string
  placeholder?: string
}

export function SelectField({
  etiqueta,
  opciones,
  ayuda,
  error,
  id,
  className = '',
  value = '',
  onChange,
  disabled,
  placeholder = 'Elige una opción',
}: Props) {
  const idGenerado = useId()
  const selectId = id ?? idGenerado
  const ayudaId = `${selectId}-ayuda`
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function alClickFuera(e: MouseEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClickFuera)
    return () => document.removeEventListener('mousedown', alClickFuera)
  }, [abierto])

  const actual = opciones.find((o) => o.valor === value)

  return (
    <div className="flex flex-col gap-2 text-left">
      <label htmlFor={selectId} className="font-heading text-sm font-bold text-grafito">
        {etiqueta}
      </label>
      <div ref={contenedorRef} className="relative">
        <button
          type="button"
          id={selectId}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={abierto}
          aria-describedby={ayuda && !error ? ayudaId : undefined}
          aria-invalid={error ? true : undefined}
          onClick={() => setAbierto((v) => !v)}
          className={`flex h-12 w-full items-center justify-between gap-3 rounded-full border bg-white px-5 text-base text-grafito outline-none transition focus:border-primario focus:ring-4 focus:ring-ambar/30 disabled:cursor-not-allowed disabled:opacity-60 ${
            error ? 'border-peligro' : 'border-borde'
          } ${className}`}
        >
          <span className={`truncate ${actual ? '' : 'text-texto-suave/70'}`}>{actual ? actual.etiqueta : placeholder}</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`shrink-0 text-texto-suave transition-transform duration-200 motion-reduce:transition-none ${abierto ? 'rotate-180' : ''}`}
          >
            <path d="M5 7.5l5 5 5-5" />
          </svg>
        </button>

        {abierto && (
          <div
            role="listbox"
            aria-label={etiqueta}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-64 overflow-auto rounded-[16px] border border-borde bg-white py-1.5 shadow-[0_4px_16px_rgba(28,36,64,0.14)]"
          >
            {opciones.map((o) => {
              const seleccionada = o.valor === value
              return (
                <button
                  key={o.valor}
                  type="button"
                  role="option"
                  aria-selected={seleccionada}
                  disabled={o.deshabilitada}
                  onClick={() => {
                    onChange?.({ target: { value: o.valor } })
                    setAbierto(false)
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50 ${
                    seleccionada ? 'font-bold text-primario' : 'text-grafito'
                  }`}
                >
                  <span className="truncate">{o.etiqueta}</span>
                  {seleccionada && (
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {ayuda && !error && (
        <p id={ayudaId} className="text-sm text-texto-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-peligro">
          {error}
        </p>
      )}
    </div>
  )
}
