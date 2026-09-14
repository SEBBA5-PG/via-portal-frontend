import { Badge, type TonoBadge } from '../../components/ui/Badge'
import { Superficie } from '../../components/ui/Superficie'
import { ESTADOS_MISION, tiempoRestante, type EstadoMision, type Familia, type Mision } from '../../data/misiones'
import { describirAlcance } from '../../data/territorios'

const TONO: Record<EstadoMision, TonoBadge> = {
  borrador: 'neutro',
  pendiente_aprobacion: 'pendiente',
  publicada: 'exito',
  pausada: 'alerta',
  agotada: 'info',
  finalizada: 'neutro',
  cancelada: 'peligro',
}

export function BadgeEstadoMision({ estado }: { estado: EstadoMision }) {
  return <Badge tono={TONO[estado]}>{ESTADOS_MISION[estado]}</Badge>
}

function IconoFamilia({ familia }: { familia: Familia }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-11 shrink-0 place-items-center rounded-[14px] border border-borde bg-primario/[0.12] text-primario"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {familia === 'digital' && (
          <>
            <rect x="5" y="2.5" width="10" height="15" rx="2" />
            <path d="M9 14.5h2" />
          </>
        )}
        {familia === 'territorial' && (
          <>
            <path d="M10 17.5s5-4.6 5-8.5a5 5 0 1 0-10 0c0 3.9 5 8.5 5 8.5z" />
            <circle cx="10" cy="9" r="1.8" />
          </>
        )}
        {familia === 'sistema' && (
          <>
            <circle cx="10" cy="10" r="6.5" />
            <path d="M10 6.5V10l2.5 1.5" />
          </>
        )}
      </svg>
    </span>
  )
}

/*
  La tarjeta tal como la ve el usuario en la app (ESQ §Tarjeta): ícono por familia, nombre,
  ubicación (solo territorial), recompensa, tiempo restante y cupo disponible (solo si
  requiere cupo). Se reutiliza en la vista previa del wizard y en la pantalla de aprobación,
  que ESQ pide "idéntica a la tarjeta".
*/
export function TarjetaMision({ mision, ahora }: { mision: Mision; ahora: number }) {
  const territorio = mision.territorioIds.length > 0 ? describirAlcance(mision.territorioIds) : null
  return (
    <Superficie className="flex gap-4 px-5 py-5">
      <IconoFamilia familia={mision.familia} />
      <div className="min-w-0 flex-1">
        <p className="font-heading text-base font-extrabold leading-snug text-grafito">
          {mision.nombre || 'Misión sin nombre'}
        </p>
        {mision.familia === 'territorial' && (
          <p className="mt-0.5 text-xs text-texto-suave">{territorio ?? 'Ubicación por definir'}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tono="alerta">{mision.recompensaAgatas} Ágatas</Badge>
          <Badge tono="neutro">{tiempoRestante(mision.expiracion, ahora)}</Badge>
          {mision.requiereCupo && mision.cupoMaximo !== null && (
            <Badge tono="info">
              {Math.max(0, mision.cupoMaximo - mision.inscritos)} cupos de {mision.cupoMaximo}
            </Badge>
          )}
        </div>
      </div>
    </Superficie>
  )
}
