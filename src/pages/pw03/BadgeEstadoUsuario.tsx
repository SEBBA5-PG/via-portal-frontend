import { Badge, type TonoBadge } from '../../components/ui/Badge'
import { ESTADOS_CUENTA_APP, type EstadoCuentaApp } from '../../data/usuariosApp'

const TONO: Record<EstadoCuentaApp, TonoBadge> = {
  provisional: 'pendiente',
  activa: 'exito',
  inactiva: 'neutro',
  bajo_auditoria: 'alerta',
  bloqueada: 'peligro',
  eliminada: 'neutro',
}

export function BadgeEstadoUsuario({ estado }: { estado: EstadoCuentaApp }) {
  return <Badge tono={TONO[estado]}>{ESTADOS_CUENTA_APP[estado]}</Badge>
}
