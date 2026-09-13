import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PW04Layout } from './PW04Layout'
import { EditorPermisos } from './EditorPermisos'
import { SelectorTerritorio } from './SelectorTerritorio'
import { Badge, type TonoBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { SelectField } from '../../components/ui/SelectField'
import { Modal } from '../../components/ui/Modal'
import { Superficie, CabeceraSuperficie } from '../../components/ui/Superficie'
import { EstadoVacio } from '../../components/ui/EstadoVacio'
import { useAuth } from '../../state/authStore'
import { useAdmin } from '../../state/adminStore'
import { ROLES, type Rol } from '../../data/roles'
import {
  ESTADOS_CUENTA,
  enmascararCedula,
  enmascararCelular,
  nombreDeCuenta,
  type EstadoCuenta,
} from '../../data/cuentas'
import { ETIQUETA_EVENTO, formatoFechaHora } from '../../data/auditoria'
import { permisoPorClave } from '../../data/permisos'
import { describirAlcance } from '../../data/territorios'
import {
  diferenciasConPlantilla,
  permisosEfectivos,
  puedeAsignarRol,
  puedeEditarPermisos,
  puedeGestionarCuenta,
  separarCambios,
  tienePermiso,
  type CambioPropuesto,
} from '../../dominio/permisos'

/*
  Ficha de una cuenta administrativa: la otra mitad del vacío detectado el 2026-09-12 (ver
  CuentasPage). Tres pestañas — identidad, permisos y actividad — porque son tres autoridades
  distintas: editar el nombre de alguien no es lo mismo que ampliarle un permiso, y ninguna
  de las dos es ver su rastro de auditoría (audit:view, exclusivo de Superadministrador).
*/

type Pestana = 'identidad' | 'permisos' | 'actividad'

const TONO_ESTADO: Record<EstadoCuenta, TonoBadge> = {
  activa: 'exito',
  provisional: 'pendiente',
  inactiva: 'neutro',
  bloqueada: 'peligro',
}

export function FichaCuentaPage() {
  const { cuentaId } = useParams()
  const auth = useAuth()
  const admin = useAdmin()
  const navigate = useNavigate()
  const [pestana, setPestana] = useState<Pestana>('identidad')

  const user = auth.usuarioActual
  const cuentaActor = user ? admin.cuentaPorId(user.id) : undefined
  const cuenta = cuentaId ? admin.cuentaPorId(cuentaId) : undefined

  if (!user || !cuentaActor) return null
  if (!cuenta) return <Navigate to="/PW-04" replace />

  const gestionable = puedeGestionarCuenta(cuentaActor, cuenta)
  const editaPermisos = puedeEditarPermisos(cuentaActor, cuenta)
  const vePII = tienePermiso(cuentaActor, 'users:view_pii')
  const veAuditoria = tienePermiso(cuentaActor, 'audit:view')
  const { ampliados, reducidos } = diferenciasConPlantilla(cuenta)

  return (
    <PW04Layout
      titulo={cuenta.nombre}
      descripcion={
        <>
          {ROLES[cuenta.rol]} · {describirAlcance(cuenta.territorioIds)} · creada el{' '}
          {cuenta.fechaCreacion} por {nombreDeCuenta(cuenta.creadoPor, admin.cuentas)}
        </>
      }
      acciones={
        <>
          <Badge tono={TONO_ESTADO[cuenta.estado]}>{ESTADOS_CUENTA[cuenta.estado]}</Badge>
          {cuenta.esRaiz && <Badge tono="alerta">Cuenta raíz</Badge>}
          {ampliados.length > 0 && <Badge tono="alerta">+{ampliados.length} ampliados</Badge>}
          {reducidos.length > 0 && <Badge tono="neutro">−{reducidos.length} reducidos</Badge>}
          <Button variante="ejecutivo-suave" onClick={() => navigate('/PW-04')}>
            Volver al listado
          </Button>
        </>
      }
    >
      {cuenta.esRaiz && (
        <Superficie tono="sutil" className="border-ambar/25 bg-ambar/[0.06] px-6 py-4">
          <p className="text-sm leading-relaxed text-ambar">
            Cuenta raíz: nace con el despliegue del sistema, tiene todos los permisos y es
            irrevocable — nunca se le puede quitar <code>accounts:create</code> ni{' '}
            <code>permissions:grant</code>. Es de uso exclusivo para el arranque inicial y
            emergencias extremas, no para el día a día, y por eso no se edita desde aquí.
          </p>
        </Superficie>
      )}

      <div className="flex flex-wrap gap-2">
        <SolapaPestana activa={pestana === 'identidad'} onClick={() => setPestana('identidad')}>
          Identidad y rol
        </SolapaPestana>
        <SolapaPestana activa={pestana === 'permisos'} onClick={() => setPestana('permisos')}>
          Permisos
        </SolapaPestana>
        <SolapaPestana activa={pestana === 'actividad'} onClick={() => setPestana('actividad')}>
          Actividad
        </SolapaPestana>
      </div>

      {pestana === 'identidad' && (
        <PestanaIdentidad
          cuentaId={cuenta.id}
          actorId={cuentaActor.id}
          gestionable={gestionable}
          vePII={vePII}
        />
      )}
      {pestana === 'permisos' && (
        <PestanaPermisos cuentaId={cuenta.id} actorId={cuentaActor.id} editable={editaPermisos} />
      )}
      {pestana === 'actividad' && <PestanaActividad cuentaId={cuenta.id} permitido={veAuditoria} />}
    </PW04Layout>
  )
}

function SolapaPestana({
  activa,
  onClick,
  children,
}: {
  activa: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`rounded-full border px-4 py-2 font-heading text-sm font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ambar/40 ${
        activa
          ? 'border-primario/40 bg-primario/[0.14] text-primario'
          : 'border-white/10 bg-white/[0.03] text-texto-suave hover:text-grafito'
      }`}
    >
      {children}
    </button>
  )
}

