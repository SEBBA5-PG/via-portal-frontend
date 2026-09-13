import type { Rol } from './roles'

/*
  `audit_logs` — registro inmutable. wiki/Actores, Roles y Permisos §Auditoría:

    "Toda modificación de rol o de permisos individuales —automática (Motor del Juego,
     actor_id: SYSTEM) o manual— se registra de forma inmutable en audit_logs: actor,
     usuario afectado, estado anterior/nuevo, timestamp, IP y motivo."

  Dos tipos de evento, no uno. Redefinir la plantilla de un rol (`roles:edit_template`,
  Q-1254) "genera su propio tipo de evento — no tiene 'un afectado' sino un ROL afectado".
  Por eso `cuentaAfectadaId` y `rolAfectado` son excluyentes entre sí.
*/

export type TipoEvento =
  | 'cambio_permiso'
  | 'cambio_plantilla_rol'
  | 'cambio_rol'
  | 'cuenta_creada'
  | 'cuenta_desactivada'
  | 'solicitud_creada'
  | 'solicitud_aprobada'
  | 'solicitud_rechazada'
  // PW-03 — usuarios de la app
  | 'usuario_bloqueado'
  | 'usuario_desbloqueado'
  | 'bloqueo_solicitado'
  | 'alias_moderado'
  | 'usuario_eliminado'
  | 'usuarios_fusionados'
  | 'impersonacion_inicio'
  | 'impersonacion_fin'
  | 'ajuste_balance_propuesto'
  | 'ajuste_balance_resuelto'
  // PW-05 — misiones
  | 'mision_guardada'
  | 'mision_enviada'
  | 'mision_publicada'
  | 'mision_rechazada'
  | 'mision_pausada'
  | 'mision_reanudada'
  | 'mision_cancelada'
  | 'mision_nueva_version'
  | 'solicitud_operacion'
  | 'solicitud_operacion_resuelta'

export const ETIQUETA_EVENTO: Record<TipoEvento, string> = {
  cambio_permiso: 'Permiso modificado',
  cambio_plantilla_rol: 'Plantilla de rol redefinida',
  cambio_rol: 'Rol reasignado',
  cuenta_creada: 'Cuenta creada',
  cuenta_desactivada: 'Cuenta desactivada',
  solicitud_creada: 'Ampliación enviada a aprobación',
  solicitud_aprobada: 'Ampliación aprobada',
  solicitud_rechazada: 'Ampliación rechazada',
  usuario_bloqueado: 'Usuario bloqueado',
  usuario_desbloqueado: 'Usuario desbloqueado',
  bloqueo_solicitado: 'Bloqueo solicitado',
  alias_moderado: 'Alias moderado',
  usuario_eliminado: 'Cuenta eliminada (soft delete)',
  usuarios_fusionados: 'Cuentas fusionadas',
  impersonacion_inicio: 'Inicio de impersonación',
  impersonacion_fin: 'Fin de impersonación',
  ajuste_balance_propuesto: 'Ajuste de balance propuesto',
  ajuste_balance_resuelto: 'Ajuste de balance resuelto',
  mision_guardada: 'Misión guardada',
  mision_enviada: 'Misión enviada a aprobación',
  mision_publicada: 'Misión publicada',
  mision_rechazada: 'Misión rechazada',
  mision_pausada: 'Misión pausada',
  mision_reanudada: 'Misión reanudada',
  mision_cancelada: 'Misión cancelada',
  mision_nueva_version: 'Nueva versión de misión',
  solicitud_operacion: 'Solicitud de Coordinador',
  solicitud_operacion_resuelta: 'Solicitud de Coordinador resuelta',
}

export interface EntradaAuditoria {
  id: string
  tipo: TipoEvento
  // `null` = SYSTEM (Motor del Juego). En PW-04 siempre hay actor humano, pero el campo
  // existe porque la wiki lo exige para el resto del sistema.
  actorId: string | null
  cuentaAfectadaId?: string
  // Solo en `cambio_plantilla_rol`: el afectado es un rol entero, no una persona.
  rolAfectado?: Rol
  permisoClave?: string
  valorAnterior?: boolean
  valorNuevo?: boolean
  motivo?: string
  // Si la entrada se aplicó sola o tras un segundo firmante — Q-1255 pide explícitamente
  // que `audit_logs` distinga los dos casos.
  conDobleFirma: boolean
  checkerId?: string
  // Afectados fuera de PW-04: un usuario de la app (PW-03) o una misión (PW-05).
  usuarioAppId?: string
  misionId?: string
  detalle?: string
  // La impersonación es de severidad alta (wiki §Auditoría, `impersonation_logs`).
  severidad?: 'normal' | 'alta'
  ip: string
  timestamp: number
}

export type NuevaEntradaAuditoria = Omit<EntradaAuditoria, 'id' | 'timestamp' | 'ip'>

const DIA = 86_400_000
const AHORA = new Date('2026-09-12T09:00:00').getTime()

export const AUDITORIA_SEED: EntradaAuditoria[] = [
  {
    id: 'a-001',
    tipo: 'cuenta_creada',
    actorId: 'u-superadmin',
    cuentaAfectadaId: 'c-nueva',
    conDobleFirma: false,
    ip: '190.24.10.55',
    timestamp: AHORA - 2 * DIA,
  },
  {
    id: 'a-002',
    tipo: 'cambio_permiso',
    actorId: 'u-superadmin',
    cuentaAfectadaId: 'c-diana',
    permisoClave: 'users:view_pii',
    valorAnterior: false,
    valorNuevo: true,
    motivo: 'Verificación de identidad en jornadas de Medellín.',
    conDobleFirma: true,
    checkerId: 'c-candidato',
    ip: '190.24.10.55',
    timestamp: AHORA - 11 * DIA,
  },
  {
    id: 'a-003',
    tipo: 'cambio_permiso',
    actorId: 'u-superadmin',
    cuentaAfectadaId: 'c-candidato',
    permisoClave: 'system:edit_global_params',
    valorAnterior: true,
    valorNuevo: false,
    motivo: 'La cuenta no ejerce funciones técnicas.',
    // Reducción: se aplicó sola, sin segundo firmante (Q-1255).
    conDobleFirma: false,
    ip: '190.24.10.55',
    timestamp: AHORA - 103 * DIA,
  },
  {
    id: 'a-004',
    tipo: 'cuenta_desactivada',
    actorId: 'u-superadmin',
    cuentaAfectadaId: 'c-paula',
    motivo: 'Fin de vinculación. Desactivación lógica, sin borrado físico.',
    conDobleFirma: false,
    ip: '190.24.10.55',
    timestamp: AHORA - 28 * DIA,
  },
  {
    id: 'a-005',
    tipo: 'cambio_plantilla_rol',
    actorId: 'c-root',
    rolAfectado: 'C',
    permisoClave: 'events:create_local',
    valorAnterior: false,
    valorNuevo: true,
    motivo: 'Los coordinadores pasan a publicar eventos locales sin aprobación previa.',
    conDobleFirma: true,
    checkerId: 'u-superadmin',
    ip: '190.24.10.9',
    timestamp: AHORA - 140 * DIA,
  },
]

export function formatoFecha(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatoFechaHora(timestamp: number): string {
  return new Date(timestamp).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
