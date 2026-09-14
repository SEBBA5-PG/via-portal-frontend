import { useId, type SelectHTMLAttributes } from 'react'

interface Opcion {
  valor: string
  etiqueta: string
  deshabilitada?: boolean
}

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  etiqueta: string
  opciones: Opcion[]
  ayuda?: string
  error?: string | null
}

// Mismo lenguaje visual que TextField (alto 48, píldora, anillo ámbar al foco). Las
// <option> se pintan con el color del sistema operativo, así que llevan fondo explícito
// para no depender de él.
export function SelectField({ etiqueta, opciones, ayuda, error, id, className = '', ...props }: Props) {
  const idGenerado = useId()
  const selectId = id ?? idGenerado
  const ayudaId = `${selectId}-ayuda`

  return (
    <div className="flex flex-col gap-2 text-left">
      <label htmlFor={selectId} className="font-heading text-sm font-bold text-grafito">
        {etiqueta}
      </label>
      <select
        id={selectId}
        aria-describedby={ayuda && !error ? ayudaId : undefined}
        aria-invalid={error ? true : undefined}
        className={`h-12 w-full appearance-none rounded-full border bg-white px-5 text-base text-grafito outline-none transition focus:border-primario focus:ring-4 focus:ring-ambar/30 ${
          error ? 'border-peligro' : 'border-borde'
        } ${className}`}
        {...props}
      >
        {opciones.map((opcion) => (
          <option
            key={opcion.valor}
            value={opcion.valor}
            disabled={opcion.deshabilitada}
            className="bg-white text-grafito"
          >
            {opcion.etiqueta}
          </option>
        ))}
      </select>
      {ayuda && !error && (
        <p id={ayudaId} className="text-sm text-texto-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-peligro">
          {error}
        </p>
      )}
    </div>
  )
}
