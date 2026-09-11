import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { requiere2FA, type Rol } from '../data/roles'
import { SEED_USERS, type DemoUser } from '../data/mockUsers'
import {
  borrarClave,
  borrarIdDeSesionDeEstaPestana,
  claveCompleta,
  escribirIdDeSesionDeEstaPestana,
  escribirJSON,
  idDeEsteDispositivo,
  leerIdDeSesionDeEstaPestana,
  leerJSON,
} from './storage'
import { generarSecretoTotp, verificarCodigoTotp } from './totp'

// PW-01 §6/7: duración de sesión de S/A sigue DIFERIDA a desarrollo — valor de trabajo para
// el demo. Coordinador Territorial sí tiene decisión de producto: turno de 10h (PW-01,
// 2026-09-11). Operador Logístico salió del portal — ya no tiene entrada aquí.
const DURACION_SESION_MS: Record<Rol, number> = {
  S: 8 * 60 * 60 * 1000,
  A: 8 * 60 * 60 * 1000,
  C: 10 * 60 * 60 * 1000,
}
// PW-01, 2026-09-11: 3 intentos fallidos de PIN → bloqueo temporal de 15 min; si se agotan
// los intentos de nuevo tras ese bloqueo, escala a bloqueo duro (desbloqueo manual).
const DURACION_BLOQUEO_MS = 15 * 60 * 1000
const INTENTOS_MAXIMOS = 3
const DURACION_CODIGO_MS = 5 * 60 * 1000
const DURACION_DISPOSITIVO_CONFIADO_MS = 30 * 24 * 60 * 60 * 1000

interface Sesion {
  userId: string
  sessionId: string
  expiraEn: number
}

interface RegistroBloqueo {
  intentos: number
  bloqueadoHasta: number | null
  // true desde el primer bloqueo temporal — si se agotan los intentos otra vez, escala a duro.
  huboBloqueoPrevio: boolean
  // Bloqueo duro (PW-01): sin auto-expiración, requiere desbloqueo manual de un
  // Administrador/Superadministrador. En este demo, ese desbloqueo lo simula `desbloquear()`.
  duro: boolean
}

interface ConfianzaDispositivo {
  deviceId: string
  expiraEn: number
}

type Paso = 'totp-setup' | 'whatsapp-verify' | 'totp-challenge'

type Pendiente =
  | { tipo: 'totp-setup'; userId: string; base32: string; otpauthUri: string }
  | { tipo: 'whatsapp-verify'; userId: string; codigo: string; expiraEn: number }
  | { tipo: 'totp-challenge'; userId: string }

interface Recuperacion {
  userId: string
  codigo: string
  expiraEn: number
  verificado: boolean
}

type ResultadoLogin =
  | { ok: true }
  | { ok: false; tipo: 'credenciales'; mensaje: string }
  | { ok: false; tipo: 'bloqueado'; hasta: number }
  | { ok: false; tipo: 'bloqueado-duro' }

type ResultadoCodigo = { ok: true } | { ok: false; mensaje: string }

function generarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

