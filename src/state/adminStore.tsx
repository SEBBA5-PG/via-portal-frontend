import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Rol } from '../data/roles'
import type { CuentaAdmin, EstadoCuenta } from '../data/cuentas'
import { SOLICITUDES_SEED, type SolicitudPermiso } from '../data/solicitudes'
import {
  AUDITORIA_SEED,
  type EntradaAuditoria,
  type NuevaEntradaAuditoria,
  type TipoEvento,
} from '../data/auditoria'
import { permisosEfectivos, separarCambios, type CambioPropuesto } from '../dominio/permisos'
import { crearCuentaBackend, editarCuentaBackend, listarCuentasBackend } from '../lib/cuentasApi'
import { escribirJSON, leerJSON } from './storage'
import { useAuth } from './authStore'

/*
  Estado de PW-04 (cuentas administrativas, solicitudes de Doble Firma y auditoría).

  Vive aparte de authStore a propósito: authStore resuelve QUIÉN entra al portal (PW-01) y
  este resuelve QUÉ puede hacer y sobre quién (PW-04). Cuando exista el backend, este es el
  que desaparece entero y se reemplaza por llamadas a la API — authStore también, pero por
  otras razones y probablemente en otro momento.

  La IP que se registra en auditoría es un valor fijo de demo: el navegador no conoce su IP
  pública, y el registro real lo hace el servidor.
*/

const IP_DEMO = '190.24.10.55'

const CLAVE_SOLICITUDES = 'pw04:solicitudes'
const CLAVE_AUDITORIA = 'pw04:auditoria'

export interface DatosNuevaCuenta {
  nombre: string
  cedula: string
  email: string
  telefonoWhatsapp: string
  rol: Rol
  territorioIds: string[]
}

export interface ResultadoEdicion {
  aplicados: CambioPropuesto[]
  enviadosAFirma: CambioPropuesto[]
}

