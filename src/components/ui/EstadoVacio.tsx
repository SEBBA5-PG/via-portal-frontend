import type { ReactNode } from 'react'

/*
  Reglas Transversales de UI §Cinco estados de pantalla, estado "Vacío":

    "Por qué está vacío y la acción para llenarlo. Distinguir «no hay nada» de «tu filtro no
     encuentra nada» — con TerritorialScope activo, lo segundo es lo habitual."

  Por eso `motivo` es obligatorio y tiene dos valores, no uno: son mensajes distintos y una
  lleva acción de limpiar filtros y la otra no.
*/

export function EstadoVacio({
  motivo,
  titulo,
  descripcion,
  accion,
}: {
  motivo: 'sin-datos' | 'sin-resultados'
  titulo: string
  descripcion: string
  accion?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div
        aria-hidden="true"
        className="mb-5 grid size-12 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-texto-suave"
      >
        {motivo === 'sin-resultados' ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13.5 13.5L17 17" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4.5" width="14" height="11" rx="2" />
            <path d="M3 8.5h14" />
          </svg>
        )}
      </div>
      <p className="font-heading text-base font-extrabold text-grafito">{titulo}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-texto-suave">{descripcion}</p>
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  )
}
