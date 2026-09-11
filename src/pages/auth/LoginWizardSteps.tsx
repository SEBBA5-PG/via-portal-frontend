import { useState } from 'react'
import { LONGITUD_CODIGO, useAuth } from '../../state/authStore'
import { enmascararTelefono } from '../../state/format'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui/Button'
import { CasillasDigitos } from '../../components/ui/CasillasDigitos'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { QrImage } from '../../components/ui/QrImage'

// PW-01: un solo dispositivo enrolado por cuenta — Coordinador Territorial no tiene 2FA, así
// que este es el único paso extra en su primer acceso desde un dispositivo nuevo.
export function DeviceEnrollStep() {
  const auth = useAuth()
  if (!auth.dispositivoPendiente) return null

  return (
    <AuthLayout
      titulo="Nuevo dispositivo"
      subtitulo="Es tu primer acceso desde este dispositivo."
      onCerrar={() => auth.cancelarPendiente()}
      acciones={
        <>
          <Button variante="ejecutivo" className="w-full" onClick={() => auth.confirmarEnrolamiento()}>
            Enrolar y continuar
          </Button>
          <Button variante="ejecutivo-suave" className="w-full" onClick={() => auth.cancelarPendiente()}>
            Cancelar
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-grafito">
        El portal admite un solo dispositivo activo por cuenta. Si continúas, se cerrará el acceso
        desde cualquier otro dispositivo enrolado con esta cuenta.
      </p>
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
    <AuthLayout
      titulo="Configura tu segundo factor"
      subtitulo="Obligatorio para Superadministrador y Administrador."
      onCerrar={() => auth.cancelarPendiente()}
      acciones={
        <Button variante="ejecutivo" className="w-full" onClick={confirmar} disabled={codigo.length !== LONGITUD_CODIGO}>
          Confirmar y activar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <QrImage value={otpauthUri} />
        <p className="text-sm text-texto-suave">
          Escanéalo con Google Authenticator, Authy o similar. ¿No puedes escanear? Ingresa esta
          clave manualmente:
        </p>
        <code className="self-start rounded-control bg-borde/70 px-3 py-1 text-sm tracking-widest">{base32}</code>
        <CasillasDigitos
          longitud={LONGITUD_CODIGO}
          valor={codigo}
          onChange={setCodigo}
          etiqueta="Código de tu app autenticadora"
          autoFocus
          autoComplete="one-time-code"
          error={error}
        />
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
    <AuthLayout
      titulo="Verifica tu WhatsApp"
      subtitulo={`Enviamos un código a ${enmascararTelefono(user.telefonoWhatsapp)}. Lo usamos para recuperar tu acceso si olvidas tu PIN.`}
      onCerrar={() => auth.cancelarPendiente()}
      acciones={
        <>
          <Button variante="ejecutivo" className="w-full" onClick={confirmar} disabled={codigo.length !== LONGITUD_CODIGO}>
            Verificar
          </Button>
          <Button variante="ejecutivo-suave" className="w-full" onClick={() => auth.reenviarCodigoWhatsapp()}>
            Reenviar código
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <CasillasDigitos
          longitud={LONGITUD_CODIGO}
          valor={codigo}
          onChange={setCodigo}
          etiqueta="Código de verificación"
          autoFocus
          autoComplete="one-time-code"
          error={error}
        />
        <DemoNotice>
          Código simulado: <strong className="tabular-nums tracking-widest">{pendiente.codigo}</strong>. En
          producción llega por WhatsApp.
        </DemoNotice>
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
    <AuthLayout
      titulo="Verificación en dos pasos"
      subtitulo="Ingresa el código de tu app autenticadora."
      onCerrar={() => auth.cancelarPendiente()}
      acciones={
        <Button variante="ejecutivo" className="w-full" onClick={confirmar} disabled={codigo.length !== LONGITUD_CODIGO}>
          Verificar
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <CasillasDigitos
          longitud={LONGITUD_CODIGO}
          valor={codigo}
          onChange={setCodigo}
          etiqueta="Código de tu app autenticadora"
          autoFocus
          autoComplete="one-time-code"
          error={error}
        />
        <label className="flex items-center gap-2 text-sm text-grafito">
          <input
            type="checkbox"
            className="size-4 accent-primario"
            checked={recordar}
            onChange={(e) => setRecordar(e.target.checked)}
          />
          Recordar este dispositivo por 30 días
        </label>
      </div>
    </AuthLayout>
  )
}
