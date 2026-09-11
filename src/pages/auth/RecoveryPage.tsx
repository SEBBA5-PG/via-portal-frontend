import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LONGITUD_CODIGO, LONGITUD_PIN, useAuth } from '../../state/authStore'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { CasillasDigitos } from '../../components/ui/CasillasDigitos'
import { DemoNotice } from '../../components/ui/DemoNotice'

const TOTAL_PASOS = 4

// PW-01, Recuperación de PIN: cédula → 2 últimos dígitos del celular → código por WhatsApp →
// PIN nuevo. La etapa vive en el store (auth.recuperacion); aquí solo lo que se escribe.
export function RecoveryPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const cedulaInicial = (location.state as { cedula?: string } | null)?.cedula ?? ''
  const [cedula, setCedula] = useState(cedulaInicial)
  const [digitos, setDigitos] = useState('')
  const [codigo, setCodigo] = useState('')
  const [pinNuevo, setPinNuevo] = useState('')
  const [pinConfirmacion, setPinConfirmacion] = useState('')
  const [pedirConfirmacion, setPedirConfirmacion] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [terminado, setTerminado] = useState<{ sigueBloqueadoDuro: boolean } | null>(null)

  const etapa = auth.recuperacion?.etapa ?? 'cedula'

  function limpiarMensajes() {
    setError(null)
    setAviso(null)
  }

  function salir() {
    auth.cancelarRecuperacion()
    navigate('/login')
  }

  function enviarCedula(e: FormEvent) {
    e.preventDefault()
    limpiarMensajes()
    if (!cedula) return setError('Escribe tu número de cédula.')
    const r = auth.iniciarRecuperacion(cedula)
    if (!r.ok) setError(r.mensaje)
  }

  function enviarDigitos() {
    limpiarMensajes()
    const r = auth.confirmarUltimosDigitos(digitos)
    setDigitos('')
    if (!r.ok) setError(r.mensaje)
    else setCodigo('')
  }

  function enviarCodigo(valor: string) {
    if (valor.length !== LONGITUD_CODIGO) return
    limpiarMensajes()
    const r = auth.confirmarCodigoRecuperacion(valor)
    if (r.ok) return
    setCodigo('')
    // El vencimiento ya lo anuncia VigenciaCodigo debajo de las casillas: no repetirlo.
    const vencido = auth.recuperacion?.expiraEn != null && Date.now() > auth.recuperacion.expiraEn
    if (!vencido) setError(r.mensaje)
  }

  function reenviar() {
    limpiarMensajes()
    setCodigo('')
    const r = auth.reenviarCodigoRecuperacion()
    if (r.ok) setAviso('Te enviamos un código nuevo.')
    else setError(r.mensaje)
  }

  function guardarPin(confirmacion: string) {
    limpiarMensajes()
    if (confirmacion !== pinNuevo) {
      setError('Los PIN no coinciden. Escríbelo de nuevo.')
      setPinConfirmacion('')
      return
    }
    const r = auth.restablecerPin(pinNuevo)
    if (!r.ok) return setError(r.mensaje)
    setTerminado({ sigueBloqueadoDuro: r.sigueBloqueadoDuro })
  }

  if (terminado) {
    return (
      <AuthLayout
        titulo="PIN actualizado"
        subtitulo="Ya puedes ingresar al portal con tu PIN nuevo."
        acciones={
          <Button variante="ejecutivo" className="w-full" onClick={() => navigate('/login', { replace: true })}>
            Ir a iniciar sesión
          </Button>
        }
      >
        {terminado.sigueBloqueadoDuro && (
          <div role="status" className="rounded-control border border-red-200 bg-red-50 px-4 py-3 text-sm text-grafito">
            Tu cuenta sigue bloqueada por intentos fallidos. Para desbloquearla, contacta a un
            Administrador o Superadministrador.
          </div>
        )}
      </AuthLayout>
    )
  }

  if (etapa === 'digitos') {
    return (
      <AuthLayout
        titulo="Confirma tu celular"
        subtitulo="Escribe los 2 últimos dígitos del celular registrado en tu cuenta. Así confirmamos que eres tú antes de enviarte el código."
        paso={{ actual: 2, total: TOTAL_PASOS }}
        onVolver={() => {
          auth.cancelarRecuperacion()
          limpiarMensajes()
          setDigitos('')
        }}
        onCerrar={salir}
        acciones={
          <Button variante="ejecutivo" className="w-full" disabled={digitos.length !== 2} onClick={enviarDigitos}>
            Enviar código por WhatsApp
          </Button>
        }
      >
        <CasillasDigitos
          longitud={2}
          valor={digitos}
          onChange={(v) => {
            setDigitos(v)
            if (error) setError(null)
          }}
          etiqueta="Últimos 2 dígitos de tu celular registrado"
          autoFocus
          error={error}
        />
      </AuthLayout>
    )
  }

  if (etapa === 'codigo' && auth.recuperacion) {
    const { codigo: codigoSimulado, expiraEn } = auth.recuperacion
    return (
      <AuthLayout
        titulo="Escribe el código"
        subtitulo={`Te enviamos un código de ${LONGITUD_CODIGO} dígitos por WhatsApp al celular registrado en tu cuenta.`}
        paso={{ actual: 3, total: TOTAL_PASOS }}
        onCerrar={salir}
        acciones={
          <>
            <Button
              variante="ejecutivo"
              className="w-full"
              disabled={codigo.length !== LONGITUD_CODIGO}
              onClick={() => enviarCodigo(codigo)}
            >
              Verificar código
            </Button>
            <Button variante="ejecutivo-suave" className="w-full" onClick={reenviar}>
              Reenviar código
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <CasillasDigitos
            longitud={LONGITUD_CODIGO}
            valor={codigo}
            onChange={(v) => {
              setCodigo(v)
              if (error) setError(null)
            }}
            onCompletar={enviarCodigo}
            etiqueta={`Código de verificación de ${LONGITUD_CODIGO} dígitos`}
            autoFocus
            autoComplete="one-time-code"
            error={error}
          />
          {expiraEn && <VigenciaCodigo expiraEn={expiraEn} />}
          {aviso && (
            <p role="status" className="text-sm text-grafito">
              {aviso}
            </p>
          )}
          {codigoSimulado && (
            <DemoNotice>
              Código simulado: <strong className="tabular-nums tracking-widest">{codigoSimulado}</strong>. En
              producción llega por WhatsApp.
            </DemoNotice>
          )}
        </div>
      </AuthLayout>
    )
  }

  if (etapa === 'pin') {
    return (
      <AuthLayout
        titulo="Crea tu PIN nuevo"
        subtitulo={`Elige un PIN de ${LONGITUD_PIN} dígitos. No lo compartas con nadie.`}
        paso={{ actual: 4, total: TOTAL_PASOS }}
        onCerrar={salir}
        acciones={
          <Button
            variante="ejecutivo"
            className="w-full"
            disabled={pinNuevo.length !== LONGITUD_PIN || pinConfirmacion.length !== LONGITUD_PIN}
            onClick={() => guardarPin(pinConfirmacion)}
          >
            Guardar PIN
          </Button>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p aria-hidden="true" className="font-heading text-sm font-bold text-grafito">
              Nuevo PIN
            </p>
            <CasillasDigitos
              longitud={LONGITUD_PIN}
              valor={pinNuevo}
              onChange={(v) => {
                setPinNuevo(v)
                if (error) setError(null)
              }}
              onCompletar={() => setPedirConfirmacion(true)}
              etiqueta="Nuevo PIN"
              oculto
              autoFocus
              autoComplete="new-password"
            />
          </div>
          {pedirConfirmacion && (
            <div className="flex flex-col gap-2">
              <p aria-hidden="true" className="font-heading text-sm font-bold text-grafito">
                Confirma tu PIN
              </p>
              <CasillasDigitos
                longitud={LONGITUD_PIN}
                valor={pinConfirmacion}
                onChange={(v) => {
                  setPinConfirmacion(v)
                  if (error) setError(null)
                }}
                onCompletar={guardarPin}
                etiqueta="Confirma tu PIN"
                oculto
                autoFocus
                autoComplete="new-password"
                error={error}
              />
            </div>
          )}
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titulo="Recupera tu PIN"
      subtitulo="Confirmaremos tu identidad con tu celular registrado y te enviaremos un código por WhatsApp."
      paso={{ actual: 1, total: TOTAL_PASOS }}
      onVolver={() => navigate('/login')}
      acciones={
        <Button type="submit" form="form-recuperar" variante="ejecutivo" className="w-full" disabled={!cedula}>
          Continuar
        </Button>
      }
    >
      <form id="form-recuperar" onSubmit={enviarCedula} noValidate>
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

function VigenciaCodigo({ expiraEn }: { expiraEn: number }) {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const restante = Math.max(0, expiraEn - ahora)
  if (restante === 0) {
    return <p className="text-sm font-bold text-red-600">El código venció. Pide uno nuevo.</p>
  }
  const minutos = Math.floor(restante / 60_000)
  const segundos = Math.floor((restante % 60_000) / 1000)
  return (
    <p className="text-sm text-texto-suave">
      El código vence en{' '}
      <span className="font-bold tabular-nums text-grafito">
        {minutos}:{segundos.toString().padStart(2, '0')}
      </span>
    </p>
  )
}
