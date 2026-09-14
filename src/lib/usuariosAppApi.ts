// Cliente para GET /api/app/usuarios/resumen (conexion-api, conexión 'app' → contenedor
// app_db) — mismo patrón que cuentasApi.ts: pasa por apiFetch (cookies Sanctum + XSRF), sin
// caché propia. Los agregados (por territorio, por Playa, ingreso semanal) ya vienen resueltos
// del servidor; el frontend solo los presenta.

import { apiFetch } from './apiClient'

export interface FilaTerritorio {
  territorioId: string
  nombre: string
  total: number
}

export interface FilaPlaya {
  playa: number
  total: number
}

export interface FilaMapaCalor {
  municipioId: string
  nombre: string
  region: string
  total: number
}

export interface ResumenUsuariosApp {
  total: number
  porTerritorio: { filas: FilaTerritorio[]; otros: number }
  porPlaya: FilaPlaya[]
  ingresoSemanal: { promedioSemanal: number; tendenciaPct: number | null }
  // Los 37 municipios del Huila con su subregión, ceros incluidos — a diferencia de
  // porTerritorio (top 8), esto alimenta el croquis por zonas.
  mapaCalor: FilaMapaCalor[]
}

export function obtenerResumenUsuariosApp(): Promise<ResumenUsuariosApp> {
  return apiFetch<ResumenUsuariosApp>('/api/app/usuarios/resumen')
}
