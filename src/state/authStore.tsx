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

// PW-01 §6/7: duración de sesión DIFERIDA — valor de trabajo propuesto para el demo.
const DURACION_SESION_MS: Record<Rol, number> = {
  S: 8 * 60 * 60 * 1000,
  A: 8 * 60 * 60 * 1000,
  C: 8 * 60 * 60 * 1000,
  O: 12 * 60 * 60 * 1000,
}
const DURACION_BLOQUEO_MS = 15 * 60 * 1000
const INTENTOS_MAXIMOS = 5
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

type ResultadoCodigo = { ok: true } | { ok: false; mensaje: string }

function generarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

interface AuthContextValue {
  usuarios: DemoUser[]
  sesion: Sesion | null
  usuarioActual: DemoUser | null
  pendiente: Pendiente | null
  motivoSalida: 'expirada' | 'otro-dispositivo' | null
  recuperacion: Recuperacion | null
  login: (email: string, password: string) => ResultadoLogin
  confirmarTotpSetup: (codigo: string) => ResultadoCodigo
  confirmarWhatsapp: (codigo: string) => ResultadoCodigo
  confirmarTotpChallenge: (codigo: string, recordarDispositivo: boolean) => ResultadoCodigo
  reenviarCodigoWhatsapp: () => void
  cerrarSesion: () => void
  limpiarMotivoSalida: () => void
  solicitarRecuperacion: (email: string) => ResultadoCodigo
  confirmarCodigoRecuperacion: (codigo: string) => ResultadoCodigo
  restablecerContrasena: (nueva: string) => ResultadoCodigo
  estaBloqueado: (email: string) => number | null
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
  const [colaPendiente, setColaPendiente] = useState<Paso[]>([])
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [motivoSalida, setMotivoSalida] = useState<'expirada' | 'otro-dispositivo' | null>(null)
  const [recuperacion, setRecuperacion] = useState<Recuperacion | null>(null)

  useEffect(() => escribirJSON('users', usuarios), [usuarios])
  useEffect(() => escribirJSON('lockouts', bloqueos), [bloqueos])
  useEffect(() => escribirJSON('deviceTrust', confianzas), [confianzas])

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

  function dispositivoConfiado(userId: string): boolean {
    const c = confianzas[userId]
    return !!c && c.deviceId === idDeEsteDispositivo() && c.expiraEn > Date.now()
  }

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

  function login(email: string, password: string): ResultadoLogin {
    const correo = email.trim().toLowerCase()
    const user = usuarios.find((u) => u.email.toLowerCase() === correo)
    if (!user) {
      return { ok: false, tipo: 'credenciales', mensaje: 'Correo o contraseña incorrectos.' }
    }
    const bloqueo = bloqueos[user.id]
    if (bloqueo?.bloqueadoHasta && bloqueo.bloqueadoHasta > Date.now()) {
      return { ok: false, tipo: 'bloqueado', hasta: bloqueo.bloqueadoHasta }
    }
    if (user.password !== password) {
      const intentos = (bloqueo?.intentos ?? 0) + 1
      if (intentos >= INTENTOS_MAXIMOS) {
        const hasta = Date.now() + DURACION_BLOQUEO_MS
        setBloqueos((prev) => ({ ...prev, [user.id]: { intentos, bloqueadoHasta: hasta } }))
        return { ok: false, tipo: 'bloqueado', hasta }
      }
      setBloqueos((prev) => ({ ...prev, [user.id]: { intentos, bloqueadoHasta: null } }))
      const restantes = INTENTOS_MAXIMOS - intentos
      return {
        ok: false,
        tipo: 'credenciales',
        mensaje: `Correo o contraseña incorrectos. Te queda${restantes === 1 ? '' : 'n'} ${restantes} intento${restantes === 1 ? '' : 's'}.`,
      }
    }

    setBloqueos((prev) => ({ ...prev, [user.id]: { intentos: 0, bloqueadoHasta: null } }))

    const cola: Paso[] = []
    if (requiere2FA(user.rol) && !user.totpConfigurado) cola.push('totp-setup')
    if (!user.whatsappVerificado) cola.push('whatsapp-verify')
    if (requiere2FA(user.rol) && user.totpConfigurado && !dispositivoConfiado(user.id)) {
      cola.push('totp-challenge')
    }
    setColaPendiente(cola)
    avanzarCola(cola, user.id)
    return { ok: true }
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
    setBloqueos((prev) => ({ ...prev, [recuperacion.userId]: { intentos: 0, bloqueadoHasta: null } }))
    setRecuperacion(null)
    return { ok: true }
  }

  function estaBloqueado(email: string): number | null {
    const correo = email.trim().toLowerCase()
    const user = usuarios.find((u) => u.email.toLowerCase() === correo)
    if (!user) return null
    const b = bloqueos[user.id]
    return b?.bloqueadoHasta && b.bloqueadoHasta > Date.now() ? b.bloqueadoHasta : null
  }

  const value: AuthContextValue = {
    usuarios,
    sesion,
    usuarioActual,
    pendiente,
    motivoSalida,
    recuperacion,
    login,
    confirmarTotpSetup,
    confirmarWhatsapp,
    confirmarTotpChallenge,
    reenviarCodigoWhatsapp,
    cerrarSesion,
    limpiarMotivoSalida,
    solicitarRecuperacion,
    confirmarCodigoRecuperacion,
    restablecerContrasena,
    estaBloqueado,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
