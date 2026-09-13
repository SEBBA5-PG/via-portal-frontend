import { Badge } from '../../components/ui/Badge'
import { Superficie } from '../../components/ui/Superficie'
import { TERRITORIO_RAIZ, TERRITORIOS, hijosDe, territoriosAlcanzados } from '../../data/territorios'

/*
  Selector de alcance territorial (PW-04).

  Dos reglas que se ven en el comportamiento: "Global" no es un booleano aparte, es marcar el
  nodo raíz — y al marcarlo, todo lo que cuelga debajo se hereda automáticamente, así que los
  hijos se muestran alcanzados pero no se marcan uno por uno. Y el territorio va por cuenta,
  no por permiso individual: este selector se aplica a la cuenta entera.
*/

export function SelectorTerritorio({
  seleccionados,
  onCambiar,
  soloLectura,
}: {
  seleccionados: string[]
  onCambiar: (ids: string[]) => void
  soloLectura?: boolean
}) {
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
      <div className="border-b border-white/[0.06] px-5 py-4">
        <Casilla
          marcada={esGlobal}
          onCambiar={() => alternar(TERRITORIO_RAIZ)}
          deshabilitada={soloLectura}
          etiqueta="Colombia — alcance global"
          detalle="Hereda automáticamente todos los departamentos y municipios de abajo."
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

      <div className="border-t border-white/[0.06] px-5 py-3 text-xs text-texto-suave">
        {seleccionados.length === 0 ? (
          <span className="text-ambar">Sin alcance asignado — la cuenta no verá datos de ningún territorio.</span>
        ) : (
          <>
            Alcanza {alcanzados.size} de {TERRITORIOS.length} nodos territoriales.
          </>
        )}
      </div>
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
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 ${deshabilitada ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <input
        type="checkbox"
        checked={marcada}
        disabled={deshabilitada}
        onChange={onCambiar}
        className="mt-0.5 size-4 shrink-0 accent-[#78b4ff] outline-none focus-visible:ring-4 focus-visible:ring-ambar/40"
      />
      <span className="min-w-0">
        <span
          className={`flex flex-wrap items-center gap-2 ${
            destacada ? 'font-heading text-sm font-extrabold text-grafito' : pequena ? 'text-xs text-grafito/75' : 'text-sm font-semibold text-grafito/90'
          }`}
        >
          {etiqueta}
          {heredada && !marcada && <Badge tono="info">Heredado</Badge>}
        </span>
        {detalle && <span className="mt-0.5 block text-xs text-texto-suave">{detalle}</span>}
      </span>
    </label>
  )
}