interface AuthContextValue {
  usuarios: DemoUser[]
  sesion: Sesion | null
  usuarioActual: DemoUser | null
  pendiente: Pendiente | null
  // PW-01: Coordinador Territorial, primer acceso desde un dispositivo nuevo — antes de
  // crear sesión, hay que enrolarlo (un solo dispositivo activo por cuenta).
  dispositivoPendiente: { userId: string } | null
  motivoSalida: 'expirada' | 'otro-dispositivo' | null
  recuperacion: Recuperacion | null
  login: (cedula: string, pin: string) => ResultadoLogin
  confirmarEnrolamiento: () => void
  confirmarTotpSetup: (codigo: string) => ResultadoCodigo
  confirmarWhatsapp: (codigo: string) => ResultadoCodigo
  confirmarTotpChallenge: (codigo: string, recordarDispositivo: boolean) => ResultadoCodigo
  reenviarCodigoWhatsapp: () => void
  cancelarPendiente: () => void
  cerrarSesion: () => void
  limpiarMotivoSalida: () => void
  solicitarRecuperacion: (email: string) => ResultadoCodigo
  confirmarCodigoRecuperacion: (codigo: string) => ResultadoCodigo
  restablecerContrasena: (nueva: string) => ResultadoCodigo
  estaBloqueado: (cedula: string) => number | null
  // Demo únicamente: en producción el bloqueo duro lo levanta un Administrador desde la
  // ficha del usuario (PW-03), no la propia persona bloqueada.
  desbloquearComoAdminDemo: (cedula: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuarios, setUsuarios] = useState<DemoUser[]>(() => leerJSON('users', SEED_USERS))
  const [sesion, setSesion] = useState<Sesion | null>(() => {
    const miUserId = leerIdDeSesionDeEstaPestana()
    if (!miUserId) return null
    const compartida = leerJSON<Sesion | null>(`session:${miUserId}`, null)
    return compartida && compartida.expiraEn > Date.now() ? compartida : null
  })
  const [bloqueos, setBloqueos] = useState<Record<string, RegistroBloqueo>>(() => leerJSON('lockouts', {}))
  const [confianzas, setConfianzas] = useState<Record<string, ConfianzaDispositivo>>(() =>
    leerJSON('deviceTrust', {}),
  )
  // PW-01: un solo dispositivo enrolado por cuenta — enrolar uno nuevo desactiva el anterior.
  // Distinto de `confianzas` (que solo aplica al desafío OTP de S/A, ver Etapa 2FA).
  const [dispositivosEnrolados, setDispositivosEnrolados] = useState<Record<string, string>>(() =>
    leerJSON('enrolledDevices', {}),
  )
  const [dispositivoPendiente, setDispositivoPendiente] = useState<{ userId: string } | null>(null)
  const [colaPendiente, setColaPendiente] = useState<Paso[]>([])
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [motivoSalida, setMotivoSalida] = useState<'expirada' | 'otro-dispositivo' | null>(null)
  const [recuperacion, setRecuperacion] = useState<Recuperacion | null>(null)

  useEffect(() => escribirJSON('users', usuarios), [usuarios])
  useEffect(() => escribirJSON('lockouts', bloqueos), [bloqueos])
  useEffect(() => escribirJSON('deviceTrust', confianzas), [confianzas])
  useEffect(() => escribirJSON('enrolledDevices', dispositivosEnrolados), [dispositivosEnrolados])

  // Sesión única PERO por cuenta (PW-01 §9), no por navegador: cada cuenta tiene su propia
  // llave `session:<userId>` en localStorage (compartida entre pestañas). Qué cuenta muestra
  // ESTA pestaña vive en sessionStorage (no se comparte) — así dos cuentas distintas pueden
  // convivir en dos pestañas del mismo navegador, y solo se cierra la pestaña cuya MISMA
  // cuenta acaba de iniciar sesión en otro lugar.
  useEffect(() => {
    function alCambiarStorage(e: StorageEvent) {
      if (!e.key?.startsWith(claveCompleta('session:'))) return
      setSesion((actual) => {
        if (!actual || e.key !== claveCompleta(`session:${actual.userId}`)) return actual
        const nueva = e.newValue ? (JSON.parse(e.newValue) as Sesion) : null
        if (nueva && nueva.sessionId !== actual.sessionId) {
          setMotivoSalida('otro-dispositivo')
          borrarIdDeSesionDeEstaPestana()
          return null
        }
        if (!nueva) {
          borrarIdDeSesionDeEstaPestana()
          return null
        }
        return nueva
      })
    }
    window.addEventListener('storage', alCambiarStorage)
    return () => window.removeEventListener('storage', alCambiarStorage)
  }, [])

