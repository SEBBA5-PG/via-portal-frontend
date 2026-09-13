import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useAdmin } from './adminStore'
import { escribirJSON, leerJSON } from './storage'
import { USUARIOS_APP_SEED, type MotivoBloqueo, type UsuarioApp } from '../data/usuariosApp'
import { MISIONES_SEED, type Mision, type PausaMision } from '../data/misiones'
import {
  SOLICITUDES_OPERACION_SEED,
  type AjusteBalance,
  type Impersonacion,
  type SolicitudOperacion,
  type TipoSolicitudOperacion,
} from '../data/operacion'
import { aliasEliminado } from '../dominio/usuarios'

/*
  Estado de la operación del portal: usuarios de la app (PW-03) y misiones (PW-05), más las
  solicitudes de Coordinador, los ajustes de balance con Doble Firma y la impersonación.

  Toda acción escribe en el mismo audit_logs de PW-04 vía `registrarEvento`: la auditoría es
  una sola para todo el portal (PW-16 la expone entera). Cuando exista el backend, este
  provider desaparece y cada acción pasa a ser una llamada a la API.
*/

const CLAVES = {
  usuarios: 'op:usuarios',
  misiones: 'op:misiones',
  solicitudes: 'op:solicitudes',
  ajustes: 'op:ajustes',
  impersonacion: 'op:impersonacion',
}

