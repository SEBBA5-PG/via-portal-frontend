import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ViaLogo } from './ViaLogo'
import { BarraSuperior } from './BarraSuperior'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import HomeIcon from '../icons/HomeIcon'
import { useAuth } from '../state/authStore'
import { useAdmin } from '../state/adminStore'
import { useOperacion } from '../state/operacionStore'
import { useNavegacionGuardia } from '../state/navegacionGuardiaStore'
import { useConfirmarSalida } from '../state/useConfirmarSalida'
import { categoriasVisiblesPara } from '../data/matrizAcceso'
import { pendientesParaFirmar } from '../dominio/permisos'

function IconoCerrarSesion({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9 12h11l-3 -3m0 6l3 -3" />
      <path d="M14 8v-2a2 2 0 0 0 -2 -2h-6a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2 -2v-2" />
    </svg>
  )
}

const BLOQUES_ORDEN = ['Operación', 'Economía', 'Gobierno', 'Sistema'] as const

// Bajo el cual el sidebar se auto-colapsa mientras el usuario no lo haya tocado a mano.
const MEDIA_QUERY_COLAPSO = '(max-width: 980px)'

// Envuelve NavLink para interceptar la navegación cuando hay cambios sin guardar (PW-04): si
// `dirty`, cancela la navegación por defecto y la deja pendiente en `pedirConfirmacion` (el
// modal de useConfirmarSalida vive una sola vez en AppShell, no aquí); si no hay nada sucio,
// el click sigue su curso normal y NavLink navega solo. Declarado fuera de AppShell — un
// componente definido dentro del render se recrea en cada render y React remonta cada
// NavLink entero (perdiendo su estado) cada vez que AppShell vuelve a renderizar.
function NavLinkConGuardia({
  to,
  className,
  title,
  children,
  dirty,
  pedirConfirmacion,
}: {
  to: string
  className: (props: { isActive: boolean }) => string
  title?: string
  children: ReactNode
  dirty: boolean
  pedirConfirmacion: (accion: () => void) => void
}) {
  const navigate = useNavigate()
  return (
    <NavLink
      to={to}
      className={className}
      title={title}
      onClick={(e) => {
        if (dirty) {
          e.preventDefault()
          pedirConfirmacion(() => navigate(to))
        }
      }}
    >
      {children}
    </NavLink>
  )
}

