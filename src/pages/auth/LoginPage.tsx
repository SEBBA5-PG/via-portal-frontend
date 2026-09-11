import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LONGITUD_PIN, useAuth } from '../../state/authStore'
import { enmascararCedula } from '../../state/format'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { CasillasDigitos } from '../../components/ui/CasillasDigitos'
import { DeviceEnrollStep, TotpSetupStep, WhatsappVerifyStep, TotpChallengeStep } from './LoginWizardSteps'

type Paso = 'cedula' | 'pin'

// PW-01: login en dos pantallas — cédula sola, luego PIN en casillas de dígitos.
export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [paso, setPaso] = useState<Paso>('cedula')
  const [cedula, setCedula] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (auth.sesion) navigate('/home', { replace: true })
  }, [auth.sesion, navigate])

  if (auth.dispositivoPendiente) return <DeviceEnrollStep />
  if (auth.pendiente?.tipo === 'totp-setup') return <TotpSetupStep />
  if (auth.pendiente?.tipo === 'whatsapp-verify') return <WhatsappVerifyStep />
  if (auth.pendiente?.tipo === 'totp-challenge') return <TotpChallengeStep />

  function continuar(e: FormEvent) {
    e.preventDefault()
    if (!cedula) return setError('Escribe tu número de cédula.')
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
    if (resultado.ok) return
    setPin('')
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

  if (paso === 'pin') {
    return (
      <AuthLayout
        titulo="Ingresa tu PIN"
        subtitulo={
          <>
            Escribe el PIN de {LONGITUD_PIN} dígitos de la cédula{' '}
            <span className="font-bold text-grafito">{enmascararCedula(cedula)}</span>.{' '}
            <button type="button" onClick={() => volverACedula()} className="font-bold text-primario hover:underline">
              Cambiar
            </button>
          </>
        }
        paso={{ actual: 2, total: 2 }}
        onVolver={() => volverACedula()}
        acciones={
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
        }
      >
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
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="Portal administrativo VIA"
      subtitulo="Ingresa con tu número de cédula para continuar."
      paso={{ actual: 1, total: 2 }}
      acciones={
        <Button type="submit" form="form-cedula" variante="ejecutivo" className="w-full" disabled={!cedula}>
          Continuar
        </Button>
      }
    >
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
          inputMode="numeric"
          autoComplete="username"
          autoFocus
          value={cedula}
          onChange={(e) => {
            setCedula(e.target.value.replace(/\D/g, ''))
            if (error) setError(null)
          }}
          error={error}
        />
      </form>
    </AuthLayout>
  )
}
