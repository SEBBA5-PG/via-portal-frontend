/*
  Entidades operativas compartidas por PW-03 y PW-05 en el demo: lo que un Coordinador
  Territorial pide en vez de ejecutar, los ajustes de balance que esperan Doble Firma y la
  sesión de impersonación en curso. Ninguna de estas tres tiene esquema en la bóveda; son la
  forma mínima para que las pantallas funcionen.
*/

export type TipoSolicitudOperacion = 'bloqueo' | 'pausa' | 'cancelacion'

export const TIPOS_SOLICITUD_OPERACION: Record<TipoSolicitudOperacion, string> = {
  bloqueo: 'Bloqueo de usuario',
  pausa: 'Pausa de misión',
  cancelacion: 'Cancelación de misión',
}

// wiki: el Coordinador "no pausa ni cancela ninguna misión por sí mismo" y solo solicita
// bloqueos. Una solicitud la atiende un Administrador o Superadministrador.
export interface SolicitudOperacion {
  id: string
  tipo: TipoSolicitudOperacion
  // usuario de la app (bloqueo) o misión (pausa/cancelación)
  objetivoId: string
  solicitanteId: string
  motivo: string
  nota: string
  timestamp: number
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  resolutorId?: string
  motivoRechazo?: string
}

// users:adjust_balance — techo fijo de Superadministrador, "con Doble Firma" al ejercerlo.
export interface AjusteBalance {
  id: string
  usuarioId: string
  makerId: string
  delta: number
  motivo: string
  timestamp: number
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  checkerId?: string
}

export interface Impersonacion {
  actorId: string
  usuarioId: string
  inicio: number
}

const HORA = 3_600_000
const AHORA = new Date('2026-09-12T09:00:00').getTime()

export const SOLICITUDES_OPERACION_SEED: SolicitudOperacion[] = [
  {
    id: 'so-01',
    tipo: 'bloqueo',
    objetivoId: 'ua-04',
    solicitanteId: 'u-coordinador',
    motivo: 'Posible cuenta duplicada',
    nota: 'Comparte dispositivo con carlitos.m, que ya está bajo auditoría.',
    timestamp: AHORA - 6 * HORA,
    estado: 'pendiente',
  },
  {
    id: 'so-02',
    tipo: 'cancelacion',
    objetivoId: 'm-02',
    solicitanteId: 'u-coordinador',
    motivo: 'Riesgo de seguridad en el territorio',
    nota: 'Hubo disturbios en dos de las manzanas del barrido.',
    timestamp: AHORA - 3 * HORA,
    estado: 'pendiente',
  },
]
