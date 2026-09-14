import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppShell } from '../components/AppShell'
import { Superficie, CabeceraSuperficie } from '../components/ui/Superficie'
import { MapaCalorHuila } from '../components/MapaCalorHuila'
import { useAuth } from '../state/authStore'
import { useAdmin } from '../state/adminStore'
import { ROLES } from '../data/roles'
import { describirAlcance } from '../data/territorios'
import { tienePermiso } from '../dominio/permisos'
import { formatoEntero, formatoTendenciaPct } from '../dominio/metricas'
import { nombrePlaya } from '../data/usuariosApp'
import { obtenerResumenUsuariosApp, type ResumenUsuariosApp } from '../lib/usuariosAppApi'

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
  Home. PW-02 fija que el filtro es por PERMISO INDIVIDUAL del usuario, no por rol: se compone
  en tiempo de carga según los permisos efectivos de la sesión, no una plantilla fija.

  Decisión de producto (2026-09-14): esta pantalla se reenfoca como un dashboard de gráficas y
  estadísticas — es lo primero y lo único que se ve. Las bandejas de "por aprobar/por firmar"
  (Doble Firma, misiones) y los atajos de estado del portal salieron de aquí a propósito; si
  vuelven, es en su propio lugar (una bandeja de tareas), no mezclados con la analítica.

  Los datos de usuarios de la app (KPI, barras por territorio/Playa, mapa de calor) SÍ son
  reales: vienen de conexion-api (GET /api/app/usuarios/resumen, conexión 'app' → app_db), no
  de un mock local. Ese endpoint TODAVÍA no aplica TerritorialScope (a diferencia de PW-03) —
  un Coordinador Territorial ve el Huila entero aquí hasta que esa regla se porte al servidor.
  El resto de KPI sigue siendo cifra de demo: qué KPIs son obligatorios para el MVP, cuáles van
  en tiempo real y cuál es la fuente de verdad de cada uno sigue ABIERTO en M16 (Q-0631/Q-0633/Q-0635).
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

  if (!user || !auth.sesion) return null

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
      </div>
    </AppShell>
  )
}
