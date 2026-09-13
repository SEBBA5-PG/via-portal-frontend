import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { PW04Layout } from './PW04Layout'
import { EditorPermisos } from './EditorPermisos'
import { SelectorTerritorio } from './SelectorTerritorio'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { SelectField } from '../../components/ui/SelectField'
import { Superficie, CabeceraSuperficie } from '../../components/ui/Superficie'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../state/authStore'
import { useAdmin, type ResultadoEdicion } from '../../state/adminStore'
import { ROLES, type Rol } from '../../data/roles'
import { plantillaDe, permisoPorClave } from '../../data/permisos'
import type { CuentaAdmin } from '../../data/cuentas'
import { puedeAsignarRol, puedeCrearCuentas } from '../../dominio/permisos'

/*
  Alta de cuenta administrativa. PW-04 es explícito en que NO son varios pasos:

    "El flujo real es una sola pantalla continua: captura de datos de identidad → sin salir
     de ahí, selector de rol + selector de territorio + el mismo editor de permisos que se
     usa para personalizar una cuenta ya existente."

  Y en el coste de tocar el editor durante el alta:

    "Al elegir el rol, el editor se precarga con la plantilla default de ese rol — si quien
     crea la cuenta no toca nada más, guarda así, sin fricción adicional (roles:assign, sin
     Doble Firma). Solo si decide personalizar un permiso puntual [...] esa acción puntual
     exige Doble Firma (permissions:edit)."

  Con el matiz de Q-1255 encima: de esas personalizaciones, solo las AMPLIACIONES esperan un
  segundo firmante. Las reducciones entran con la cuenta.
*/

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

  const [nombre, setNombre] = useState('')
  const [cedula, setCedula] = useState('')
  const [email, setEmail] = useState('')
  const [telefonoWhatsapp, setTelefonoWhatsapp] = useState('')
  const [rol, setRol] = useState<Rol>('C')
  const [territorioIds, setTerritorioIds] = useState<string[]>([])
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [errores, setErrores] = useState<Errores>({})
  const [creada, setCreada] = useState<{ cuenta: CuentaAdmin; pinTemporal: string; resultado: ResultadoEdicion } | null>(null)

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

  if (!user || !cuentaActor) return null
  if (!puedeCrearCuentas(cuentaActor)) return <Navigate to="/PW-04" replace />

  const rolesDisponibles = (Object.keys(ROLES) as Rol[]).filter((r) => puedeAsignarRol(cuentaActor, r))

  const personalizados = Object.entries(overrides).filter(
    ([clave, valor]) => valor !== plantillaDe(rol)[clave],
  )
  const ampliaciones = personalizados.filter(([, valor]) => valor)
  const reducciones = personalizados.filter(([, valor]) => !valor)

  const validar = (): boolean => {
    const nuevos: Errores = {}
    if (nombre.trim().length < 5) nuevos.nombre = 'Escribe el nombre completo.'
    if (!/^\d{6,12}$/.test(cedula.trim())) nuevos.cedula = 'La cédula debe tener entre 6 y 12 dígitos.'
    else if (admin.cuentas.some((c) => c.cedula === cedula.trim()))
      nuevos.cedula = 'Ya existe una cuenta administrativa con esta cédula.'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nuevos.email = 'Correo inválido — es el respaldo de recuperación.'
    if (telefonoWhatsapp.trim().length < 10) nuevos.telefonoWhatsapp = 'Celular incompleto.'
    if (territorioIds.length === 0) nuevos.territorioIds = 'Asigna al menos un territorio.'
    setErrores(nuevos)
    return Object.keys(nuevos).length === 0
  }

  const guardar = () => {
    if (!validar()) return
    const resultado = admin.crearCuenta(
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
  }

  return (
    <PW04Layout
      titulo="Crear cuenta administrativa"
      descripcion="Una sola pantalla continua: identidad, rol, alcance territorial y permisos. Si no tocas los permisos, la cuenta se crea con la plantilla de su rol y sin fricción adicional."
      acciones={
        <Button variante="ejecutivo-suave" onClick={() => navigate('/PW-04')}>
          Cancelar
        </Button>
      }
    >
      <Superficie>
        <CabeceraSuperficie
          titulo="1 · Identidad"
          descripcion="La cédula es el identificador de login del portal, no el celular. El correo es el respaldo de recuperación. La mayoría de edad la verifica Recursos Humanos antes del alta: no hay campo de fecha de nacimiento en el sistema."
        />
        <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
          <TextField
            etiqueta="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            error={errores.nombre}
            autoComplete="off"
          />
          <TextField
            etiqueta="Cédula de ciudadanía"
            value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            error={errores.cedula}
            ayuda="Solo Colombia — el sistema no maneja tipo de documento ni país emisor."
            autoComplete="off"
          />
          <TextField
            etiqueta="Celular"
            value={telefonoWhatsapp}
            onChange={(e) => setTelefonoWhatsapp(e.target.value)}
            error={errores.telefonoWhatsapp}
            ayuda={
              rol === 'C'
                ? 'Para Coordinador queda reservado solo a recuperación de PIN: no hace 2FA.'
                : 'Canal de 2FA en cada login (OTP por WhatsApp).'
            }
            autoComplete="off"
          />
          <TextField
            etiqueta="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errores.email}
            autoComplete="off"
          />
        </div>
      </Superficie>

      <Superficie>
        <CabeceraSuperficie
          titulo="2 · Rol y alcance"
          descripcion="El rol define la plantilla de permisos por defecto. El territorio va por cuenta, no por permiso: marcar Colombia es el alcance global."
        />
        <div className="flex flex-col gap-6 px-6 py-6">
          <div className="max-w-sm">
            <SelectField
              etiqueta="Rol administrativo"
              value={rol}
              onChange={(e) => {
                setRol(e.target.value as Rol)
                // Cambiar de rol reinicia las personalizaciones: estaban expresadas como
                // diferencia contra la plantilla anterior y contra la nueva dirían otra cosa.
                setOverrides({})
              }}
              opciones={rolesDisponibles.map((r) => ({ valor: r, etiqueta: ROLES[r] }))}
              ayuda={
                cuentaActor.rol === 'A'
                  ? 'Como Administrador solo puedes asignar roles inferiores al tuyo.'
                  : 'Un usuario tiene un solo rol administrativo a la vez.'
              }
            />
          </div>
          <div>
            <p className="mb-2 font-heading text-sm font-bold text-grafito">Alcance territorial</p>
            <SelectorTerritorio seleccionados={territorioIds} onCambiar={setTerritorioIds} />
            {errores.territorioIds && (
              <p role="alert" className="mt-2 text-sm text-red-400">
                {errores.territorioIds}
              </p>
            )}
          </div>
        </div>
      </Superficie>

      <Superficie>
        <CabeceraSuperficie
          titulo="3 · Permisos"
          descripcion={`Precargado con la plantilla de ${ROLES[rol]}. Cada permiso que amplíes por encima de ese default se enviará a la firma de un segundo Superadministrador; los que reduzcas entran con la cuenta.`}
          acciones={
            personalizados.length > 0 ? (
              <span className="flex gap-2">
                {ampliaciones.length > 0 && <Badge tono="peligro">{ampliaciones.length} a firma</Badge>}
                {reducciones.length > 0 && <Badge tono="exito">{reducciones.length} inmediatas</Badge>}
              </span>
            ) : (
              <Badge tono="neutro">Plantilla sin cambios</Badge>
            )
          }
        />
        <div className="px-6 py-6">
          <EditorPermisos
            cuenta={borrador}
            valores={valores}
            solicitudes={[]}
            onCambiar={(clave, valor) => setOverrides((prev) => ({ ...prev, [clave]: valor }))}
          />
        </div>
      </Superficie>

      <div className="flex flex-wrap items-center justify-end gap-4 pb-4">
        <p className="mr-auto max-w-lg text-xs leading-relaxed text-texto-suave">
          La cuenta nace <strong className="text-grafito/90">provisional</strong>: el sistema genera
          un PIN temporal de un solo uso y la persona debe cambiarlo en su primer login. Quien crea
          la cuenta nunca conoce el PIN permanente de otro.
        </p>
        <Button variante="ejecutivo-suave" onClick={() => navigate('/PW-04')}>
          Cancelar
        </Button>
        <Button variante="ejecutivo" onClick={guardar}>
          {ampliaciones.length > 0 ? 'Crear y enviar ampliaciones a aprobación' : 'Crear cuenta'}
        </Button>
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
    </PW04Layout>
  )
}
