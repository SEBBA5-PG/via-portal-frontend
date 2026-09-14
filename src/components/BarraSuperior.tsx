import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../state/authStore'
import { ROLES } from '../data/roles'

/*
  Barra superior global (búsqueda + perfil), fija arriba a la derecha del área de contenido
  de AppShell — visible en todas las pantallas, no solo PW-04.

  Rediseño 2026-09-14 (observaciones 1 y 4 de la primera tanda): los dos botones pasan a
  color sólido de marca. La búsqueda se despliega también con el cursor encima y, mientras
  está abierta y vacía, muestra ejemplos de qué se puede buscar. El perfil reemplaza al
  bloque de nombre+rol que antes vivía al pie del sidebar.

  Ajuste 2026-09-14 (segunda tanda, "animaciones más sutiles y delicadas"): el colapso al
  quitar el cursor espera un instante (`RETARDO_COLAPSO`) en vez de cerrarse de golpe — así
  un movimiento de mouse de paso no cierra lo que se acaba de abrir — y las transiciones
  pasan de 220ms lineal-ish a 320-380ms con fundes de opacidad + un leve desplazamiento en
  vez de aparecer/desaparecer en seco.
*/

const EJEMPLOS_BUSQUEDA = ['Nombre o cédula de una cuenta', 'Territorio o alcance', 'Solicitud de Doble Firma']
const RETARDO_COLAPSO = 260

function IconoLupa() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="6" />
      <path d="M17 17l-3.5-3.5" />
    </svg>
  )
}

// Dos iniciales: primera letra de las dos primeras palabras del nombre. Extiende la lógica
// de una sola inicial que ya vive en AppShell.tsx.
function inicialesDe(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  return palabras
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}

// Colapso con un pequeño respiro: cancela el cierre si el cursor vuelve a entrar antes de
// que se cumpla el retardo, para que la animación se sienta intencional y no nerviosa.
function useColapsoConRetardo(cerrar: () => boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelar = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const programar = () => {
    cancelar()
    timerRef.current = setTimeout(() => {
      cerrar()
      timerRef.current = null
    }, RETARDO_COLAPSO)
  }

  useEffect(() => cancelar, [])

  return { cancelar, programar }
}

export function BarraSuperior() {
  const auth = useAuth()
  const user = auth.usuarioActual
  const [expandidoBusqueda, setExpandidoBusqueda] = useState(false)
  const [expandidoPerfil, setExpandidoPerfil] = useState(false)
  const [texto, setTexto] = useState('')

  const busqueda = useColapsoConRetardo(() => {
    if (texto.trim() !== '') return false
    setExpandidoBusqueda(false)
    return true
  })
  const perfil = useColapsoConRetardo(() => {
    setExpandidoPerfil(false)
    return true
  })

  if (!user) return null

  return (
    <div className="relative z-10 flex items-center gap-3">
      <div
        className="relative"
        onMouseEnter={() => {
          busqueda.cancelar()
          setExpandidoBusqueda(true)
        }}
        onMouseLeave={busqueda.programar}
      >
        {expandidoBusqueda ? (
          <input
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={() => {
              if (texto.trim() === '') setExpandidoBusqueda(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setTexto('')
                setExpandidoBusqueda(false)
              }
            }}
            placeholder="Buscar usuarios, misiones, solicitudes…"
            className="h-10 w-72 rounded-full border border-primario/30 bg-white pl-4 pr-4 text-sm text-grafito shadow-[0_2px_10px_rgba(0,45,178,0.12)] outline-none transition-[width] duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-texto-tenue focus:border-primario focus:ring-4 focus:ring-ambar/30 sm:w-80"
          />
        ) : (
          <button
            type="button"
            onClick={() => setExpandidoBusqueda(true)}
            aria-label="Buscar"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-primario)] text-white outline-none transition duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:bg-[var(--color-primario-600)] focus-visible:ring-4 focus-visible:ring-ambar/40"
          >
            <IconoLupa />
          </button>
        )}

        <div
          className={`pointer-events-none absolute right-0 top-[calc(100%+8px)] w-72 origin-top-right rounded-control border border-borde bg-white p-3.5 text-xs shadow-[0_4px_16px_rgba(28,36,64,0.14)] transition-[opacity,transform] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none sm:w-80 ${
            expandidoBusqueda && texto.trim() === ''
              ? 'translate-y-0 opacity-100'
              : '-translate-y-1 opacity-0'
          }`}
        >
          <p className="mb-2 font-heading text-xs font-bold text-grafito">Prueba buscar por…</p>
          <ul className="flex flex-col gap-1.5 text-texto-suave">
            {EJEMPLOS_BUSQUEDA.map((ejemplo) => (
              <li key={ejemplo} className="flex items-center gap-2">
                <span className="size-1 shrink-0 rounded-full bg-texto-tenue" aria-hidden="true" />
                {ejemplo}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        onMouseEnter={() => {
          perfil.cancelar()
          setExpandidoPerfil(true)
        }}
        onMouseLeave={perfil.programar}
        onFocus={() => setExpandidoPerfil(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setExpandidoPerfil(false)
        }}
      >
        <button
          type="button"
          aria-expanded={expandidoPerfil}
          aria-label={`${user.nombre}, ${ROLES[user.rol]}`}
          onClick={() => setExpandidoPerfil((v) => !v)}
          className={`flex h-10 items-center rounded-full bg-[var(--color-primario)] text-white outline-none transition-[width] duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none focus-visible:ring-4 focus-visible:ring-ambar/40 ${
            expandidoPerfil ? 'w-auto max-w-[220px] pr-4' : 'w-10'
          }`}
        >
          <span className="grid size-10 shrink-0 place-items-center font-heading text-sm font-bold">
            {inicialesDe(user.nombre)}
          </span>
          <span
            className={`overflow-hidden whitespace-nowrap text-left transition-opacity duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${
              expandidoPerfil ? 'opacity-100' : 'w-0 opacity-0'
            }`}
          >
            <span className="block font-heading text-xs font-bold leading-tight">{user.nombre}</span>
            <span className="block text-[0.65rem] font-semibold leading-tight text-white/75">{ROLES[user.rol]}</span>
          </span>
        </button>
      </div>
    </div>
  )
}
