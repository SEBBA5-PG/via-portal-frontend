import type { Rol } from './roles'

/*
  Catálogo de permisos del Portal Web. Transcripción de VIA BRAIN,
  decisiones/cuestionario/abiertos/Catálogo de Permisos (borrador).md — 13 categorías.

  Dos correcciones deliberadas respecto a ese documento, ambas por decisiones posteriores:

  1. La columna `O` (Operador Logístico) se omite. El rol salió del Portal Web el
     2026-09-11 y migró al sistema de entregas independiente (wiki/Actores, Roles y
     Permisos §Roles administrativos). El catálogo todavía está escrito con 4 roles
     porque no se ha actualizado desde entonces; aquí son 3.
  2. `accounts:create` y `permissions:grant` no son plantilla de ningún rol — se marcan
     `cesionIndividual` y nunca se precargan al elegir un rol.
*/

// Valor de un permiso en la plantilla por defecto de un rol.
//   'si'          → lo trae el rol
//   'restringido' → lo trae, con el límite escrito en `nota` (p. ej. "su territorio")
//   'solicitar'   → solo puede pedirlo, no ejecutarlo (patrón Coordinador → Administrador)
//   'no'          → no lo trae
export type EstadoDefault = 'si' | 'restringido' | 'solicitar' | 'no'

export interface CategoriaPermiso {
  numero: number
  nombre: string
}

export const CATEGORIAS_PERMISO: CategoriaPermiso[] = [
  { numero: 1, nombre: 'Usuarios y ciclo de vida' },
  { numero: 2, nombre: 'Roles y permisos' },
  { numero: 3, nombre: 'Misiones y evidencias' },
  { numero: 4, nombre: 'Eventos y asistencia' },
  { numero: 5, nombre: 'Recompensas, catálogo e inventario' },
  { numero: 6, nombre: 'Economía (Ágatas)' },
  { numero: 7, nombre: 'Rankings' },
  { numero: 8, nombre: 'Referidos y red de crecimiento' },
  { numero: 9, nombre: 'Encuestas y formularios' },
  { numero: 10, nombre: 'Contenido (CMS técnico)' },
  { numero: 11, nombre: 'Seguridad y antifraude' },
  { numero: 12, nombre: 'Notificaciones' },
  { numero: 13, nombre: 'Configuración global' },
]

export interface Permiso {
  clave: string
  etiqueta: string
  categoria: number
  porDefecto: Record<Rol, EstadoDefault>
  nota?: Partial<Record<Rol, string>>
  /*
    Techo de seguridad: no es ajustable por nadie, tampoco por un Superadministrador.
    Regla dura de Portal Web — Matriz de Acceso por Rol: "no se renderizan ni siquiera
    como checkbox deshabilitado en el editor de permisos. Un control deshabilitado
    comunica «esto se podría activar»; un techo fijo no se puede activar nunca".
  */
  techoFijo?: boolean
  /*
    Otorgarlo o quitarlo exige Doble Firma SIEMPRE, sin la excepción direccional de
    Q-1255 (reducir aplica de inmediato). Aplica a `roles:edit_template` (Q-1254, por
    afectar a todas las cuentas de un rol a la vez) y a los dos permisos del nivel 2 del
    modelo de cuentas (PW-04: "Otorgar accounts:create o permissions:grant a alguien
    exige Doble Firma de dos Superadministrador distintos").
  */
  dobleFirmaSiempre?: boolean
  // Ejercer el permiso (no otorgarlo) exige Doble Firma. Informativo para la ficha.
  dobleFirmaAlEjercer?: boolean
  /*
    No pertenece a la plantilla de ningún rol: solo se obtiene por cesión individual.
    La cuenta `root` los trae de forma nativa e irrevocable (PW-04, modelo de 3 niveles).
  */
  cesionIndividual?: boolean
  /*
    BLOQUEANTE legal sin responsable asignado (M13 Q-0535, Ley 1581 — dato sensible de
    opinión política). El backend debe denegarlo aunque el permiso figure activo.
  */
  bloqueoLegal?: boolean
  // El rol ejecutor no está confirmado en la fuente — resolver con el cliente vía M15.
  sinConfirmar?: boolean
}

