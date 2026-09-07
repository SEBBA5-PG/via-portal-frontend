import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primario' | 'secundario' | 'peligro'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
}

const CLASES: Record<Variante, string> = {
  primario: 'bg-acento text-white hover:brightness-95',
  secundario: 'bg-white text-cafe border border-institucional-sidebar hover:bg-institucional/60',
  peligro: 'bg-red-600 text-white hover:brightness-95',
}

export function Button({ variante = 'primario', className = '', ...props }: Props) {
  return (
    <button
      className={`font-heading font-bold rounded-pill px-6 py-3 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${CLASES[variante]} ${className}`}
      {...props}
    />
  )
}
