import { useEffect, useRef, useState, type ReactNode } from 'react'

/*
  Círculo de 40px que se expande a una píldora con etiqueta — reemplaza los <select>
  nativos de filtro (y, en otras pantallas, un botón de acción simple) por algo que no
  ocupa espacio en reposo. Dos modos según las props que reciba:

    - Filtro con menú: se pasa `opciones` (+ opcionalmente `valorActual`/`onSeleccionar`).
      Con el botón ya expandido, un clic abre/cierra un desplegable de opciones debajo.
    - Acción simple: no se pasa `opciones`. El clic ejecuta `onClick` directamente, sin
      menú — la expansión solo revela la etiqueta.

  Se expande por tres vías independientes: hover (mouse), foco (teclado) y clic (táctil,
  donde no existe hover). Las tres viven en el contenedor para que mover el mouse del botón
  al menú desplegable no lo colapse a mitad de camino.
*/

export interface OpcionBotonCircular {
  valor: string
  etiqueta: string
  // Punto de color de la opción; sin este valor se usa un gris neutro.
  color?: string
}

interface Props {
  // Ícono en reposo. Por defecto, el de filtro (líneas decrecientes) en modo filtro.
  icono?: ReactNode
  etiqueta: string
  // Presente => modo filtro-con-menú. Ausente => modo botón-de-acción simple.
  opciones?: OpcionBotonCircular[]
  valorActual?: string
  onSeleccionar?: (valor: string) => void
  onClick?: () => void
  className?: string
  // Botón de acción (sin `opciones`) en color sólido de marca en vez de blanco — para
  // acciones primarias como "Crear cuenta" (observación 9 del usuario, 2026-09-14).
  solido?: boolean
}

// Ícono de filtro convencional: tres líneas horizontales de largo decreciente de arriba
// hacia abajo, más reconocible como "filtrar" que tres líneas iguales.
function IconoFiltro() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 5.5h14" />
      <path d="M6 10h8" />
      <path d="M8.5 14.5h3" />
    </svg>
  )
}

export function BotonCircularExpansible({
  icono,
  etiqueta,
  opciones,
  valorActual,
  onSeleccionar,
  onClick,
  className = '',
  solido = false,
}: Props) {
  const esFiltro = opciones !== undefined

  const [expandido, setExpandido] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  // Clic fuera del componente cierra el menú (y colapsa el botón, ya que en ese punto ni
  // hover ni foco siguen activos).
  useEffect(() => {
    if (!menuAbierto) return
    function alClickFuera(e: MouseEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) {
        setMenuAbierto(false)
        setExpandido(false)
      }
    }
    document.addEventListener('mousedown', alClickFuera)
    return () => document.removeEventListener('mousedown', alClickFuera)
  }, [menuAbierto])

  function manejarClick() {
    if (!esFiltro) {
      // Botón de acción: el clic expande (útil en táctil, sin hover) y dispara la acción
      // en el mismo gesto — no hay menú que abrir primero.
      setExpandido(true)
      onClick?.()
      return
    }
    if (!expandido) {
      // Primer toque en táctil: solo revela la etiqueta, todavía no abre el menú.
      setExpandido(true)
      return
    }
    setMenuAbierto((abierto) => !abierto)
  }

  return (
    <div
      ref={contenedorRef}
      className="relative inline-block"
      onMouseEnter={() => setExpandido(true)}
      onMouseLeave={() => {
        if (!menuAbierto) setExpandido(false)
      }}
      onFocus={() => setExpandido(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setExpandido(false)
          setMenuAbierto(false)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && menuAbierto) {
          setMenuAbierto(false)
        }
      }}
    >
      <button
        type="button"
        onClick={manejarClick}
        aria-haspopup={esFiltro ? 'listbox' : undefined}
        aria-expanded={esFiltro ? menuAbierto : undefined}
        aria-label={expandido ? undefined : etiqueta}
        className={`flex h-10 items-center overflow-hidden rounded-full px-2.5 outline-none transition-[width,background-color] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none focus-visible:ring-4 focus-visible:ring-ambar/40 ${
          expandido ? 'w-auto max-w-[220px] justify-start gap-2' : 'w-10 justify-center'
        } ${
          solido
            ? 'bg-[var(--color-primario)] text-white hover:bg-[var(--color-primario-600)]'
            : `border border-borde text-grafito ${menuAbierto ? 'bg-primario-tint' : expandido ? 'bg-surface-sunken' : 'bg-white'}`
        } ${className}`}
      >
        {/* El ícono se centra solo si la etiqueta no está montada — con la etiqueta siempre
            presente (aunque invisible) el layout la contaba para centrar y el ícono quedaba
            corrido hacia la izquierda en reposo. */}
        <span className="grid shrink-0 place-items-center">{icono ?? <IconoFiltro />}</span>
        {expandido && (
          <span className="overflow-hidden whitespace-nowrap text-sm font-semibold motion-reduce:transition-none">
            {etiqueta}
          </span>
        )}
      </button>

      {esFiltro && menuAbierto && (
        <div
          role="listbox"
          aria-label={etiqueta}
          className="absolute left-0 top-[calc(100%+8px)] z-20 w-52 overflow-hidden rounded-control border border-borde bg-white py-1.5 shadow-[0_4px_16px_rgba(28,36,64,0.12)]"
        >
          {opciones!.map((op) => {
            const seleccionada = op.valor === valorActual
            return (
              <button
                key={op.valor}
                type="button"
                role="option"
                aria-selected={seleccionada}
                onClick={() => {
                  onSeleccionar?.(op.valor)
                  setMenuAbierto(false)
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-grafito transition-colors hover:bg-surface-sunken"
              >
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${!op.color ? 'bg-texto-tenue' : ''}`}
                  style={op.color ? { backgroundColor: op.color } : undefined}
                />
                <span className="flex-1 truncate">{op.etiqueta}</span>
                {seleccionada && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-primario"
                    aria-hidden="true"
                  >
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
