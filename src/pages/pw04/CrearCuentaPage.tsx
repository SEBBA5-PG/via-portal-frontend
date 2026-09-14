import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { AppShell } from '../../components/AppShell'
import { Stepper } from './crear/Stepper'
import { PasoIdentidad } from './crear/PasoIdentidad'
import { PasoRolYAlcance } from './crear/PasoRolYAlcance'
import { PasoPermisos } from './crear/PasoPermisos'
import { PasoPreview } from './crear/PasoPreview'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { useAuth } from '../../state/authStore'
import { useAdmin, type ResultadoEdicion } from '../../state/adminStore'
import { useConfirmarSalida } from '../../state/useConfirmarSalida'
import { useNavegacionGuardia } from '../../state/navegacionGuardiaStore'
import { ROLES, type Rol } from '../../data/roles'
import { plantillaDe, permisoPorClave } from '../../data/permisos'
import type { CuentaAdmin } from '../../data/cuentas'
import { puedeAsignarRol, puedeCrearCuentas, permisosEditables as permisosEditablesDe } from '../../dominio/permisos'

/*
  Alta de cuenta administrativa — asistente de 4 pasos (Identidad → Rol y alcance →
  Permisos → Preview), fiel a las capturas de referencia. Reemplaza la versión anterior de
  una sola pantalla continua; toda la lógica de estado, validación y guardado que ya existía
  se conserva tal cual, solo cambia cómo se presenta.

  El guardado real (`admin.crearCuenta`) sigue ocurriendo una sola vez, al final: ahora en el
  botón terminal del paso de Preview, no antes.

    "El flujo real [...] captura de datos de identidad → sin salir de ahí, selector de rol +
     selector de territorio + el mismo editor de permisos que se usa para personalizar una
     cuenta ya existente" — PW-04. El wizard no cambia esa continuidad de estado: solo la
     reparte en pasos con su propia navegación.

  Con el matiz de Q-1255 encima: de esas personalizaciones, solo las AMPLIACIONES esperan un
  segundo firmante. Las reducciones entran con la cuenta.
*/

const PASOS = ['Identidad', 'Rol y alcance', 'Permisos', 'Preview']

interface Errores {
  nombre?: string
  cedula?: string
  email?: string
  telefonoWhatsapp?: string
  territorioIds?: string
}

