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

// PW-01, 2026-09-11: PIN de 6 dígitos (decisión borrador, validada primero en este demo).
export const LONGITUD_PIN = 6
// wiki/Registro, Autenticación y Recuperación: OTP de 6 dígitos con 3 minutos de validez y
// antiabuso de 3 solicitudes cada 15 minutos.
export const LONGITUD_CODIGO = 6
const DURACION_CODIGO_MS = 3 * 60 * 1000
const MAX_SOLICITUDES_CODIGO = 3
const VENTANA_SOLICITUDES_MS = 15 * 60 * 1000

// PW-01, Preguntas abiertas: la duración de sesión de S/A sigue DIFERIDA a desarrollo — valor
// de trabajo para el demo. Coordinador Territorial sí tiene decisión de producto: turno de 10h
// (PW-01, 2026-09-11). Operador Logístico salió del portal — ya no tiene entrada aquí.
const DURACION_SESION_MS: Record<Rol, number> = {
  S: 8 * 60 * 60 * 1000,
  A: 8 * 60 * 60 * 1000,
  C: 10 * 60 * 60 * 1000,
}
// PW-01, 2026-09-11: 3 intentos fallidos de PIN → bloqueo temporal de 15 min; si se agotan
// los intentos de nuevo tras ese bloqueo, escala a bloqueo duro (desbloqueo manual).
const DURACION_BLOQUEO_MS = 15 * 60 * 1000
const INTENTOS_MAXIMOS = 3
// Valor de trabajo, no decidido en VIA BRAIN: 3 fallos al confirmar los 2 últimos dígitos del
// celular pausan la recuperación de esa cuenta 15 minutos (mismos números que el bloqueo de PIN).
const FALLOS_DIGITOS_MAXIMOS = 3
const PAUSA_RECUPERACION_MS = 15 * 60 * 1000
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
  // Administrador/Superadministrador. En este demo, ese desbloqueo lo simula `desbloquearComoAdminDemo()`.
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

// Recuperación de PIN (PW-01): cédula → 2 últimos dígitos del celular → OTP por WhatsApp →
// PIN nuevo. El número nunca se muestra: la persona demuestra que lo conoce.
interface Recuperacion {
  userId: string
  etapa: 'digitos' | 'codigo' | 'pin'
  codigo: string | null
  expiraEn: number | null
}

interface LimiteRecuperacion {
  // Marcas de tiempo de los códigos emitidos, para el antiabuso.
  solicitudes: number[]
  fallosDigitos: number
  pausadaHasta: number | null
}

type ResultadoLogin =
  | { ok: true }
  | { ok: false; tipo: 'sin-cuenta'; mensaje: string }
  | { ok: false; tipo: 'credenciales'; mensaje: string }
  | { ok: false; tipo: 'bloqueado'; hasta: number }
  | { ok: false; tipo: 'bloqueado-duro' }

type ResultadoCodigo = { ok: true } | { ok: false; mensaje: string }

type ResultadoPin = { ok: true; sigueBloqueadoDuro: boolean } | { ok: false; mensaje: string }

function generarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function intentosRestantes(restantes: number): string {
  return `Te queda${restantes === 1 ? '' : 'n'} ${restantes} intento${restantes === 1 ? '' : 's'}.`
}

