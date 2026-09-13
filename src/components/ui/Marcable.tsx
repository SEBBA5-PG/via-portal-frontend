import type { ReactNode } from 'react'

// Checkbox o radio con etiqueta y detalle, en el lenguaje del portal.
export function Marcable({
  tipo = 'checkbox',
  nombre,
  marcado,
  onCambiar,
  etiqueta,
  detalle,
  deshabilitado,
}: {
  tipo?: 'checkbox' | 'radio'
  nombre?: string
  marcado: boolean
  onCambiar: (marcado: boolean) => void
  etiqueta: ReactNode
  detalle?: ReactNode
  deshabilitado?: boolean
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-[14px] border px-4 py-3 transition-colors ${
        marcado ? 'border-primario/40 bg-primario/[0.08]' : 'border-white/10 bg-white/[0.02]'
      } ${deshabilitado ? 'cursor-not-allowed opacity-55' : 'cursor-pointer hover:bg-white/[0.05]'}`}
    >
      <input
        type={tipo}
        name={nombre}
        checked={marcado}
        disabled={deshabilitado}
        onChange={(e) => onCambiar(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[#78b4ff]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-grafito">{etiqueta}</span>
        {detalle && <span className="mt-0.5 block text-xs leading-relaxed text-texto-suave">{detalle}</span>}
      </span>
    </label>
  )
}
