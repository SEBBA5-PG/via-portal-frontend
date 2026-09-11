import { useState } from 'react'
import { useAuth } from '../../state/authStore'
import { enmascararTelefono } from '../../state/format'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui/Button'
import { CodeInput } from '../../components/ui/CodeInput'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { QrImage } from '../../components/ui/QrImage'

// PW-01: un solo dispositivo enrolado por cuenta — Coordinador Territorial no tiene 2FA, así
// que este es el único paso extra en su primer acceso desde un dispositivo nuevo.
export function DeviceEnrollStep() {
  const auth = useAuth()
  if (!auth.dispositivoPendiente) return null

  return (
    <AuthLayout titulo="Nuevo dispositivo" subtitulo="Es tu primer acceso desde aquí">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-cafe">
          El portal admite un solo dispositivo activo por cuenta. Si continúas, se cerrará el
          acceso desde cualquier otro dispositivo enrolado con esta cuenta.
        </p>
        <Button onClick={() => auth.confirmarEnrolamiento()}>Enrolar y continuar</Button>
        <button
          onClick={() => auth.cancelarPendiente()}
          className="text-xs text-cafe-muted underline self-center"
        >
          Cancelar
        </button>
      </div>
    </AuthLayout>
  )
}

export function TotpSetupStep() {
  const auth = useAuth()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (auth.pendiente?.tipo !== 'totp-setup') return null
  const { otpauthUri, base32 } = auth.pendiente

  function confirmar() {
    const r = auth.confirmarTotpSetup(codigo)
    if (!r.ok) setError(r.mensaje)
  }

  return (
    <AuthLayout titulo="Configura tu segundo factor" subtitulo="Obligatorio para Superadministrador y Administrador">
      <div className="flex flex-col items-center gap-4">
        <QrImage value={otpauthUri} />
        <p className="text-xs text-cafe-muted text-center">
          Escanéalo con Google Authenticator, Authy o similar. ¿No puedes escanear? Ingresa esta
          clave manualmente:
        </p>
        <code className="text-sm bg-white rounded-xl px-3 py-1 tracking-widest">{base32}</code>
        <div className="w-full mt-2">
          <CodeInput value={codigo} onChange={setCodigo} autoFocus />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={confirmar} disabled={codigo.length !== 6} className="w-full">
          Confirmar y activar
        </Button>
        <button
          onClick={() => auth.cancelarPendiente()}
          className="text-xs text-cafe-muted underline"
        >
          Cancelar
        </button>
      </div>
    </AuthLayout>
  )
}

export function WhatsappVerifyStep() {
  const auth = useAuth()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  if (auth.pendiente?.tipo !== 'whatsapp-verify') return null
  const pendiente = auth.pendiente
  const user = auth.usuarios.find((u) => u.id === pendiente.userId)
  if (!user) return null

  function confirmar() {
    const r = auth.confirmarWhatsapp(codigo)
    if (!r.ok) setError(r.mensaje)
  }

  return (
    <AuthLayout titulo="Verifica tu WhatsApp" subtitulo="Lo usamos para recuperar tu acceso si olvidas tu contraseña">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-cafe">
          Enviamos un código a {enmascararTelefono(user.telefonoWhatsapp)}
        </p>
        <DemoNotice>
          Código simulado: <strong>{pendiente.codigo}</strong> (en producción llegaría por WhatsApp)
        </DemoNotice>
        <CodeInput value={codigo} onChange={setCodigo} autoFocus />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={confirmar} disabled={codigo.length !== 6}>
          Verificar
        </Button>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => auth.reenviarCodigoWhatsapp()}
            className="text-xs text-cafe-muted underline"
          >
            Reenviar código
          </button>
          <button
            onClick={() => auth.cancelarPendiente()}
            className="text-xs text-cafe-muted underline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}

export function TotpChallengeStep() {
  const auth = useAuth()
  const [codigo, setCodigo] = useState('')
  const [recordar, setRecordar] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function confirmar() {
    const r = auth.confirmarTotpChallenge(codigo, recordar)
    if (!r.ok) setError(r.mensaje)
  }

  return (
    <AuthLayout titulo="Verificación en dos pasos" subtitulo="Ingresa el código de tu app autenticadora">
      <div className="flex flex-col gap-4">
        <CodeInput value={codigo} onChange={setCodigo} autoFocus />
        <label className="flex items-center gap-2 text-sm text-cafe">
          <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
          Recordar este dispositivo por 30 días
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button onClick={confirmar} disabled={codigo.length !== 6}>
          Verificar
        </Button>
        <button
          onClick={() => auth.cancelarPendiente()}
          className="text-xs text-cafe-muted underline self-center"
        >
          Cancelar
        </button>
      </div>
    </AuthLayout>
  )
}
