import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primario' | 'secundario' | 'peligro' | 'ejecutivo' | 'ejecutivo-suave'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

const CLASES: Record<Variante, string> = {
  primario: 'rounded-xl px-6 py-3 bg-primario text-white shadow-[0_1px_2px_rgba(0,45,178,0.15),0_2px_8px_rgba(0,45,178,0.18)] hover:bg-primario-600',
  secundario: 'rounded-xl h-12 px-5 bg-white text-grafito border border-borde shadow-sm hover:bg-surface-sunken',
  peligro: 'rounded-xl px-6 py-3 bg-peligro text-white shadow-[0_2px_8px_rgba(214,64,64,0.18)] hover:brightness-95',
  // Rediseño 2026-09-14: botón de acción principal en forma rectangular (no píldora),
  // color sólido de marca en vez del acabado glossy anterior, con una sombra mínima en
  // vez del volumen apilado de antes.
  ejecutivo: 'rounded-xl h-12 px-5 bg-primario text-white shadow-[0_1px_2px_rgba(0,45,178,0.12),0_4px_12px_rgba(0,45,178,0.22)] transition hover:bg-primario-600 active:brightness-95',
  'ejecutivo-suave': 'rounded-xl h-12 px-5 bg-primario/[0.12] text-primario hover:bg-primario/[0.2]',
}

export function Button({ variante = 'primario', className = '', ...props }: Props) {
  return (
    <button
      className={`font-heading font-bold text-sm transition outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 disabled:opacity-50 disabled:cursor-not-allowed ${CLASES[variante]} ${className}`}
      {...props}
    />
  )
}