function nuevoId(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID().slice(0, 8)}`
}

function usePersistido<T>(clave: string, semilla: T) {
  const [valor, setValor] = useState<T>(() => leerJSON(clave, semilla))
  const actualizar = useCallback(
    (fn: (previo: T) => T) => {
      setValor((previo) => {
        const siguiente = fn(previo)
        escribirJSON(clave, siguiente)
        return siguiente
      })
    },
    [clave],
  )
  return [valor, actualizar] as const
}

interface OperacionContextValue {
  usuarios: UsuarioApp[]
  misiones: Mision[]
  solicitudes: SolicitudOperacion[]
  ajustes: AjusteBalance[]
  impersonacion: Impersonacion | null

  // PW-03
  bloquearUsuario: (actorId: string, usuarioId: string, motivo: MotivoBloqueo, nota: string) => void
  desbloquearUsuario: (actorId: string, usuarioId: string, nota: string) => void
  solicitarBloqueo: (actorId: string, usuarioId: string, motivo: string, nota: string) => void
  moderarAlias: (actorId: string, usuarioId: string) => void
  eliminarUsuario: (actorId: string, usuarioId: string, nota: string) => void
  fusionarUsuarios: (actorId: string, primariaId: string, secundariaId: string) => void
  iniciarImpersonacion: (actorId: string, usuarioId: string) => void
  terminarImpersonacion: () => void
  proponerAjuste: (actorId: string, usuarioId: string, delta: number, motivo: string) => void
  resolverAjuste: (actorId: string, ajusteId: string, aprobar: boolean) => void

  // PW-05
  guardarMision: (actorId: string, mision: Mision) => string
  enviarMision: (actorId: string, misionId: string, publicar: boolean) => void
  aprobarMision: (actorId: string, misionId: string) => void
  rechazarMision: (actorId: string, misionId: string, motivo: string) => void
  pausarMision: (actorId: string, misionId: string, pausa: Omit<PausaMision, 'desde'>) => void
  reanudarMision: (actorId: string, misionId: string) => void
  cancelarMision: (actorId: string, misionId: string, motivo: string) => void
  crearNuevaVersion: (actorId: string, mision: Mision) => void
  solicitarOperacionMision: (actorId: string, misionId: string, tipo: TipoSolicitudOperacion, motivo: string, nota: string) => void

  resolverSolicitudOperacion: (actorId: string, solicitudId: string, aprobar: boolean, motivoRechazo?: string) => void
  reiniciarOperacion: () => void
}

const OperacionContext = createContext<OperacionContextValue | null>(null)

export function OperacionProvider({ children }: { children: ReactNode }) {
  const { registrarEvento } = useAdmin()
  const [usuarios, setUsuarios] = usePersistido<UsuarioApp[]>(CLAVES.usuarios, USUARIOS_APP_SEED)
  const [misiones, setMisiones] = usePersistido<Mision[]>(CLAVES.misiones, MISIONES_SEED)
  const [solicitudes, setSolicitudes] = usePersistido<SolicitudOperacion[]>(CLAVES.solicitudes, SOLICITUDES_OPERACION_SEED)
  const [ajustes, setAjustes] = usePersistido<AjusteBalance[]>(CLAVES.ajustes, [])
  const [impersonacion, setImpersonacion] = usePersistido<Impersonacion | null>(CLAVES.impersonacion, null)

  const cambiarUsuario = useCallback(
    (id: string, cambios: Partial<UsuarioApp>) =>
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...cambios } : u))),
    [setUsuarios],
  )

  const cambiarMision = useCallback(
    (id: string, cambios: Partial<Mision>) =>
      setMisiones((prev) => prev.map((m) => (m.id === id ? { ...m, ...cambios, fechaEdicion: Date.now() } : m))),
    [setMisiones],
  )

  // ---------- PW-03 ----------

  const bloquearUsuario = useCallback(
    (actorId: string, usuarioId: string, motivo: MotivoBloqueo, nota: string) => {
      cambiarUsuario(usuarioId, { estado: 'bloqueada', motivoBloqueo: motivo })
      registrarEvento([{ tipo: 'usuario_bloqueado', actorId, usuarioAppId: usuarioId, motivo: nota, detalle: motivo, conDobleFirma: false }])
    },
    [cambiarUsuario, registrarEvento],
  )

  const desbloquearUsuario = useCallback(
    (actorId: string, usuarioId: string, nota: string) => {
      cambiarUsuario(usuarioId, { estado: 'activa', motivoBloqueo: undefined })
      registrarEvento([{ tipo: 'usuario_desbloqueado', actorId, usuarioAppId: usuarioId, motivo: nota, conDobleFirma: false }])
    },
    [cambiarUsuario, registrarEvento],
  )

  const solicitarBloqueo = useCallback(
    (actorId: string, usuarioId: string, motivo: string, nota: string) => {
      setSolicitudes((prev) => [
        { id: nuevoId('so'), tipo: 'bloqueo', objetivoId: usuarioId, solicitanteId: actorId, motivo, nota, timestamp: Date.now(), estado: 'pendiente' },
        ...prev,
      ])
      registrarEvento([{ tipo: 'bloqueo_solicitado', actorId, usuarioAppId: usuarioId, motivo: nota, detalle: motivo, conDobleFirma: false }])
    },
    [setSolicitudes, registrarEvento],
  )

  const moderarAlias = useCallback(
    (actorId: string, usuarioId: string) => {
      // wiki §Moderación: "forzar un alias por defecto".
      const nuevo = `Usuario_${usuarioId.replace(/\W/g, '').slice(-4)}`
      cambiarUsuario(usuarioId, { alias: nuevo })
      registrarEvento([{ tipo: 'alias_moderado', actorId, usuarioAppId: usuarioId, detalle: `Alias forzado a ${nuevo}`, conDobleFirma: false }])
    },
    [cambiarUsuario, registrarEvento],
  )

  const eliminarUsuario = useCallback(
    (actorId: string, usuarioId: string, nota: string) => {
      cambiarUsuario(usuarioId, {
        estado: 'eliminada',
        nombreLegal: 'Usuario eliminado',
        alias: aliasEliminado(usuarioId),
        celular: '',
        barrio: '',
        agatas: 0,
      })
      registrarEvento([{ tipo: 'usuario_eliminado', actorId, usuarioAppId: usuarioId, motivo: nota, conDobleFirma: false }])
    },
    [cambiarUsuario, registrarEvento],
  )

  const fusionarUsuarios = useCallback(
    (actorId: string, primariaId: string, secundariaId: string) => {
      setUsuarios((prev) => {
        const secundaria = prev.find((u) => u.id === secundariaId)
        if (!secundaria) return prev
        return prev.map((u) => {
          if (u.id === primariaId) return { ...u, agatas: u.agatas + secundaria.agatas }
          if (u.id === secundariaId)
            return { ...u, estado: 'eliminada', agatas: 0, alias: aliasEliminado(u.id), fusionadoCon: primariaId }
          return u
        })
      })
      registrarEvento([
        {
          tipo: 'usuarios_fusionados',
          actorId,
          usuarioAppId: primariaId,
          detalle: `fusionada_con_${primariaId} ← ${secundariaId}`,
          conDobleFirma: false,
        },
      ])
    },
    [setUsuarios, registrarEvento],
  )

  const iniciarImpersonacion = useCallback(
    (actorId: string, usuarioId: string) => {
      setImpersonacion(() => ({ actorId, usuarioId, inicio: Date.now() }))
      registrarEvento([{ tipo: 'impersonacion_inicio', actorId, usuarioAppId: usuarioId, severidad: 'alta', conDobleFirma: false }])
    },
    [setImpersonacion, registrarEvento],
  )

  const terminarImpersonacion = useCallback(() => {
    if (impersonacion) {
      const minutos = Math.max(1, Math.round((Date.now() - impersonacion.inicio) / 60_000))
      registrarEvento([
        {
          tipo: 'impersonacion_fin',
          actorId: impersonacion.actorId,
          usuarioAppId: impersonacion.usuarioId,
          severidad: 'alta',
          detalle: `Duración: ${minutos} min`,
          conDobleFirma: false,
        },
      ])
    }
    setImpersonacion(() => null)
  }, [impersonacion, setImpersonacion, registrarEvento])

  const proponerAjuste = useCallback(
    (actorId: string, usuarioId: string, delta: number, motivo: string) => {
      setAjustes((prev) => [
        { id: nuevoId('aj'), usuarioId, makerId: actorId, delta, motivo, timestamp: Date.now(), estado: 'pendiente' },
        ...prev,
      ])
      registrarEvento([
        { tipo: 'ajuste_balance_propuesto', actorId, usuarioAppId: usuarioId, motivo, detalle: `${delta > 0 ? '+' : ''}${delta} Ágatas`, conDobleFirma: true },
      ])
    },
    [setAjustes, registrarEvento],
  )

  const resolverAjuste = useCallback(
    (actorId: string, ajusteId: string, aprobar: boolean) => {
      const ajuste = ajustes.find((a) => a.id === ajusteId)
      if (!ajuste || ajuste.estado !== 'pendiente' || ajuste.makerId === actorId) return
      setAjustes((prev) =>
        prev.map((a) => (a.id === ajusteId ? { ...a, estado: aprobar ? 'aprobado' : 'rechazado', checkerId: actorId } : a)),
      )
      if (aprobar) {
        setUsuarios((prev) =>
          prev.map((u) => (u.id === ajuste.usuarioId ? { ...u, agatas: Math.max(0, u.agatas + ajuste.delta) } : u)),
        )
      }
      registrarEvento([
        {
          tipo: 'ajuste_balance_resuelto',
          actorId: ajuste.makerId,
          checkerId: actorId,
          usuarioAppId: ajuste.usuarioId,
          motivo: ajuste.motivo,
          detalle: `${aprobar ? 'Aprobado' : 'Rechazado'}: ${ajuste.delta > 0 ? '+' : ''}${ajuste.delta} Ágatas`,
          conDobleFirma: true,
        },
      ])
    },
    [ajustes, setAjustes, setUsuarios, registrarEvento],
  )

  // ---------- PW-05 ----------

  const guardarMision = useCallback(
    (actorId: string, mision: Mision): string => {
      const id = mision.id || nuevoId('m')
      setMisiones((prev) => {
        const existe = prev.some((m) => m.id === id)
        const guardada = { ...mision, id, fechaEdicion: Date.now() }
        return existe ? prev.map((m) => (m.id === id ? guardada : m)) : [guardada, ...prev]
      })
      if (!mision.id) {
        registrarEvento([{ tipo: 'mision_guardada', actorId, misionId: id, detalle: 'Creada como borrador', conDobleFirma: false }])
      }
      return id
    },
    [setMisiones, registrarEvento],
  )

  const enviarMision = useCallback(
    (actorId: string, misionId: string, publicar: boolean) => {
      cambiarMision(misionId, { estado: publicar ? 'publicada' : 'pendiente_aprobacion', motivoRechazo: undefined })
      registrarEvento([{ tipo: publicar ? 'mision_publicada' : 'mision_enviada', actorId, misionId, conDobleFirma: false }])
    },
    [cambiarMision, registrarEvento],
  )

  const aprobarMision = useCallback(
    (actorId: string, misionId: string) => {
      cambiarMision(misionId, { estado: 'publicada', motivoRechazo: undefined })
      registrarEvento([{ tipo: 'mision_publicada', actorId, misionId, detalle: 'Aprobada tras revisión', conDobleFirma: false }])
    },
    [cambiarMision, registrarEvento],
  )

  const rechazarMision = useCallback(
    (actorId: string, misionId: string, motivo: string) => {
      // ESQ: al rechazar, la misión "vuelve a borrador, editable".
      cambiarMision(misionId, { estado: 'borrador', motivoRechazo: motivo })
      registrarEvento([{ tipo: 'mision_rechazada', actorId, misionId, motivo, conDobleFirma: false }])
    },
    [cambiarMision, registrarEvento],
  )

  const pausarMision = useCallback(
    (actorId: string, misionId: string, pausa: Omit<PausaMision, 'desde'>) => {
      cambiarMision(misionId, { estado: 'pausada', pausa: { ...pausa, desde: Date.now() } })
      registrarEvento([
        { tipo: 'mision_pausada', actorId, misionId, motivo: pausa.motivo, detalle: pausa.hasta ? `Hasta ${pausa.hasta}` : 'Indefinida', conDobleFirma: false },
      ])
    },
    [cambiarMision, registrarEvento],
  )

  const reanudarMision = useCallback(
    (actorId: string, misionId: string) => {
      // ESQ: reanudar es una acción explícita y auditada.
      cambiarMision(misionId, { estado: 'publicada', pausa: undefined })
      registrarEvento([{ tipo: 'mision_reanudada', actorId, misionId, conDobleFirma: false }])
    },
    [cambiarMision, registrarEvento],
  )

  const cancelarMision = useCallback(
    (actorId: string, misionId: string, motivo: string) => {
      setMisiones((prev) =>
        prev.map((m) =>
          m.id === misionId
            ? {
                ...m,
                estado: 'cancelada',
                motivoCancelacion: motivo,
                pausa: undefined,
                // La evidencia en revisión pasa a `cancelada_sin_revisar`, sin recompensa. La
                // aprobada no se revierte: el ledger no se toca.
                evidenciasEnRevision: 0,
                fechaEdicion: Date.now(),
              }
            : m,
        ),
      )
      // Una misión cancelada no puede dejar solicitudes del Coordinador colgando: la de
      // cancelación queda cumplida y cualquier otra (pausa) pierde objeto.
      setSolicitudes((prev) =>
        prev.map((s) =>
          s.objetivoId === misionId && s.estado === 'pendiente'
            ? {
                ...s,
                estado: s.tipo === 'cancelacion' ? 'aprobada' : 'rechazada',
                resolutorId: actorId,
                motivoRechazo: s.tipo === 'cancelacion' ? undefined : 'La misión se canceló.',
              }
            : s,
        ),
      )
      registrarEvento([{ tipo: 'mision_cancelada', actorId, misionId, motivo, conDobleFirma: false }])
    },
    [setMisiones, setSolicitudes, registrarEvento],
  )

  const crearNuevaVersion = useCallback(
    (actorId: string, mision: Mision) => {
      cambiarMision(mision.id, { ...mision, version: mision.version + 1 })
      registrarEvento([
        { tipo: 'mision_nueva_version', actorId, misionId: mision.id, detalle: `v${mision.version} → v${mision.version + 1}`, conDobleFirma: false },
      ])
    },
    [cambiarMision, registrarEvento],
  )

  const solicitarOperacionMision = useCallback(
    (actorId: string, misionId: string, tipo: TipoSolicitudOperacion, motivo: string, nota: string) => {
      setSolicitudes((prev) => [
        { id: nuevoId('so'), tipo, objetivoId: misionId, solicitanteId: actorId, motivo, nota, timestamp: Date.now(), estado: 'pendiente' },
        ...prev,
      ])
      registrarEvento([{ tipo: 'solicitud_operacion', actorId, misionId, motivo: nota, detalle: `${tipo}: ${motivo}`, conDobleFirma: false }])
    },
    [setSolicitudes, registrarEvento],
  )

  const resolverSolicitudOperacion = useCallback(
    (actorId: string, solicitudId: string, aprobar: boolean, motivoRechazo?: string) => {
      const solicitud = solicitudes.find((s) => s.id === solicitudId)
      if (!solicitud || solicitud.estado !== 'pendiente') return
      setSolicitudes((prev) =>
        prev.map((s) =>
          s.id === solicitudId
            ? { ...s, estado: aprobar ? 'aprobada' : 'rechazada', resolutorId: actorId, motivoRechazo }
            : s,
        ),
      )
      if (aprobar) {
        if (solicitud.tipo === 'bloqueo') bloquearUsuario(actorId, solicitud.objetivoId, 'manual', `A pedido de Coordinador: ${solicitud.motivo}`)
        if (solicitud.tipo === 'pausa') pausarMision(actorId, solicitud.objetivoId, { motivo: solicitud.motivo, hasta: null, notificar: true })
        if (solicitud.tipo === 'cancelacion') cancelarMision(actorId, solicitud.objetivoId, solicitud.motivo)
      }
      registrarEvento([
        {
          tipo: 'solicitud_operacion_resuelta',
          actorId: solicitud.solicitanteId,
          checkerId: actorId,
          usuarioAppId: solicitud.tipo === 'bloqueo' ? solicitud.objetivoId : undefined,
          misionId: solicitud.tipo === 'bloqueo' ? undefined : solicitud.objetivoId,
          motivo: aprobar ? solicitud.motivo : motivoRechazo,
          detalle: `${solicitud.tipo} ${aprobar ? 'aprobada' : 'rechazada'}`,
          conDobleFirma: false,
        },
      ])
    },
    [solicitudes, setSolicitudes, bloquearUsuario, pausarMision, cancelarMision, registrarEvento],
  )

  const reiniciarOperacion = useCallback(() => {
    setUsuarios(() => USUARIOS_APP_SEED)
    setMisiones(() => MISIONES_SEED)
    setSolicitudes(() => SOLICITUDES_OPERACION_SEED)
    setAjustes(() => [])
    setImpersonacion(() => null)
  }, [setUsuarios, setMisiones, setSolicitudes, setAjustes, setImpersonacion])

  const valor = useMemo<OperacionContextValue>(
    () => ({
      usuarios,
      misiones,
      solicitudes,
      ajustes,
      impersonacion,
      bloquearUsuario,
      desbloquearUsuario,
      solicitarBloqueo,
      moderarAlias,
      eliminarUsuario,
      fusionarUsuarios,
      iniciarImpersonacion,
      terminarImpersonacion,
      proponerAjuste,
      resolverAjuste,
      guardarMision,
      enviarMision,
      aprobarMision,
      rechazarMision,
      pausarMision,
      reanudarMision,
      cancelarMision,
      crearNuevaVersion,
      solicitarOperacionMision,
      resolverSolicitudOperacion,
      reiniciarOperacion,
    }),
    [
      usuarios,
      misiones,
      solicitudes,
      ajustes,
      impersonacion,
      bloquearUsuario,
      desbloquearUsuario,
      solicitarBloqueo,
      moderarAlias,
      eliminarUsuario,
      fusionarUsuarios,
      iniciarImpersonacion,
      terminarImpersonacion,
      proponerAjuste,
      resolverAjuste,
      guardarMision,
      enviarMision,
      aprobarMision,
      rechazarMision,
      pausarMision,
      reanudarMision,
      cancelarMision,
      crearNuevaVersion,
      solicitarOperacionMision,
      resolverSolicitudOperacion,
      reiniciarOperacion,
    ],
  )

  return <OperacionContext.Provider value={valor}>{children}</OperacionContext.Provider>
}

export function useOperacion(): OperacionContextValue {
  const contexto = useContext(OperacionContext)
  if (!contexto) throw new Error('useOperacion debe usarse dentro de <OperacionProvider>')
  return contexto
}
