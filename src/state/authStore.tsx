import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { requiere2FA, type Rol } from '../data/roles'
import { SEED_USERS, type DemoUser } from '../data/mockUsers'
import { loginBackend, logoutBackend } from '../lib/authApi'
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

// PW-01, 2026-09-11: PIN de 6 dígitos (decisión borrador, validada primero en este demo).
export const LONGITUD_PIN = 6
// wiki/Registro, Autenticación y Recuperación: OTP de 6 dígitos por WhatsApp con 3 minutos de
// validez. Antiabuso por número celular: al superar 3 solicitudes en 15 minutos, ese número queda
// bloqueado 1 hora. Lo comparten el desafío 2FA y la recuperación de PIN (es el mismo celular).
export const LONGITUD_CODIGO = 6
const DURACION_CODIGO_MS = 3 * 60 * 1000
const MAX_SOLICITUDES_CODIGO = 3
const VENTANA_SOLICITUDES_MS = 15 * 60 * 1000
const BLOQUEO_NUMERO_MS = 60 * 60 * 1000
// Valor de trabajo, no decidido en VIA BRAIN: 3 códigos errados anulan el código vigente y hay que
// pedir otro (que cuenta para el antiabuso). Sin tope, un código de 6 dígitos admitiría intentos
// ilimitados durante sus 3 minutos.
const FALLOS_CODIGO_MAXIMOS = 3

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

// Un código OTP en curso. `codigo` y `expiraEn` quedan en null cuando se anula por fallos.
interface CodigoEnCurso {
  codigo: string | null
  expiraEn: number | null
  fallos: number
}

// PW-01, Mecanismo de 2FA: tras el PIN correcto, Superadministrador y Administrador pasan por un
// único desafío OTP vía WhatsApp, en cada login — sin app autenticadora ni "recordar dispositivo".
interface DesafioOtp extends CodigoEnCurso {
  userId: string
}

// Recuperación de PIN (PW-01): cédula → 2 últimos dígitos del celular → OTP por WhatsApp →
// PIN nuevo. El número nunca se muestra: la persona demuestra que lo conoce.
interface Recuperacion extends CodigoEnCurso {
  userId: string
  etapa: 'digitos' | 'codigo' | 'pin'
}

interface LimiteRecuperacion {
  fallosDigitos: number
  pausadaHasta: number | null
}

interface EnviosNumero {
  // Marcas de tiempo de los códigos emitidos a ese número, para el antiabuso.
  solicitudes: number[]
  bloqueadoHasta: number | null
}

type ResultadoLogin =
  | { ok: true }
  | { ok: false; tipo: 'sin-cuenta'; mensaje: string }
  | { ok: false; tipo: 'credenciales'; mensaje: string }
  | { ok: false; tipo: 'codigo'; mensaje: string }
  | { ok: false; tipo: 'bloqueado'; hasta: number }
  | { ok: false; tipo: 'bloqueado-duro' }

type ResultadoCodigo = { ok: true } | { ok: false; mensaje: string }

type ResultadoPin = { ok: true; sigueBloqueadoDuro: boolean } | { ok: false; mensaje: string }

type CodigoEmitido = { ok: true; codigo: string; expiraEn: number } | { ok: false; mensaje: string }

type EvaluacionCodigo = { ok: true } | { ok: false; mensaje: string; cambios: Partial<CodigoEnCurso> }

function generarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function intentosRestantes(restantes: number): string {
  return `Te queda${restantes === 1 ? '' : 'n'} ${restantes} intento${restantes === 1 ? '' : 's'}.`
}

function minutosHasta(momento: number): number {
  return Math.max(1, Math.ceil((momento - Date.now()) / 60_000))
}

function numeroDe(user: DemoUser): string {
  return user.telefonoWhatsapp.replace(/\D/g, '')
}