  // Expiración de sesión (PW-01 §6): revisa cada 15s sin forzar renders innecesarios.
  useEffect(() => {
    const id = setInterval(() => {
      setSesion((actual) => {
        if (!actual) return actual
        if (Date.now() > actual.expiraEn) {
          borrarClave(`session:${actual.userId}`)
          borrarIdDeSesionDeEstaPestana()
          setMotivoSalida('expirada')
          return null
        }
        return actual
      })
    }, 15_000)
    return () => clearInterval(id)
  }, [])

  const usuarioActual = useMemo(
    () => (sesion ? (usuarios.find((u) => u.id === sesion.userId) ?? null) : null),
    [sesion, usuarios],
  )

  function actualizarUsuario(userId: string, cambios: Partial<DemoUser>) {
    setUsuarios((prev) => prev.map((u) => (u.id === userId ? { ...u, ...cambios } : u)))
  }

  // `dispositivoConfiado` (recordar dispositivo 30 días para saltar el desafío OTP) se
  // reincorpora en la Etapa 2FA — por ahora `confianzas` solo se escribe, ver
  // `confirmarTotpChallenge` más abajo, pendiente de rediseño junto con esa etapa.

  function crearSesion(userId: string) {
    const user = usuarios.find((u) => u.id === userId)
    if (!user) return
    const nueva: Sesion = {
      userId,
      sessionId: crypto.randomUUID(),
      expiraEn: Date.now() + DURACION_SESION_MS[user.rol],
    }
    escribirJSON(`session:${userId}`, nueva)
    escribirIdDeSesionDeEstaPestana(userId)
    setSesion(nueva)
    setColaPendiente([])
    setPendiente(null)
    setDispositivoPendiente(null)
  }

  function avanzarCola(cola: Paso[], userId: string) {
    const user = usuarios.find((u) => u.id === userId)
    if (!user) return
    if (cola.length === 0) {
      crearSesion(userId)
      return
    }
    const paso = cola[0]
    if (paso === 'totp-setup') {
      const { base32, otpauthUri } = generarSecretoTotp(user.email)
      setPendiente({ tipo: 'totp-setup', userId, base32, otpauthUri })
    } else if (paso === 'whatsapp-verify') {
      setPendiente({
        tipo: 'whatsapp-verify',
        userId,
        codigo: generarCodigo(),
        expiraEn: Date.now() + DURACION_CODIGO_MS,
      })
    } else {
      setPendiente({ tipo: 'totp-challenge', userId })
    }
  }