function PestanaIdentidad({
  cuentaId,
  actorId,
  gestionable,
  vePII,
}: {
  cuentaId: string
  actorId: string
  gestionable: boolean
  vePII: boolean
}) {
  const admin = useAdmin()
  const cuenta = admin.cuentaPorId(cuentaId)
  const [confirmarDesactivar, setConfirmarDesactivar] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [rolPropuesto, setRolPropuesto] = useState<Rol | null>(null)

  const actor = admin.cuentaPorId(actorId)
  if (!cuenta || !actor) return null

  return (
    <>
      <Superficie>
        <CabeceraSuperficie
          titulo="Datos de identidad"
          descripcion="La cédula no se edita: es el identificador de login y cambiarla equivaldría a crear otra cuenta."
        />
        <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
          <TextField
            etiqueta="Nombre completo"
            value={cuenta.nombre}
            disabled={!gestionable}
            onChange={(e) => admin.editarIdentidad(actorId, cuentaId, { nombre: e.target.value })}
          />
          <TextField etiqueta="Cédula" value={vePII ? cuenta.cedula : enmascararCedula(cuenta.cedula)} disabled />
          <TextField
            etiqueta="Celular"
            value={vePII ? cuenta.telefonoWhatsapp : enmascararCelular(cuenta.telefonoWhatsapp)}
            disabled={!gestionable || !vePII}
            onChange={(e) => admin.editarIdentidad(actorId, cuentaId, { telefonoWhatsapp: e.target.value })}
            ayuda={cuenta.rol === 'C' ? 'Solo recuperación de PIN — este rol no hace 2FA.' : 'Canal de 2FA en cada login.'}
          />
          <TextField
            etiqueta="Correo electrónico"
            value={vePII ? cuenta.email : '•••••••@•••••'}
            disabled={!gestionable || !vePII}
            onChange={(e) => admin.editarIdentidad(actorId, cuentaId, { email: e.target.value })}
          />
        </div>
        {!vePII && (
          <p className="border-t border-white/[0.06] px-6 py-3 text-xs text-texto-suave">
            La PII aparece enmascarada porque tu cuenta no tiene <code>users:view_pii</code>. En
            producción el enmascaramiento lo aplica el servidor: el dato completo no llega al
            navegador.
          </p>
        )}
      </Superficie>

      <Superficie>
        <CabeceraSuperficie
          titulo="Rol y alcance territorial"
          descripcion="Cambiar el rol reemplaza la plantilla de permisos base y descarta las personalizaciones anteriores, porque estaban expresadas contra la plantilla vieja."
        />
        <div className="flex flex-col gap-6 px-6 py-6">
          <div className="max-w-sm">
            <SelectField
              etiqueta="Rol administrativo"
              value={cuenta.rol}
              disabled={!gestionable}
              onChange={(e) => setRolPropuesto(e.target.value as Rol)}
              opciones={(Object.keys(ROLES) as Rol[]).map((r) => ({
                valor: r,
                etiqueta: ROLES[r],
                deshabilitada: !puedeAsignarRol(actor, r),
              }))}
            />
          </div>
          <div>
            <p className="mb-2 font-heading text-sm font-bold text-grafito">Alcance territorial</p>
            <SelectorTerritorio
              seleccionados={cuenta.territorioIds}
              soloLectura={!gestionable}
              onCambiar={(ids) => admin.editarIdentidad(actorId, cuentaId, { territorioIds: ids })}
            />
          </div>
        </div>
      </Superficie>

      {gestionable && cuenta.estado !== 'inactiva' && (
        <Superficie tono="sutil" className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            <p className="font-heading text-sm font-extrabold text-grafito">Revocar el acceso</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-texto-suave">
              Desactivación lógica: se revocan los tokens de sesión activos y queda el motivo en
              auditoría. Nunca hay borrado físico — está prohibido en producción por auditoría
              electoral, así que esta pantalla no ofrece «eliminar».
            </p>
          </div>
          <Button variante="peligro" onClick={() => setConfirmarDesactivar(true)}>
            Desactivar cuenta
          </Button>
        </Superficie>
      )}

      <Modal
        abierto={confirmarDesactivar}
        titulo={`Desactivar a ${cuenta.nombre}`}
        descripcion="La persona dejará de poder entrar al portal de inmediato y sus sesiones activas se cierran. La cuenta y su historial se conservan."
        onCerrar={() => setConfirmarDesactivar(false)}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={() => setConfirmarDesactivar(false)}>
              Cancelar
            </Button>
            <Button
              variante="peligro"
              disabled={motivo.trim().length < 5}
              onClick={() => {
                admin.cambiarEstado(actorId, cuentaId, 'inactiva', motivo.trim())
                setConfirmarDesactivar(false)
                setMotivo('')
              }}
            >
              Desactivar
            </Button>
          </>
        }
      >
        <TextField
          etiqueta="Motivo (obligatorio)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          ayuda="Queda registrado en audit_logs junto con tu identidad y la fecha."
        />
      </Modal>

      <Modal
        abierto={rolPropuesto !== null}
        titulo="Cambiar el rol de la cuenta"
        descripcion={
          rolPropuesto && (
            <>
              {cuenta.nombre} pasará de <strong className="text-grafito">{ROLES[cuenta.rol]}</strong> a{' '}
              <strong className="text-grafito">{ROLES[rolPropuesto]}</strong>. Su plantilla de permisos
              cambia entera y se descartan las {Object.keys(cuenta.overrides).length} personalizaciones
              que tiene hoy.
            </>
          )
        }
        onCerrar={() => setRolPropuesto(null)}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={() => setRolPropuesto(null)}>
              Cancelar
            </Button>
            <Button
              variante="ejecutivo"
              disabled={motivo.trim().length < 5}
              onClick={() => {
                if (rolPropuesto) admin.cambiarRol(actorId, cuentaId, rolPropuesto, motivo.trim())
                setRolPropuesto(null)
                setMotivo('')
              }}
            >
              Cambiar rol
            </Button>
          </>
        }
      >
        <TextField
          etiqueta="Motivo (obligatorio)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </Modal>
    </>
  )
}

