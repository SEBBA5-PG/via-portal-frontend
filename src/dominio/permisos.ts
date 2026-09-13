import type { Rol } from '../data/roles'
import type { CuentaAdmin } from '../data/cuentas'
import type { SolicitudPermiso } from '../data/solicitudes'
import { PERMISOS, permisoPorClave, plantillaDe, type Permiso } from '../data/permisos'

/*
  Reglas de autorización de PW-04, como funciones puras: sin React, sin storage, sin fetch.

  Esto es deliberado. Cuando el backend Laravel exista, cada función de aquí tiene que
  poder traducirse a una Policy sin reescribir la lógica — y hasta entonces, la UI no puede
  inventarse una regla que el servidor no vaya a aplicar. Toda decisión está citada.

  Advertencia estructural que NO se resuelve aquí: en el demo estas comprobaciones corren en
  el navegador, y eso jamás es autorización real. "Ocultar no es autorizar" (Portal Web —
  Matriz de Acceso por Rol): cuando haya backend, estas mismas reglas tienen que correr allá
  y ser las que de verdad deciden.
*/

// Jerarquía de roles administrativos. Un usuario tiene UN SOLO rol a la vez, no se combinan.
const JERARQUIA: Record<Rol, number> = { S: 3, A: 2, C: 1 }

export type DireccionCambio = 'ampliacion' | 'reduccion' | 'sin-cambio'

export interface CambioPropuesto {
  clave: string
  valorNuevo: boolean
}

/*
  M02 Q-0050: "el rol es la plantilla de permisos por defecto, no una garantía fija: cada
  usuario puede recibir permisos individuales por encima o por debajo de ese default".

  El orden importa: plantilla primero, override después. Si se invirtiera, redefinir la
  plantilla de un rol (Q-1254) pisaría los overrides individuales, y Q-1254 dice justo lo
  contrario — "cambiar la plantilla no toca los overrides individuales que ya tenga cada
  cuenta".
*/
export function permisosEfectivos(cuenta: CuentaAdmin): Record<string, boolean> {
  const efectivos = plantillaDe(cuenta.rol)
  for (const [clave, valor] of Object.entries(cuenta.overrides)) {
    efectivos[clave] = valor
  }
  return efectivos
}

export function tienePermiso(cuenta: CuentaAdmin, clave: string): boolean {
  const permiso = permisoPorClave(clave)
  // BLOQUEANTE legal de M13 Q-0535 (Ley 1581): el backend debe denegarlo aunque el permiso
  // figure activo. Se deniega aquí también para que la UI no prometa algo que no ocurrirá.
  if (permiso?.bloqueoLegal) return false
  return permisosEfectivos(cuenta)[clave] === true
}

/*
  Lo que el editor de permisos necesita para mostrar el toggle "ver diferencias respecto al
  rol base". Propuesta de PW-04 sin validar por el equipo: la vista principal son los
  permisos EFECTIVOS y esto es la capa secundaria.
*/
export function diferenciasConPlantilla(cuenta: CuentaAdmin): {
  ampliados: string[]
  reducidos: string[]
} {
  const plantilla = plantillaDe(cuenta.rol)
  const ampliados: string[] = []
  const reducidos: string[] = []
  for (const [clave, valor] of Object.entries(cuenta.overrides)) {
    if (valor === plantilla[clave]) continue
    if (valor) ampliados.push(clave)
    else reducidos.push(clave)
  }
  return { ampliados, reducidos }
}

/*
  Q-1255 (2026-09-12) — el corazón de este módulo.

  "Reducir un permiso por debajo del default del rol → aplica de inmediato, sin Doble Firma.
   Restringir acceso nunca es la acción sensible.
   Ampliar un permiso por encima del default del rol → exige Doble Firma de dos
   Superadministrador distintos, sea al crear la cuenta o después."

  La dirección se mide contra el VALOR EFECTIVO ACTUAL, no contra la plantilla del rol.
  Quitarle a alguien un permiso que su rol tampoco trae no es una reducción: es no-cambio.
  Y devolverle un permiso que se le había quitado sí es una ampliación, aunque su rol lo
  traiga por defecto — está ganando acceso que ahora mismo no tiene.
*/
export function clasificarCambio(
  cuenta: CuentaAdmin,
  clave: string,
  valorNuevo: boolean,
): DireccionCambio {
  const actual = permisosEfectivos(cuenta)[clave] === true
  if (actual === valorNuevo) return 'sin-cambio'
  return valorNuevo ? 'ampliacion' : 'reduccion'
}

/*
  Q-1254: `roles:edit_template` "exige Doble Firma de dos Superadministrador distintos, la
  misma regla dura de M02 Q-0050" — SIN la salvedad de dirección de Q-1255, porque afecta a
  todas las cuentas de ese rol a la vez. Lo mismo para otorgar `accounts:create` y
  `permissions:grant` (PW-04, modelo de tres niveles).
*/
export function requiereDobleFirma(cuenta: CuentaAdmin, clave: string, valorNuevo: boolean): boolean {
  const direccion = clasificarCambio(cuenta, clave, valorNuevo)
  if (direccion === 'sin-cambio') return false
  const permiso = permisoPorClave(clave)
  if (permiso?.dobleFirmaSiempre) return true
  return direccion === 'ampliacion'
}

