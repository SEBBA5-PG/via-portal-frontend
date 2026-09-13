/*
  Árbol territorial del portal. PW-04 (2026-09-09) fija la estructura:
  `id`, `nombre`, `tipo`, `padre_id`. Hoy solo hace falta poblar hasta municipio.

  Regla clave: "Global" NO es un campo booleano aparte — es asignar el nodo raíz (país);
  la cuenta hereda automáticamente todo lo que cuelga debajo. Y el territorio va POR
  CUENTA, no por permiso individual.

  Pendiente de la bóveda (`[DECISIÓN BORRADOR]`): el `municipio` de los usuarios de la app
  hoy vive como texto libre y debe migrar a referenciar esta misma tabla compartida.
*/

export type TipoTerritorio = 'pais' | 'region' | 'departamento' | 'municipio'

export interface Territorio {
  id: string
  nombre: string
  tipo: TipoTerritorio
  padreId: string | null
}

export const TERRITORIO_RAIZ = 't-co'

export const TERRITORIOS: Territorio[] = [
  { id: 't-co', nombre: 'Colombia', tipo: 'pais', padreId: null },

  { id: 't-cund', nombre: 'Cundinamarca', tipo: 'departamento', padreId: 't-co' },
  { id: 't-bogota', nombre: 'Bogotá D.C.', tipo: 'municipio', padreId: 't-cund' },
  { id: 't-soacha', nombre: 'Soacha', tipo: 'municipio', padreId: 't-cund' },
  { id: 't-zipaquira', nombre: 'Zipaquirá', tipo: 'municipio', padreId: 't-cund' },

  { id: 't-ant', nombre: 'Antioquia', tipo: 'departamento', padreId: 't-co' },
  { id: 't-medellin', nombre: 'Medellín', tipo: 'municipio', padreId: 't-ant' },
  { id: 't-bello', nombre: 'Bello', tipo: 'municipio', padreId: 't-ant' },
  { id: 't-envigado', nombre: 'Envigado', tipo: 'municipio', padreId: 't-ant' },

  { id: 't-atl', nombre: 'Atlántico', tipo: 'departamento', padreId: 't-co' },
  { id: 't-barranquilla', nombre: 'Barranquilla', tipo: 'municipio', padreId: 't-atl' },
  { id: 't-soledad', nombre: 'Soledad', tipo: 'municipio', padreId: 't-atl' },

  { id: 't-valle', nombre: 'Valle del Cauca', tipo: 'departamento', padreId: 't-co' },
  { id: 't-cali', nombre: 'Cali', tipo: 'municipio', padreId: 't-valle' },
  { id: 't-palmira', nombre: 'Palmira', tipo: 'municipio', padreId: 't-valle' },
]

const POR_ID = new Map(TERRITORIOS.map((t) => [t.id, t]))

export function territorioPorId(id: string): Territorio | undefined {
  return POR_ID.get(id)
}

export function hijosDe(padreId: string | null): Territorio[] {
  return TERRITORIOS.filter((t) => t.padreId === padreId)
}

// Nombre legible del alcance de una cuenta. Asignar el nodo raíz es lo que significa
// "global" — no hay un booleano que lo diga.
export function describirAlcance(territorioIds: string[]): string {
  if (territorioIds.length === 0) return 'Sin alcance asignado'
  if (territorioIds.includes(TERRITORIO_RAIZ)) return 'Global (todo el país)'
  const nombres = territorioIds.map((id) => territorioPorId(id)?.nombre ?? id)
  if (nombres.length <= 2) return nombres.join(' · ')
  return `${nombres.slice(0, 2).join(' · ')} +${nombres.length - 2}`
}

// Todos los territorios que una cuenta alcanza, expandiendo la herencia hacia abajo:
// quien tiene Antioquia alcanza Medellín, Bello y Envigado sin tenerlos listados.
export function territoriosAlcanzados(territorioIds: string[]): Set<string> {
  const alcanzados = new Set<string>()
  const pendientes = [...territorioIds]
  while (pendientes.length > 0) {
    const id = pendientes.pop()
    if (!id || alcanzados.has(id)) continue
    alcanzados.add(id)
    for (const hijo of hijosDe(id)) pendientes.push(hijo.id)
  }
  return alcanzados
}
