import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primario' | 'secundario' | 'peligro' | 'ejecutivo' | 'ejecutivo-suave'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

const CLASES: Record<Variante, string> = {
  primario: 'rounded-pill px-6 py-3 bg-acento text-white hover:brightness-95',
  secundario: 'rounded-pill px-6 py-3 bg-white text-cafe border border-institucional-sidebar hover:bg-institucional/60',
  peligro: 'rounded-pill px-6 py-3 bg-red-600 text-white hover:brightness-95',
  // Línea ejecutiva (login, 2026-09-11): recuadro de 10px en vez de píldora y alto fijo de 48px.
  // AppShell y Home siguen en las variantes de arriba hasta su propio rediseño.
  ejecutivo: 'rounded-control h-12 px-5 bg-primario text-white hover:bg-marino',
  'ejecutivo-suave': 'rounded-control h-12 px-5 bg-primario/[0.07] text-primario hover:bg-primario/[0.13]',
}

export function Button({ variante = 'primario', className = '', ...props }: Props) {
  return (
    <button
      className={`font-heading font-bold text-sm transition outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 disabled:opacity-50 disabled:cursor-not-allowed ${CLASES[variante]} ${className}`}
      {...props}
    />
  )
}
