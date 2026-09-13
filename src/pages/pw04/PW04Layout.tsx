import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../state/authStore'
import { useAdmin } from '../../state/adminStore'
import { pendientesParaFirmar, tienePermiso } from '../../dominio/permisos'

// Envoltorio común de PW-04: cabecera de categoría y sub-navegación entre sus pantallas.
// La bandeja solo aparece para quien realmente puede firmar algo — mostrarla vacía a un
// Administrador sería prometer una capacidad que la wiki le niega.
export function PW04Layout({
  titulo,
  descripcion,
  acciones,
  children,
}: {
  titulo: string
  descripcion?: ReactNode
  acciones?: ReactNode
  children: ReactNode
}) {
  const auth = useAuth()
  const admin = useAdmin()
  const user = auth.usuarioActual
  const cuentaActor = user ? admin.cuentaPorId(user.id) : undefined

  const puedeVerBandeja = cuentaActor ? tienePermiso(cuentaActor, 'permissions:edit') : false
  const porFirmar = cuentaActor ? pendientesParaFirmar(admin.solicitudes, cuentaActor).length : 0

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-texto-suave">
              PW-04 · Roles y permisos
            </p>
            <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-grafito">
              {titulo}
            </h1>
            {descripcion && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto-suave">{descripcion}</p>
            )}
          </div>
          {acciones && <div className="flex shrink-0 flex-wrap items-center gap-3">{acciones}</div>}
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-white/[0.07] pb-3">
          <Solapa to="/PW-04" fin>
            Cuentas administrativas
          </Solapa>
          {puedeVerBandeja && (
            <Solapa to="/PW-04/solicitudes">
              <span className="flex items-center gap-2">
                Doble Firma
                {porFirmar > 0 && <Badge tono="alerta">{porFirmar}</Badge>}
              </span>
            </Solapa>
          )}
        </nav>

        {children}
      </div>
    </AppShell>
  )
}

function Solapa({ to, fin, children }: { to: string; fin?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={fin}
      className={({ isActive }) =>
        `rounded-full px-4 py-2 font-heading text-sm font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 ${
          isActive ? 'bg-primario/[0.14] text-primario' : 'text-texto-suave hover:bg-white/[0.05] hover:text-grafito'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
