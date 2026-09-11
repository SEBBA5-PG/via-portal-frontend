import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ViaLogo } from './ViaLogo'
import { useAuth } from '../state/authStore'
import { ROLES } from '../data/roles'
import { categoriasVisiblesPara } from '../data/matrizAcceso'
import { Button } from './ui/Button'

const BLOQUES_ORDEN = ['Operación', 'Economía', 'Gobierno', 'Sistema'] as const

const claseLink = ({ isActive }: { isActive: boolean }) =>
  `block rounded-pill px-4 py-2 font-heading font-extrabold text-sm ${
    isActive ? 'bg-acento text-white' : 'text-cafe hover:bg-white/50'
  }`

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const user = auth.usuarioActual
  if (!user) return null

  // PW-02 (Home y dashboard) no se lista aparte: el link "Home" de arriba ya cubre ese
  // destino — listar los dos sería un duplicado confuso en el menú.
  const categorias = categoriasVisiblesPara(user.rol).filter((c) => c.id !== 'PW-02')
  const agruparPorBloque = user.rol === 'S' || user.rol === 'A'

  return (
    <div className="min-h-screen flex bg-institucional">
      <aside className="w-64 shrink-0 bg-institucional-sidebar px-4 py-6 flex flex-col gap-6">
        <ViaLogo className="h-10 mx-auto" />
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
          <NavLink to="/home" className={claseLink}>
            Home
          </NavLink>
          {agruparPorBloque
            ? BLOQUES_ORDEN.map((bloque) => {
                const items = categorias.filter((c) => c.bloque === bloque)
                if (items.length === 0) return null
                return (
                  <div key={bloque} className="mt-3">
                    <p className="px-4 text-xs uppercase tracking-wide text-cafe-muted mb-1">{bloque}</p>
                    {items.map((c) => (
                      <NavLink key={c.id} to={`/${c.id}`} className={claseLink}>
                        {c.nombre}
                      </NavLink>
                    ))}
                  </div>
                )
              })
            : categorias.map((c) => (
                <NavLink key={c.id} to={`/${c.id}`} className={claseLink}>
                  {c.nombre}
                </NavLink>
              ))}
        </nav>
        <div className="text-xs text-cafe-muted text-center">
          <p className="font-bold text-cafe">{user.nombre}</p>
          <p>{ROLES[user.rol]}</p>
          <Button variante="secundario" className="mt-3 w-full" onClick={() => auth.cerrarSesion()}>
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  )
}
