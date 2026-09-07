import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string
  error?: string
}

export function TextField({ etiqueta, error, id, className = '', ...props }: Props) {
  const inputId = id ?? etiqueta.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={inputId} className="font-heading font-bold text-sm text-cafe">
        {etiqueta}
      </label>
      <input
        id={inputId}
        className={`rounded-2xl border border-institucional-sidebar bg-white px-4 py-3 text-cafe outline-none focus:border-acento ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
