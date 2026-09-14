import type { ReactNode } from 'react'

/*
  Resumen de permisos DE SOLO LECTURA. Reemplaza al Interruptor cuando nadie puede editar: un
  interruptor apagado comunica "esto se podría activar" (ver Interruptor.tsx), así que aquí no
  hay <button>, ni onClick, ni estado propio — cada fila es un círculo con check (concedido) o
  un círculo vacío (no concedido), sin ninguna semántica de control.

  Replica el mismo ritmo visual de fila que Interruptor: etiqueta + code chip con la clave,
  y debajo la marca (badges) y la descripción cuando existan.
*/

export interface ItemChecklistPermiso {
  clave: string
  etiqueta: ReactNode
  activo: boolean
  // Señal visual (badges) debajo de la etiqueta — igual rol que "marca" en Interruptor.
  marca?: ReactNode
  descripcion?: ReactNode
}

export function ChecklistPermisos({ items }: { items: ItemChecklistPermiso[] }) {
  return (
    <>
      {items.map((item) => (
        <div key={item.clave} className="flex items-start gap-4 px-6 py-3.5 transition-colors hover:bg-surface-sunken">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
              item.activo ? 'border-exito bg-exito text-white' : 'border-borde bg-transparent'
            }`}
          >
            {item.activo && (
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2.5 6.5l2.5 2.5 4.5-5.5" />
              </svg>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-grafito">
              {item.etiqueta}
              <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-body text-[0.7rem] text-texto-suave">
                {item.clave}
              </code>
            </p>
            {item.marca && <div className="mt-1 flex flex-wrap items-center gap-2">{item.marca}</div>}
            {item.descripcion && (
              <p className="mt-0.5 text-xs leading-relaxed text-texto-suave">{item.descripcion}</p>
            )}
          </div>
        </div>
      ))}
    </>
  )
}