// Misma regla para el desafío 2FA y la recuperación: vencido, correcto, errado o anulado.
function evaluarCodigo(enCurso: CodigoEnCurso, codigo: string): EvaluacionCodigo {
  if (!enCurso.codigo || !enCurso.expiraEn) {
    return { ok: false, mensaje: 'Este código ya no es válido. Pide uno nuevo.', cambios: {} }
  }
  if (Date.now() > enCurso.expiraEn) return { ok: false, mensaje: 'El código venció. Pide uno nuevo.', cambios: {} }
  if (enCurso.codigo === codigo) return { ok: true }
  const fallos = enCurso.fallos + 1
  if (fallos >= FALLOS_CODIGO_MAXIMOS) {
    return {
      ok: false,
      mensaje: `Escribiste un código incorrecto ${FALLOS_CODIGO_MAXIMOS} veces. Por seguridad lo anulamos: pide uno nuevo.`,
      cambios: { fallos, codigo: null, expiraEn: null },
    }
  }
  return {
    ok: false,
    mensaje: `El código no es correcto. ${intentosRestantes(FALLOS_CODIGO_MAXIMOS - fallos)}`,
    cambios: { fallos },
  }
}

interface AuthContextValue {
  usuarios: DemoUser[]
  sesion: Sesion | null
  usuarioActual: DemoUser | null
  desafio2FA: DesafioOtp | null
  // PW-01: Coordinador Territorial, primer acceso desde un dispositivo nuevo — antes de
  // crear sesión, hay que enrolarlo (un solo dispositivo activo por cuenta).
  dispositivoPendiente: { userId: string } | null
  motivoSalida: 'expirada' | 'otro-dispositivo' | null
  recuperacion: Recuperacion | null
  login: (cedula: string, pin: string) => Promise<ResultadoLogin>
  confirmarEnrolamiento: () => void
  confirmarCodigo2FA: (codigo: string) => ResultadoCodigo
  reenviarCodigo2FA: () => ResultadoCodigo
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
  // PW-01: un solo dispositivo enrolado por cuenta — enrolar uno nuevo desactiva el anterior.
  const [dispositivosEnrolados, setDispositivosEnrolados] = useState<Record<string, string>>(() =>
    leerJSON('enrolledDevices', {}),
  )
  const [limites, setLimites] = useState<Record<string, LimiteRecuperacion>>(() => leerJSON('recoveryLimits', {}))
  // Por número celular (sin espacios ni signos), no por cuenta.
  const [envios, setEnvios] = useState<Record<string, EnviosNumero>>(() => leerJSON('otpSends', {}))
  const [dispositivoPendiente, setDispositivoPendiente] = useState<{ userId: string } | null>(null)
  const [desafio2FA, setDesafio2FA] = useState<DesafioOtp | null>(null)
  const [motivoSalida, setMotivoSalida] = useState<'expirada' | 'otro-dispositivo' | null>(null)
  const [recuperacion, setRecuperacion] = useState<Recuperacion | null>(null)

