import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Superficie, CabeceraSuperficie } from '../components/ui/Superficie'
import { MapaCalorHuila } from '../components/MapaCalorHuila'
import { useAuth } from '../state/authStore'
import { useAdmin } from '../state/adminStore'
import { ROLES } from '../data/roles'
import { describirAlcance } from '../data/territorios'
import { pendientesParaFirmar, tienePermiso } from '../dominio/permisos'
import { puedeAprobar } from '../dominio/misiones'
import { formatoEntero, formatoTendenciaPct } from '../dominio/metricas'
import { nombrePlaya } from '../data/usuariosApp'
import { obtenerResumenUsuariosApp, type ResumenUsuariosApp } from '../lib/usuariosAppApi'
import { useOperacion } from '../state/operacionStore'

// Paleta de las Playas del embudo (1 = Achira, más gente → 7 = Huila, menos gente): un
// degradado propio, no el color primario del portal, para no confundir "Playa" con "estado".
const COLORES_PLAYA = ['#c7f0dc', '#a3e4c4', '#7fd7ac', '#5bc394', '#3fae7f', '#2b8f68', '#1c7354']

function EtiquetaEje({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" className="fill-grafito/85 text-[11px]">
      {payload?.value}
    </text>
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

  Las tarjetas de usuarios (`usuarios_total`, `usuarios_nuevos`) y el panel de más abajo SÍ son
  reales: vienen de conexion-api (GET /api/app/usuarios/resumen, conexión 'app' → app_db), no
  de un mock local. Ese endpoint TODAVÍA no aplica TerritorialScope (a diferencia de PW-03) —
  un Coordinador Territorial ve el Huila entero aquí hasta que esa regla se porte al servidor.
  El resto sigue siendo cifra de demo: qué KPIs son obligatorios para el MVP, cuáles van en
  tiempo real y cuál es la fuente de verdad de cada uno sigue ABIERTO en M16 (Q-0631/Q-0633/Q-0635).

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

  // Datos de usuarios de la app: ya no salen del mock local — vienen de conexion-api
  // (conexión 'app', contenedor app_db aparte de cuentas_administrativas) vía
  // GET /api/app/usuarios/resumen. El backend todavía no aplica TerritorialScope sobre este
  // endpoint (sí lo hace usuariosVisiblesPara para el mock): un Coordinador Territorial ve
  // aquí el total del Huila, no solo su territorio, hasta que esa regla se porte al servidor.
  const [resumenApp, setResumenApp] = useState<ResumenUsuariosApp | null>(null)
  const [cargandoResumen, setCargandoResumen] = useState(true)

  useEffect(() => {
    if (!puedeVerUsuarios) {
      setResumenApp(null)
      setCargandoResumen(false)
      return
    }
    let cancelado = false
    setCargandoResumen(true)
    obtenerResumenUsuariosApp()
      .then((r) => {
        if (!cancelado) setResumenApp(r)
      })
      .catch(() => {
        if (!cancelado) setResumenApp(null)
      })
      .finally(() => {
        if (!cancelado) setCargandoResumen(false)
      })
    return () => {
      cancelado = true
    }
  }, [puedeVerUsuarios])

  const datosTerritorio = useMemo(
    () => (resumenApp ? resumenApp.porTerritorio.filas.map((f) => ({ nombre: f.nombre, total: f.total })) : []),
    [resumenApp],
  )
  const datosPlaya = useMemo(
    () =>
      resumenApp
        ? resumenApp.porPlaya.map((f) => ({ nombre: nombrePlaya(f.playa), total: f.total, playa: f.playa }))
        : [],
    [resumenApp],
  )

  const kpisUsuarios: Kpi[] = useMemo(
    () =>
      puedeVerUsuarios && resumenApp
        ? [
            {
              clave: 'usuarios_total',
              permiso: 'users:view',
              etiqueta: 'Total de usuarios',
              valor: formatoEntero(resumenApp.total),
              tendencia: formatoTendenciaPct(resumenApp.ingresoSemanal.tendenciaPct),
              destino: '/PW-03',
            },
            {
              clave: 'usuarios_nuevos',
              permiso: 'users:view',
              etiqueta: 'Nuevos usuarios (prom. semanal)',
              valor: formatoEntero(resumenApp.ingresoSemanal.promedioSemanal),
              tendencia: formatoTendenciaPct(resumenApp.ingresoSemanal.tendenciaPct),
              destino: '/PW-03',
            },
          ]
        : [],
    [puedeVerUsuarios, resumenApp],
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

        {puedeVerUsuarios && (cargandoResumen || resumenApp) && (
          <Superficie>
            <CabeceraSuperficie
              titulo="Dónde están tus usuarios"
              descripcion={
                cuenta
                  ? `${describirAlcance(cuenta.territorioIds)} · el listado con filtros y exportación vive en Usuarios de la app; la analítica profunda con series de tiempo es PW-17, todavía sin construir.`
                  : undefined
              }
            />
            {cargandoResumen ? (
              <p className="px-6 py-5 text-sm text-texto-suave">Cargando datos de la app…</p>
            ) : resumenApp ? (
              <div className="grid gap-x-8 gap-y-6 px-6 py-5 sm:grid-cols-2">
                <div>
                  <p className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-texto-suave">
                    Por territorio
                  </p>
                  <ResponsiveContainer width="100%" height={Math.max(180, datosTerritorio.length * 32)}>
                    <BarChart data={datosTerritorio} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-borde/60" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-texto-suave" />
                      <YAxis
                        type="category"
                        dataKey="nombre"
                        width={92}
                        tick={<EtiquetaEje />}
                        axisLine={false}
                        tickLine={false}
                      interval={0}
                      />
                      <Tooltip
                        formatter={(valor) => [formatoEntero(Number(valor)), 'Usuarios']}
                        contentStyle={{ fontSize: 12, borderRadius: 10 }}
                      />
                      <Bar dataKey="total" fill="var(--color-primario)" radius={[0, 6, 6, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                  {resumenApp.porTerritorio.otros > 0 && (
                    <p className="mt-2.5 text-xs text-texto-suave">
                      +{formatoEntero(resumenApp.porTerritorio.otros)} usuarios en otros municipios
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-texto-suave">
                    Por Playa
                  </p>
                  <ResponsiveContainer width="100%" height={224}>
                    <BarChart data={datosPlaya} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-borde/60" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-texto-suave" />
                      <YAxis
                        type="category"
                        dataKey="nombre"
                        width={92}
                        tick={<EtiquetaEje />}
                        axisLine={false}
                        tickLine={false}
                      interval={0}
                      />
                      <Tooltip
                        formatter={(valor) => [formatoEntero(Number(valor)), 'Usuarios']}
                        contentStyle={{ fontSize: 12, borderRadius: 10 }}
                      />
                      <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={18}>
                        {datosPlaya.map((fila) => (
                          <Cell key={fila.playa} fill={COLORES_PLAYA[fila.playa - 1]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </Superficie>
        )}

        {puedeVerUsuarios && resumenApp && (
          <Superficie>
            <CabeceraSuperficie
              titulo="Zonas calientes por municipio"
              descripcion="Croquis del Huila y sus 37 municipios — más oscuro = más usuarios. Clic u hover sobre un municipio para ver su detalle."
            />
            <div className="px-6 py-5">
              <MapaCalorHuila filas={resumenApp.mapaCalor} />
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
