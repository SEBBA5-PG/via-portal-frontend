import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PW04Layout } from './PW04Layout'
import { Badge, type TonoBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EstadoVacio } from '../../components/ui/EstadoVacio'
import { Celda, EncabezadoTabla, FilaTabla, Tabla } from '../../components/ui/Tabla'
import { Superficie } from '../../components/ui/Superficie'
import { useAuth } from '../../state/authStore'
import { useAdmin } from '../../state/adminStore'
import { ROLES, type Rol } from '../../data/roles'
import {
  DIAS_INACTIVIDAD_SOSPECHOSA,
  ESTADOS_CUENTA,
  diasDesde,
  enmascararCedula,
  type EstadoCuenta,
} from '../../data/cuentas'
import { describirAlcance } from '../../data/territorios'
import { diferenciasConPlantilla, puedeCrearCuentas, tienePermiso } from '../../dominio/permisos'

/*
  Listado de cuentas administrativas.

  Esta pantalla resuelve el vacío que se detectó en PW-04 el 2026-09-12: el alcance de la
  categoría ya cubría "gestionar cuentas y permisos del personal administrativo", pero solo
  estaban especificados el *alta* y la *edición de permisos* — ver todas las cuentas, entrar
  a su ficha y desactivarlas no estaba escrito en ningún lado. Es el equivalente, para
  cuentas administrativas, de lo que PW-03 ya resuelve para los usuarios de la app.

  No hay acción "Eliminar". Reglas Transversales §Confirmaciones: "El borrado físico está
  prohibido en producción por auditoría electoral. Ninguna pantalla del portal debe ofrecer
  «eliminar» como acción terminal."
*/

const TONO_ESTADO: Record<EstadoCuenta, TonoBadge> = {
  activa: 'exito',
  provisional: 'pendiente',
  inactiva: 'neutro',
  bloqueada: 'peligro',
}

