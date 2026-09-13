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
  categoria: string
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
            <p className="text-xs font-bold uppercase tracking-wide text-texto-suave">{categoria}</p>
            <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-grafito">{titulo}</h1>
            {descripcion && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto-suave">{descripcion}</p>
            )}
          </div>
          {acciones && <div className="flex shrink-0 flex-wrap items-center gap-3">{acciones}</div>}
        </header>

        {solapas && solapas.length > 0 && (
          <nav className="flex flex-wrap gap-2 border-b border-white/[0.07] pb-3">
            {solapas.map((solapa) => (
              <NavLink
                key={solapa.to}
                to={solapa.to}
                end={solapa.fin}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 font-heading text-sm font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 ${
                    isActive
                      ? 'bg-primario/[0.14] text-primario'
                      : 'text-texto-suave hover:bg-white/[0.05] hover:text-grafito'
                  }`
                }
              >
                {solapa.contador ? (
                  <span className="flex items-center gap-2">
                    {solapa.etiqueta}
                    <Badge tono="alerta">{solapa.contador}</Badge>
                  </span>
                ) : (
                  solapa.etiqueta
                )}
              </NavLink>
            ))}
          </nav>
        )}

        {children}
      </div>
    </AppShell>
  )
}
