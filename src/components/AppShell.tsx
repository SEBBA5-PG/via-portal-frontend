import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ViaLogo } from './ViaLogo'
import { useAuth } from '../state/authStore'
import { useAdmin } from '../state/adminStore'
import { useOperacion } from '../state/operacionStore'
import { ROLES } from '../data/roles'
import { categoriasVisiblesPara } from '../data/matrizAcceso'
import { pendientesParaFirmar } from '../dominio/permisos'

const BLOQUES_ORDEN = ['Operación', 'Economía', 'Gobierno', 'Sistema'] as const

/*
  Rediseñado a la paleta marino/glass el 2026-09-12. Q-1250 cerró que la paleta
  marino/ámbar es "la identidad visual única del portal, para las 18 categorías" y retiró la
  amarilla corporativa — hasta ahora solo el flujo de acceso la usaba y la zona autenticada
  seguía en café/institucional, partiendo el portal en dos estéticas.
*/

const claseLink = ({ isActive }: { isActive: boolean }) =>
  `block rounded-full px-4 py-2 font-heading text-sm font-bold transition-colors ${
    isActive ? 'bg-primario/[0.14] text-primario' : 'text-grafito/70 hover:bg-white/[0.05] hover:text-grafito'
  }`

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const admin = useAdmin()
  const op = useOperacion()
  const user = auth.usuarioActual
  if (!user) return null

  // wiki §Auditoría: la impersonación es de severidad alta y su inicio y fin tienen que ser
  // visibles (PW-03). El aviso vive en el shell para que no se pierda al navegar.
  const impersonando = op.impersonacion?.actorId === user.id ? op.impersonacion : null
  const aliasImpersonado = impersonando ? op.usuarios.find((u) => u.id === impersonando.usuarioId)?.alias : null

  // PW-02 (Home y dashboard) no se lista aparte: el link "Home" de arriba ya cubre ese
  // destino — listar los dos sería un duplicado confuso en el menú.
  const categorias = categoriasVisiblesPara(user.rol).filter((c) => c.id !== 'PW-02')
  const agruparPorBloque = user.rol === 'S' || user.rol === 'A'

  // Contador de la bandeja de Doble Firma: solo cuenta lo que ESTA persona puede firmar —
  // sus propias solicitudes no suman, porque nunca podrá aprobarlas (Maker ≠ Checker).
  const cuenta = admin.cuentaPorId(user.id)
  const porFirmar = cuenta ? pendientesParaFirmar(admin.solicitudes, cuenta).length : 0

  // Alto fijo con dos columnas que scrollean por separado: el menú de 17 categorías y una
  // tabla larga no deben arrastrarse mutuamente al hacer scroll.
  return (
    <div className="flex h-dvh overflow-hidden bg-fondo-acceso">
      <aside className="flex w-64 shrink-0 flex-col gap-6 border-r border-white/[0.07] bg-[#faf6ee]/[0.03] px-4 py-6 backdrop-blur-[12px]">
        <ViaLogo className="mx-auto h-10" esquema="oscuro" />
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <NavLink to="/home" className={claseLink}>
            Home
          </NavLink>
          {agruparPorBloque
            ? BLOQUES_ORDEN.map((bloque) => {
                const items = categorias.filter((c) => c.bloque === bloque)
                if (items.length === 0) return null
                return (
                  <div key={bloque} className="mt-4">
                    <p className="mb-1 px-4 text-xs font-bold uppercase tracking-wide text-texto-suave/70">
                      {bloque}
                    </p>
                    {items.map((c) =>
                      c.id === 'PW-04' && porFirmar > 0 ? (
                        <NavLink key={c.id} to={`/${c.id}`} className={claseLink}>
                          <span className="flex items-center justify-between gap-2">
                            {c.nombre}
                            <span
                              className="grid size-5 shrink-0 place-items-center rounded-full bg-ambar/85 font-heading text-[0.65rem] font-extrabold text-[#14181f]"
                              aria-label={`${porFirmar} solicitudes pendientes de tu firma`}
                            >
                              {porFirmar}
                            </span>
                          </span>
                        </NavLink>
                      ) : (
                        <NavLink key={c.id} to={`/${c.id}`} className={claseLink}>
                          {c.nombre}
                        </NavLink>
                      ),
                    )}
                  </div>
                )
              })
            : categorias.map((c) => (
                <NavLink key={c.id} to={`/${c.id}`} className={claseLink}>
                  {c.nombre}
                </NavLink>
              ))}
        </nav>
        <div className="border-t border-white/[0.07] pt-4 text-center">
          <p className="font-heading text-sm font-bold text-grafito">{user.nombre}</p>
          <p className="mt-0.5 text-xs text-texto-suave">{ROLES[user.rol]}</p>
          <button
            type="button"
            onClick={() => auth.cerrarSesion()}
            className="mt-3 w-full rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 font-heading text-sm font-bold text-grafito/80 outline-none transition hover:bg-white/[0.09] hover:text-grafito focus-visible:ring-4 focus-visible:ring-ambar/40"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto px-8 py-8">
        {impersonando && (
          <div
            role="status"
            className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-[16px] border border-red-400/35 bg-red-500/[0.12] px-5 py-3.5 text-sm text-red-100"
          >
            <span>
              Estás impersonando a <strong>{aliasImpersonado}</strong> desde las{' '}
              {new Date(impersonando.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} — cada acción
              queda registrada con severidad alta.
            </span>
            <button
              type="button"
              onClick={() => op.terminarImpersonacion()}
              className="rounded-full border border-red-300/40 bg-red-400/20 px-4 py-1.5 font-heading text-xs font-bold text-red-50 outline-none transition hover:bg-red-400/30 focus-visible:ring-4 focus-visible:ring-ambar/40"
            >
              Terminar impersonación
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