  // PW-01: identificador propio del portal = cédula (no celular/email como la app), primer
  // factor = PIN numérico. El desafío OTP de S/A (Etapa 2FA) todavía no engancha aquí — por
  // ahora, tras el PIN correcto, entra directo (salvo enrolamiento de dispositivo de C).
  function login(cedula: string, pin: string): ResultadoLogin {
    const cc = cedula.trim()
    const user = usuarios.find((u) => u.cedula === cc)
    if (!user) {
      return { ok: false, tipo: 'credenciales', mensaje: 'No encontramos una cuenta con esa cédula.' }
    }
    const bloqueo = bloqueos[user.id]
    if (bloqueo?.duro) {
      return { ok: false, tipo: 'bloqueado-duro' }
    }
    if (bloqueo?.bloqueadoHasta && bloqueo.bloqueadoHasta > Date.now()) {
      return { ok: false, tipo: 'bloqueado', hasta: bloqueo.bloqueadoHasta }
    }
    if (user.pin !== pin) {
      const intentos = (bloqueo?.intentos ?? 0) + 1
      if (intentos >= INTENTOS_MAXIMOS) {
        if (bloqueo?.huboBloqueoPrevio) {
          setBloqueos((prev) => ({
            ...prev,
            [user.id]: { intentos, bloqueadoHasta: null, huboBloqueoPrevio: true, duro: true },
          }))
          return { ok: false, tipo: 'bloqueado-duro' }
        }
        const hasta = Date.now() + DURACION_BLOQUEO_MS
        setBloqueos((prev) => ({
          ...prev,
          [user.id]: { intentos: 0, bloqueadoHasta: hasta, huboBloqueoPrevio: true, duro: false },
        }))
        return { ok: false, tipo: 'bloqueado', hasta }
      }
      setBloqueos((prev) => ({
        ...prev,
        [user.id]: { intentos, bloqueadoHasta: null, huboBloqueoPrevio: bloqueo?.huboBloqueoPrevio ?? false, duro: false },
      }))
      const restantes = INTENTOS_MAXIMOS - intentos
      return {
        ok: false,
        tipo: 'credenciales',
        mensaje: `PIN incorrecto. Te queda${restantes === 1 ? '' : 'n'} ${restantes} intento${restantes === 1 ? '' : 's'}.`,
      }
    }

    setBloqueos((prev) => ({ ...prev, [user.id]: { intentos: 0, bloqueadoHasta: null, huboBloqueoPrevio: false, duro: false } }))

    // Coordinador Territorial sin 2FA: si el dispositivo no es el enrolado, primero hay que
    // enrolarlo (PW-01). Superadministrador/Administrador quedan para la Etapa 2FA vía OTP.
    if (!requiere2FA(user.rol) && dispositivosEnrolados[user.id] !== idDeEsteDispositivo()) {
      setDispositivoPendiente({ userId: user.id })
      return { ok: true }
    }

    crearSesion(user.id)
    return { ok: true }
  }

  function confirmarEnrolamiento() {
    if (!dispositivoPendiente) return
    setDispositivosEnrolados((prev) => ({ ...prev, [dispositivoPendiente.userId]: idDeEsteDispositivo() }))
    crearSesion(dispositivoPendiente.userId)
  }

  function desbloquearComoAdminDemo(cedula: string) {
    const user = usuarios.find((u) => u.cedula === cedula.trim())
    if (!user) return
    setBloqueos((prev) => {
      const resto = { ...prev }
      delete resto[user.id]
      return resto
    })
  }

  function confirmarTotpSetup(codigo: string): ResultadoCodigo {
    if (!pendiente || pendiente.tipo !== 'totp-setup') return { ok: false, mensaje: 'Paso inválido.' }
    if (!verificarCodigoTotp(pendiente.base32, codigo)) {
      return { ok: false, mensaje: 'Código incorrecto. Revisa tu app autenticadora.' }
    }
    actualizarUsuario(pendiente.userId, { totpConfigurado: true, totpSecret: pendiente.base32 })
    const resto = colaPendiente.slice(1)
    setColaPendiente(resto)
    avanzarCola(resto, pendiente.userId)
    return { ok: true }
  }

  function reenviarCodigoWhatsapp() {
    if (!pendiente || pendiente.tipo !== 'whatsapp-verify') return
    setPendiente({ ...pendiente, codigo: generarCodigo(), expiraEn: Date.now() + DURACION_CODIGO_MS })
  }

  // No revierte pasos ya confirmados (confirmarTotpSetup/confirmarWhatsapp ya persisten el
  // suyo al momento de confirmarse, antes de avanzar la cola) — solo corta el paso en curso
  // y lo que quedaba pendiente, devolviendo a LoginPage al formulario plano.
  function cancelarPendiente() {
    setColaPendiente([])
    setPendiente(null)
    setDispositivoPendiente(null)
  }

  function confirmarWhatsapp(codigo: string): ResultadoCodigo {
    if (!pendiente || pendiente.tipo !== 'whatsapp-verify') return { ok: false, mensaje: 'Paso inválido.' }
    if (Date.now() > pendiente.expiraEn) return { ok: false, mensaje: 'El código expiró, pide uno nuevo.' }
    if (pendiente.codigo !== codigo) return { ok: false, mensaje: 'Código incorrecto.' }
    actualizarUsuario(pendiente.userId, { whatsappVerificado: true })
    const resto = colaPendiente.slice(1)
    setColaPendiente(resto)
    avanzarCola(resto, pendiente.userId)
    return { ok: true }
  }

