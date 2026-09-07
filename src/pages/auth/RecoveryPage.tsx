import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/authStore'
import { enmascararTelefono } from '../../state/format'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { CodeInput } from '../../components/ui/CodeInput'
import { DemoNotice } from '../../components/ui/DemoNotice'

type Paso = 'solicitar' | 'verificar' | 'restablecer' | 'listo'

export function RecoveryPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [paso, setPaso] = useState<Paso>('solicitar')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)

  const usuario = auth.recuperacion
    ? auth.usuarios.find((u) => u.id === auth.recuperacion!.userId)
    : null

  function solicitar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const r = auth.solicitarRecuperacion(email)
    if (!r.ok) setError(r.mensaje)
    else setPaso('verificar')
  }

  function verificar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const r = auth.confirmarCodigoRecuperacion(codigo)
    if (!r.ok) setError(r.mensaje)
    else setPaso('restablecer')
  }

  function restablecer(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (nueva.length < 8) return setError('Usa al menos 8 caracteres.')
    if (nueva !== confirmacion) return setError('Las contraseñas no coinciden.')
    const r = auth.restablecerContrasena(nueva)
    if (!r.ok) setError(r.mensaje)
    else setPaso('listo')
  }

  if (paso === 'listo') {
    return (
      <AuthLayout titulo="Contraseña actualizada">
        <p className="text-sm text-cafe mb-4 text-center">
          Ya puedes iniciar sesión con tu nueva contraseña.
        </p>
        <Button onClick={() => navigate('/login')} className="w-full">
          Ir a iniciar sesión
        </Button>
      </AuthLayout>
    )
  }

  if (paso === 'restablecer') {
    return (
      <AuthLayout titulo="Elige una nueva contraseña">
        <form onSubmit={restablecer} className="flex flex-col gap-4">
          <TextField
            etiqueta="Nueva contraseña"
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            required
          />
          <TextField
            etiqueta="Confirmar contraseña"
            type="password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit">Guardar contraseña</Button>
        </form>
      </AuthLayout>
    )
  }

  if (paso === 'verificar') {
    return (
      <AuthLayout
        titulo="Verifica el código"
        subtitulo={usuario ? `Enviado por WhatsApp a ${enmascararTelefono(usuario.telefonoWhatsapp)}` : undefined}
      >
        <div className="flex flex-col gap-4">
          {auth.recuperacion && (
            <DemoNotice>
              Código simulado: <strong>{auth.recuperacion.codigo}</strong>
            </DemoNotice>
          )}
          <form onSubmit={verificar} className="flex flex-col gap-4">
            <CodeInput value={codigo} onChange={setCodigo} autoFocus />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={codigo.length !== 6}>
              Verificar código
            </Button>
          </form>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout titulo="Recuperar acceso" subtitulo="Te enviaremos un código temporal por WhatsApp">
      <form onSubmit={solicitar} className="flex flex-col gap-4">
        <TextField etiqueta="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit">Enviar código</Button>
      </form>
      <div className="mt-4 text-center">
        <Link to="/login" className="text-sm text-cafe-muted underline">
          Volver a iniciar sesión
        </Link>
      </div>
    </AuthLayout>
  )
}
