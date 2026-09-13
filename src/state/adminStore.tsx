import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Rol } from '../data/roles'
import { CUENTAS_SEED, type CuentaAdmin, type EstadoCuenta } from '../data/cuentas'
import { SOLICITUDES_SEED, type SolicitudPermiso } from '../data/solicitudes'
import { AUDITORIA_SEED, type EntradaAuditoria, type TipoEvento } from '../data/auditoria'
import { permisosEfectivos, separarCambios, type CambioPropuesto } from '../dominio/permisos'
import { escribirJSON, leerJSON } from './storage'

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

const CLAVE_CUENTAS = 'pw04:cuentas'
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
  solicitudes: SolicitudPermiso[]
  auditoria: EntradaAuditoria[]
  cuentaPorId: (id: string) => CuentaAdmin | undefined
  auditoriaDe: (cuentaId: string) => EntradaAuditoria[]
  crearCuenta: (actorId: string, datos: DatosNuevaCuenta, overrides: Record<string, boolean>) => { cuenta: CuentaAdmin; pinTemporal: string; resultado: ResultadoEdicion }
  editarPermisos: (actorId: string, cuentaId: string, cambios: CambioPropuesto[], motivo: string) => ResultadoEdicion
  editarIdentidad: (actorId: string, cuentaId: string, datos: Partial<Pick<CuentaAdmin, 'nombre' | 'email' | 'telefonoWhatsapp' | 'territorioIds'>>) => void
  cambiarRol: (actorId: string, cuentaId: string, rol: Rol, motivo: string) => void
  cambiarEstado: (actorId: string, cuentaId: string, estado: EstadoCuenta, motivo: string) => void
  resolverSolicitud: (actorId: string, solicitudId: string, aprobar: boolean, motivoRechazo?: string) => void
  reiniciarDemo: () => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

// PW-04: "el sistema genera un PIN temporal de un solo uso; el nuevo usuario debe cambiarlo
// en su primer login. Quien crea la cuenta nunca conoce el PIN permanente de otro."
function generarPinTemporal(): string {
  const digitos = new Uint8Array(6)
  crypto.getRandomValues(digitos)
  return Array.from(digitos, (d) => (d % 10).toString()).join('')
}

