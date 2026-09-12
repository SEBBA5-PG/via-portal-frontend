import { useId, useState } from 'react'

interface Props {
  longitud: number
  valor: string
  onChange: (valor: string) => void
  etiqueta: string
  // PIN: cada dígito se dibuja como un punto, con opción de revelarlo.
  oculto?: boolean
  autoFocus?: boolean
  autoComplete?: string
  error?: string | null
  onCompletar?: (valor: string) => void
}

// Un solo <input> real y transparente encima de las casillas: así el pegado, el autocompletado
// del código (`one-time-code`), el teclado numérico del móvil y los lectores de pantalla
// funcionan como en un campo normal. Las casillas son solo el dibujo de ese valor.
export function CasillasDigitos({
  longitud,
  valor,
  onChange,
  etiqueta,
  oculto = false,
  autoFocus,
  autoComplete = 'off',
  error,
  onCompletar,
}: Props) {
  const [enfocado, setEnfocado] = useState(false)
  const [revelado, setRevelado] = useState(false)
  const errorId = useId()
  const completo = valor.length === longitud

  function alCambiar(texto: string) {
    const limpio = texto.replace(/\D/g, '').slice(0, longitud)
    onChange(limpio)
    if (limpio.length === longitud && valor.length !== longitud) onCompletar?.(limpio)
  }

  // El cursor siempre al final: escribir "en medio" de casillas dibujadas no tiene sentido.
  function cursorAlFinal(input: HTMLInputElement) {
    const fin = input.value.length
    if (input.selectionStart !== fin || input.selectionEnd !== fin) input.setSelectionRange(fin, fin)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-fit">
        <div className="flex justify-center gap-2 sm:gap-3" aria-hidden="true">
          {Array.from({ length: longitud }, (_, i) => {
            const digito = valor[i]
            const activa = enfocado && !completo && i === valor.length
            const borde = error
              ? 'border-red-600'
              : activa
                ? 'border-primario ring-4 ring-ambar/35'
                : digito
                  ? 'border-primario/60'
                  : 'border-borde/40'
            return (
              <div
                key={i}
                className={`grid aspect-[4/5] w-[clamp(2.25rem,9vw,3.5rem)] place-items-center rounded-control border-[1.5px] bg-fondo/[0.05] font-heading text-2xl font-bold text-grafito transition ${borde}`}
              >
                {digito && (oculto && !revelado ? <span className="size-2.5 rounded-full bg-grafito" /> : digito)}
                {activa && <span className="h-6 w-0.5 animate-pulse bg-primario" />}
              </div>
            )
          })}
        </div>
        <input
          autoFocus={autoFocus}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={autoComplete}
          maxLength={longitud}
          value={valor}
          aria-label={etiqueta}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => alCambiar(e.target.value)}
          onFocus={(e) => {
            setEnfocado(true)
            cursorAlFinal(e.currentTarget)
          }}
          onBlur={() => setEnfocado(false)}
          onSelect={(e) => cursorAlFinal(e.currentTarget)}
          // text-base (16px) evita el zoom automático de iOS al enfocar.
          className={`absolute inset-0 h-full w-full cursor-text bg-transparent text-base text-transparent caret-transparent outline-none selection:bg-transparent ${oculto && !revelado ? '[-webkit-text-security:disc]' : ''}`}
        />
      </div>
      {oculto && (
        <button
          type="button"
          onClick={() => setRevelado((v) => !v)}
          className="self-start text-sm font-bold text-primario hover:underline"
        >
          {revelado ? 'Ocultar PIN' : 'Mostrar PIN'}
        </button>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