export const PERMISOS: Permiso[] = [
  // 1 — Usuarios y ciclo de vida
  {
    clave: 'users:view',
    etiqueta: 'Ver listado y perfil de usuarios',
    categoria: 1,
    porDefecto: { S: 'si', A: 'si', C: 'restringido' },
    nota: { C: 'Su territorio' },
  },
  {
    clave: 'users:view_pii',
    etiqueta: 'Ver C.C., teléfono y correo sin enmascarar',
    categoria: 1,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
  },
  {
    clave: 'users:export',
    etiqueta: 'Exportar listados a CSV/Excel',
    categoria: 1,
    porDefecto: { S: 'si', A: 'si', C: 'restringido' },
    nota: { C: 'Solo nombre, sin PII' },
  },
  {
    clave: 'export:pii_data',
    etiqueta: 'Exportar con PII visible',
    categoria: 1,
    porDefecto: { S: 'si', A: 'restringido', C: 'no' },
    nota: { A: 'Condicionado' },
  },
  {
    clave: 'users:block',
    etiqueta: 'Bloquear y desbloquear usuarios',
    categoria: 1,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
    techoFijo: true,
  },
  {
    clave: 'users:request_block',
    etiqueta: 'Solicitar bloqueo de un usuario',
    categoria: 1,
    porDefecto: { S: 'no', A: 'no', C: 'solicitar' },
  },
  {
    clave: 'users:impersonate',
    etiqueta: 'Impersonar a un usuario',
    categoria: 1,
    porDefecto: { S: 'si', A: 'no', C: 'no' },
    techoFijo: true,
  },
  {
    clave: 'users:adjust_balance',
    etiqueta: 'Ajustar balances de Ágatas y estrellas',
    categoria: 1,
    porDefecto: { S: 'si', A: 'no', C: 'no' },
    techoFijo: true,
    dobleFirmaAlEjercer: true,
  },
  {
    clave: 'users:moderate_profile',
    etiqueta: 'Moderar perfil público (foto, alias)',
    categoria: 1,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
    sinConfirmar: true,
  },
  {
    clave: 'users:delete_account',
    etiqueta: 'Ejecutar eliminación de cuenta',
    categoria: 1,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
  },
  {
    clave: 'users:2fa_admin_enforce',
    etiqueta: 'Exigir y gestionar 2FA de cuentas administrativas',
    categoria: 1,
    porDefecto: { S: 'si', A: 'no', C: 'no' },
  },

  // 2 — Roles y permisos (la categoría que gobierna a PW-04)
  {
    clave: 'roles:assign',
    etiqueta: 'Asignar rol a una cuenta',
    categoria: 2,
    porDefecto: { S: 'si', A: 'restringido', C: 'no' },
    nota: { A: 'Solo roles inferiores al suyo' },
  },
  {
    clave: 'roles:revoke',
    etiqueta: 'Revocar el rol de una cuenta',
    categoria: 2,
    porDefecto: { S: 'si', A: 'restringido', C: 'no' },
    nota: { A: 'Solo roles inferiores al suyo' },
  },
  {
    clave: 'permissions:edit',
    etiqueta: 'Editar permisos individuales de una cuenta',
    categoria: 2,
    porDefecto: { S: 'si', A: 'no', C: 'no' },
    nota: { S: 'Doble Firma solo al ampliar (Q-1255)' },
  },
  {
    clave: 'roles:edit_template',
    etiqueta: 'Redefinir la plantilla por defecto de un rol completo',
    categoria: 2,
    porDefecto: { S: 'si', A: 'no', C: 'no' },
    dobleFirmaSiempre: true,
    dobleFirmaAlEjercer: true,
  },
  {
    clave: 'audit:view',
    etiqueta: 'Ver la trazabilidad de auditoría',
    categoria: 2,
    porDefecto: { S: 'si', A: 'no', C: 'no' },
  },
  {
    clave: 'accounts:create',
    etiqueta: 'Crear cuentas administrativas nuevas',
    categoria: 2,
    porDefecto: { S: 'no', A: 'no', C: 'no' },
    cesionIndividual: true,
    dobleFirmaSiempre: true,
  },
  {
    clave: 'permissions:grant',
    etiqueta: 'Ceder a otra cuenta un permiso propio',
    categoria: 2,
    porDefecto: { S: 'no', A: 'no', C: 'no' },
    cesionIndividual: true,
    dobleFirmaSiempre: true,
  },

  // 3 — Misiones y evidencias
  {
    clave: 'missions:create_global',
    etiqueta: 'Crear misiones globales',
    categoria: 3,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
  },
  {
    clave: 'missions:create_local',
    etiqueta: 'Crear misión local en su jurisdicción',
    categoria: 3,
    porDefecto: { S: 'si', A: 'si', C: 'restringido' },
    nota: { C: 'Queda pendiente de aprobación' },
  },
  {
    clave: 'missions:publish',
    etiqueta: 'Aprobar y publicar la misión de un Coordinador',
    categoria: 3,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
  },
  {
    clave: 'missions:edit_draft',
    etiqueta: 'Editar misión en borrador',
    categoria: 3,
    porDefecto: { S: 'si', A: 'si', C: 'restringido' },
    nota: { C: 'Solo las suyas' },
    sinConfirmar: true,
  },
  {
    clave: 'missions:pause_cancel',
    etiqueta: 'Pausar o cancelar una misión',
    categoria: 3,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
    techoFijo: true,
  },
  {
    clave: 'missions:request_pause_cancel',
    etiqueta: 'Solicitar pausa o cancelación de misión',
    categoria: 3,
    porDefecto: { S: 'no', A: 'no', C: 'solicitar' },
  },
  {
    clave: 'evidence:review',
    etiqueta: 'Revisar la cola de evidencias',
    categoria: 3,
    porDefecto: { S: 'restringido', A: 'restringido', C: 'restringido' },
    nota: { S: 'Muestreo del 15%', A: 'Muestreo del 15%', C: 'Su jurisdicción, 100%' },
  },
  {
    clave: 'evidence:approve_reject',
    etiqueta: 'Aprobar o rechazar evidencia con motivo tipificado',
    categoria: 3,
    porDefecto: { S: 'si', A: 'si', C: 'restringido' },
    nota: { C: 'Su jurisdicción' },
  },

  // 4 — Eventos y asistencia
  {
    clave: 'events:create_global',
    etiqueta: 'Crear eventos globales',
    categoria: 4,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
  },
  {
    clave: 'events:create_local',
    etiqueta: 'Crear evento local (publica sin aprobación)',
    categoria: 4,
    porDefecto: { S: 'si', A: 'si', C: 'si' },
  },
  {
    clave: 'events:edit',
    etiqueta: 'Editar evento propio no iniciado',
    categoria: 4,
    porDefecto: { S: 'si', A: 'si', C: 'si' },
  },
  {
    clave: 'events:cancel_pause',
    etiqueta: 'Cancelar o pausar un evento',
    categoria: 4,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
    techoFijo: true,
  },
  {
    clave: 'events:request_cancel',
    etiqueta: 'Solicitar cancelación de evento',
    categoria: 4,
    porDefecto: { S: 'no', A: 'no', C: 'solicitar' },
  },
  {
    clave: 'events:checkin_manual',
    etiqueta: 'Check-in manual por cédula',
    categoria: 4,
    porDefecto: { S: 'si', A: 'si', C: 'si' },
    sinConfirmar: true,
  },

  // 5 — Recompensas, catálogo e inventario
  {
    clave: 'rewards:create',
    etiqueta: 'Crear recompensas del catálogo',
    categoria: 5,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
  },
  {
    clave: 'rewards:deliver',
    etiqueta: 'Entregar recompensa por QR de canje',
    categoria: 5,
    porDefecto: { S: 'no', A: 'no', C: 'restringido' },
    nota: { C: 'Su municipio' },
  },
  {
    clave: 'rewards:cancel_refund',
    etiqueta: 'Cancelar o reembolsar un canje',
    categoria: 5,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
    sinConfirmar: true,
  },
  {
    clave: 'inventory:edit_global',
    etiqueta: 'Modificar el inventario global',
    categoria: 5,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
  },
  {
    clave: 'inventory:report_local',
    etiqueta: 'Reportar stock local',
    categoria: 5,
    porDefecto: { S: 'no', A: 'no', C: 'si' },
  },

  // 6 — Economía
  {
    clave: 'economy:adjust_manual',
    etiqueta: 'Ajuste manual del Grifo Económico',
    categoria: 6,
    porDefecto: { S: 'si', A: 'no', C: 'no' },
    dobleFirmaAlEjercer: true,
  },
  {
    clave: 'economy:view_ledger',
    etiqueta: 'Ver el ledger de Ágatas',
    categoria: 6,
    porDefecto: { S: 'si', A: 'si', C: 'restringido' },
    nota: { C: 'Su territorio, agregado' },
    sinConfirmar: true,
  },

  // 7 — Rankings
  {
    clave: 'rankings:view_internal',
    etiqueta: 'Ver el desglose no opaco del puntaje compuesto',
    categoria: 7,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
    sinConfirmar: true,
  },
  {
    clave: 'rankings:exclude_user',
    etiqueta: 'Excluir a un usuario del ranking',
    categoria: 7,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
  },

  // 8 — Referidos y red de crecimiento
  {
    clave: 'referrals:reassign',
    etiqueta: 'Reasignar un referido',
    categoria: 8,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
    sinConfirmar: true,
  },
  {
    clave: 'referrals:view_tree',
    etiqueta: 'Ver el árbol de referidos',
    categoria: 8,
    porDefecto: { S: 'si', A: 'si', C: 'restringido' },
    nota: { C: 'Su rama territorial, solo lectura' },
    sinConfirmar: true,
  },
  {
    clave: 'referrals:antifraud_review',
    etiqueta: 'Revisar señales antifraude de la red',
    categoria: 8,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
    sinConfirmar: true,
  },

  // 9 — Encuestas y formularios
  {
    clave: 'surveys:create',
    etiqueta: 'Crear encuestas y formularios',
    categoria: 9,
    porDefecto: { S: 'si', A: 'si', C: 'si' },
  },
  {
    clave: 'surveys:view_results',
    etiqueta: 'Ver resultados de encuestas',
    categoria: 9,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
    bloqueoLegal: true,
    sinConfirmar: true,
  },

  // 10 — Contenido
  {
    clave: 'content:edit_strings',
    etiqueta: 'Editar el copy fijo de la app (app_strings)',
    categoria: 10,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
    sinConfirmar: true,
  },

  // 11 — Seguridad y antifraude
  {
    clave: 'antifraud:view_signals',
    etiqueta: 'Ver señales de fraude',
    categoria: 11,
    porDefecto: { S: 'si', A: 'si', C: 'restringido' },
    nota: { C: 'Su jurisdicción' },
    sinConfirmar: true,
  },
  {
    clave: 'antifraud:override',
    etiqueta: 'Revertir una marca de fraude',
    categoria: 11,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
    sinConfirmar: true,
  },

  // 12 — Notificaciones
  {
    clave: 'notifications:send_massive',
    etiqueta: 'Enviar notificaciones masivas departamentales',
    categoria: 12,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
  },
  {
    clave: 'notifications:request_massive',
    etiqueta: 'Solicitar un envío masivo',
    categoria: 12,
    porDefecto: { S: 'no', A: 'no', C: 'solicitar' },
  },

  // 13 — Configuración global
  {
    clave: 'system:edit_global_params',
    etiqueta: 'Editar parámetros globales del sistema',
    categoria: 13,
    porDefecto: { S: 'si', A: 'no', C: 'no' },
    dobleFirmaAlEjercer: true,
  },
  {
    clave: 'reports:export',
    etiqueta: 'Exportar reportes',
    categoria: 13,
    porDefecto: { S: 'si', A: 'si', C: 'no' },
  },
]

