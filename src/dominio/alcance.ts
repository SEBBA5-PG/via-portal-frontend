import type { CuentaAdmin } from '../data/cuentas'
import { TERRITORIO_RAIZ, territoriosAlcanzados } from '../data/territorios'

/*
  TerritorialScope (wiki/Actores, Roles y Permisos §Control territorial): una cuenta con
  jurisdicción asignada solo ve lo que cuelga de sus territorios. `null` significa "sin
  territorio" (una misión global): lo alcanza cualquiera.
*/
export function alcanza(cuenta: CuentaAdmin, territorioId: string | null): boolean {
  if (territorioId === null) return true
  return territoriosAlcanzados(cuenta.territorioIds).has(territorioId)
}

export function esAlcanceGlobal(cuenta: CuentaAdmin): boolean {
  return cuenta.territorioIds.includes(TERRITORIO_RAIZ)
}

// Variante de `alcanza` para el alcance territorial MÚLTIPLE de una misión (PW-05: una misión
// local puede mezclar varias subregiones/municipios, no solo uno) — [] se trata igual que
// `territorioId: null` en `alcanza`: alcanzable por cualquiera.
export function alcanzaAlgunoDe(cuenta: CuentaAdmin, territorioIds: string[]): boolean {
  if (territorioIds.length === 0) return true
  return territorioIds.some((id) => alcanza(cuenta, id))
}

// ¿El territorio `hijo` cae dentro de `contenedor`? (Soacha dentro de Cundinamarca, etc.)
export function contieneTerritorio(contenedor: string, hijo: string): boolean {
  return territoriosAlcanzados([contenedor]).has(hijo)
}