function nuevoId(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID().slice(0, 8)}`
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [cuentas, setCuentas] = useState<CuentaAdmin[]>(() => leerJSON(CLAVE_CUENTAS, CUENTAS_SEED))
  const [solicitudes, setSolicitudes] = useState<SolicitudPermiso[]>(() =>
    leerJSON(CLAVE_SOLICITUDES, SOLICITUDES_SEED),
  )
  const [auditoria, setAuditoria] = useState<EntradaAuditoria[]>(() =>
    leerJSON(CLAVE_AUDITORIA, AUDITORIA_SEED),
  )

  const guardarCuentas = useCallback((siguiente: CuentaAdmin[]) => {
    setCuentas(siguiente)
    escribirJSON(CLAVE_CUENTAS, siguiente)
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
  */
  const editarPermisos = useCallback(
    (actorId: string, cuentaId: string, cambios: CambioPropuesto[], motivo: string): ResultadoEdicion => {
      const cuenta = cuentas.find((c) => c.id === cuentaId)
      if (!cuenta) return { aplicados: [], enviadosAFirma: [] }

      const { inmediatos, requierenFirma } = separarCambios(cuenta, cambios)
      const efectivosAntes = permisosEfectivos(cuenta)

      if (inmediatos.length > 0) {
        const overrides = { ...cuenta.overrides }
        for (const cambio of inmediatos) overrides[cambio.clave] = cambio.valorNuevo
        guardarCuentas(
          cuentas.map((c) =>
            c.id === cuentaId ? { ...c, overrides, fechaEdicion: hoyISO() } : c,
          ),
        )
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
    (actorId: string, datos: DatosNuevaCuenta, overridesPropuestos: Record<string, boolean>) => {
      const pinTemporal = generarPinTemporal()
      const cuenta: CuentaAdmin = {
        id: nuevoId('c'),
        nombre: datos.nombre,
        cedula: datos.cedula,
        email: datos.email,
        telefonoWhatsapp: datos.telefonoWhatsapp,
        rol: datos.rol,
        estado: 'provisional',
        territorioIds: datos.territorioIds,
        overrides: {},
        fechaCreacion: hoyISO(),
        fechaEdicion: hoyISO(),
        creadoPor: actorId,
        ultimoAcceso: null,
      }

      /*
        PW-04: "Al elegir el rol, el editor se precarga con la plantilla default de ese rol —
        si quien crea la cuenta no toca nada más, guarda así, sin fricción adicional
        (`roles:assign`, sin Doble Firma). Solo si decide personalizar un permiso puntual por
        encima o por debajo del default en ese mismo momento, esa acción puntual exige Doble
        Firma (`permissions:edit`) — la misma regla aplica sin importar si la cuenta es nueva
        o existente; reutilizar la pantalla no relaja ni endurece la regla."

        Con el matiz de Q-1255 encima: de esas personalizaciones, solo las ampliaciones
        esperan firma. Las reducciones entran con la cuenta.
      */
      const cambios: CambioPropuesto[] = Object.entries(overridesPropuestos).map(([clave, valorNuevo]) => ({
        clave,
        valorNuevo,
      }))
      const { inmediatos, requierenFirma } = separarCambios(cuenta, cambios)
      const efectivosBase = permisosEfectivos(cuenta)
      for (const cambio of inmediatos) cuenta.overrides[cambio.clave] = cambio.valorNuevo

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
    (_actorId: string, cuentaId: string, datos: Partial<CuentaAdmin>) => {
      guardarCuentas(
        cuentas.map((c) => (c.id === cuentaId ? { ...c, ...datos, fechaEdicion: hoyISO() } : c)),
      )
    },
    [cuentas, guardarCuentas],
  )

  const cambiarRol = useCallback(
    (actorId: string, cuentaId: string, rol: Rol, motivo: string) => {
      const cuenta = cuentas.find((c) => c.id === cuentaId)
      if (!cuenta || cuenta.rol === rol) return
      /*
        Al cambiar de rol los overrides individuales se descartan: estaban expresados como
        "diferencia respecto a la plantilla ANTERIOR" y contra la nueva significarían otra
        cosa. Es una lectura de M02 Q-0050 de este demo, no una decisión de la bóveda —
        PW-04 no dice qué pasa con los overrides en un ascenso.
      */
      guardarCuentas(
        cuentas.map((c) =>
          c.id === cuentaId ? { ...c, rol, overrides: {}, fechaEdicion: hoyISO() } : c,
        ),
      )
      registrar([
        { tipo: 'cambio_rol', actorId, cuentaAfectadaId: cuentaId, motivo, conDobleFirma: false },
      ])
    },
    [cuentas, guardarCuentas, registrar],
  )

  const cambiarEstado = useCallback(
    (actorId: string, cuentaId: string, estado: EstadoCuenta, motivo: string) => {
      guardarCuentas(
        cuentas.map((c) => (c.id === cuentaId ? { ...c, estado, fechaEdicion: hoyISO() } : c)),
      )
      registrar([
        {
          tipo: estado === 'inactiva' ? 'cuenta_desactivada' : 'cambio_rol',
          actorId,
          cuentaAfectadaId: cuentaId,
          motivo,
          conDobleFirma: false,
        },
      ])
    },
    [cuentas, guardarCuentas, registrar],
  )

  const resolverSolicitud = useCallback(
    (actorId: string, solicitudId: string, aprobar: boolean, motivoRechazo?: string) => {
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

      if (aprobar) {
        guardarCuentas(
          cuentas.map((c) =>
            c.id === solicitud.cuentaObjetivoId
              ? {
                  ...c,
                  overrides: { ...c.overrides, [solicitud.permisoClave]: solicitud.valorNuevo },
                  fechaEdicion: hoyISO(),
                }
              : c,
          ),
        )
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

  const reiniciarDemo = useCallback(() => {
    guardarCuentas(CUENTAS_SEED)
    guardarSolicitudes(SOLICITUDES_SEED)
    setAuditoria(AUDITORIA_SEED)
    escribirJSON(CLAVE_AUDITORIA, AUDITORIA_SEED)
  }, [guardarCuentas, guardarSolicitudes])

  const valor = useMemo<AdminContextValue>(
    () => ({
      cuentas,
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
    }),
    [
      cuentas,
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
    ],
  )

  return <AdminContext.Provider value={valor}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminContextValue {
  const contexto = useContext(AdminContext)
  if (!contexto) throw new Error('useAdmin debe usarse dentro de <AdminProvider>')
  return contexto
}