const POR_CLAVE = new Map(PERMISOS.map((p) => [p.clave, p]))

export function permisoPorClave(clave: string): Permiso | undefined {
  return POR_CLAVE.get(clave)
}

// Un estado por defecto concede el permiso salvo que sea 'no'. 'solicitar' sí lo concede:
// el Coordinador realmente puede pedir el bloqueo, es una capacidad suya, no una negación.
export function concede(estado: EstadoDefault): boolean {
  return estado !== 'no'
}

/*
  La plantilla del rol se DERIVA del catálogo, nunca se escribe a mano — si las dos listas
  vivieran separadas, tarde o temprano dirían cosas distintas y el editor de permisos
  mostraría un default que el backend no reconoce.

  M02 Q-0050: "el rol es la plantilla de permisos por defecto, no una garantía fija".
*/
export function plantillaDe(rol: Rol): Record<string, boolean> {
  const plantilla: Record<string, boolean> = {}
  for (const permiso of PERMISOS) {
    // Los de cesión individual no son plantilla de ningún rol (PW-04): nacen apagados
    // aunque la columna del catálogo diga otra cosa.
    plantilla[permiso.clave] = permiso.cesionIndividual ? false : concede(permiso.porDefecto[rol])
  }
  return plantilla
}

export function permisosDeCategoria(numero: number): Permiso[] {
  return PERMISOS.filter((p) => p.categoria === numero)
}
