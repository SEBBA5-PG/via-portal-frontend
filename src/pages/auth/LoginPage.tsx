import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LONGITUD_PIN, useAuth } from '../../state/authStore'
import { enmascararCedula } from '../../state/format'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { CasillasDigitos } from '../../components/ui/CasillasDigitos'
import UsersIcon from '../../icons/UsersIcon'
import type { AnimatedIconHandle } from '../../icons/types'
import { useDesafioOtpStep, useDeviceEnrollStep, type PasoLoginProps } from './LoginWizardSteps'

type Paso = 'cedula' | 'pin'

// Ninguna cédula colombiana tiene menos de 5 dígitos.
const CEDULA_DIGITOS_MIN = 5

// PW-01: login en dos pantallas — cédula sola, luego PIN en casillas de dígitos.
export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [paso, setPaso] = useState<Paso>('cedula')
  const [cedula, setCedula] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const iconoCedulaRef = useRef<AnimatedIconHandle>(null)

  useEffect(() => {
    if (auth.sesion) navigate('/home', { replace: true })
  }, [auth.sesion, navigate])

  // Los hooks de "dispositivo nuevo" y 2FA se llaman siempre (nunca condicionados a un
  // `if` de arriba): son los que dejan a LoginPage renderizar un único <AuthLayout> al
  // final, sin importar el paso — ver el porqué en useDeviceEnrollStep en LoginWizardSteps.tsx.
  const deviceStep = useDeviceEnrollStep()
  const otpStep = useDesafioOtpStep()

  function continuar(e: FormEvent) {
    e.preventDefault()
    if (!cedula) return setError('Escribe tu número de cédula.')
    if (cedula.length < CEDULA_DIGITOS_MIN) return setError('Ese número de cédula no es válido.')
    setError(null)
    setPin('')
    setPaso('pin')
  }

  function volverACedula(mensaje: string | null = null) {
    setPaso('cedula')
    setPin('')
    setError(mensaje)
  }

  function ingresar(valor: string) {
    if (valor.length !== LONGITUD_PIN) return
    setError(null)
    const resultado = auth.login(cedula, valor)
    // También en el éxito: si la persona vuelve desde el desafío OTP, las casillas quedan vacías.
    setPin('')
    if (resultado.ok) return
    if (resultado.tipo === 'bloqueado') {
      navigate('/bloqueado', { state: { hasta: resultado.hasta } })
    } else if (resultado.tipo === 'bloqueado-duro') {
      navigate('/bloqueado', { state: { duro: true, cedula } })
    } else if (resultado.tipo === 'sin-cuenta') {
      volverACedula(resultado.mensaje)
    } else {
      setError(resultado.mensaje)
    }
  }

  function olvideMiPin() {
    const r = auth.iniciarRecuperacion(cedula)
    if (r.ok) return navigate('/recuperar', { state: { cedula } })
    if (auth.usuarios.some((u) => u.cedula === cedula)) setError(r.mensaje)
    else volverACedula(r.mensaje)
  }

  const pasoPin: PasoLoginProps = {
    titulo: 'Ingresa tu PIN',
    subtitulo: (
      <>
        Escribe el PIN de {LONGITUD_PIN} dígitos de la cédula{' '}
        <span className="font-bold text-grafito">{enmascararCedula(cedula)}</span>.{' '}
        <button type="button" onClick={() => volverACedula()} className="font-bold text-primario hover:underline">
          Cambiar
        </button>
      </>
    ),
    paso: { actual: 2, total: 2 },
    onVolver: () => volverACedula(),
    ancho: 'amplio',
    acciones: (
      <>
        <Button
          variante="ejecutivo"
          className="w-full"
          disabled={pin.length !== LONGITUD_PIN}
          onClick={() => ingresar(pin)}
        >
          Ingresar
        </Button>
        <button
          type="button"
          onClick={olvideMiPin}
          className="self-center py-2 text-sm font-bold text-primario hover:underline"
        >
          ¿Olvidaste tu PIN?
        </button>
      </>
    ),
    children: (
      <CasillasDigitos
        longitud={LONGITUD_PIN}
        valor={pin}
        onChange={(v) => {
          setPin(v)
          if (error) setError(null)
        }}
        onCompletar={ingresar}
        etiqueta={`PIN de ${LONGITUD_PIN} dígitos`}
        oculto
        autoFocus
        autoComplete="current-password"
        error={error}
      />
    ),
  }

  const pasoCedula: PasoLoginProps = {
    saludo: 'Bienvenido',
    titulo: 'Portal administrativo VIA',
    subtitulo: 'Ingresa con tu número de cédula para continuar.',
    paso: { actual: 1, total: 2 },
    acciones: (
      <Button type="submit" form="form-cedula" variante="ejecutivo" className="w-full" disabled={!cedula}>
        Continuar
      </Button>
    ),
    children: (
      <>
        {auth.motivoSalida === 'otro-dispositivo' && (
          <div
            role="status"
            className="mb-6 flex items-start justify-between gap-3 rounded-control border border-ambar/60 bg-ambar/10 px-4 py-3 text-sm text-grafito"
          >
            <span>Tu sesión se cerró porque se inició sesión con tu cuenta en otro lugar.</span>
            <button
              type="button"
              onClick={() => auth.limpiarMotivoSalida()}
              className="shrink-0 font-bold text-primario hover:underline"
            >
              Entendido
            </button>
          </div>
        )}
        <form id="form-cedula" onSubmit={continuar} noValidate>
          <TextField
            etiqueta="Número de cédula"
            ayuda="Solo números, sin puntos ni espacios."
            placeholder="0000000000"
            inputMode="numeric"
            autoComplete="username"
            autoFocus
            value={cedula}
            onChange={(e) => {
              setCedula(e.target.value.replace(/\D/g, ''))
              if (error) setError(null)
            }}
            error={error}
            icono={<UsersIcon ref={iconoCedulaRef} size={20} />}
            iconoRef={iconoCedulaRef}
          />
        </form>
      </>
    ),
  }

  // Un único <AuthLayout>, siempre en el mismo lugar del árbol — cambiar de cédula a PIN, a
  // 2FA, a dispositivo nuevo y de vuelta nunca remonta AuthLayout (ni su fondo de nodos ni su
  // logo), así que la transición suave entre pasos aplica también aquí, no solo cédula↔PIN.
  const pasoActivo = deviceStep ?? otpStep ?? (paso === 'pin' ? pasoPin : pasoCedula)
  return <AuthLayout {...pasoActivo} />
}
