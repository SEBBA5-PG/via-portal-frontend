import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/*
  Botón de "volver" reutilizable entre pantallas de detalle (fichas, pasos de un asistente,
  etc.): un círculo con flecha que se despliega con el cursor para mostrar a dónde vuelve —
  mismo lenguaje de BotonCircularExpansible, pero pensado para vivir arriba a la izquierda,
  por encima del contenido, en vez de mezclado entre los filtros/acciones de la cabecera.
*/

function IconoFlechaAtras() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4.5L5.5 10l6.5 5.5" />
      <path d="M5.5 10h9" />
    </svg>
  )
}

export function BotonVolver({
  a,
  etiqueta = 'Volver',
  interceptar,
}: {
  a: string
  etiqueta?: string
  // Para pantallas con progreso sin guardar (asistentes): en vez de navegar directo, se le
  // entrega la navegación real como función y quien llama decide si la ejecuta ya mismo o
  // primero pide confirmación (p. ej. con useConfirmarSalida).
  interceptar?: (ir: () => void) => void
}) {
  const navigate = useNavigate()
  const [expandido, setExpandido] = useState(false)

  return (
    <button
      type="button"
      onClick={() => {
        const ir = () => navigate(a)
        if (interceptar) interceptar(ir)
        else ir()
      }}
      onMouseEnter={() => setExpandido(true)}
      onMouseLeave={() => setExpandido(false)}
      onFocus={() => setExpandido(true)}
      onBlur={() => setExpandido(false)}
      aria-label={etiqueta}
      className={`flex h-10 items-center overflow-hidden rounded-full border border-borde bg-white text-grafito shadow-sm outline-none transition-[width,color,border-color] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none hover:border-primario/40 hover:text-primario focus-visible:ring-4 focus-visible:ring-ambar/40 ${
        expandido ? 'w-auto max-w-[240px] justify-start gap-2 px-4' : 'w-10 justify-center'
      }`}
    >
      <span className="grid shrink-0 place-items-center">
        <IconoFlechaAtras />
      </span>
      {expandido && <span className="overflow-hidden whitespace-nowrap text-sm font-semibold">{etiqueta}</span>}
    </button>
  )
}
