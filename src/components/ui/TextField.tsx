import { useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  ayuda?: string
  error?: string | null
}

export function TextField({ etiqueta, ayuda, error, id, className = '', ...props }: Props) {
  const idGenerado = useId()
  const inputId = id ?? idGenerado
  const ayudaId = `${inputId}-ayuda`
  const errorId = `${inputId}-error`
  const mostrarAyuda = Boolean(ayuda) && !error

  return (
    <div className="flex flex-col gap-2 text-left">
      <label htmlFor={inputId} className="font-heading text-sm font-bold text-grafito">
        {etiqueta}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : mostrarAyuda ? ayudaId : undefined}
        className={`h-12 rounded-control border-[1.5px] bg-fondo px-4 text-base text-grafito outline-none transition placeholder:text-texto-suave/70 focus:border-primario focus:ring-4 focus:ring-ambar/30 ${error ? 'border-red-600' : 'border-borde'} ${className}`}
        {...props}
      />
      {mostrarAyuda && (
        <p id={ayudaId} className="text-sm text-texto-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