  useEffect(() => escribirJSON('users:v2', usuarios), [usuarios])
  useEffect(() => escribirJSON('lockouts:v2', bloqueos), [bloqueos])
  useEffect(() => escribirJSON('enrolledDevices', dispositivosEnrolados), [dispositivosEnrolados])
  useEffect(() => escribirJSON('recoveryLimits', limites), [limites])
  useEffect(() => escribirJSON('otpSends', envios), [envios])

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
    setDesafio2FA(null)
    setDispositivoPendiente(null)
  }

  function mensajeNumeroBloqueado(hasta: number): string {
    return `Superaste el límite de ${MAX_SOLICITUDES_CODIGO} códigos en 15 minutos. Por seguridad, podrás pedir otro en ${minutosHasta(hasta)} min.`
  }

  // Emite un OTP al celular de la cuenta respetando el antiabuso por número. En el demo el código
  // no sale del navegador: la pantalla lo muestra en un aviso "Modo demo".
  function emitirCodigo(user: DemoUser): CodigoEmitido {
    const numero = numeroDe(user)
    const ahora = Date.now()
    const envio = envios[numero] ?? { solicitudes: [], bloqueadoHasta: null }
    if (envio.bloqueadoHasta && envio.bloqueadoHasta > ahora) {
      return { ok: false, mensaje: mensajeNumeroBloqueado(envio.bloqueadoHasta) }
    }
    const recientes = envio.solicitudes.filter((t) => ahora - t < VENTANA_SOLICITUDES_MS)
    if (recientes.length >= MAX_SOLICITUDES_CODIGO) {
      const hasta = ahora + BLOQUEO_NUMERO_MS
      setEnvios((prev) => ({ ...prev, [numero]: { solicitudes: recientes, bloqueadoHasta: hasta } }))
      return { ok: false, mensaje: mensajeNumeroBloqueado(hasta) }
    }
    setEnvios((prev) => ({ ...prev, [numero]: { solicitudes: [...recientes, ahora], bloqueadoHasta: null } }))
    return { ok: true, codigo: generarCodigo(), expiraEn: ahora + DURACION_CODIGO_MS }
  }

  // Tras el PIN correcto (ya sea contra las cuentas simuladas o contra conexion-api): S/A pasan
  // al desafío OTP (que sigue 100% simulado, PW-01 — el corte de login real no toca esto); C
  // entra directo, salvo el enrolamiento de dispositivo.
  function continuarTrasPinCorrecto(user: DemoUser): ResultadoLogin {
    if (requiere2FA(user.rol)) {
      const emitido = emitirCodigo(user)
      if (!emitido.ok) return { ok: false, tipo: 'codigo', mensaje: emitido.mensaje }
      setDesafio2FA({ userId: user.id, codigo: emitido.codigo, expiraEn: emitido.expiraEn, fallos: 0 })
      return { ok: true }
    }

    // Coordinador Territorial sin 2FA: si el dispositivo no es el enrolado, primero hay que
    // enrolarlo (PW-01).
    if (dispositivosEnrolados[user.id] !== idDeEsteDispositivo()) {
      setDispositivoPendiente({ userId: user.id })
      return { ok: true }
    }

    crearSesion(user.id)
    return { ok: true }
  }

  // PW-01: identificador propio del portal = cédula (no celular/email como la app), primer
  // factor = PIN numérico.
  //
  // La cuenta puede venir de dos lados: las cuentas simuladas de siempre (SEED_USERS, con todo
  // su bloqueo/antiabuso local) o, si la cédula no está entre esas, la "puerta de entrada" real
  // contra conexion-api (Sanctum) — las 2 cuentas quemadas en la base de datos (VIA BRAIN,
  // Portal Web — Cuentas de prueba del demo.md). El resto del flujo (2FA, sesión) es el mismo
  // para ambas: solo cambia quién valida la cédula+PIN.
  async function login(cedula: string, pin: string): Promise<ResultadoLogin> {
    const cc = cedula.trim()
    const user = usuarios.find((u) => u.cedula === cc)

    // Cuentas de conexion-api (backend real) SIEMPRE revalidan el PIN contra el servidor, en
    // cada login — nunca contra el PIN cacheado en `usuarios`. Esa caché solo existe para el
    // bookkeeping local de 2FA/sesión entre pasos. Si se comparara aquí contra `user.pin`
    // (como el resto de este flujo hace para SEED_USERS), un segundo login con la misma
    // cédula nunca volvería a llamar loginBackend → nunca se establece cookie de sesión real
    // en conexion-api → cualquier pantalla que dependa del backend (PW-04 cuentas, etc.)
    // queda huérfana con 401 aunque la UI muestre "sesión activa" (ese estado sale de
    // localStorage, no del servidor).
    if (!user || user.origenBackend) {
      const resultado = await loginBackend(cc, pin)
      if (!resultado.ok) {
        return { ok: false, tipo: 'sin-cuenta', mensaje: resultado.mensaje }
      }
      const cuenta = resultado.cuenta
      const nuevo: DemoUser = {
        id: cuenta.id,
        nombre: cuenta.nombre,
        cedula: cuenta.cedula,
        rol: cuenta.rol,
        email: cuenta.email,
        telefonoWhatsapp: cuenta.telefonoWhatsapp,
        pin,
        origenBackend: true,
      }
      setUsuarios((prev) => [...prev.filter((u) => u.id !== nuevo.id), nuevo])
      return continuarTrasPinCorrecto(nuevo)
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

    return continuarTrasPinCorrecto(user)
  }

  function confirmarEnrolamiento() {
    if (!dispositivoPendiente) return
    setDispositivosEnrolados((prev) => ({ ...prev, [dispositivoPendiente.userId]: idDeEsteDispositivo() }))
    crearSesion(dispositivoPendiente.userId)
  }

  function confirmarCodigo2FA(codigo: string): ResultadoCodigo {
    if (!desafio2FA) return { ok: false, mensaje: 'Paso inválido.' }
    const r = evaluarCodigo(desafio2FA, codigo)
    if (!r.ok) {
      setDesafio2FA({ ...desafio2FA, ...r.cambios })
      return { ok: false, mensaje: r.mensaje }
    }
    crearSesion(desafio2FA.userId)
    return { ok: true }
  }

  function reenviarCodigo2FA(): ResultadoCodigo {
    const user = desafio2FA && usuarios.find((u) => u.id === desafio2FA.userId)
    if (!user) return { ok: false, mensaje: 'Paso inválido.' }
    const emitido = emitirCodigo(user)
    if (!emitido.ok) return emitido
    setDesafio2FA({ userId: user.id, codigo: emitido.codigo, expiraEn: emitido.expiraEn, fallos: 0 })
    return { ok: true }
  }

  // Corta el paso en curso (desafío OTP o enrolamiento) y devuelve a LoginPage. Los códigos ya
  // emitidos siguen contando para el antiabuso.
  function cancelarPendiente() {
    setDesafio2FA(null)
    setDispositivoPendiente(null)
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

  function cerrarSesion() {
    if (sesion) borrarClave(`session:${sesion.userId}`)
    borrarIdDeSesionDeEstaPestana()
    setSesion(null)
    setMotivoSalida(null)
    // Fire-and-forget: si la cuenta activa era una de las 2 reales, cierra también la sesión
    // de Sanctum. Si era una cuenta simulada, el backend simplemente no tiene nada que cerrar.
    void logoutBackend()
  }

  function limpiarMotivoSalida() {
    setMotivoSalida(null)
  }

  function limiteDe(userId: string): LimiteRecuperacion {
    return limites[userId] ?? { fallosDigitos: 0, pausadaHasta: null }
  }

  function mensajePausa(hasta: number): string {
    return `Por seguridad, la recuperación de esta cuenta está en pausa. Intenta de nuevo en ${minutosHasta(hasta)} min.`
  }

  function iniciarRecuperacion(cedula: string): ResultadoCodigo {
    const user = usuarios.find((u) => u.cedula === cedula.trim())
    if (!user) return { ok: false, mensaje: 'No encontramos una cuenta con esa cédula.' }
    const { pausadaHasta } = limiteDe(user.id)
    if (pausadaHasta && pausadaHasta > Date.now()) return { ok: false, mensaje: mensajePausa(pausadaHasta) }
    setRecuperacion({ userId: user.id, etapa: 'digitos', codigo: null, expiraEn: null, fallos: 0 })
    return { ok: true }
  }

  function emitirCodigoRecuperacion(user: DemoUser): ResultadoCodigo {
    const emitido = emitirCodigo(user)
    if (!emitido.ok) return emitido
    setRecuperacion({ userId: user.id, etapa: 'codigo', codigo: emitido.codigo, expiraEn: emitido.expiraEn, fallos: 0 })
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
    if (digitos !== numeroDe(user).slice(-2)) {
      const fallos = limite.fallosDigitos + 1
      if (fallos >= FALLOS_DIGITOS_MAXIMOS) {
        setLimites((prev) => ({
          ...prev,
          [user.id]: { fallosDigitos: 0, pausadaHasta: Date.now() + PAUSA_RECUPERACION_MS },
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
    const r = emitirCodigoRecuperacion(user)
    if (r.ok) setLimites((prev) => ({ ...prev, [user.id]: { fallosDigitos: 0, pausadaHasta: null } }))
    return r
  }

  function reenviarCodigoRecuperacion(): ResultadoCodigo {
    if (!recuperacion || recuperacion.etapa !== 'codigo') return { ok: false, mensaje: 'Paso inválido.' }
    const user = usuarios.find((u) => u.id === recuperacion.userId)
    if (!user) return { ok: false, mensaje: 'Paso inválido.' }
    return emitirCodigoRecuperacion(user)
  }

  function confirmarCodigoRecuperacion(codigo: string): ResultadoCodigo {
    if (!recuperacion || recuperacion.etapa !== 'codigo') return { ok: false, mensaje: 'Solicita el código de nuevo.' }
    const r = evaluarCodigo(recuperacion, codigo)
    if (!r.ok) {
      setRecuperacion({ ...recuperacion, ...r.cambios })
      return { ok: false, mensaje: r.mensaje }
    }
    setRecuperacion({ ...recuperacion, etapa: 'pin', codigo: null, expiraEn: null, fallos: 0 })
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
    desafio2FA,
    dispositivoPendiente,
    motivoSalida,
    recuperacion,
    login,
    confirmarEnrolamiento,
    confirmarCodigo2FA,
    reenviarCodigo2FA,
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
