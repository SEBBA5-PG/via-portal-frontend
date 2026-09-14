import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Superficie } from '../../components/ui/Superficie'
import { TERRITORIO_RAIZ, TERRITORIOS, describirAlcance, hijosDe, territoriosAlcanzados } from '../../data/territorios'

/*
  Selector de alcance territorial (PW-04).

  Dos reglas que se ven en el comportamiento: "Global" no es un booleano aparte, es marcar el
  nodo raíz — y al marcarlo, todo lo que cuelga debajo se hereda automáticamente, así que los
  hijos se muestran alcanzados pero no se marcan uno por uno. Y el territorio va por cuenta,
  no por permiso individual: este selector se aplica a la cuenta entera.

  Presentación cerrada tipo dropdown (asistente de alta, 2026-09-13): en reposo se ve como un
  campo/pill que resume la selección actual, y un clic despliega la lista de checkboxes de
  siempre debajo. `abierto` es estado puramente local — no toca las props públicas
  (`seleccionados`, `onCambiar`) ni la lógica de herencia de arriba.
*/

function resumenSeleccion(seleccionados: string[]): string {
  if (seleccionados.length === 0) return 'Selecciona uno o más municipios'
  return describirAlcance(seleccionados)
}

export function SelectorTerritorio({
  seleccionados,
  onCambiar,
  soloLectura,
}: {
  seleccionados: string[]
  onCambiar: (ids: string[]) => void
  soloLectura?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const alcanzados = territoriosAlcanzados(seleccionados)
  const esGlobal = seleccionados.includes(TERRITORIO_RAIZ)

  const alternar = (id: string) => {
    if (soloLectura) return
    if (id === TERRITORIO_RAIZ) {
      // Marcar el país reemplaza cualquier selección más fina: ya la incluye toda.
      onCambiar(esGlobal ? [] : [TERRITORIO_RAIZ])
      return
    }
    const sinRaiz = seleccionados.filter((s) => s !== TERRITORIO_RAIZ)
    onCambiar(sinRaiz.includes(id) ? sinRaiz.filter((s) => s !== id) : [...sinRaiz, id])
  }

  const departamentos = hijosDe(TERRITORIO_RAIZ)

  return (
    <Superficie tono="panel" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left outline-none transition-colors hover:bg-surface-sunken focus-visible:ring-4 focus-visible:ring-ambar/40"
      >
        <span
          className={`text-sm font-semibold ${seleccionados.length === 0 ? 'text-texto-suave' : 'text-grafito'}`}
        >
          {resumenSeleccion(seleccionados)}
        </span>
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
          className={`shrink-0 text-texto-suave transition-transform duration-200 motion-reduce:transition-none ${abierto ? 'rotate-180' : ''}`}
        >
          <path d="M5 7.5l5 5 5-5" />
        </svg>
      </button>

      {abierto && (
        <>
          <div className="border-y border-borde px-5 py-4">
            <Casilla
              marcada={esGlobal}
              onCambiar={() => alternar(TERRITORIO_RAIZ)}
              deshabilitada={soloLectura}
              etiqueta="Huila — alcance global"
              detalle="Hereda automáticamente todas las subregiones y municipios de abajo."
              destacada
            />
          </div>

          <div className="grid gap-x-8 gap-y-1 px-5 py-4 sm:grid-cols-2">
            {departamentos.map((departamento) => {
              const municipios = hijosDe(departamento.id)
              return (
                <div key={departamento.id} className="py-1.5">
                  <Casilla
                    marcada={seleccionados.includes(departamento.id)}
                    heredada={esGlobal}
                    onCambiar={() => alternar(departamento.id)}
                    deshabilitada={soloLectura || esGlobal}
                    etiqueta={departamento.nombre}
                  />
                  <div className="mt-1 flex flex-col gap-0.5 pl-7">
                    {municipios.map((municipio) => (
                      <Casilla
                        key={municipio.id}
                        marcada={seleccionados.includes(municipio.id)}
                        heredada={alcanzados.has(municipio.id) && !seleccionados.includes(municipio.id)}
                        onCambiar={() => alternar(municipio.id)}
                        deshabilitada={soloLectura || alcanzados.has(municipio.id) && !seleccionados.includes(municipio.id)}
                        etiqueta={municipio.nombre}
                        pequena
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t border-borde px-5 py-3 text-xs text-texto-suave">
            {seleccionados.length === 0 ? (
              <span className="text-ambar">Sin alcance asignado — la cuenta no verá datos de ningún territorio.</span>
            ) : (
              <>
                Alcanza {alcanzados.size} de {TERRITORIOS.length} nodos territoriales.
              </>
            )}
          </div>
        </>
      )}
    </Superficie>
  )
}

function Casilla({
  marcada,
  heredada,
  onCambiar,
  deshabilitada,
  etiqueta,
  detalle,
  destacada,
  pequena,
}: {
  marcada: boolean
  heredada?: boolean
  onCambiar: () => void
  deshabilitada?: boolean
  etiqueta: string
  detalle?: string
  destacada?: boolean
  pequena?: boolean
}) {
  const tintadaHeredada = heredada && !marcada

  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 ${
        destacada
          ? 'rounded-control bg-[var(--side-bg)] px-4 py-3'
          : tintadaHeredada
            ? '-mx-2 rounded-control bg-[var(--side-bg)]/10 px-2 py-1'
            : ''
      } ${deshabilitada ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <input
        type="checkbox"
        checked={marcada}
        disabled={deshabilitada}
        onChange={onCambiar}
        className={`mt-0.5 size-4 shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 ${
          destacada ? 'accent-[var(--side-activo-bg)]' : 'accent-primario'
        }`}
      />
      <span className="min-w-0">
        <span
          className={`flex flex-wrap items-center gap-2 ${
            destacada
              ? 'font-heading text-sm font-extrabold text-[var(--side-texto-fuerte)]'
              : pequena
                ? 'text-xs text-grafito/75'
                : 'text-sm font-semibold text-grafito/90'
          }`}
        >
          {etiqueta}
          {heredada && !marcada && <Badge tono="info">Heredado</Badge>}
        </span>
        {detalle && (
          <span className={`mt-0.5 block text-xs ${destacada ? 'text-[var(--side-texto)]' : 'text-texto-suave'}`}>
            {detalle}
          </span>
        )}
      </span>
    </label>
  )
}
