import type { ReactNode } from 'react'

export type TonoBadge = 'neutro' | 'exito' | 'alerta' | 'peligro' | 'pendiente' | 'info'

const TONOS: Record<TonoBadge, string> = {
  neutro: 'bg-surface-sunken text-texto-suave border-borde',
  exito: 'bg-exito/15 text-exito border-exito/30',
  alerta: 'bg-ambar/15 text-ambar border-ambar/30',
  peligro: 'bg-peligro/15 text-peligro border-peligro/30',
  pendiente: 'bg-primario/10 text-primario border-primario/25',
  info: 'bg-primario/10 text-primario border-primario/20',
}

// Color sólido del circulito de ícono dentro de la etiqueta — mismo tono que el texto, pero
// como relleno opaco para que el ícono en blanco resalte (ver referencia de diseño del
// usuario, 2026-09-14: pill con ícono en un círculo sólido + texto en negrita).
const COLOR_ICONO: Record<TonoBadge, string> = {
  neutro: 'var(--color-texto-suave)',
  exito: 'var(--color-exito)',
  alerta: 'var(--color-ambar)',
  peligro: 'var(--color-peligro)',
  pendiente: 'var(--color-primario)',
  info: 'var(--color-primario)',
}

function IconoCheck() {
  return (
    <svg width="8" height="8" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  )
}

function IconoReloj() {
  return (
    <svg width="8" height="8" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6v4l3 2" />
    </svg>
  )
}

function IconoX() {
  return (
    <svg width="8" height="8" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  )
}

function IconoPunto() {
  return <span className="block size-1.5 rounded-full bg-white" aria-hidden="true" />
}

// Ícono automático por tono, siguiendo la referencia de diseño: éxito = check, pendiente =
// reloj, peligro = x, alerta/neutro/info = punto. Se puede sobreescribir con la prop `icono`.
const ICONO_POR_TONO: Record<TonoBadge, ReactNode> = {
  exito: <IconoCheck />,
  pendiente: <IconoReloj />,
  peligro: <IconoX />,
  alerta: <IconoPunto />,
  neutro: <IconoPunto />,
  info: <IconoPunto />,
}

export function Badge({
  tono = 'neutro',
  children,
  className = '',
  icono,
  sinIcono = false,
}: {
  tono?: TonoBadge
  children: ReactNode
  className?: string
  // Sobreescribe el ícono automático (p. ej. un signo +/− para diffs de permisos).
  icono?: ReactNode
  // Oculta el círculo de ícono por completo — para badges puramente numéricos/compactos.
  sinIcono?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-heading text-xs font-bold ${TONOS[tono]} ${className}`}
    >
      {!sinIcono && (
        <span
          className="grid size-3.5 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: COLOR_ICONO[tono] }}
          aria-hidden="true"
        >
          {icono ?? ICONO_POR_TONO[tono]}
        </span>
      )}
      {children}
    </span>
  )
}