function minutosHasta(momento: number): number {
  return Math.max(1, Math.ceil((momento - Date.now()) / 60_000))
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
  iniciarRecuperacion: (cedula: string) => ResultadoCodigo
  confirmarUltimosDigitos: (digitos: string) => ResultadoCodigo
  reenviarCodigoRecuperacion: () => ResultadoCodigo
  confirmarCodigoRecuperacion: (codigo: string) => ResultadoCodigo
  restablecerPin: (nuevo: string) => ResultadoPin
  cancelarRecuperacion: () => void
  estaBloqueado: (cedula: string) => number | null
  // Demo únicamente: en producción el bloqueo duro lo levanta un Administrador desde la
  // ficha del usuario (PW-03), no la propia persona bloqueada.
  desbloquearComoAdminDemo: (cedula: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Claves `:v2` desde el PIN de 6 dígitos: un navegador que ya abrió el demo tendría guardadas
  // las cuentas con el PIN viejo de 4 y no podría entrar.
  const [usuarios, setUsuarios] = useState<DemoUser[]>(() => leerJSON('users:v2', SEED_USERS))
  const [sesion, setSesion] = useState<Sesion | null>(() => {
    const miUserId = leerIdDeSesionDeEstaPestana()
    if (!miUserId) return null
    const compartida = leerJSON<Sesion | null>(`session:${miUserId}`, null)
    return compartida && compartida.expiraEn > Date.now() ? compartida : null
  })
  const [bloqueos, setBloqueos] = useState<Record<string, RegistroBloqueo>>(() => leerJSON('lockouts:v2', {}))
  const [confianzas, setConfianzas] = useState<Record<string, ConfianzaDispositivo>>(() =>
    leerJSON('deviceTrust', {}),
  )
  // PW-01: un solo dispositivo enrolado por cuenta — enrolar uno nuevo desactiva el anterior.
  // Distinto de `confianzas` (que solo aplica al desafío OTP de S/A, ver Etapa 2FA).
  const [dispositivosEnrolados, setDispositivosEnrolados] = useState<Record<string, string>>(() =>
    leerJSON('enrolledDevices', {}),
  )
  const [limites, setLimites] = useState<Record<string, LimiteRecuperacion>>(() => leerJSON('recoveryLimits', {}))
  const [dispositivoPendiente, setDispositivoPendiente] = useState<{ userId: string } | null>(null)
  const [colaPendiente, setColaPendiente] = useState<Paso[]>([])
  const [pendiente, setPendiente] = useState<Pendiente | null>(null)
  const [motivoSalida, setMotivoSalida] = useState<'expirada' | 'otro-dispositivo' | null>(null)
  const [recuperacion, setRecuperacion] = useState<Recuperacion | null>(null)

  useEffect(() => escribirJSON('users:v2', usuarios), [usuarios])
  useEffect(() => escribirJSON('lockouts:v2', bloqueos), [bloqueos])
  useEffect(() => escribirJSON('deviceTrust', confianzas), [confianzas])
  useEffect(() => escribirJSON('enrolledDevices', dispositivosEnrolados), [dispositivosEnrolados])
  useEffect(() => escribirJSON('recoveryLimits', limites), [limites])

  // Sesión única PERO por cuenta (PW-01, Sesión única por usuario), no por navegador: cada
  // cuenta tiene su propia llave `session:<userId>` en localStorage (compartida entre pestañas).
  // Qué cuenta muestra ESTA pestaña vive en sessionStorage (no se comparte) — así dos cuentas
  // distintas pueden convivir en dos pestañas del mismo navegador, y solo se cierra la pestaña
  // cuya MISMA cuenta acaba de iniciar sesión en otro lugar.
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

  // Expiración de sesión: revisa cada 15s sin forzar renders innecesarios.
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
      return { ok: false, tipo: 'sin-cuenta', mensaje: 'No encontramos una cuenta con esa cédula.' }
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
      return {
        ok: false,
        tipo: 'credenciales',
        mensaje: `PIN incorrecto. ${intentosRestantes(INTENTOS_MAXIMOS - intentos)}`,
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

  function limiteDe(userId: string): LimiteRecuperacion {
    return limites[userId] ?? { solicitudes: [], fallosDigitos: 0, pausadaHasta: null }
  }

  function mensajePausa(hasta: number): string {
    return `Por seguridad, la recuperación de esta cuenta está en pausa. Intenta de nuevo en ${minutosHasta(hasta)} min.`
  }

  function iniciarRecuperacion(cedula: string): ResultadoCodigo {
    const user = usuarios.find((u) => u.cedula === cedula.trim())
    if (!user) return { ok: false, mensaje: 'No encontramos una cuenta con esa cédula.' }
    const { pausadaHasta } = limiteDe(user.id)
    if (pausadaHasta && pausadaHasta > Date.now()) return { ok: false, mensaje: mensajePausa(pausadaHasta) }
    setRecuperacion({ userId: user.id, etapa: 'digitos', codigo: null, expiraEn: null })
    return { ok: true }
  }

  // Emite o reemite el OTP respetando el antiabuso (3 solicitudes cada 15 min por cuenta).
  function emitirCodigo(userId: string, fallosDigitos: number): ResultadoCodigo {
    const ahora = Date.now()
    const limite = limiteDe(userId)
    const recientes = limite.solicitudes.filter((t) => ahora - t < VENTANA_SOLICITUDES_MS)
    if (recientes.length >= MAX_SOLICITUDES_CODIGO) {
      return {
        ok: false,
        mensaje: `Ya pediste ${MAX_SOLICITUDES_CODIGO} códigos en los últimos 15 minutos. Podrás pedir otro en ${minutosHasta(recientes[0] + VENTANA_SOLICITUDES_MS)} min.`,
      }
    }
    setLimites((prev) => ({ ...prev, [userId]: { ...limite, fallosDigitos, solicitudes: [...recientes, ahora] } }))
    setRecuperacion({ userId, etapa: 'codigo', codigo: generarCodigo(), expiraEn: ahora + DURACION_CODIGO_MS })
    return { ok: true }
  }

  function confirmarUltimosDigitos(digitos: string): ResultadoCodigo {
    if (!recuperacion || recuperacion.etapa !== 'digitos') return { ok: false, mensaje: 'Paso inválido.' }
    const user = usuarios.find((u) => u.id === recuperacion.userId)
    if (!user) return { ok: false, mensaje: 'Paso inválido.' }
    const limite = limiteDe(user.id)
    if (limite.pausadaHasta && limite.pausadaHasta > Date.now()) {
      setRecuperacion(null)
      return { ok: false, mensaje: mensajePausa(limite.pausadaHasta) }
    }
    if (digitos !== user.telefonoWhatsapp.replace(/\D/g, '').slice(-2)) {
      const fallos = limite.fallosDigitos + 1
      if (fallos >= FALLOS_DIGITOS_MAXIMOS) {
        setLimites((prev) => ({
          ...prev,
          [user.id]: { ...limite, fallosDigitos: 0, pausadaHasta: Date.now() + PAUSA_RECUPERACION_MS },
        }))
        setRecuperacion(null)
        return {
          ok: false,
          mensaje: 'Los dígitos no coinciden. Por seguridad, pausamos la recuperación de esta cuenta durante 15 minutos.',
        }
      }
      setLimites((prev) => ({ ...prev, [user.id]: { ...limite, fallosDigitos: fallos } }))
      return {
        ok: false,
        mensaje: `Los dígitos no coinciden con el celular registrado. ${intentosRestantes(FALLOS_DIGITOS_MAXIMOS - fallos)}`,
      }
    }
    return emitirCodigo(user.id, 0)
  }

  function reenviarCodigoRecuperacion(): ResultadoCodigo {
    if (!recuperacion || recuperacion.etapa !== 'codigo') return { ok: false, mensaje: 'Paso inválido.' }
    return emitirCodigo(recuperacion.userId, limiteDe(recuperacion.userId).fallosDigitos)
  }

  function confirmarCodigoRecuperacion(codigo: string): ResultadoCodigo {
    if (!recuperacion || recuperacion.etapa !== 'codigo' || !recuperacion.codigo || !recuperacion.expiraEn) {
      return { ok: false, mensaje: 'Solicita el código de nuevo.' }
    }
    if (Date.now() > recuperacion.expiraEn) return { ok: false, mensaje: 'El código venció. Pide uno nuevo.' }
    if (recuperacion.codigo !== codigo) {
      return { ok: false, mensaje: 'El código no es correcto. Revísalo e inténtalo de nuevo.' }
    }
    setRecuperacion({ ...recuperacion, etapa: 'pin', codigo: null, expiraEn: null })
    return { ok: true }
  }

  function restablecerPin(nuevo: string): ResultadoPin {
    if (!recuperacion || recuperacion.etapa !== 'pin') return { ok: false, mensaje: 'Verifica el código primero.' }
    if (!new RegExp(`^\\d{${LONGITUD_PIN}}$`).test(nuevo)) {
      return { ok: false, mensaje: `El PIN debe tener ${LONGITUD_PIN} dígitos.` }
    }
    const { userId } = recuperacion
    actualizarUsuario(userId, { pin: nuevo })
    // Recuperar el PIN levanta el bloqueo temporal, pero NO el duro: ese exige revisión manual
    // de un Administrador/Superadministrador (PW-01). Antes este paso borraba el registro entero.
    const sigueBloqueadoDuro = bloqueos[userId]?.duro ?? false
    if (!sigueBloqueadoDuro) {
      setBloqueos((prev) => {
        const resto = { ...prev }
        delete resto[userId]
        return resto
      })
    }
    setRecuperacion(null)
    return { ok: true, sigueBloqueadoDuro }
  }

  function cancelarRecuperacion() {
    setRecuperacion(null)
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
    iniciarRecuperacion,
    confirmarUltimosDigitos,
    reenviarCodigoRecuperacion,
    confirmarCodigoRecuperacion,
    restablecerPin,
    cancelarRecuperacion,
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