/*
  Reparte una edición en dos montones. Q-1255: "la evaluación es por permiso individual
  dentro de una edición, no por la acción completa: si una sola edición reduce 3 permisos y
  amplía 2, los 3 se aplican de inmediato y los 2 quedan pendientes de un segundo
  Superadministrador".
*/
export function separarCambios(
  cuenta: CuentaAdmin,
  cambios: CambioPropuesto[],
): { inmediatos: CambioPropuesto[]; requierenFirma: CambioPropuesto[] } {
  const inmediatos: CambioPropuesto[] = []
  const requierenFirma: CambioPropuesto[] = []
  for (const cambio of cambios) {
    if (clasificarCambio(cuenta, cambio.clave, cambio.valorNuevo) === 'sin-cambio') continue
    if (!esEditable(cuenta, cambio.clave)) continue
    if (requiereDobleFirma(cuenta, cambio.clave, cambio.valorNuevo)) requierenFirma.push(cambio)
    else inmediatos.push(cambio)
  }
  return { inmediatos, requierenFirma }
}

/*
  Techos de seguridad. Matriz de Acceso por Rol, corolario:

    "los techos fijos no se renderizan ni siquiera como checkbox deshabilitado en el editor
     de permisos. Un control deshabilitado comunica «esto se podría activar»; un techo fijo
     no se puede activar nunca, tampoco por un Superadministrador."

  Y la cuenta raíz es irrevocable: nunca se le puede quitar `accounts:create` ni
  `permissions:grant` (PW-04).
*/
export function esEditable(cuenta: CuentaAdmin, clave: string): boolean {
  const permiso = permisoPorClave(clave)
  if (!permiso) return false
  if (permiso.techoFijo) return false
  if (cuenta.esRaiz) return false
  return true
}

// Permisos que el editor puede dibujar como control para esta cuenta. Los techos fijos
// quedan fuera por completo, no deshabilitados.
export function permisosEditables(cuenta: CuentaAdmin): Permiso[] {
  return PERMISOS.filter((p) => esEditable(cuenta, p.clave))
}

// Techos que aplican a esta cuenta, para listarlos como texto informativo aparte. No son
// controles: son la explicación de por qué ciertos permisos no aparecen arriba.
export function techosDe(cuenta: CuentaAdmin): { permiso: Permiso; concedido: boolean }[] {
  const efectivos = permisosEfectivos(cuenta)
  return PERMISOS.filter((p) => p.techoFijo).map((permiso) => ({
    permiso,
    concedido: efectivos[permiso.clave] === true,
  }))
}

/*
  wiki §Permisos: "Quién edita permisos: solo otro Superadministrador, nunca un
  Administrador ni el propio usuario."
*/
export function puedeEditarPermisos(actor: CuentaAdmin, objetivo: CuentaAdmin): boolean {
  if (actor.rol !== 'S') return false
  if (actor.id === objetivo.id) return false
  if (objetivo.esRaiz) return false
  return tienePermiso(actor, 'permissions:edit')
}

/*
  wiki §Asignación y revocación de roles: el Superadministrador asigna cualquiera; el
  Administrador solo roles inferiores al suyo; el Coordinador no asigna.
*/
export function puedeAsignarRol(actor: CuentaAdmin, rolDestino: Rol): boolean {
  if (!tienePermiso(actor, 'roles:assign')) return false
  if (actor.rol === 'S') return true
  return JERARQUIA[rolDestino] < JERARQUIA[actor.rol]
}

export function puedeGestionarCuenta(actor: CuentaAdmin, objetivo: CuentaAdmin): boolean {
  if (objetivo.esRaiz) return false
  if (actor.rol === 'S') return true
  if (actor.rol === 'A') return JERARQUIA[objetivo.rol] < JERARQUIA[actor.rol]
  return false
}

export function puedeCrearCuentas(actor: CuentaAdmin): boolean {
  return tienePermiso(actor, 'accounts:create')
}

/*
  Reglas Transversales de UI §Doble Firma, regla 4: "El Maker no puede ser el Checker. La UI
  debe impedirlo, no solo el backend." Y el checker es siempre Superadministrador, en ambas
  direcciones — Q-1255 refina cuándo hace falta un segundo firmante, no quién puede serlo.
*/
export function puedeSerChecker(actor: CuentaAdmin, solicitud: SolicitudPermiso): boolean {
  if (actor.rol !== 'S') return false
  if (solicitud.estado !== 'pendiente') return false
  if (actor.id === solicitud.makerId) return false
  return tienePermiso(actor, 'permissions:edit')
}

export function razonNoPuedeFirmar(actor: CuentaAdmin, solicitud: SolicitudPermiso): string | null {
  if (puedeSerChecker(actor, solicitud)) return null
  if (solicitud.estado !== 'pendiente') return 'Esta solicitud ya fue resuelta.'
  if (actor.id === solicitud.makerId) return 'No puedes aprobar una solicitud que tú mismo enviaste.'
  if (actor.rol !== 'S') return 'Solo un Superadministrador puede firmar esta solicitud.'
  return 'Tu cuenta no tiene el permiso de editar permisos.'
}

// Solicitudes que bloquean un permiso concreto: mientras haya una pendiente, el editor
// muestra el valor que rige mientras tanto en vez de dejar volver a proponerlo.
export function solicitudPendienteDe(
  solicitudes: SolicitudPermiso[],
  cuentaId: string,
  clave: string,
): SolicitudPermiso | undefined {
  return solicitudes.find(
    (s) => s.estado === 'pendiente' && s.cuentaObjetivoId === cuentaId && s.permisoClave === clave,
  )
}

export function pendientesParaFirmar(solicitudes: SolicitudPermiso[], actor: CuentaAdmin): SolicitudPermiso[] {
  return solicitudes.filter((s) => puedeSerChecker(actor, s))
}
