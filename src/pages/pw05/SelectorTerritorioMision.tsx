import { useState } from 'react'
import { TERRITORIO_RAIZ, hijosDe } from '../../data/territorios'

/*
  Alcance de una misión LOCAL: selección múltiple — una o más subregiones completas, uno o
  más municipios sueltos, o una mezcla de ambos (corrección del usuario 2026-09-14: no es
  "una subregión O un municipio", es una lista donde marcar la subregión selecciona todos sus
  municipios de una vez, y cada municipio se puede además marcar/desmarcar suelto).

  Toda la fila de la subregión abre/cierra el acordeón (no solo la flecha) — el checkbox
  detiene la propagación del clic para que marcar/desmarcar no also la abra o cierre.
*/

export function SelectorTerritorioMision({
  valores,
  onCambiar,
  disabled,
}: {
  valores: string[]
  onCambiar: (ids: string[]) => void
  disabled?: boolean
}) {
  const subregiones = hijosDe(TERRITORIO_RAIZ)
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set())

  const alternarExpansion = (id: string) =>
    setAbiertas((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })

  const alternarMunicipio = (id: string) => {
    if (disabled) return
    onCambiar(valores.includes(id) ? valores.filter((v) => v !== id) : [...valores, id])
  }

  const alternarSubregion = (municipioIds: string[]) => {
    if (disabled) return
    const todosMarcados = municipioIds.length > 0 && municipioIds.every((id) => valores.includes(id))
    if (todosMarcados) {
      onCambiar(valores.filter((v) => !municipioIds.includes(v)))
    } else {
      onCambiar(Array.from(new Set([...valores, ...municipioIds])))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {subregiones.map((sub) => {
        const municipios = hijosDe(sub.id)
        const municipioIds = municipios.map((m) => m.id)
        const expandida = abiertas.has(sub.id)
        const marcados = municipioIds.filter((id) => valores.includes(id))
        const todosMarcados = municipioIds.length > 0 && marcados.length === municipioIds.length
        const algunoMarcado = marcados.length > 0

        return (
          <div key={sub.id} className="overflow-hidden rounded-[14px] border border-borde">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={expandida}
              onClick={() => alternarExpansion(sub.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  alternarExpansion(sub.id)
                }
              }}
              className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ambar/40 ${
                algunoMarcado ? 'bg-primario/[0.08]' : 'bg-surface-sunken hover:bg-primario/[0.05]'
              }`}
            >
              {/* Sin <label>: envolver el checkbox en un <label> hace que CUALQUIER clic en el
                  texto lo marque/desmarque por comportamiento nativo del navegador, aunque el
                  `onClick` de React tenga stopPropagation — así que el texto nunca llegaba a
                  disparar la expansión del acordeón. Checkbox y texto van sueltos: solo el
                  checkbox detiene la propagación (y solo él cambia la selección); el resto de
                  la fila (texto incluido) activa expandir/colapsar. */}
              <div className="flex flex-1 items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={todosMarcados}
                  ref={(el) => {
                    if (el) el.indeterminate = algunoMarcado && !todosMarcados
                  }}
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => alternarSubregion(municipioIds)}
                  className="size-4 shrink-0 accent-primario outline-none focus-visible:ring-4 focus-visible:ring-ambar/40"
                />
                <span className="font-heading text-sm font-bold text-grafito">{sub.nombre}</span>
                <span className="text-xs text-texto-suave">
                  {todosMarcados
                    ? 'toda la subregión'
                    : algunoMarcado
                      ? `${marcados.length} de ${municipioIds.length} municipios`
                      : 'toda la subregión'}
                </span>
              </div>
              <span className="grid size-7 shrink-0 place-items-center rounded-full text-texto-suave" aria-hidden="true">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 motion-reduce:transition-none ${expandida ? 'rotate-180' : ''}`}
                >
                  <path d="M5 7.5l5 5 5-5" />
                </svg>
              </span>
            </div>

            {expandida && (
              <div className="flex flex-col gap-0.5 px-4 py-3 pl-9">
                {municipios.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-sm text-grafito/85 hover:bg-surface-sunken"
                  >
                    <input
                      type="checkbox"
                      checked={valores.includes(m.id)}
                      disabled={disabled}
                      onChange={() => alternarMunicipio(m.id)}
                      className="size-3.5 shrink-0 accent-primario outline-none focus-visible:ring-4 focus-visible:ring-ambar/40"
                    />
                    {m.nombre}
                  </label>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
