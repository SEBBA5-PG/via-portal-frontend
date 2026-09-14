import { useMemo } from 'react'
import type { FilaMapaCalor } from '../lib/usuariosAppApi'
import { formatoEntero } from '../dominio/metricas'

/*
  Croquis esquemático del Huila por zonas calientes de usuarios — NO es un mapa geográfico
  real (no hay polígonos de municipios): cada municipio es una celda dentro de su subregión
  (Norte/Centro/Sur/Occidente, igual que data/territorios.ts), coloreada según su total de
  usuarios respecto al municipio con más usuarios del conjunto visible. Elegido sobre un mapa
  real (react-simple-maps + GeoJSON del Huila) por rapidez de implementación — migrar a un
  mapa real después no toca el backend, solo esta pieza.
*/

const ORDEN_REGIONES = ['Subregión Norte', 'Subregión Centro', 'Subregión Sur', 'Subregión Occidente']

// Interpola entre el tinte más claro y el acento primario del portal según la intensidad
// (0 a 1) — mismo criterio de "más usuarios = más saturado" que un choropleth de censo.
function colorCelda(intensidad: number): string {
  if (intensidad <= 0) return 'var(--color-surface-sunken)'
  const claro = { r: 227, g: 230, b: 253 } // --color-primario-tint
  const oscuro = { r: 47, g: 59, b: 196 } // --color-primario-600
  const t = Math.min(1, Math.max(0.12, intensidad))
  const mezclar = (a: number, b: number) => Math.round(a + (b - a) * t)
  return `rgb(${mezclar(claro.r, oscuro.r)}, ${mezclar(claro.g, oscuro.g)}, ${mezclar(claro.b, oscuro.b)})`
}

export function CroquisCalorHuila({ filas }: { filas: FilaMapaCalor[] }) {
  const maximo = Math.max(1, ...filas.map((f) => f.total))

  const porRegion = useMemo(() => {
    const grupos = new Map<string, FilaMapaCalor[]>()
    for (const fila of filas) {
      const lista = grupos.get(fila.region) ?? []
      lista.push(fila)
      grupos.set(fila.region, lista)
    }
    for (const lista of grupos.values()) lista.sort((a, b) => b.total - a.total)
    return ORDEN_REGIONES.map((region) => ({ region, municipios: grupos.get(region) ?? [] })).filter(
      (g) => g.municipios.length > 0,
    )
  }, [filas])

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {porRegion.map(({ region, municipios }) => (
          <div key={region} className="rounded-xl border border-borde/70 p-3">
            <p className="mb-2.5 font-heading text-xs font-bold uppercase tracking-wide text-texto-suave">
              {region.replace('Subregión ', '')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {municipios.map((m) => (
                <div
                  key={m.municipioId}
                  title={`${m.nombre}: ${formatoEntero(m.total)} usuarios`}
                  className="flex h-14 w-14 flex-col items-center justify-center rounded-lg text-center transition-transform hover:scale-105"
                  style={{ backgroundColor: colorCelda(m.total / maximo) }}
                >
                  <span
                    className="truncate px-1 text-[10px] font-semibold leading-tight"
                    style={{ color: m.total / maximo > 0.55 ? '#fff' : 'var(--color-grafito)' }}
                  >
                    {m.nombre}
                  </span>
                  <span
                    className="font-mono text-[11px] font-bold"
                    style={{ color: m.total / maximo > 0.55 ? '#fff' : 'var(--color-grafito)' }}
                  >
                    {formatoEntero(m.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-texto-suave">
        <span>Menos usuarios</span>
        <span className="flex h-2.5 flex-1 max-w-40 overflow-hidden rounded-full">
          {[0.12, 0.3, 0.5, 0.7, 0.9, 1].map((t) => (
            <span key={t} className="h-full flex-1" style={{ backgroundColor: colorCelda(t) }} />
          ))}
        </span>
        <span>Más usuarios</span>
      </div>
    </div>
  )
}