function PestanaPermisos({
  cuentaId,
  actorId,
  editable,
}: {
  cuentaId: string
  actorId: string
  editable: boolean
}) {
  const admin = useAdmin()
  const cuenta = admin.cuentaPorId(cuentaId)
  const [borrador, setBorrador] = useState<Record<string, boolean> | null>(null)
  const [motivo, setMotivo] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const valores = useMemo(() => {
    if (!cuenta) return {}
    return borrador ?? permisosEfectivos(cuenta)
  }, [cuenta, borrador])

  if (!cuenta) return null

  const cambios: CambioPropuesto[] = Object.entries(valores)
    .map(([clave, valorNuevo]) => ({ clave, valorNuevo }))
    .filter((c) => permisosEfectivos(cuenta)[c.clave] !== c.valorNuevo)

  const { inmediatos, requierenFirma } = separarCambios(cuenta, cambios)
  const hayCambios = inmediatos.length + requierenFirma.length > 0

  return (
    <>
      {!editable && (
        <Superficie tono="sutil" className="px-6 py-5">
          <p className="font-heading text-sm font-extrabold text-grafito">Permisos en solo lectura</p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-texto-suave">
            Editar permisos individuales es exclusivo de un Superadministrador distinto del titular
            de la cuenta — nunca un Administrador, nunca el propio usuario. Puedes consultar los
            permisos efectivos, pero no modificarlos.
          </p>
        </Superficie>
      )}

      <EditorPermisos
        cuenta={cuenta}
        valores={valores}
        solicitudes={admin.solicitudes}
        soloLectura={!editable}
        onCambiar={(clave, valor) =>
          setBorrador((prev) => ({ ...(prev ?? permisosEfectivos(cuenta)), [clave]: valor }))
        }
      />

      {editable && hayCambios && (
        <Superficie className="sticky bottom-4 flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="min-w-0 text-sm text-texto-suave">
            <p className="font-heading font-extrabold text-grafito">
              {inmediatos.length + requierenFirma.length} cambio(s) sin guardar
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {inmediatos.length > 0 && (
                <>
                  <Badge tono="exito">{inmediatos.length} inmediato(s)</Badge>
                  <span>se aplican al guardar</span>
                </>
              )}
              {requierenFirma.length > 0 && (
                <>
                  <Badge tono="peligro">{requierenFirma.length} a firma</Badge>
                  <span>los aprueba un segundo Superadministrador</span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variante="ejecutivo-suave" onClick={() => setBorrador(null)}>
              Descartar
            </Button>
            <Button variante="ejecutivo" onClick={() => setConfirmando(true)}>
              {/* Reglas Transversales §Doble Firma, regla 1: el Maker no ve «Guardar» cuando
                  lo que hace es proponer — ve que va a aprobación, y con qué rol aprobador. */}
              {requierenFirma.length > 0 ? 'Enviar a aprobación' : 'Guardar cambios'}
            </Button>
          </div>
        </Superficie>
      )}

      <Modal
        abierto={confirmando}
        ancho="amplio"
        titulo={requierenFirma.length > 0 ? 'Revisar antes de enviar' : 'Confirmar cambios'}
        descripcion="Q-1255 evalúa cada permiso por separado dentro de una misma edición: las reducciones se aplican de inmediato y solo las ampliaciones esperan un segundo firmante."
        onCerrar={() => setConfirmando(false)}
        acciones={
          <>
            <Button variante="ejecutivo-suave" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button
              variante="ejecutivo"
              disabled={motivo.trim().length < 5}
              onClick={() => {
                admin.editarPermisos(actorId, cuentaId, cambios, motivo.trim())
                setConfirmando(false)
                setBorrador(null)
                setMotivo('')
              }}
            >
              {requierenFirma.length > 0 ? 'Enviar a aprobación' : 'Guardar'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {inmediatos.length > 0 && (
            <ListaCambios
              titulo="Se aplican de inmediato"
              tono="exito"
              nota="Reducir acceso nunca es la acción sensible, así que no espera firma."
              cambios={inmediatos}
            />
          )}
          {requierenFirma.length > 0 && (
            <ListaCambios
              titulo="Esperan a un segundo Superadministrador"
              tono="peligro"
              nota="Mientras estén pendientes, la cuenta sigue operando con su valor actual."
              cambios={requierenFirma}
            />
          )}
          <TextField
            etiqueta="Motivo (obligatorio)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            ayuda="Queda en audit_logs y lo verá quien tenga que firmar."
          />
        </div>
      </Modal>
    </>
  )
}

function ListaCambios({
  titulo,
  tono,
  nota,
  cambios,
}: {
  titulo: string
  tono: TonoBadge
  nota: string
  cambios: CambioPropuesto[]
}) {
  return (
    <div>
      <p className="flex items-center gap-2 font-heading text-sm font-extrabold text-grafito">
        <Badge tono={tono}>{cambios.length}</Badge> {titulo}
      </p>
      <p className="mt-1 text-xs text-texto-suave">{nota}</p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {cambios.map((cambio) => (
          <li key={cambio.clave} className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cambio.valorNuevo ? 'text-[#8fd382]' : 'text-texto-suave'}>
              {cambio.valorNuevo ? '＋' : '−'}
            </span>
            <span className="text-grafito/85">
              {permisoPorClave(cambio.clave)?.etiqueta ?? cambio.clave}
            </span>
            <code className="text-[0.7rem] text-texto-suave">{cambio.clave}</code>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PestanaActividad({ cuentaId, permitido }: { cuentaId: string; permitido: boolean }) {
  const admin = useAdmin()
  const entradas = admin.auditoriaDe(cuentaId)

  /*
    Reglas Transversales §Cinco estados, estado "Sin permiso": "Qué falta y a quién pedirlo.
    Nunca «error 403»". Y solo aparece dentro de una categoría visible, que es el caso: PW-04
    es visible para este rol, lo que falta es el permiso puntual de auditoría.
  */
  if (!permitido) {
    return (
      <Superficie>
        <EstadoVacio
          motivo="sin-datos"
          titulo="No puedes ver la trazabilidad de esta cuenta"
          descripcion="Ver el rastro de auditoría exige el permiso audit:view, exclusivo de Superadministrador. Pídeselo a quien administre los permisos del portal."
        />
      </Superficie>
    )
  }

  if (entradas.length === 0) {
    return (
      <Superficie>
        <EstadoVacio
          motivo="sin-datos"
          titulo="Sin movimientos registrados"
          descripcion="Esta cuenta no ha tenido cambios de rol, permisos ni estado desde que se creó."
        />
      </Superficie>
    )
  }

  return (
    <Superficie>
      <CabeceraSuperficie
        titulo="Trazabilidad"
        descripcion="Registro inmutable: actor, estado anterior y nuevo, fecha, IP y motivo. Las entradas nunca se editan ni se borran."
      />
      <ul className="flex flex-col">
        {entradas.map((entrada) => {
          const permiso = entrada.permisoClave ? permisoPorClave(entrada.permisoClave) : undefined
          return (
            <li key={entrada.id} className="border-b border-white/[0.04] px-6 py-4 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tono={entrada.conDobleFirma ? 'alerta' : 'neutro'}>
                  {ETIQUETA_EVENTO[entrada.tipo]}
                </Badge>
                {entrada.conDobleFirma && <Badge tono="pendiente">Doble Firma</Badge>}
                <span className="text-xs text-texto-suave">{formatoFechaHora(entrada.timestamp)}</span>
              </div>
              {permiso && (
                <p className="mt-2 text-sm text-grafito/90">
                  {permiso.etiqueta}{' '}
                  <span className="text-texto-suave">
                    ({entrada.valorAnterior ? 'concedido' : 'no concedido'} →{' '}
                    {entrada.valorNuevo ? 'concedido' : 'no concedido'})
                  </span>
                </p>
              )}
              <p className="mt-1 text-xs text-texto-suave">
                Por {nombreDeCuenta(entrada.actorId, admin.cuentas)}
                {entrada.checkerId && <> · firmado por {nombreDeCuenta(entrada.checkerId, admin.cuentas)}</>}
                {' · '}
                IP {entrada.ip}
              </p>
              {entrada.motivo && <p className="mt-1.5 text-xs italic text-grafito/70">"{entrada.motivo}"</p>}
            </li>
          )
        })}
      </ul>
    </Superficie>
  )
}
