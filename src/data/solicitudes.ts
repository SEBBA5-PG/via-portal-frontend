/*
  `solicitudes_de_permiso` — la entidad que nace con PW-04 Q-1255 (2026-09-12).

  Antes de Q-1255 la Doble Firma era todo-o-nada por acción: se aprobaba "la edición".
  Ahora se evalúa PERMISO POR PERMISO dentro de una misma edición, así que hace falta una
  fila por permiso ampliado, no una por edición. De ahí esta tabla.

  Las seis columnas son literalmente las que enumera Q-1255 (maker, permiso, cuenta
  objetivo, timestamp, estado, checker). El resto de este archivo es lo mínimo para que la
  bandeja funcione en el demo — advertencia: `solicitudes_de_permiso` todavía NO está
  modelada ni en la wiki ni en PW-16, así que nada de esto está respaldado por una decisión
  cerrada más allá de esas seis columnas.
*/

export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada'

export interface SolicitudPermiso {
  id: string
  // Quien propone el cambio (Maker). Siempre un Superadministrador: `permissions:edit` no
  // usa el patrón habitual de Administrador solicita → Superadministrador aprueba.
  makerId: string
  cuentaObjetivoId: string
  permisoClave: string
  // Siempre `true` en la práctica: solo las AMPLIACIONES llegan aquí. Las reducciones se
  // aplican de inmediato y nunca crean una solicitud (Q-1255).
  valorNuevo: boolean
  // Valor vigente mientras la solicitud está pendiente. La UI tiene que poder decir "qué
  // valor rige mientras tanto" sin recalcularlo (Reglas Transversales de UI §Doble Firma).
  valorVigente: boolean
  motivo: string
  timestamp: number
  estado: EstadoSolicitud
  checkerId?: string
  fechaResolucion?: number
  motivoRechazo?: string
}

const DIA = 86_400_000
// Fecha de referencia del demo (2026-09-12) para que las solicitudes semilla no envejezcan
// de forma rara según cuándo se abra el navegador.
const AHORA = new Date('2026-09-12T09:00:00').getTime()

export const SOLICITUDES_SEED: SolicitudPermiso[] = [
  {
    id: 's-001',
    makerId: 'u-superadmin',
    cuentaObjetivoId: 'c-diana',
    permisoClave: 'export:pii_data',
    valorNuevo: true,
    valorVigente: false,
    motivo: 'Necesita exportar el censo de Medellín con cédula para el cruce con la registraduría.',
    timestamp: AHORA - 2 * DIA,
    estado: 'pendiente',
  },
  {
    id: 's-002',
    makerId: 'u-superadmin',
    cuentaObjetivoId: 'c-jorge',
    permisoClave: 'users:2fa_admin_enforce',
    valorNuevo: true,
    valorVigente: false,
    motivo: 'Va a liderar el endurecimiento de acceso del equipo de Antioquia.',
    timestamp: AHORA - 5 * 3_600_000,
    estado: 'pendiente',
  },
  {
    id: 's-003',
    makerId: 'c-candidato',
    cuentaObjetivoId: 'c-ricardo',
    permisoClave: 'audit:view',
    valorNuevo: true,
    valorVigente: false,
    motivo: 'Revisión trimestral de trazabilidad.',
    timestamp: AHORA - 9 * DIA,
    estado: 'rechazada',
    checkerId: 'u-superadmin',
    fechaResolucion: AHORA - 8 * DIA,
    motivoRechazo:
      'La cuenta no registra acceso desde marzo. Revisar primero si sigue activa antes de ampliarle nada.',
  },
  {
    id: 's-004',
    makerId: 'u-superadmin',
    cuentaObjetivoId: 'c-jorge',
    permisoClave: 'economy:adjust_manual',
    valorNuevo: true,
    valorVigente: false,
    motivo: 'Cierre económico de la campaña de Antioquia.',
    timestamp: AHORA - 22 * DIA,
    estado: 'aprobada',
    checkerId: 'c-candidato',
    fechaResolucion: AHORA - 21 * DIA,
  },
]