export function CuentasPage() {
  const auth = useAuth()
  const admin = useAdmin()
  const navigate = useNavigate()
  const [filtroRol, setFiltroRol] = useState<Rol | 'todos'>('todos')
  const [filtroEstado, setFiltroEstado] = useState<EstadoCuenta | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')

  const user = auth.usuarioActual
  const cuentaActor = user ? admin.cuentaPorId(user.id) : undefined
  const hoy = useMemo(() => new Date(), [])

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return admin.cuentas.filter((c) => {
      if (filtroRol !== 'todos' && c.rol !== filtroRol) return false
      if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false
      if (texto && !c.nombre.toLowerCase().includes(texto) && !c.cedula.includes(texto)) return false
      return true
    })
  }, [admin.cuentas, filtroRol, filtroEstado, busqueda])

  if (!user || !cuentaActor) return null

  // El enmascaramiento de PII lo debe aplicar el backend, no un formateador de frontend
  // (Reglas Transversales §PII). Aquí no hay backend: la pantalla respeta la intención.
  const vePII = tienePermiso(cuentaActor, 'users:view_pii')
  const puedeCrear = puedeCrearCuentas(cuentaActor)
  const hayFiltros = filtroRol !== 'todos' || filtroEstado !== 'todos' || busqueda.trim() !== ''

  return (
    <PW04Layout
      titulo="Cuentas administrativas"
      descripcion="Todas las cuentas que hacen login en el portal. El identificador de acceso es la cédula, no el celular — es el carve-out del portal respecto al resto del sistema (PW-01)."
      acciones={
        puedeCrear ? (
          <Button variante="ejecutivo" onClick={() => navigate('/PW-04/nueva')}>
            Crear cuenta
          </Button>
        ) : (
          <p className="max-w-xs text-right text-xs leading-relaxed text-texto-suave">
            Crear cuentas exige el permiso <code>accounts:create</code>, que no trae ningún rol
            por defecto. Pídeselo a un Superadministrador con esa cesión.
          </p>
        )
      }
    >
      <Superficie className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-white/[0.07] px-6 py-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-heading text-xs font-bold text-texto-suave">Buscar</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o cédula"
              className="h-10 w-56 rounded-full border-[1.5px] border-borde/40 bg-fondo/[0.05] px-4 text-sm text-grafito outline-none transition placeholder:text-texto-suave/70 focus:border-primario focus:ring-4 focus:ring-ambar/30"
            />
          </label>
          <Filtro
            etiqueta="Rol"
            valor={filtroRol}
            onCambiar={(v) => setFiltroRol(v as Rol | 'todos')}
            opciones={[['todos', 'Todos'], ...Object.entries(ROLES)]}
          />
          <Filtro
            etiqueta="Estado"
            valor={filtroEstado}
            onCambiar={(v) => setFiltroEstado(v as EstadoCuenta | 'todos')}
            opciones={[['todos', 'Todos'], ...Object.entries(ESTADOS_CUENTA)]}
          />
          <p className="ml-auto text-xs text-texto-suave">
            {filtradas.length} de {admin.cuentas.length} cuentas
          </p>
        </div>

        {filtradas.length === 0 ? (
          <EstadoVacio
            motivo={hayFiltros ? 'sin-resultados' : 'sin-datos'}
            titulo={hayFiltros ? 'Ninguna cuenta coincide con tu filtro' : 'Todavía no hay cuentas administrativas'}
            descripcion={
              hayFiltros
                ? 'Prueba con otro rol o estado, o limpia la búsqueda para ver el listado completo.'
                : 'La primera cuenta la crea el despliegue del sistema (cuenta raíz) y desde ahí se ramifican las demás.'
            }
            accion={
              hayFiltros ? (
                <Button
                  variante="ejecutivo-suave"
                  onClick={() => {
                    setFiltroRol('todos')
                    setFiltroEstado('todos')
                    setBusqueda('')
                  }}
                >
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Tabla>
            <EncabezadoTabla
              columnas={['Cuenta', 'Rol', 'Alcance', 'Estado', 'Permisos', 'Último acceso']}
            />
            <tbody>
              {filtradas.map((cuenta) => {
                const dias = diasDesde(cuenta.ultimoAcceso, hoy)
                const dormida =
                  cuenta.estado === 'activa' && dias !== null && dias > DIAS_INACTIVIDAD_SOSPECHOSA
                const { ampliados, reducidos } = diferenciasConPlantilla(cuenta)

                return (
                  <FilaTabla
                    key={cuenta.id}
                    etiqueta={`Abrir la ficha de ${cuenta.nombre}`}
                    onClick={() => navigate(`/PW-04/cuenta/${cuenta.id}`)}
                  >
                    <Celda>
                      <button
                        type="button"
                        className="text-left outline-none focus-visible:ring-4 focus-visible:ring-ambar/40"
                      >
                        <span className="flex items-center gap-2 font-heading font-bold text-grafito">
                          {cuenta.nombre}
                          {cuenta.esRaiz && <Badge tono="alerta">Raíz</Badge>}
                        </span>
                        <span className="mt-0.5 block text-xs text-texto-suave">
                          {vePII ? cuenta.cedula : enmascararCedula(cuenta.cedula)}
                        </span>
                      </button>
                    </Celda>
                    <Celda>{ROLES[cuenta.rol]}</Celda>
                    <Celda className="text-texto-suave">{describirAlcance(cuenta.territorioIds)}</Celda>
                    <Celda>
                      <Badge tono={TONO_ESTADO[cuenta.estado]}>{ESTADOS_CUENTA[cuenta.estado]}</Badge>
                    </Celda>
                    <Celda>
                      {ampliados.length === 0 && reducidos.length === 0 ? (
                        <span className="text-xs text-texto-suave">Plantilla del rol</span>
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {ampliados.length > 0 && <Badge tono="alerta">+{ampliados.length}</Badge>}
                          {reducidos.length > 0 && <Badge tono="neutro">−{reducidos.length}</Badge>}
                        </span>
                      )}
                    </Celda>
                    <Celda>
                      {cuenta.ultimoAcceso === null ? (
                        <span className="text-xs text-texto-suave">Nunca ha entrado</span>
                      ) : (
                        <span className={dormida ? 'text-ambar' : 'text-texto-suave'}>
                          {dormida ? `Hace ${dias} días` : cuenta.ultimoAcceso}
                        </span>
                      )}
                    </Celda>
                  </FilaTabla>
                )
              })}
            </tbody>
          </Tabla>
        )}
      </Superficie>

      <p className="px-1 text-xs leading-relaxed text-texto-suave">
        Las cuentas activas sin acceso en más de {DIAS_INACTIVIDAD_SOSPECHOSA} días se marcan en
        ámbar: PW-04 las llama "un riesgo de seguridad silencioso". El umbral es una propuesta
        de este demo, no una decisión cerrada de la bóveda.
      </p>
    </PW04Layout>
  )
}

function Filtro({
  etiqueta,
  valor,
  onCambiar,
  opciones,
}: {
  etiqueta: string
  valor: string
  onCambiar: (valor: string) => void
  opciones: [string, string][]
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-heading text-xs font-bold text-texto-suave">{etiqueta}</span>
      <select
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className="h-10 rounded-full border-[1.5px] border-borde/40 bg-fondo/[0.05] px-4 text-sm text-grafito outline-none transition focus:border-primario focus:ring-4 focus:ring-ambar/30"
      >
        {opciones.map(([v, etiquetaOpcion]) => (
          <option key={v} value={v} className="bg-[#111823] text-grafito">
            {etiquetaOpcion}
          </option>
        ))}
      </select>
    </label>
  )
}
