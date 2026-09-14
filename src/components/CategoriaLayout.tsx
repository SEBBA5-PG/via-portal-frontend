import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { AppShell } from './AppShell'
import { Badge } from './ui/Badge'

// Envoltorio común de una categoría del portal: etiqueta de categoría, título, descripción,
// acciones y sub-navegación entre sus pantallas. Nació en PW-04 y se extrajo aquí cuando
// PW-03 y PW-05 lo necesitaron igual.

export interface Solapa {
  to: string
  etiqueta: string
  fin?: boolean
  contador?: number
}

export function CategoriaLayout({
  categoria,
  titulo,
  descripcion,
  acciones,
  solapas,
  children,
}: {
  categoria?: string
  titulo: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  solapas?: Solapa[]
  children: ReactNode
}) {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {categoria && (
              <p className="text-xs font-bold uppercase tracking-wide text-texto-suave">{categoria}</p>
            )}
            <h1 className={`font-heading text-3xl font-extrabold tracking-tight text-grafito ${categoria ? 'mt-1' : ''}`}>
              {titulo}
            </h1>
            {descripcion && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto-suave">{descripcion}</p>
            )}
          </div>
          {acciones && <div className="flex shrink-0 flex-wrap items-center gap-3">{acciones}</div>}
        </header>

        {/* Menú-barra de solapas: pista con fondo sutil, la solapa activa se rellena de
            color sólido de marca en vez del tinte suave anterior (observación 8). */}
        {solapas && solapas.length > 0 && (
          <nav className="inline-flex w-fit flex-wrap gap-1 rounded-full bg-surface-sunken p-1.5">
            {solapas.map((solapa) => (
              <NavLink
                key={solapa.to}
                to={solapa.to}
                end={solapa.fin}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 font-heading text-sm font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 ${
                    isActive
                      ? 'bg-primario text-white shadow-sm'
                      : 'text-texto-suave hover:text-grafito'
                  }`
                }
              >
                {({ isActive }) =>
                  solapa.contador ? (
                    <span className="flex items-center gap-2">
                      {solapa.etiqueta}
                      <Badge tono={isActive ? 'neutro' : 'alerta'} sinIcono className={isActive ? 'border-white/30 bg-white/20 text-white' : ''}>
                        {solapa.contador}
                      </Badge>
                    </span>
                  ) : (
                    solapa.etiqueta
                  )
                }
              </NavLink>
            ))}
          </nav>
        )}

        {children}
      </div>
    </AppShell>
  )
}
