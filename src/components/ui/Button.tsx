import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primario' | 'secundario' | 'peligro' | 'ejecutivo' | 'ejecutivo-suave'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

const CLASES: Record<Variante, string> = {
  primario: 'rounded-pill px-6 py-3 bg-acento text-white hover:brightness-95',
  secundario: 'rounded-pill px-6 py-3 bg-white text-cafe border border-institucional-sidebar hover:bg-institucional/60',
  peligro: 'rounded-pill px-6 py-3 bg-red-600 text-white hover:brightness-95',
  // Línea ejecutiva (login, 2026-09-11; revisión "glass premium" 2026-09-12): alto fijo de
  // 48px. AppShell y Home siguen en las variantes de arriba hasta su propio rediseño.
  // "ejecutivo" es blanco sólido y opaco (única pieza 100% opaca de la tarjeta en vidrio,
  // por eso resalta como acción principal) con volumen de sombras apiladas de adentro
  // hacia afuera, en vez de plano — ver el mismo tratamiento en BotonIcono de AuthLayout.
  ejecutivo:
    'rounded-full h-12 px-5 bg-gradient-to-b from-[#f7f5f1] to-[#e6e3dc] text-[#14181f] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_-2px_3px_rgba(0,0,0,0.10)_inset,0_-6px_10px_rgba(0,0,0,0.18)_inset,0_22px_40px_rgba(0,0,0,0.45),0_6px_14px_rgba(0,0,0,0.35)] transition-[transform,filter] duration-150 ease-out hover:-translate-y-px hover:brightness-105 active:translate-y-px active:brightness-95',
  'ejecutivo-suave': 'rounded-full h-12 px-5 bg-primario/[0.12] text-primario hover:bg-primario/[0.2]',
}

export function Button({ variante = 'primario', className = '', ...props }: Props) {
  return (
    <button
      className={`font-heading font-bold text-sm transition outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 disabled:opacity-50 disabled:cursor-not-allowed ${CLASES[variante]} ${className}`}
      {...props}
    />
  )
}
