import { useId, type ReactNode } from 'react'

/*
  Interruptor de un permiso. Es un <button role="switch"> real, no un div con onClick: el
  editor de permisos es exactamente el tipo de pantalla de alto volumen donde las Reglas
  Transversales §Accesibilidad exigen navegación por teclado completa.

  No existe estado "deshabilitado por techo fijo": esos permisos no llegan hasta aquí — la
  Matriz de Acceso prohíbe renderizarlos incluso deshabilitados, porque un control apagado
  comunica "esto se podría activar".
*/

export function Interruptor({
  activo,
  onCambiar,
  etiqueta,
  descripcion,
  marca,
  bloqueado,
  razonBloqueo,
}: {
  activo: boolean
  onCambiar: (valor: boolean) => void
  etiqueta: ReactNode
  descripcion?: ReactNode
  // Señal visual a la derecha de la etiqueta (ampliado/reducido/pendiente).
  marca?: ReactNode
  // Bloqueado por una solicitud en curso, no por falta de autoridad.
  bloqueado?: boolean
  razonBloqueo?: string
}) {
  const id = useId()
  return (
    <div className="flex items-start gap-4 px-6 py-3.5 transition-colors hover:bg-white/[0.02]">
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={activo}
        disabled={bloqueado}
        onClick={() => onCambiar(!activo)}
        className={`mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 disabled:cursor-not-allowed disabled:opacity-45 ${
          activo ? 'border-primario/50 bg-primario/35' : 'border-white/15 bg-white/[0.06]'
        }`}
      >
        <span
          aria-hidden="true"
          className={`block size-4.5 rounded-full bg-grafito shadow transition-transform duration-200 ${
            activo ? 'translate-x-[1.4rem]' : 'translate-x-[0.18rem]'
          }`}
        />
      </button>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-sm font-semibold text-grafito">
          {etiqueta}
          {marca}
        </label>
        {descripcion && <p className="mt-0.5 text-xs leading-relaxed text-texto-suave">{descripcion}</p>}
        {bloqueado && razonBloqueo && (
          <p className="mt-1 text-xs leading-relaxed text-primario/90">{razonBloqueo}</p>
        )}
      </div>
    </div>
  )
}
