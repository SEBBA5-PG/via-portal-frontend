import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PW04Layout } from './PW04Layout'
import { Badge, type TonoBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { BotonCircularExpansible } from '../../components/ui/BotonCircularExpansible'
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

// Punto de color por rol en el filtro de Rol (BotonCircularExpansible). Reusa tonos ya
// presentes en la pantalla: Superadministrador con el azul sólido del sidebar (--side-bg),
// Administrador con el primario de marca, Coordinador Territorial con el ámbar de alerta.
const COLOR_ROL: Record<Rol, string> = {
  S: 'var(--side-bg)',
  A: 'var(--color-primario)',
  C: 'var(--color-ambar)',
}

function IconoMas() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M10 4v12" />
      <path d="M4 10h12" />
    </svg>
  )
}

function IconoLupa() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="6" />
      <path d="M17 17l-3.5-3.5" />
    </svg>
  )
}

// Búsqueda de texto libre como botón circular que se convierte en input al pasar el cursor o
// hacer foco — mismo lenguaje visual que los filtros de BotonCircularExpansible (observación
// 6 del usuario: minimizar la barra de búsqueda a algo desplegable, igual que Rol y Estado).
function BuscadorExpansible({ valor, onCambiar }: { valor: string; onCambiar: (v: string) => void }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setExpandido(true)}
      onMouseLeave={() => {
        if (valor.trim() === '') setExpandido(false)
      }}
    >
      {expandido ? (
        <input
          autoFocus
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          onBlur={() => {
            if (valor.trim() === '') setExpandido(false)
          }}
          placeholder="Nombre o cédula"
          className="h-10 w-48 rounded-full border border-borde bg-white pl-4 pr-3 text-sm text-grafito outline-none transition-[width] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] placeholder:text-texto-tenue focus:border-primario focus:ring-4 focus:ring-ambar/30"
        />
      ) : (
        <button
          type="button"
          onClick={() => setExpandido(true)}
          aria-label="Buscar por nombre o cédula"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-borde bg-white text-texto-suave outline-none transition-[width,background-color] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-surface-sunken focus-visible:ring-4 focus-visible:ring-ambar/40"
        >
          <IconoLupa />
        </button>
      )}
    </div>
  )
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

  if (!user) return null

  /*
    `cuentaActor` puede tardar en resolver (o no resolver nunca, para una sesión de demo cuya
    cédula no vive en conexion-api): las cuentas ahora se cargan async desde el backend
    (`admin.cargandoCuentas`), no de un seed local síncrono. Mientras carga o si el actor no
    aparece, la pantalla sigue mostrando el shell — nunca una pantalla en blanco.
  */
  // El enmascaramiento de PII lo debe aplicar el backend, no un formateador de frontend
  // (Reglas Transversales §PII). Aquí no hay backend: la pantalla respeta la intención.
  const vePII = cuentaActor ? tienePermiso(cuentaActor, 'users:view_pii') : false
  const puedeCrear = cuentaActor ? puedeCrearCuentas(cuentaActor) : false
  const hayFiltros = filtroRol !== 'todos' || filtroEstado !== 'todos' || busqueda.trim() !== ''

  return (
    <PW04Layout titulo="Cuentas administrativas">
      <Superficie className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-borde px-6 py-4">
          <BuscadorExpansible valor={busqueda} onCambiar={setBusqueda} />
          <BotonCircularExpansible
            etiqueta="Rol"
            valorActual={filtroRol}
            onSeleccionar={(v) => setFiltroRol(v as Rol | 'todos')}
            opciones={[
              { valor: 'todos', etiqueta: 'Todos' },
              ...(Object.entries(ROLES) as [Rol, string][]).map(([valor, etiqueta]) => ({
                valor,
                etiqueta,
                color: COLOR_ROL[valor],
              })),
            ]}
          />
          <BotonCircularExpansible
            etiqueta="Estado"
            valorActual={filtroEstado}
            onSeleccionar={(v) => setFiltroEstado(v as EstadoCuenta | 'todos')}
            opciones={[
              { valor: 'todos', etiqueta: 'Todos' },
              ...Object.entries(ESTADOS_CUENTA).map(([valor, etiqueta]) => ({ valor, etiqueta })),
            ]}
          />
          <p className="text-xs text-texto-suave">
            {filtradas.length} de {admin.cuentas.length} cuentas
          </p>
          {puedeCrear && (
            <BotonCircularExpansible
              className="ml-auto"
              solido
              icono={<IconoMas />}
              etiqueta="Crear cuenta"
              onClick={() => navigate('/PW-04/nueva')}
            />
          )}
        </div>

        {admin.cargandoCuentas ? (
          <EstadoVacio motivo="sin-datos" titulo="Cargando cuentas…" descripcion="Consultando el listado en el servidor." />
        ) : filtradas.length === 0 ? (
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
              columnas={['Cuenta', 'Rol', 'Alcance', 'Estado', '', 'Último acceso']}
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
                          {cuenta.esRaiz && (
                            <Badge tono="alerta" sinIcono>
                              Raíz
                            </Badge>
                          )}
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
                          {ampliados.length > 0 && (
                            <Badge tono="alerta" sinIcono>
                              +{ampliados.length}
                            </Badge>
                          )}
                          {reducidos.length > 0 && (
                            <Badge tono="neutro" sinIcono>
                              −{reducidos.length}
                            </Badge>
                          )}
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
    </PW04Layout>
  )
}
