import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Superficie, CabeceraSuperficie } from '../components/ui/Superficie'
import { useAuth } from '../state/authStore'
import { useAdmin } from '../state/adminStore'
import { ROLES } from '../data/roles'
import { describirAlcance } from '../data/territorios'
import { pendientesParaFirmar, tienePermiso } from '../dominio/permisos'
import { puedeAprobar } from '../dominio/misiones'
import { useOperacion } from '../state/operacionStore'

function formatoRestante(ms: number): string {
  const horas = Math.floor(ms / 3_600_000)
  const minutos = Math.floor((ms % 3_600_000) / 60_000)
  return `${horas}h ${minutos}m`
}

/*
  Home. PW-02 fija la regla que gobierna esta pantalla:

    "el filtro es por PERMISO INDIVIDUAL del usuario, no por rol [...] dos usuarios con el
     mismo rol pueden ver un home distinto. El home nunca es una plantilla fija con tarjetas
     ocultas por rol: se compone en tiempo de carga según los permisos efectivos de la sesión."

  Y su alcance: "solo tarjetas KPI livianas (número + tendencia, sin gráficos ni filtros)" —
  la analítica profunda vive en PW-17/M16, no aquí.

  Las cifras de las tarjetas son de demo. Qué KPIs son obligatorios para el MVP, cuáles van
  en tiempo real y cuál es la fuente de verdad de cada uno sigue ABIERTO en M16
  (Q-0631/Q-0633/Q-0635) — inventar números definitivos aquí sería fabricar decisión.
*/

interface Kpi {
  clave: string
  // Permiso del que cuelga la tarjeta: hereda el permiso de la categoría de la que saca el dato.
  permiso: string
  etiqueta: string
  valor: string
  tendencia?: string
  destino: string
}

const KPIS: Kpi[] = [
  { clave: 'usuarios', permiso: 'users:view', etiqueta: 'Usuarios activos', valor: '48 210', tendencia: '+3,1% semanal', destino: '/PW-03' },
  { clave: 'evidencias', permiso: 'evidence:review', etiqueta: 'Evidencias en cola', valor: '312', tendencia: '−18 hoy', destino: '/PW-06' },
  { clave: 'eventos', permiso: 'events:create_local', etiqueta: 'Eventos esta semana', valor: '27', destino: '/PW-07' },
  { clave: 'canjes', permiso: 'rewards:create', etiqueta: 'Canjes pendientes de entrega', valor: '94', destino: '/PW-08' },
  { clave: 'ledger', permiso: 'economy:view_ledger', etiqueta: 'Ágatas emitidas hoy', valor: '1,2 M', tendencia: 'dentro del CAP', destino: '/PW-09' },
  { clave: 'fraude', permiso: 'antifraud:view_signals', etiqueta: 'Señales de fraude abiertas', valor: '6', destino: '/PW-15' },
]

export function HomePage() {
  const auth = useAuth()
  const admin = useAdmin()
  const op = useOperacion()
  const navigate = useNavigate()
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const user = auth.usuarioActual
  const cuenta = user ? admin.cuentaPorId(user.id) : undefined

  const visibles = useMemo(
    () => (cuenta ? KPIS.filter((kpi) => tienePermiso(cuenta, kpi.permiso)) : []),
    [cuenta],
  )
  const porFirmar = useMemo(
    () => (cuenta ? pendientesParaFirmar(admin.solicitudes, cuenta) : []),
    [cuenta, admin.solicitudes],
  )

  if (!user || !auth.sesion) return null

  const misionesPorAprobar = cuenta ? op.misiones.filter((m) => puedeAprobar(cuenta, m)).length : 0

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-grafito">
            Hola, {user.nombre.split(' ')[0]}
          </h1>
          <p className="mt-1.5 text-sm text-texto-suave">
            {ROLES[user.rol]}
            {cuenta && <> · {describirAlcance(cuenta.territorioIds)}</>} · sesión activa por{' '}
            {formatoRestante(auth.sesion.expiraEn - ahora)}
          </p>
        </header>

        {porFirmar.length > 0 && (
          <Superficie className="flex flex-wrap items-center justify-between gap-4 border-ambar/25 px-6 py-5">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-heading text-base font-extrabold text-grafito">
                <Badge tono="alerta">{porFirmar.length}</Badge>
                Ampliaciones de permiso esperan tu firma
              </p>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-texto-suave">
                Son cambios que otro Superadministrador propuso y no puede aprobar por su cuenta.
                Mientras esperan, las cuentas afectadas siguen operando con su valor anterior.
              </p>
            </div>
            <Button variante="ejecutivo" onClick={() => navigate('/PW-04/solicitudes')}>
              Revisar
            </Button>
          </Superficie>
        )}

        {misionesPorAprobar > 0 && (
          <Superficie className="flex flex-wrap items-center justify-between gap-4 border-primario/25 px-6 py-5">
            <p className="flex items-center gap-2 font-heading text-base font-extrabold text-grafito">
              <Badge tono="pendiente">{misionesPorAprobar}</Badge>
              Misiones de Coordinadores esperan aprobación
            </p>
            <Button variante="ejecutivo" onClick={() => navigate('/PW-05')}>
              Ver misiones
            </Button>
          </Superficie>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((kpi) => (
            <Link
              key={kpi.clave}
              to={kpi.destino}
              className="rounded-[18px] outline-none focus-visible:ring-4 focus-visible:ring-ambar/40"
            >
              <Superficie className="h-full px-6 py-5 transition-colors hover:bg-surface-sunken">
                <p className="text-xs font-bold uppercase tracking-wide text-texto-suave">
                  {kpi.etiqueta}
                </p>
                <p className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-grafito">
                  {kpi.valor}
                </p>
                {kpi.tendencia && <p className="mt-1 text-xs text-primario">{kpi.tendencia}</p>}
              </Superficie>
            </Link>
          ))}
        </div>

        <Superficie>
          <CabeceraSuperficie
            titulo="Estado del portal"
            descripcion="PW-01 (Acceso y sesión) y PW-04 (Roles y permisos) están construidos. El resto de las categorías se levantan una por una; el menú ya refleja la Matriz de Acceso por Rol real para tu perfil."
          />
          <div className="flex flex-wrap gap-3 px-6 py-5">
            {/* PW-04 está Oculto para Coordinador Territorial: no se enlaza desde aquí
                tampoco. Ofrecer el atajo y que la ruta lo rebote sería el mismo error que
                ocultar en el menú sin denegar en el servidor, al revés. */}
            {user.rol !== 'C' && (
              <Button variante="ejecutivo-suave" onClick={() => navigate('/PW-04')}>
                Ir a Roles y permisos
              </Button>
            )}
            <Button variante="ejecutivo-suave" onClick={() => navigate('/sesion-expirada')}>
              Ver: sesión expirada
            </Button>
            <Button
              variante="ejecutivo-suave"
              onClick={() => navigate('/bloqueado', { state: { hasta: Date.now() + 15_000 } })}
            >
              Ver: bloqueo por intentos
            </Button>
            <Button
              variante="ejecutivo-suave"
              onClick={() =>
                navigate('/sin-permiso', { state: { categoriaNombre: 'Configuración global del sistema' } })
              }
            >
              Ver: acceso denegado
            </Button>
            <Button
              variante="ejecutivo-suave"
              onClick={() => {
                admin.reiniciarDemo()
                op.reiniciarOperacion()
              }}
            >
              Reiniciar datos del demo
            </Button>
          </div>
        </Superficie>
      </div>
    </AppShell>
  )
}
