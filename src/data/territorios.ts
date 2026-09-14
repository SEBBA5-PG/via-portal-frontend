/*
  Árbol territorial del portal. PW-04 (2026-09-09) fija la estructura:
  `id`, `nombre`, `tipo`, `padre_id`. Hoy solo hace falta poblar hasta municipio.

  Regla clave: "Global" NO es un campo booleano aparte — es asignar el nodo raíz (país);
  la cuenta hereda automáticamente todo lo que cuelga debajo. Y el territorio va POR
  CUENTA, no por permiso individual.

  Alcance real del demo (2026-09-14): el operativo es exclusivamente en el Huila, así que
  el nodo raíz es el departamento (no Colombia) y el siguiente nivel son sus 4 subregiones
  — no los 37 municipios sueltos. Cada subregión cuelga sus municipios principales.

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

export const TERRITORIO_RAIZ = 't-huila'

export const TERRITORIOS: Territorio[] = [
  { id: 't-huila', nombre: 'Huila', tipo: 'departamento', padreId: null },

  { id: 't-norte', nombre: 'Subregión Norte', tipo: 'region', padreId: 't-huila' },
  { id: 't-neiva', nombre: 'Neiva', tipo: 'municipio', padreId: 't-norte' },
  { id: 't-aipe', nombre: 'Aipe', tipo: 'municipio', padreId: 't-norte' },
  { id: 't-algeciras', nombre: 'Algeciras', tipo: 'municipio', padreId: 't-norte' },
  { id: 't-baraya', nombre: 'Baraya', tipo: 'municipio', padreId: 't-norte' },
  { id: 't-campoalegre', nombre: 'Campoalegre', tipo: 'municipio', padreId: 't-norte' },
  { id: 't-colombia-huila', nombre: 'Colombia', tipo: 'municipio', padreId: 't-norte' },
  { id: 't-hobo', nombre: 'Hobo', tipo: 'municipio', padreId: 't-norte' },
  { id: 't-palermo', nombre: 'Palermo', tipo: 'municipio', padreId: 't-norte' },
  { id: 't-rivera', nombre: 'Rivera', tipo: 'municipio', padreId: 't-norte' },
  { id: 't-tello', nombre: 'Tello', tipo: 'municipio', padreId: 't-norte' },
  { id: 't-villavieja', nombre: 'Villavieja', tipo: 'municipio', padreId: 't-norte' },

  { id: 't-centro', nombre: 'Subregión Centro', tipo: 'region', padreId: 't-huila' },
  { id: 't-garzon', nombre: 'Garzón', tipo: 'municipio', padreId: 't-centro' },
  { id: 't-altamira', nombre: 'Altamira', tipo: 'municipio', padreId: 't-centro' },
  { id: 't-elagrado', nombre: 'El Agrado', tipo: 'municipio', padreId: 't-centro' },
  { id: 't-gigante', nombre: 'Gigante', tipo: 'municipio', padreId: 't-centro' },
  { id: 't-guadalupe', nombre: 'Guadalupe', tipo: 'municipio', padreId: 't-centro' },
  { id: 't-pital', nombre: 'Pital', tipo: 'municipio', padreId: 't-centro' },
  { id: 't-suaza', nombre: 'Suaza', tipo: 'municipio', padreId: 't-centro' },
  { id: 't-tarqui', nombre: 'Tarqui', tipo: 'municipio', padreId: 't-centro' },

  { id: 't-sur', nombre: 'Subregión Sur', tipo: 'region', padreId: 't-huila' },
  { id: 't-pitalito', nombre: 'Pitalito', tipo: 'municipio', padreId: 't-sur' },
  { id: 't-acevedo', nombre: 'Acevedo', tipo: 'municipio', padreId: 't-sur' },
  { id: 't-elias', nombre: 'Elías', tipo: 'municipio', padreId: 't-sur' },
  { id: 't-isnos', nombre: 'Isnos', tipo: 'municipio', padreId: 't-sur' },
  { id: 't-oporapa', nombre: 'Oporapa', tipo: 'municipio', padreId: 't-sur' },
  { id: 't-palestina', nombre: 'Palestina', tipo: 'municipio', padreId: 't-sur' },
  { id: 't-saladoblanco', nombre: 'Saladoblanco', tipo: 'municipio', padreId: 't-sur' },
  { id: 't-sanagustin', nombre: 'San Agustín', tipo: 'municipio', padreId: 't-sur' },
  { id: 't-timana', nombre: 'Timaná', tipo: 'municipio', padreId: 't-sur' },

  { id: 't-occidente', nombre: 'Subregión Occidente', tipo: 'region', padreId: 't-huila' },
  { id: 't-laplata', nombre: 'La Plata', tipo: 'municipio', padreId: 't-occidente' },
  { id: 't-laargentina', nombre: 'La Argentina', tipo: 'municipio', padreId: 't-occidente' },
  { id: 't-nataga', nombre: 'Nátaga', tipo: 'municipio', padreId: 't-occidente' },
  { id: 't-paicol', nombre: 'Paicol', tipo: 'municipio', padreId: 't-occidente' },
  { id: 't-tesalia', nombre: 'Tesalia', tipo: 'municipio', padreId: 't-occidente' },
  { id: 't-iquira', nombre: 'Íquira', tipo: 'municipio', padreId: 't-occidente' },
  { id: 't-yaguara', nombre: 'Yaguará', tipo: 'municipio', padreId: 't-occidente' },
  { id: 't-teruel', nombre: 'Teruel', tipo: 'municipio', padreId: 't-occidente' },
  { id: 't-santamaria', nombre: 'Santa María', tipo: 'municipio', padreId: 't-occidente' },
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
  if (territorioIds.includes(TERRITORIO_RAIZ)) return 'Global (todo el Huila)'
  const nombres = territorioIds.map((id) => territorioPorId(id)?.nombre ?? id)
  if (nombres.length <= 2) return nombres.join(' · ')
  return `${nombres.slice(0, 2).join(' · ')} +${nombres.length - 2}`
}

// Todos los territorios que una cuenta alcanza, expandiendo la herencia hacia abajo:
// quien tiene una subregión alcanza sus municipios sin tenerlos listados.
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
