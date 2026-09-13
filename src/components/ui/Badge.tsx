import type { ReactNode } from 'react'

export type TonoBadge = 'neutro' | 'exito' | 'alerta' | 'peligro' | 'pendiente' | 'info'

const TONOS: Record<TonoBadge, string> = {
  neutro: 'bg-white/[0.07] text-texto-suave border-white/10',
  exito: 'bg-[#4a8d40]/20 text-[#8fd382] border-[#8fd382]/25',
  alerta: 'bg-ambar/15 text-ambar border-ambar/30',
  peligro: 'bg-red-500/15 text-red-300 border-red-400/30',
  pendiente: 'bg-primario/15 text-primario border-primario/30',
  info: 'bg-primario/10 text-primario/90 border-primario/20',
}

export function Badge({
  tono = 'neutro',
  children,
  className = '',
}: {
  tono?: TonoBadge
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-heading text-xs font-bold ${TONOS[tono]} ${className}`}
    >
      {children}
    </span>
  )
}
