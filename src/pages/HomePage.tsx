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
import { usuariosVisiblesPara } from '../dominio/usuarios'
import {
  formatoEntero,
  formatoTendenciaPct,
  promedioIngresoSemanal,
  resumenPorPlaya,
  resumenPorTerritorio,
} from '../dominio/metricas'
import { nombrePlaya } from '../data/usuariosApp'
import { useOperacion } from '../state/operacionStore'

// Barrita de proporción para los desgloses de "Dónde están tus usuarios" — mismo elemento
// para territorio y para Playa, así se repite igual de fila en fila.
function FilaBarra({ etiqueta, valor, maximo }: { etiqueta: string; valor: number; maximo: number }) {
  const ancho = maximo > 0 && valor > 0 ? Math.max((valor / maximo) * 100, 3) : 0
  return (
    <li className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-xs text-grafito/85" title={etiqueta}>
        {etiqueta}
      </span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
        <span className="block h-full rounded-full bg-primario" style={{ width: `${ancho}%` }} />
      </span>
      <span className="w-9 shrink-0 text-right font-mono text-xs text-texto-suave">{formatoEntero(valor)}</span>
    </li>
  )
}

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

  Las tarjetas de usuarios (`usuarios_total`, `usuarios_nuevos`) SÍ son reales: se calculan
  sobre `USUARIOS_APP_SEED` (dominio/metricas.ts), respetando el mismo TerritorialScope que
  PW-03 — un Coordinador ve su territorio, no el Huila entero. El resto sigue siendo cifra de
  demo: qué KPIs son obligatorios para el MVP, cuáles van en tiempo real y cuál es la fuente
  de verdad de cada uno sigue ABIERTO en M16 (Q-0631/Q-0633/Q-0635).

  El panel "Dónde están tus usuarios" de más abajo estira un poco el "sin gráficos" de
  PW-02 — un desglose con barritas no es un número suelto —, pero tampoco es la analítica
  de series de tiempo y comparativas de PW-17. Vive aquí porque es lo que se pidió para
  arrancar; si el home crece, esto es candidato a moverse a su propia vista.
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

const KPIS_ESTATICOS: Kpi[] = [
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

  const puedeVerUsuarios = cuenta ? tienePermiso(cuenta, 'users:view') : false
  const usuariosEnAlcance = useMemo(
    () => (cuenta && puedeVerUsuarios ? usuariosVisiblesPara(cuenta, op.usuarios) : []),
    [cuenta, puedeVerUsuarios, op.usuarios],
  )
  const { promedioSemanal, tendenciaPct } = useMemo(
    () => promedioIngresoSemanal(usuariosEnAlcance),
    [usuariosEnAlcance],
  )
  const territorial = useMemo(() => resumenPorTerritorio(usuariosEnAlcance), [usuariosEnAlcance])
  const porPlaya = useMemo(() => resumenPorPlaya(usuariosEnAlcance), [usuariosEnAlcance])
  const maximoPorPlaya = Math.max(1, ...porPlaya.map((f) => f.total))
  const maximoPorTerritorio = territorial.filas[0]?.total ?? 1

  const kpisUsuarios: Kpi[] = useMemo(
    () =>
      puedeVerUsuarios
        ? [
            {
              clave: 'usuarios_total',
              permiso: 'users:view',
              etiqueta: 'Total de usuarios',
              valor: formatoEntero(usuariosEnAlcance.length),
              tendencia: formatoTendenciaPct(tendenciaPct),
              destino: '/PW-03',
            },
            {
              clave: 'usuarios_nuevos',
              permiso: 'users:view',
              etiqueta: 'Nuevos usuarios (prom. semanal)',
              valor: formatoEntero(promedioSemanal),
              tendencia: formatoTendenciaPct(tendenciaPct),
              destino: '/PW-03',
            },
          ]
        : [],
    [puedeVerUsuarios, usuariosEnAlcance.length, promedioSemanal, tendenciaPct],
  )

  const visibles = useMemo(
    () => (cuenta ? [...kpisUsuarios, ...KPIS_ESTATICOS.filter((kpi) => tienePermiso(cuenta, kpi.permiso))] : []),
    [cuenta, kpisUsuarios],
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

        {puedeVerUsuarios && usuariosEnAlcance.length > 0 && (
          <Superficie>
            <CabeceraSuperficie
              titulo="Dónde están tus usuarios"
              descripcion={`${describirAlcance(cuenta!.territorioIds)} · el listado con filtros y exportación vive en Usuarios de la app; la analítica profunda con series de tiempo es PW-17, todavía sin construir.`}
            />
            <div className="grid gap-x-8 gap-y-6 px-6 py-5 sm:grid-cols-2">
              <div>
                <p className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-texto-suave">
                  Por territorio
                </p>
                <ul className="flex flex-col gap-2.5">
                  {territorial.filas.map((fila) => (
                    <FilaBarra key={fila.territorioId} etiqueta={fila.nombre} valor={fila.total} maximo={maximoPorTerritorio} />
                  ))}
                </ul>
                {territorial.otros > 0 && (
                  <p className="mt-2.5 text-xs text-texto-suave">
                    +{formatoEntero(territorial.otros)} usuarios en otros municipios
                  </p>
                )}
              </div>
              <div>
                <p className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-texto-suave">
                  Por Playa
                </p>
                <ul className="flex flex-col gap-2.5">
                  {porPlaya.map((fila) => (
                    <FilaBarra key={fila.playa} etiqueta={nombrePlaya(fila.playa)} valor={fila.total} maximo={maximoPorPlaya} />
                  ))}
                </ul>
              </div>
            </div>
          </Superficie>
        )}

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
