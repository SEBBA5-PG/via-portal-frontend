import { useId, type InputHTMLAttributes, type ReactNode, type RefObject } from 'react'
import type { AnimatedIconHandle } from '../../icons/types'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  ayuda?: string
  error?: string | null
  // Ícono a la derecha del campo (p. ej. UsersIcon en cédula) — opcional, no afecta
  // a los TextField que no lo usan.
  icono?: ReactNode
  // Handle del ícono (mismo ref que se le pasa a UsersIcon) — permite que el campo
  // completo dispare la animación de hover/foco, no solo el SVG diminuto (feedback
  // 2026-09-12: "la animación debe activarse al pasar o activar la celda", no solo el ícono).
  iconoRef?: RefObject<AnimatedIconHandle | null>
}

export function TextField({ etiqueta, ayuda, error, id, className = '', icono, iconoRef, ...props }: Props) {
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
      <div
        className="relative"
        onMouseEnter={() => iconoRef?.current?.startAnimation()}
        onMouseLeave={() => iconoRef?.current?.stopAnimation()}
        onFocus={() => iconoRef?.current?.startAnimation()}
        onBlur={() => iconoRef?.current?.stopAnimation()}
      >
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : mostrarAyuda ? ayudaId : undefined}
          className={`h-12 w-full rounded-full border-[1.5px] bg-fondo/[0.05] px-5 text-base text-grafito outline-none transition placeholder:text-texto-suave/70 focus:border-primario focus:ring-4 focus:ring-ambar/30 ${icono ? 'pr-12' : ''} ${error ? 'border-red-600' : 'border-borde/40'} ${className}`}
          {...props}
        />
        {icono && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-texto-suave">
            {icono}
          </span>
        )}
      </div>
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
