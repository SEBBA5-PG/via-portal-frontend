import { useMemo, useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { FeatureCollection, Geometry } from 'geojson'
import huilaGeoCrudo from '../data/geo/huila-municipios.json'
import type { FilaMapaCalor } from '../lib/usuariosAppApi'
import { colorIntensidad } from '../dominio/colorCalor'
import { formatoEntero } from '../dominio/metricas'

/*
  Mapa geográfico real del Huila (37 municipios, polígonos DIVIPOLA 2018 — fuente:
  caticoa3/colombia_mapa, filtrado a departamento 41 y con `properties.nombre` normalizado
  para que haga match exacto con `territorios.nombre` del backend) coloreado como choropleth
  según el total de usuarios de cada municipio. Reemplaza el croquis esquemático (grid por
  subregión) de la primera versión de este panel.
*/

// Centrado a ojo sobre el Huila (no hay un cálculo de centroide real de la geometría aquí);
// si el GeoJSON cambia de fuente, estos valores pueden necesitar reajuste visual.
const PROJECTION_CONFIG = { center: [-75.55, 2.55] as [number, number], scale: 17000 }

// El JSON importado no trae el tipo literal 'FeatureCollection' (resolveJsonModule lo infiere
// como string genérico) — el contenido sí lo es, viene de nuestro propio script de conversión.
const huilaGeo = huilaGeoCrudo as unknown as FeatureCollection<Geometry, { nombre: string }>

export function MapaCalorHuila({ filas }: { filas: FilaMapaCalor[] }) {
  const porNombre = useMemo(() => new Map(filas.map((f) => [f.nombre, f])), [filas])
  const maximo = Math.max(1, ...filas.map((f) => f.total))
  const masCaliente = useMemo(
    () => (filas.length > 0 ? filas.reduce((a, b) => (b.total > a.total ? b : a)) : null),
    [filas],
  )
  const [seleccionado, setSeleccionado] = useState<FilaMapaCalor | null>(masCaliente)

  const activo = seleccionado ?? masCaliente

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={PROJECTION_CONFIG}
          width={480}
          height={620}
          className="h-auto w-full max-w-md"
        >
          <Geographies geography={huilaGeo}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const nombre = geo.properties?.nombre ?? ''
                const fila = porNombre.get(nombre)
                const total = fila?.total ?? 0
                const esActivo = activo?.nombre === nombre
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => setSeleccionado(fila ?? { municipioId: nombre, nombre, region: '', total: 0 })}
                    onClick={() => setSeleccionado(fila ?? { municipioId: nombre, nombre, region: '', total: 0 })}
                    className="cursor-pointer outline-none transition-opacity hover:opacity-75"
                    style={{
                      fill: colorIntensidad(total / maximo),
                      stroke: '#fff',
                      strokeWidth: esActivo ? 1.5 : 0.75,
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>

        <div className="mt-3 flex items-center gap-2 text-xs text-texto-suave">
          <span>Menos usuarios</span>
          <span className="flex h-2.5 max-w-40 flex-1 overflow-hidden rounded-full">
            {[0.12, 0.3, 0.5, 0.7, 0.9, 1].map((t) => (
              <span key={t} className="h-full flex-1" style={{ backgroundColor: colorIntensidad(t) }} />
            ))}
          </span>
          <span>Más usuarios</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {activo && (
          <div className="rounded-xl border border-borde/70 p-4">
            <p className="font-heading text-sm font-extrabold text-grafito">{activo.nombre}</p>
            {activo.region && <p className="text-xs text-texto-suave">{activo.region}</p>}
            <p className="mt-2 font-heading text-2xl font-extrabold text-primario">{formatoEntero(activo.total)}</p>
            <p className="text-xs text-texto-suave">usuarios de la app</p>
          </div>
        )}

        <div>
          <p className="mb-2 font-heading text-xs font-bold uppercase tracking-wide text-texto-suave">
            Top 5 municipios
          </p>
          <ol className="flex flex-col gap-1.5">
            {[...filas]
              .sort((a, b) => b.total - a.total)
              .slice(0, 5)
              .map((f, i) => (
                <li key={f.municipioId}>
                  <button
                    type="button"
                    onClick={() => setSeleccionado(f)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-sunken ${
                      activo?.municipioId === f.municipioId ? 'bg-surface-sunken font-bold text-grafito' : 'text-texto-suave'
                    }`}
                  >
                    <span className="truncate">
                      {i + 1}. {f.nombre}
                    </span>
                    <span className="font-mono">{formatoEntero(f.total)}</span>
                  </button>
                </li>
              ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