export function CrearCuentaPage() {
  const auth = useAuth()
  const admin = useAdmin()
  const navigate = useNavigate()
  const prefiereMenosMovimiento = useReducedMotion()

  const [pasoActual, setPasoActual] = useState(0)
  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [email, setEmail] = useState('')
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState('')
  const [rol, setRol] = useState<Rol>('C')
  const [territorioIds, setTerritorioIds] = useState<string[]>([])
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [errores, setErrores] = useState<Errores>({})
  const [creada, setCreada] = useState<{ cuenta: CuentaAdmin; pinTemporal: string; resultado: ResultadoEdicion } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)

  const user = auth.usuarioActual
  const cuentaActor = user ? admin.cuentaPorId(user.id) : undefined

  /*
    Cuenta "fantasma" contra la que el editor calcula la plantilla y la dirección de cada
    cambio. Es la misma forma que una cuenta real porque el editor y las reglas de dominio no
    deben saber si están mirando un alta o una edición — Q-1255 aplica igual en los dos casos.
  */
  const borrador = useMemo<CuentaAdmin>(
    () => ({
      id: 'nueva',
      nombre,
      cedula,
      email,
      telefonoWhatsapp,
      rol,
      estado: 'provisional',
      territorioIds,
      overrides: {},
      fechaCreacion: '',
      fechaEdicion: '',
      creadoPor: cuentaActor?.id ?? null,
      ultimoAcceso: null,
    }),
    [nombre, cedula, email, telefonoWhatsapp, rol, territorioIds, cuentaActor],
  )

  const valores = useMemo(
    () => ({ ...plantillaDe(rol), ...overrides }),
    [rol, overrides],
  )

  // Una vez creada la cuenta y mostrado el modal de éxito, ya no hay nada que "perder" al salir.
  const hayCambiosSinGuardar =
    creada === null &&
    (nombre.trim() !== '' ||
      cedula.trim() !== '' ||
      email.trim() !== '' ||
      telefonoWhatsapp.trim() !== '' ||
      territorioIds.length > 0 ||
      Object.keys(overrides).length > 0)

  const { pedirConfirmacion, modal } = useConfirmarSalida(hayCambiosSinGuardar)
  const { setDirty } = useNavegacionGuardia()

  useEffect(() => {
    setDirty(hayCambiosSinGuardar)
    return () => setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayCambiosSinGuardar])

  if (!user) return null
  // Las cuentas se cargan async desde el backend: mientras tanto, `cuentaActor` puede no
  // haber resuelto todavía. Un texto simple evita una pantalla en blanco durante esa espera.
  if (admin.cargandoCuentas) {
    return (
      <AppShell>
        <p className="p-8 text-sm text-texto-suave">Cargando…</p>
      </AppShell>
    )
  }
  if (!cuentaActor || !puedeCrearCuentas(cuentaActor)) return <Navigate to="/PW-04" replace />

  const rolesDisponibles = (Object.keys(ROLES) as Rol[]).filter((r) => puedeAsignarRol(cuentaActor, r))
  const editablesDelBorrador = permisosEditablesDe(borrador)

  const personalizados = Object.entries(overrides).filter(
    ([clave, valor]) => valor !== plantillaDe(rol)[clave],
  )
  const ampliaciones = personalizados.filter(([, valor]) => valor)
  const reducciones = personalizados.filter(([, valor]) => !valor)

  const validarIdentidad = (): boolean => {
    const nuevos: Errores = {}
    if (nombre.trim().length < 5) nuevos.nombre = 'Escribe el nombre completo.'
    if (!/^\d{6,12}$/.test(cedula.trim())) nuevos.cedula = 'La cédula debe tener entre 6 y 12 dígitos.'
    else if (admin.cuentas.some((c) => c.cedula === cedula.trim()))
      nuevos.cedula = 'Ya existe una cuenta administrativa con esta cédula.'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nuevos.email = 'Correo inválido — es el respaldo de recuperación.'
    if (telefonoWhatsapp.trim().length < 10) nuevos.telefonoWhatsapp = 'Celular incompleto.'
    setErrores((prev) => ({ ...prev, ...nuevos, territorioIds: undefined }))
    return Object.keys(nuevos).length === 0
  }

  const validarAlcance = (): boolean => {
    if (territorioIds.length === 0) {
      setErrores((prev) => ({ ...prev, territorioIds: 'Asigna al menos un territorio.' }))
      return false
    }
    setErrores((prev) => ({ ...prev, territorioIds: undefined }))
    return true
  }

  const siguiente = () => {
    if (pasoActual === 0 && !validarIdentidad()) return
    if (pasoActual === 1 && !validarAlcance()) return
    setPasoActual((p) => Math.min(p + 1, PASOS.length - 1))
  }

  const atras = () => setPasoActual((p) => Math.max(p - 1, 0))

  const cancelar = () => pedirConfirmacion(() => navigate('/PW-04'))

  const guardar = async () => {
    if (!validarIdentidad() || !validarAlcance()) return
    setGuardando(true)
    setErrorGuardado(null)
    try {
      const resultado = await admin.crearCuenta(
        cuentaActor.id,
        {
          nombre: nombre.trim(),
          cedula: cedula.trim(),
          email: email.trim(),
          telefonoWhatsapp: telefonoWhatsapp.trim(),
          rol,
          territorioIds,
        },
        overrides,
      )
      setCreada(resultado)
    } catch {
      setErrorGuardado('No pudimos crear la cuenta contra el servidor. Intenta de nuevo en unos segundos.')
    } finally {
      setGuardando(false)
    }
  }

  // 150-200ms, respeta motion-reduce: sin desplazamiento y sin duración cuando el usuario lo
  // pide (mismo criterio que el resto del código, ej. AppShell.tsx con `motion-reduce:...`).
  const desplazamiento = prefiereMenosMovimiento ? 0 : 16
  const transicion = {
    initial: { opacity: prefiereMenosMovimiento ? 1 : 0, x: desplazamiento },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: prefiereMenosMovimiento ? 1 : 0, x: -desplazamiento },
    transition: { duration: prefiereMenosMovimiento ? 0 : 0.18, ease: [0.4, 0, 0.2, 1] as const },
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-5">
          <button
            type="button"
            onClick={cancelar}
            className="w-fit text-sm font-bold text-texto-suave outline-none transition-colors hover:text-primario focus-visible:ring-4 focus-visible:ring-ambar/40"
          >
            ‹ Cuentas administrativas
          </button>
          <Stepper pasos={PASOS} pasoActual={pasoActual} />
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={pasoActual} {...transicion} className="flex flex-col gap-6">
            {pasoActual === 0 && (
              <PasoIdentidad
                nombre={nombre}
                setNombre={setNombre}
                cedula={cedula}
                setCedula={setCedula}
                telefonoWhatsapp={telefonoWhatsapp}
                setTelefonoWhatsapp={setTelefonoWhatsapp}
                email={email}
                setEmail={setEmail}
                rol={rol}
                errores={errores}
              />
            )}
            {pasoActual === 1 && (
              <PasoRolYAlcance
                rol={rol}
                setRol={(r) => {
                  setRol(r)
                  // Cambiar de rol reinicia las personalizaciones: estaban expresadas como
                  // diferencia contra la plantilla anterior y contra la nueva dirían otra cosa.
                  setOverrides({})
                }}
                rolesDisponibles={rolesDisponibles}
                territorioIds={territorioIds}
                setTerritorioIds={setTerritorioIds}
                errorTerritorio={errores.territorioIds}
                ayudaRol={
                  cuentaActor.rol === 'A' ? 'Como Administrador solo puedes asignar roles inferiores al tuyo.' : undefined
                }
              />
            )}
            {pasoActual === 2 && (
              <PasoPermisos
                rol={rol}
                borrador={borrador}
                valores={valores}
                personalizados={personalizados}
                ampliaciones={ampliaciones}
                reducciones={reducciones}
                onCambiar={(clave, valor) => setOverrides((prev) => ({ ...prev, [clave]: valor }))}
              />
            )}
            {pasoActual === 3 && (
              <PasoPreview
                nombre={nombre.trim()}
                cedula={cedula.trim()}
                telefonoWhatsapp={telefonoWhatsapp.trim()}
                email={email.trim()}
                rol={rol}
                territorioIds={territorioIds}
                permisosEditables={editablesDelBorrador}
                valores={valores}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {errorGuardado && (
          <p role="alert" className="text-sm text-red-600">
            {errorGuardado}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <p className="max-w-lg text-xs leading-relaxed text-texto-suave">
            La cuenta nace <strong className="text-grafito/90">provisional</strong>: el sistema genera
            un PIN temporal de un solo uso y la persona debe cambiarlo en su primer login. Quien crea
            la cuenta nunca conoce el PIN permanente de otro.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variante="secundario" onClick={cancelar}>
              Cancelar
            </Button>
            {pasoActual > 0 && (
              <Button variante="ejecutivo-suave" onClick={atras}>
                Atrás
              </Button>
            )}
            {pasoActual < PASOS.length - 1 && (
              <Button variante="ejecutivo" onClick={siguiente}>
                Siguiente
              </Button>
            )}
            {pasoActual === PASOS.length - 1 && (
              <Button variante="ejecutivo" onClick={guardar} disabled={guardando}>
                {guardando
                  ? 'Creando…'
                  : ampliaciones.length > 0
                    ? 'Crear y enviar ampliaciones a aprobación'
                    : 'Crear cuenta'}
              </Button>
            )}
          </div>
        </div>

        <Modal
          abierto={creada !== null}
          titulo="Cuenta creada"
          onCerrar={() => navigate(`/PW-04/cuenta/${creada?.cuenta.id}`)}
          acciones={
            <Button variante="ejecutivo" onClick={() => navigate(`/PW-04/cuenta/${creada?.cuenta.id}`)}>
              Ver la ficha
            </Button>
          }
          descripcion={
            creada && (
              <>
                <strong className="text-grafito">{creada.cuenta.nombre}</strong> ya puede entrar al
                portal con su cédula y el PIN temporal de abajo. El PIN se muestra una sola vez.
              </>
            )
          }
        >
          {creada && (
            <div className="flex flex-col gap-4">
              <div className="rounded-[16px] border border-ambar/30 bg-ambar/10 px-5 py-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-ambar">PIN temporal</p>
                <p className="mt-1 font-heading text-3xl font-extrabold tracking-[0.35em] text-grafito">
                  {creada.pinTemporal}
                </p>
              </div>
              {creada.resultado.aplicados.length > 0 && (
                <p className="text-sm text-texto-suave">
                  <Badge tono="exito">Aplicado</Badge>{' '}
                  {creada.resultado.aplicados.length} permiso(s) reducidos respecto a la plantilla,
                  vigentes desde ya.
                </p>
              )}
              {creada.resultado.enviadosAFirma.length > 0 && (
                <div className="text-sm text-texto-suave">
                  <p>
                    <Badge tono="pendiente">Pendiente</Badge> Estas ampliaciones esperan la firma de
                    otro Superadministrador. Mientras tanto la cuenta opera sin ellas:
                  </p>
                  <ul className="mt-2 flex flex-col gap-1 pl-1">
                    {creada.resultado.enviadosAFirma.map((cambio) => (
                      <li key={cambio.clave} className="text-xs text-grafito/80">
                        · {permisoPorClave(cambio.clave)?.etiqueta ?? cambio.clave}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Modal>

        {modal}
      </div>
    </AppShell>
  )
}