  function confirmarTotpChallenge(codigo: string, recordarDispositivo: boolean): ResultadoCodigo {
    if (!pendiente || pendiente.tipo !== 'totp-challenge') return { ok: false, mensaje: 'Paso inválido.' }
    const user = usuarios.find((u) => u.id === pendiente.userId)
    if (!user?.totpSecret || !verificarCodigoTotp(user.totpSecret, codigo)) {
      return { ok: false, mensaje: 'Código incorrecto o expirado.' }
    }
    if (recordarDispositivo) {
      setConfianzas((prev) => ({
        ...prev,
        [user.id]: { deviceId: idDeEsteDispositivo(), expiraEn: Date.now() + DURACION_DISPOSITIVO_CONFIADO_MS },
      }))
    }
    const resto = colaPendiente.slice(1)
    setColaPendiente(resto)
    avanzarCola(resto, pendiente.userId)
    return { ok: true }
  }

  function cerrarSesion() {
    if (sesion) borrarClave(`session:${sesion.userId}`)
    borrarIdDeSesionDeEstaPestana()
    setSesion(null)
    setMotivoSalida(null)
  }

  function limpiarMotivoSalida() {
    setMotivoSalida(null)
  }

  function solicitarRecuperacion(email: string): ResultadoCodigo {
    const correo = email.trim().toLowerCase()
    const user = usuarios.find((u) => u.email.toLowerCase() === correo)
    if (!user) return { ok: false, mensaje: 'No encontramos una cuenta con ese correo.' }
    setRecuperacion({
      userId: user.id,
      codigo: generarCodigo(),
      expiraEn: Date.now() + DURACION_CODIGO_MS,
      verificado: false,
    })
    return { ok: true }
  }

  function confirmarCodigoRecuperacion(codigo: string): ResultadoCodigo {
    if (!recuperacion) return { ok: false, mensaje: 'Solicita el código de nuevo.' }
    if (Date.now() > recuperacion.expiraEn) return { ok: false, mensaje: 'El código expiró, pide uno nuevo.' }
    if (recuperacion.codigo !== codigo) return { ok: false, mensaje: 'Código incorrecto.' }
    setRecuperacion({ ...recuperacion, verificado: true })
    return { ok: true }
  }

  function restablecerContrasena(nueva: string): ResultadoCodigo {
    if (!recuperacion?.verificado) return { ok: false, mensaje: 'Verifica el código primero.' }
    actualizarUsuario(recuperacion.userId, { password: nueva })
    setBloqueos((prev) => {
      const resto = { ...prev }
      delete resto[recuperacion.userId]
      return resto
    })
    setRecuperacion(null)
    return { ok: true }
  }

  function estaBloqueado(cedula: string): number | null {
    const user = usuarios.find((u) => u.cedula === cedula.trim())
    if (!user) return null
    const b = bloqueos[user.id]
    return b?.bloqueadoHasta && b.bloqueadoHasta > Date.now() ? b.bloqueadoHasta : null
  }

  const value: AuthContextValue = {
    usuarios,
    sesion,
    usuarioActual,
    pendiente,
    dispositivoPendiente,
    motivoSalida,
    recuperacion,
    login,
    confirmarEnrolamiento,
    confirmarTotpSetup,
    confirmarWhatsapp,
    confirmarTotpChallenge,
    reenviarCodigoWhatsapp,
    cancelarPendiente,
    cerrarSesion,
    limpiarMotivoSalida,
    solicitarRecuperacion,
    confirmarCodigoRecuperacion,
    restablecerContrasena,
    estaBloqueado,
    desbloquearComoAdminDemo,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