/*
  Reskin claro (2026-09-13) — reemplaza la paleta marino/glass oscura que Q-1250
  (2026-09-12) había fijado como "identidad visual única del portal". El shell pasa a
  fondo claro (bg-fondo) con un sidebar de "estado sólido" (--side-bg, el mismo azul
  marca que usan otros bloques de énfasis sólido del reskin) en vez del panel
  translúcido/backdrop-blur sobre fondo oscuro. Sumado en esta misma tarea: el sidebar
  ahora es colapsable (ancho fijo ↔ solo-íconos), con auto-colapso responsivo por debajo
  de 980px que cede ante la elección manual del usuario apenas la hace.
*/

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const admin = useAdmin()
  const op = useOperacion()
  const user = auth.usuarioActual

  const guardia = useNavegacionGuardia()
  const { pedirConfirmacion, modal } = useConfirmarSalida(guardia.dirty)

  // Arranca colapsado (observación "simplifica la animación del sidebar, deja el estado sin
  // desplegar por defecto", 2026-09-14): navegar entre categorías funciona igual colapsado o
  // expandido — expandir es solo para leer los nombres, no un paso obligatorio.
  const [colapsado, setColapsado] = useState(true)
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)
  // true en cuanto el usuario toca el botón toggle a mano: desde ahí el auto-colapso
  // responsivo deja de pisarle la elección por el resto de la vida de este componente.
  const forzado = useRef(false)

  // El sidebar ya arranca colapsado por defecto (ver arriba): este efecto solo fuerza el
  // colapso por debajo del ancho responsivo, nunca lo expande — expandir es siempre una
  // elección explícita del usuario.
  useEffect(() => {
    const mql = window.matchMedia(MEDIA_QUERY_COLAPSO)
    const sincronizar = () => {
      if (!forzado.current && mql.matches) setColapsado(true)
    }
    sincronizar()
    mql.addEventListener('change', sincronizar)
    return () => mql.removeEventListener('change', sincronizar)
  }, [])

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

  const alternarColapso = () => {
    forzado.current = true
    setColapsado((prev) => !prev)
  }

  const claseLink = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center rounded-full font-heading text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ambar/50 ${
      colapsado ? 'size-12 justify-center' : 'w-full gap-3 px-4 py-2.5'
    } ${
      isActive
        ? 'bg-[var(--side-activo-bg)] text-[var(--side-activo-fg)]'
        : 'text-[var(--side-texto)] hover:bg-[var(--side-hover)] hover:text-[var(--side-texto-fuerte)]'
    }`

  // Alto fijo con dos columnas que scrollean por separado: el menú de 17 categorías y una
  // tabla larga no deben arrastrarse mutuamente al hacer scroll.
  return (
    <div className="flex h-dvh overflow-hidden bg-fondo">
      <aside
        className={`relative z-20 flex shrink-0 flex-col gap-6 overflow-x-hidden bg-[var(--side-bg)] px-4 py-7 shadow-[6px_0_28px_-6px_rgba(0,20,90,0.45)] transition-[width] duration-[200ms] ease-out motion-reduce:transition-none ${
          colapsado ? 'w-[96px]' : 'w-72'
        }`}
      >
        {/* Logo + botón de expandir/colapsar viven en flujo normal, no flotando encima del
            borde del sidebar — antes el botón era un circulito de 24px que se salía del
            aside con `overflow-x-hidden` y quedaba medio cortado, poco notorio. Colapsado,
            el botón va debajo del logo (columna) para no chocar visualmente con él;
            expandido, va a su lado (fila). */}
        <div className={`shrink-0 ${colapsado ? 'flex flex-col items-center gap-3' : 'flex items-center justify-between'}`}>
          <ViaLogo
            className={`transition-[height] duration-[200ms] ease-out motion-reduce:transition-none ${
              colapsado ? 'h-7' : 'h-8'
            }`}
            esquema="oscuro"
          />

          <button
            type="button"
            onClick={alternarColapso}
            aria-expanded={!colapsado}
            aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
            title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
            className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[var(--side-bg)] bg-white text-[var(--side-bg)] shadow-[0_2px_6px_rgba(28,36,64,0.12),0_6px_16px_rgba(0,20,90,0.22)] outline-none transition hover:scale-105 hover:bg-surface-sunken focus-visible:ring-2 focus-visible:ring-ambar/50"
          >
            <span className="relative block h-3.5 w-4">
              <span
                className={`absolute left-0 top-0 h-[1.5px] w-full rounded-full bg-current transition-transform duration-[200ms] ease-out motion-reduce:transition-none ${
                  colapsado ? '' : 'translate-y-[6px] rotate-45'
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rounded-full bg-current transition-opacity duration-[150ms] motion-reduce:transition-none ${
                  colapsado ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <span
                className={`absolute left-0 bottom-0 h-[1.5px] w-full rounded-full bg-current transition-transform duration-[200ms] ease-out motion-reduce:transition-none ${
                  colapsado ? '' : '-translate-y-[6px] -rotate-45'
                }`}
              />
            </span>
          </button>
        </div>

        {/* `dir="rtl"` en el contenedor de scroll + `dir="ltr"` en el contenido es el truco
            estándar para mover la barra de scroll al borde IZQUIERDO del nav — con la barra
            a la derecha (por defecto) quedaba pegada a los íconos y "chocaba visualmente"
            con el botón de colapsar/expandir cuando el menú tenía muchas categorías
            (observación 2026-09-14). También se reduce su grosor con las clases de
            `::-webkit-scrollbar`. */}
        <nav
          dir="rtl"
          className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-track]:bg-transparent"
        >
        <div dir="ltr" className={`flex flex-col gap-1 ${colapsado ? 'items-center' : ''}`}>
          <NavLinkConGuardia to="/home" className={claseLink} title={colapsado ? 'Home' : undefined} dirty={guardia.dirty} pedirConfirmacion={pedirConfirmacion}>
            <HomeIcon size={20} className="shrink-0" />
            {!colapsado && <span className="truncate">Home</span>}
          </NavLinkConGuardia>
          {agruparPorBloque
            ? BLOQUES_ORDEN.map((bloque) => {
                const items = categorias.filter((c) => c.bloque === bloque)
                if (items.length === 0) return null
                return (
                  <div key={bloque} className="mt-4">
                    {colapsado ? (
                      <div className="mb-2 flex justify-center">
                        <hr className="w-9 border-t border-[var(--side-hover)]" />
                      </div>
                    ) : (
                      <p className="mb-1 px-4 text-xs font-bold uppercase tracking-wide text-[var(--side-texto)]/70">
                        {bloque}
                      </p>
                    )}
                    {items.map((c) =>
                      c.id === 'PW-04' && porFirmar > 0 ? (
                        <NavLinkConGuardia key={c.id} to={`/${c.id}`} className={claseLink} title={colapsado ? c.nombre : undefined} dirty={guardia.dirty} pedirConfirmacion={pedirConfirmacion}>
                          <span className="relative inline-flex shrink-0">
                            <c.icono size={20} />
                            {colapsado && (
                              <span
                                aria-hidden="true"
                                className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-ambar ring-2 ring-[var(--side-bg)]"
                              />
                            )}
                          </span>
                          {!colapsado && (
                            <span className="flex flex-1 items-center justify-between gap-2">
                              {c.nombre}
                              <span
                                className="grid size-5 shrink-0 place-items-center rounded-full bg-ambar font-heading text-[0.65rem] font-extrabold text-grafito"
                                aria-label={`${porFirmar} solicitudes pendientes de tu firma`}
                              >
                                {porFirmar}
                              </span>
                            </span>
                          )}
                        </NavLinkConGuardia>
                      ) : (
                        <NavLinkConGuardia key={c.id} to={`/${c.id}`} className={claseLink} title={colapsado ? c.nombre : undefined} dirty={guardia.dirty} pedirConfirmacion={pedirConfirmacion}>
                          <c.icono size={20} className="shrink-0" />
                          {!colapsado && <span className="truncate">{c.nombre}</span>}
                        </NavLinkConGuardia>
                      ),
                    )}
                  </div>
                )
              })
            : categorias.map((c) => (
                <NavLinkConGuardia key={c.id} to={`/${c.id}`} className={claseLink} title={colapsado ? c.nombre : undefined} dirty={guardia.dirty} pedirConfirmacion={pedirConfirmacion}>
                  <c.icono size={20} className="shrink-0" />
                  {!colapsado && <span className="truncate">{c.nombre}</span>}
                </NavLinkConGuardia>
              ))}

          {/* Cerrar sesión vive como la última categoría de la lista (observación 5 del
              usuario, 2026-09-14) en vez de un bloque aparte al pie — mismo estilo de link,
              con confirmación antes de terminar la sesión. */}
          <div className={colapsado ? 'mt-2 flex justify-center border-t border-[var(--side-hover)] pt-3' : 'mt-2 border-t border-[var(--side-hover)] pt-3'}>
            <button
              type="button"
              onClick={() => setConfirmandoSalida(true)}
              title={colapsado ? 'Cerrar sesión' : undefined}
              aria-label="Cerrar sesión"
              className={`group relative flex items-center rounded-full font-heading text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ambar/50 text-[var(--side-texto)] hover:bg-[var(--side-hover)] hover:text-[var(--side-texto-fuerte)] ${
                colapsado ? 'size-12 justify-center' : 'w-full gap-3 px-4 py-2.5'
              }`}
            >
              <IconoCerrarSesion size={20} className="shrink-0" />
              {!colapsado && <span className="truncate">Cerrar sesión</span>}
            </button>
          </div>
        </div>
        </nav>
      </aside>
      {/* La barra superior vive en su propia fila, no flotando encima del contenido — antes
          era `absolute` sobre el `<main>` y en pantallas con poco alto (o con el header del
          asistente de alta, cuyo último paso llega hasta el borde derecho) terminaba
          superpuesta con el título o los botones de la página (observación 2026-09-14). */}
      <main className="relative flex flex-1 flex-col overflow-y-auto">
        <div className="flex shrink-0 justify-end px-8 pt-8">
          <BarraSuperior />
        </div>
        <Modal
          abierto={confirmandoSalida}
          titulo="¿Cerrar sesión?"
          descripcion="Tendrás que volver a autenticarte con tu cédula y PIN para entrar de nuevo al portal."
          onCerrar={() => setConfirmandoSalida(false)}
          acciones={
            <>
              <Button variante="ejecutivo-suave" onClick={() => setConfirmandoSalida(false)}>
                Cancelar
              </Button>
              <Button variante="peligro" onClick={() => auth.cerrarSesion()}>
                Cerrar sesión
              </Button>
            </>
          }
        />
        <div className="px-8 pb-8">
          {modal}
          {impersonando && (
            <div
              role="status"
              className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-[16px] border border-peligro/30 bg-peligro/10 px-5 py-3.5 text-sm text-peligro"
            >
              <span>
                Estás impersonando a <strong>{aliasImpersonado}</strong> desde las{' '}
                {new Date(impersonando.inicio).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} — cada acción
                queda registrada con severidad alta.
              </span>
              <button
                type="button"
                onClick={() => op.terminarImpersonacion()}
                className="rounded-full border border-transparent bg-peligro px-4 py-1.5 font-heading text-xs font-bold text-white outline-none transition hover:bg-peligro/90 focus-visible:ring-2 focus-visible:ring-ambar/50"
              >
                Terminar impersonación
              </button>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
