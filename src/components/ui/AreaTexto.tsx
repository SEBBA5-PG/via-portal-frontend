import { useId, type TextareaHTMLAttributes } from 'react'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiqueta: string
  ayuda?: string
}

// Mismo lenguaje que TextField, en varias líneas.
export function AreaTexto({ etiqueta, ayuda, id, className = '', ...props }: Props) {
  const idGenerado = useId()
  const areaId = id ?? idGenerado
  return (
    <div className="flex flex-col gap-2 text-left">
      <label htmlFor={areaId} className="font-heading text-sm font-bold text-grafito">
        {etiqueta}
      </label>
      <textarea
        id={areaId}
        rows={3}
        className={`w-full rounded-[18px] border-[1.5px] border-borde bg-white px-5 py-3 text-base text-grafito outline-none transition placeholder:text-texto-tenue focus:border-primario focus:ring-4 focus:ring-ambar/30 disabled:opacity-60 ${className}`}
        {...props}
      />
      {ayuda && <p className="text-sm text-texto-suave">{ayuda}</p>}
    </div>
  )
}