interface AdminContextValue {
  cuentas: CuentaAdmin[]
  // true mientras la carga inicial de /api/cuentas está en vuelo. CuentasPage lo usa para no
  // mostrar "0 cuentas" como si fuera un resultado real mientras el backend responde.
  cargandoCuentas: boolean
  solicitudes: SolicitudPermiso[]
  auditoria: EntradaAuditoria[]
  cuentaPorId: (id: string) => CuentaAdmin | undefined
  auditoriaDe: (cuentaId: string) => EntradaAuditoria[]
  crearCuenta: (actorId: string, datos: DatosNuevaCuenta, overrides: Record<string, boolean>) => Promise<{ cuenta: CuentaAdmin; pinTemporal: string; resultado: ResultadoEdicion }>
  editarPermisos: (actorId: string, cuentaId: string, cambios: CambioPropuesto[], motivo: string) => Promise<ResultadoEdicion>
  editarIdentidad: (actorId: string, cuentaId: string, datos: Partial<Pick<CuentaAdmin, 'nombre' | 'email' | 'telefonoWhatsapp' | 'territorioIds'>>) => Promise<void>
  cambiarRol: (actorId: string, cuentaId: string, rol: Rol, motivo: string) => Promise<void>
  cambiarEstado: (actorId: string, cuentaId: string, estado: EstadoCuenta, motivo: string) => Promise<void>
  resolverSolicitud: (actorId: string, solicitudId: string, aprobar: boolean, motivoRechazo?: string) => Promise<void>
  reiniciarDemo: () => void
  // Punto único de escritura en audit_logs para las demás categorías (PW-03, PW-05): el
  // registro es uno solo, no uno por categoría.
  registrarEvento: (entradas: NuevaEntradaAuditoria[]) => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

// El PIN temporal ya no lo genera el frontend: PW-04 dice que "el sistema" lo genera, y con
// backend real ese sistema es conexion-api — POST /api/cuentas ya lo devuelve.
function nuevoId(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID().slice(0, 8)}`
}

export function AdminProvider({ children }: { children: ReactNode }) {
  // Las cuentas ya no se siembran de un mock local: nacen vacías y se pueblan desde
  // conexion-api (ver el useEffect de abajo). `solicitudes` y `auditoria` siguen 100% en
  // localStorage — la bandeja de Doble Firma real es trabajo pendiente en el backend hermano.
  const auth = useAuth()
  const usuarioId = auth.usuarioActual?.id ?? null
  const [cuentas, setCuentas] = useState<CuentaAdmin[]>([])
  const [cargandoCuentas, setCargandoCuentas] = useState(true)
  const [solicitudes, setSolicitudes] = useState<SolicitudPermiso[]>(() =>
    leerJSON(CLAVE_SOLICITUDES, SOLICITUDES_SEED),
  )
  const [auditoria, setAuditoria] = useState<EntradaAuditoria[]>(() =>
    leerJSON(CLAVE_AUDITORIA, AUDITORIA_SEED),
  )

  useEffect(() => {
    // Sin sesión (aún no hizo login, o acaba de cerrar sesión) no hay cookie de Sanctum con
    // la que pedir /api/cuentas — esperar a que authStore resuelva un usuarioActual antes de
    // llamar al backend. Re-dispara en cada cambio de sesión (login, logout, cambio de
    // usuario en dos pestañas) para no quedarse con la respuesta 401 del primer montaje.
    if (usuarioId === null) {
      setCuentas([])
      setCargandoCuentas(false)
      return
    }
    let cancelado = false
    setCargandoCuentas(true)
    listarCuentasBackend()
      .then((recibidas) => {
        if (!cancelado) setCuentas(recibidas)
      })
      .finally(() => {
        if (!cancelado) setCargandoCuentas(false)
      })
    return () => {
      cancelado = true
    }
  }, [usuarioId])

  // Ya no hay un `guardarCuentas` que persista en localStorage: cada mutación de cuentas pasa
  // por conexion-api (crearCuentaBackend/editarCuentaBackend) y esta función solo refleja la
  // respuesta del servidor en el estado local.
  const guardarCuentas = useCallback((siguiente: CuentaAdmin[]) => {
    setCuentas(siguiente)
  }, [])

  const guardarSolicitudes = useCallback((siguiente: SolicitudPermiso[]) => {
    setSolicitudes(siguiente)
    escribirJSON(CLAVE_SOLICITUDES, siguiente)
  }, [])

  // `audit_logs` es inmutable: solo se le antepone. Nunca se edita ni se borra una entrada.
  const registrar = useCallback(
    (entradas: Omit<EntradaAuditoria, 'id' | 'timestamp' | 'ip'>[]) => {
      if (entradas.length === 0) return
      setAuditoria((previas) => {
        const nuevas: EntradaAuditoria[] = entradas.map((e) => ({
          ...e,
          id: nuevoId('a'),
          ip: IP_DEMO,
          timestamp: Date.now(),
        }))
        const siguiente = [...nuevas, ...previas]
        escribirJSON(CLAVE_AUDITORIA, siguiente)
        return siguiente
      })
    },
    [],
  )

  const cuentaPorId = useCallback((id: string) => cuentas.find((c) => c.id === id), [cuentas])

  const auditoriaDe = useCallback(
    (cuentaId: string) => auditoria.filter((e) => e.cuentaAfectadaId === cuentaId),
    [auditoria],
  )

  /*
    Aplica una tanda de cambios de permisos sobre una cuenta. Q-1255: las reducciones se
    escriben al instante en `overrides`, las ampliaciones no tocan la cuenta — se convierten
    en filas de `solicitudes_de_permiso` y la cuenta sigue con su valor anterior vigente.

    Los inmediatos ahora se persisten contra conexion-api (PATCH /api/cuentas/:id). Las
    ampliaciones que requieren Doble Firma siguen encoladas en `solicitudes`, que NO CAMBIA:
    sigue en localStorage exactamente igual que hoy.
    // Pendiente: Doble Firma real en conexion-api — por ahora la bandeja de aprobación sigue
    // simulada aquí.
  */
  const editarPermisos = useCallback(
    async (actorId: string, cuentaId: string, cambios: CambioPropuesto[], motivo: string): Promise<ResultadoEdicion> => {
      const cuenta = cuentas.find((c) => c.id === cuentaId)
      if (!cuenta) return { aplicados: [], enviadosAFirma: [] }

      const { inmediatos, requierenFirma } = separarCambios(cuenta, cambios)
      const efectivosAntes = permisosEfectivos(cuenta)

      if (inmediatos.length > 0) {
        const overrides = { ...cuenta.overrides }
        for (const cambio of inmediatos) overrides[cambio.clave] = cambio.valorNuevo
        try {
          const actualizada = await editarCuentaBackend(cuentaId, { overrides })
          guardarCuentas(cuentas.map((c) => (c.id === cuentaId ? actualizada : c)))
        } catch {
          // Sin backend disponible, no hay nada más que este cliente pueda hacer: la
          // mutación simplemente no queda persistida y el estado local no cambia.
          return { aplicados: [], enviadosAFirma: [] }
        }
      }

      if (requierenFirma.length > 0) {
        const nuevas: SolicitudPermiso[] = requierenFirma.map((cambio) => ({
          id: nuevoId('s'),
          makerId: actorId,
          cuentaObjetivoId: cuentaId,
          permisoClave: cambio.clave,
          valorNuevo: cambio.valorNuevo,
          valorVigente: efectivosAntes[cambio.clave] === true,
          motivo,
          timestamp: Date.now(),
          estado: 'pendiente',
        }))
        guardarSolicitudes([...nuevas, ...solicitudes])
      }

      registrar([
        ...inmediatos.map((cambio) => ({
          tipo: 'cambio_permiso' as TipoEvento,
          actorId,
          cuentaAfectadaId: cuentaId,
          permisoClave: cambio.clave,
          valorAnterior: efectivosAntes[cambio.clave] === true,
          valorNuevo: cambio.valorNuevo,
          motivo,
          conDobleFirma: false,
        })),
        ...requierenFirma.map((cambio) => ({
          tipo: 'solicitud_creada' as TipoEvento,
          actorId,
          cuentaAfectadaId: cuentaId,
          permisoClave: cambio.clave,
          valorAnterior: efectivosAntes[cambio.clave] === true,
          valorNuevo: cambio.valorNuevo,
          motivo,
          conDobleFirma: true,
        })),
      ])

      return { aplicados: inmediatos, enviadosAFirma: requierenFirma }
    },
    [cuentas, solicitudes, guardarCuentas, guardarSolicitudes, registrar],
  )

  const crearCuenta = useCallback(
    async (actorId: string, datos: DatosNuevaCuenta, overridesPropuestos: Record<string, boolean>) => {
      /*
        PW-04: "Al elegir el rol, el editor se precarga con la plantilla default de ese rol —
        si quien crea la cuenta no toca nada más, guarda así, sin fricción adicional
        (`roles:assign`, sin Doble Firma). Solo si decide personalizar un permiso puntual por
        encima o por debajo del default en ese mismo momento, esa acción puntual exige Doble
        Firma (`permissions:edit`) — la misma regla aplica sin importar si la cuenta es nueva
        o existente; reutilizar la pantalla no relaja ni endurece la regla."

        Con el matiz de Q-1255 encima: de esas personalizaciones, solo las ampliaciones
        esperan firma. Las reducciones entran con la cuenta, y son las únicas que viajan en
        `overrides` al backend — las ampliaciones no tocan la cuenta hasta que se aprueben.
      */
      const borrador: CuentaAdmin = {
        id: 'nueva',
        nombre: datos.nombre,
        cedula: datos.cedula,
        email: datos.email,
        telefonoWhatsapp: datos.telefonoWhatsapp,
        rol: datos.rol,
        estado: 'provisional',
        territorioIds: datos.territorioIds,
        overrides: {},
        fechaCreacion: '',
        fechaEdicion: '',
        creadoPor: actorId,
        ultimoAcceso: null,
      }

      const cambios: CambioPropuesto[] = Object.entries(overridesPropuestos).map(([clave, valorNuevo]) => ({
        clave,
        valorNuevo,
      }))
      const { inmediatos, requierenFirma } = separarCambios(borrador, cambios)
      const efectivosBase = permisosEfectivos(borrador)
      const overridesInmediatos: Record<string, boolean> = {}
      for (const cambio of inmediatos) overridesInmediatos[cambio.clave] = cambio.valorNuevo

      const { cuenta, pinTemporal } = await crearCuentaBackend({
        nombre: datos.nombre,
        cedula: datos.cedula,
        email: datos.email,
        telefonoWhatsapp: datos.telefonoWhatsapp,
        rol: datos.rol,
        territorioIds: datos.territorioIds,
        overrides: overridesInmediatos,
      })

      guardarCuentas([...cuentas, cuenta])

      if (requierenFirma.length > 0) {
        guardarSolicitudes([
          ...requierenFirma.map((cambio) => ({
            id: nuevoId('s'),
            makerId: actorId,
            cuentaObjetivoId: cuenta.id,
            permisoClave: cambio.clave,
            valorNuevo: cambio.valorNuevo,
            valorVigente: efectivosBase[cambio.clave] === true,
            motivo: 'Personalización de permisos durante el alta de la cuenta.',
            timestamp: Date.now(),
            estado: 'pendiente' as const,
          })),
          ...solicitudes,
        ])
      }

      registrar([
        { tipo: 'cuenta_creada', actorId, cuentaAfectadaId: cuenta.id, conDobleFirma: false },
        ...inmediatos.map((cambio) => ({
          tipo: 'cambio_permiso' as TipoEvento,
          actorId,
          cuentaAfectadaId: cuenta.id,
          permisoClave: cambio.clave,
          valorAnterior: efectivosBase[cambio.clave] === true,
          valorNuevo: cambio.valorNuevo,
          motivo: 'Personalización durante el alta.',
          conDobleFirma: false,
        })),
        ...requierenFirma.map((cambio) => ({
          tipo: 'solicitud_creada' as TipoEvento,
          actorId,
          cuentaAfectadaId: cuenta.id,
          permisoClave: cambio.clave,
          valorAnterior: efectivosBase[cambio.clave] === true,
          valorNuevo: cambio.valorNuevo,
          motivo: 'Personalización durante el alta.',
          conDobleFirma: true,
        })),
      ])

      return {
        cuenta,
        pinTemporal,
        resultado: { aplicados: inmediatos, enviadosAFirma: requierenFirma },
      }
    },
    [cuentas, solicitudes, guardarCuentas, guardarSolicitudes, registrar],
  )

  const editarIdentidad = useCallback(
    async (_actorId: string, cuentaId: string, datos: Partial<CuentaAdmin>) => {
      try {
        const actualizada = await editarCuentaBackend(cuentaId, datos)
        guardarCuentas(cuentas.map((c) => (c.id === cuentaId ? actualizada : c)))
      } catch {
        // Sin backend disponible, la edición no queda persistida — el estado local no cambia.
      }
    },
    [cuentas, guardarCuentas],
  )

  const cambiarRol = useCallback(
    async (actorId: string, cuentaId: string, rol: Rol, motivo: string) => {
      const cuenta = cuentas.find((c) => c.id === cuentaId)
      if (!cuenta || cuenta.rol === rol) return
      /*
        Al cambiar de rol los overrides individuales se descartan: estaban expresados como
        "diferencia respecto a la plantilla ANTERIOR" y contra la nueva significarían otra
        cosa. Es una lectura de M02 Q-0050 de este demo, no una decisión de la bóveda —
        PW-04 no dice qué pasa con los overrides en un ascenso.
      */
      try {
        const actualizada = await editarCuentaBackend(cuentaId, { rol, overrides: {} })
        guardarCuentas(cuentas.map((c) => (c.id === cuentaId ? actualizada : c)))
        registrar([
          { tipo: 'cambio_rol', actorId, cuentaAfectadaId: cuentaId, motivo, conDobleFirma: false },
        ])
      } catch {
        // Sin backend disponible, el cambio de rol no queda persistido.
      }
    },
    [cuentas, guardarCuentas, registrar],
  )

  const cambiarEstado = useCallback(
    async (actorId: string, cuentaId: string, estado: EstadoCuenta, motivo: string) => {
      try {
        const actualizada = await editarCuentaBackend(cuentaId, { estado })
        guardarCuentas(cuentas.map((c) => (c.id === cuentaId ? actualizada : c)))
        registrar([
          {
            tipo: estado === 'inactiva' ? 'cuenta_desactivada' : 'cambio_rol',
            actorId,
            cuentaAfectadaId: cuentaId,
            motivo,
            conDobleFirma: false,
          },
        ])
      } catch {
        // Sin backend disponible, el cambio de estado no queda persistido.
      }
    },
    [cuentas, guardarCuentas, registrar],
  )

  const resolverSolicitud = useCallback(
    async (actorId: string, solicitudId: string, aprobar: boolean, motivoRechazo?: string) => {
      const solicitud = solicitudes.find((s) => s.id === solicitudId)
      if (!solicitud || solicitud.estado !== 'pendiente') return

      guardarSolicitudes(
        solicitudes.map((s) =>
          s.id === solicitudId
            ? {
                ...s,
                estado: aprobar ? ('aprobada' as const) : ('rechazada' as const),
                checkerId: actorId,
                fechaResolucion: Date.now(),
                motivoRechazo: aprobar ? undefined : motivoRechazo,
              }
            : s,
        ),
      )

      // Pendiente: Doble Firma real en conexion-api — por ahora la bandeja de aprobación
      // sigue simulada aquí; al aprobar, sí se persiste el override resultante en la cuenta.
      if (aprobar) {
        const cuenta = cuentas.find((c) => c.id === solicitud.cuentaObjetivoId)
        if (cuenta) {
          try {
            const actualizada = await editarCuentaBackend(cuenta.id, {
              overrides: { ...cuenta.overrides, [solicitud.permisoClave]: solicitud.valorNuevo },
            })
            guardarCuentas(cuentas.map((c) => (c.id === cuenta.id ? actualizada : c)))
          } catch {
            // Sin backend disponible, la aprobación no queda persistida en la cuenta.
          }
        }
      }

      registrar([
        {
          tipo: aprobar ? 'solicitud_aprobada' : 'solicitud_rechazada',
          // El actor del cambio es quien lo propuso; el checker va en su propio campo. Si se
          // registrara al checker como actor, el rastro perdería a la persona que pidió la
          // ampliación, que es justo a quien hay que poder señalar después.
          actorId: solicitud.makerId,
          cuentaAfectadaId: solicitud.cuentaObjetivoId,
          permisoClave: solicitud.permisoClave,
          valorAnterior: solicitud.valorVigente,
          valorNuevo: aprobar ? solicitud.valorNuevo : solicitud.valorVigente,
          motivo: aprobar ? solicitud.motivo : motivoRechazo,
          // Q-1255 pide que audit_logs distinga si una entrada se aplicó sola o tras un
          // segundo firmante. Esta siempre pasó por dos personas.
          conDobleFirma: true,
          checkerId: actorId,
        },
      ])
    },
    [cuentas, solicitudes, guardarCuentas, guardarSolicitudes, registrar],
  )

  /*
    Las cuentas ya no son un seed local: reiniciar el demo no tiene forma de "restaurarlas"
    sin backend, así que este botón queda limitado a lo que sí sigue siendo local —
    solicitudes y auditoría. Cuentas se recargarían con un refresh de página (vuelve a
    disparar el useEffect de listarCuentasBackend).
  */
  const reiniciarDemo = useCallback(() => {
    guardarSolicitudes(SOLICITUDES_SEED)
    setAuditoria(AUDITORIA_SEED)
    escribirJSON(CLAVE_AUDITORIA, AUDITORIA_SEED)
  }, [guardarSolicitudes])

  const valor = useMemo<AdminContextValue>(
    () => ({
      cuentas,
      cargandoCuentas,
      solicitudes,
      auditoria,
      cuentaPorId,
      auditoriaDe,
      crearCuenta,
      editarPermisos,
      editarIdentidad,
      cambiarRol,
      cambiarEstado,
      resolverSolicitud,
      reiniciarDemo,
      registrarEvento: registrar,
    }),
    [
      cuentas,
      cargandoCuentas,
      solicitudes,
      auditoria,
      cuentaPorId,
      auditoriaDe,
      crearCuenta,
      editarPermisos,
      editarIdentidad,
      cambiarRol,
      cambiarEstado,
      resolverSolicitud,
      reiniciarDemo,
      registrar,
    ],
  )

  return <AdminContext.Provider value={valor}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminContextValue {
  const contexto = useContext(AdminContext)
  if (!contexto) throw new Error('useAdmin debe usarse dentro de <AdminProvider>')
  return contexto
}
