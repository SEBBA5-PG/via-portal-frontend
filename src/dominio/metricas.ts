import type { UsuarioApp } from '../data/usuariosApp'
import { territorioPorId } from '../data/territorios'

/*
  Métricas del home (PW-02), como funciones puras. Reciben un `UsuarioApp[]` que YA pasó por
  `usuariosVisiblesPara` (TerritorialScope) — igual que el resto de `dominio/`, esto no
  decide el alcance, solo agrega lo que le llega filtrado.

  PW-02 fija el home como "tarjetas KPI livianas (número + tendencia, sin gráficos ni
  filtros)"; la analítica profunda con series de tiempo, comparativas y exportación es
  PW-17/M16, todavía sin construir. Los desgloses de aquí (por territorio, por Playa) están
  en un punto intermedio — son más que un número suelto — así que se muestran como un panel
  aparte de la grilla de KPI, no como una tarjeta más.
*/

export interface FilaTerritorio {
  territorioId: string
  nombre: string
  total: number
}

export interface ResumenTerritorial {
  filas: FilaTerritorio[]
  otros: number
}

// Los N municipios con más usuarios; el resto se agrupa en `otros` para no alargar la
// tarjeta a los 33 municipios del Huila cuando el alcance de la cuenta es global.
export function resumenPorTerritorio(usuarios: UsuarioApp[], top = 8): ResumenTerritorial {
  const conteo = new Map<string, number>()
  for (const u of usuarios) conteo.set(u.municipioId, (conteo.get(u.municipioId) ?? 0) + 1)

  const filas = [...conteo.entries()]
    .map(([territorioId, total]) => ({
      territorioId,
      nombre: territorioPorId(territorioId)?.nombre ?? territorioId,
      total,
    }))
    .sort((a, b) => b.total - a.total)

  return { filas: filas.slice(0, top), otros: filas.slice(top).reduce((acc, f) => acc + f.total, 0) }
}

export interface FilaPlaya {
  playa: number
  total: number
}

// Siempre las 7 filas, aunque alguna Playa esté en cero — para que el orden 1→7 no salte.
export function resumenPorPlaya(usuarios: UsuarioApp[]): FilaPlaya[] {
  const conteo = new Array(7).fill(0)
  for (const u of usuarios) {
    if (u.playa >= 1 && u.playa <= 7) conteo[u.playa - 1] += 1
  }
  return conteo.map((total, i) => ({ playa: i + 1, total }))
}

interface CorteSemanal {
  semanasAtras: number
  nuevos: number
}

/*
  Cortes de 7 días, terminando en el registro más reciente del propio conjunto — no en
  `Date.now()`. Las fechas de este demo viven en 2026; anclarlas al reloj real las
  descuadraría apenas pase esa fecha, y con datos filtrados por territorio el "más reciente"
  ya varía de una cuenta a otra.
*/
function ingresoSemanal(usuarios: UsuarioApp[], semanas: number): CorteSemanal[] {
  if (usuarios.length === 0) return Array.from({ length: semanas }, (_, semanasAtras) => ({ semanasAtras, nuevos: 0 }))

  const hoy = Math.max(...usuarios.map((u) => Date.parse(u.fechaRegistro)))
  const cortes = new Array(semanas).fill(0)
  for (const u of usuarios) {
    const dias = Math.floor((hoy - Date.parse(u.fechaRegistro)) / 86_400_000)
    const semana = Math.floor(dias / 7)
    if (semana >= 0 && semana < semanas) cortes[semana] += 1
  }
  return cortes.map((nuevos, semanasAtras) => ({ semanasAtras, nuevos }))
}

export interface PromedioIngreso {
  promedioSemanal: number
  // null cuando la mitad previa de la ventana no tuvo ningún registro: no hay base para %.
  tendenciaPct: number | null
}

// Promedio semanal de ingreso, con tendencia: mitad reciente de la ventana contra la mitad
// anterior — el mismo par que usaría cualquier "esta semana vs. la pasada", pero con más
// semanas de cada lado para no depender de un solo corte ruidoso.
export function promedioIngresoSemanal(usuarios: UsuarioApp[], semanas = 8): PromedioIngreso {
  const serie = ingresoSemanal(usuarios, semanas)
  const total = serie.reduce((acc, s) => acc + s.nuevos, 0)
  const mitad = Math.floor(semanas / 2)
  const reciente = serie.slice(0, mitad).reduce((acc, s) => acc + s.nuevos, 0)
  const previa = serie.slice(mitad, mitad * 2).reduce((acc, s) => acc + s.nuevos, 0)

  return {
    promedioSemanal: total / (semanas || 1),
    tendenciaPct: previa > 0 ? (reciente - previa) / previa : null,
  }
}

const FORMATO_ENTERO = new Intl.NumberFormat('es-CO')
const FORMATO_PORCENTAJE = new Intl.NumberFormat('es-CO', {
  style: 'percent',
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
})

export function formatoEntero(n: number): string {
  return FORMATO_ENTERO.format(Math.round(n))
}

export function formatoTendenciaPct(pct: number | null): string | undefined {
  if (pct === null) return undefined
  return `${FORMATO_PORCENTAJE.format(pct)} vs. 4 semanas previas`
}
