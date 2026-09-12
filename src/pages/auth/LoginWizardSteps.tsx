import { useState, type ReactNode } from 'react'
import { LONGITUD_CODIGO, useAuth } from '../../state/authStore'
import { Button } from '../../components/ui/Button'
import { CasillasDigitos } from '../../components/ui/CasillasDigitos'
import { DemoNotice } from '../../components/ui/DemoNotice'
import { VigenciaCodigo } from '../../components/ui/VigenciaCodigo'

// Props que le bastan a un solo <AuthLayout> para mostrar cualquier paso del login — nunca
// un subconjunto distinto de props de AuthLayout, para que LoginPage pueda renderizar
// siempre el mismo elemento (ver el porqué en LoginPage.tsx).
export interface PasoLoginProps {
  saludo?: string
  titulo: string
  subtitulo?: ReactNode
  paso?: { actual: number; total: number }
  onVolver?: () => void
  onCerrar?: () => void
  ancho?: 'normal' | 'amplio'
  acciones: ReactNode
  children?: ReactNode
}

// PW-01: un solo dispositivo enrolado por cuenta — Coordinador Territorial no tiene 2FA, así
// que este es el único paso extra en su primer acceso desde un dispositivo nuevo.
//
// Antes esto era un componente que retornaba su propio <AuthLayout>, y LoginPage hacía
// `return <DeviceEnrollStep />` en vez de seguir con su <AuthLayout> de siempre — React ve
// ahí un tipo de elemento distinto en el mismo lugar del árbol y remonta todo de cero (el
// fondo de nodos, el logo, todo), sin pasar por la transición suave entre pasos (feedback
// 2026-09-12). Ahora es un hook que solo devuelve las props del paso — LoginPage arma un
// único <AuthLayout>, así que React lo actualiza en vez de remontarlo, sin importar de qué
// paso a cuál se mueva.
export function useDeviceEnrollStep(): PasoLoginProps | null {
  const auth = useAuth()
  if (!auth.dispositivoPendiente) return null

  return {
    titulo: 'Nuevo dispositivo',
    subtitulo: 'Es tu primer acceso desde este dispositivo.',
    onCerrar: () => auth.cancelarPendiente(),
    acciones: (
      <>
        <Button variante="ejecutivo" className="w-full" onClick={() => auth.confirmarEnrolamiento()}>
          Enrolar y continuar
        </Button>
        <Button variante="ejecutivo-suave" className="w-full" onClick={() => auth.cancelarPendiente()}>
          Cancelar
        </Button>
      </>
    ),
    children: (
      <p className="text-sm leading-6 text-grafito">
        El portal admite un solo dispositivo activo por cuenta. Si continúas, se cerrará el acceso
        desde cualquier otro dispositivo enrolado con esta cuenta.
      </p>
    ),
  }
}

// PW-01, Mecanismo de 2FA: Superadministrador y Administrador, tras el PIN correcto, confirman un
// código de un solo uso enviado por WhatsApp al celular de la cuenta. El número no se muestra.
// Mismo motivo que arriba: hook que devuelve props, no un componente con su propio AuthLayout.
export function useDesafioOtpStep(): PasoLoginProps | null {
  const auth = useAuth()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const desafio = auth.desafio2FA
  if (!desafio) return null

  function verificar(valor: string) {
    if (!desafio || valor.length !== LONGITUD_CODIGO) return
    setError(null)
    setAviso(null)
    const r = auth.confirmarCodigo2FA(valor)
    if (r.ok) return
    setCodigo('')
    // El vencimiento ya lo anuncia VigenciaCodigo debajo de las casillas: no repetirlo.
    const vencido = desafio.expiraEn != null && Date.now() > desafio.expiraEn
    if (!vencido) setError(r.mensaje)
  }

  function reenviar() {
    setError(null)
    setAviso(null)
    setCodigo('')
    const r = auth.reenviarCodigo2FA()
    if (r.ok) setAviso('Te enviamos un código nuevo.')
    else setError(r.mensaje)
  }

  return {
    titulo: 'Verifica que eres tú',
    subtitulo: `Por seguridad, te enviamos un código de ${LONGITUD_CODIGO} dígitos por WhatsApp al celular registrado en tu cuenta.`,
    onVolver: () => auth.cancelarPendiente(),
    ancho: 'amplio',
    acciones: (
      <>
        <Button
          variante="ejecutivo"
          className="w-full"
          disabled={codigo.length !== LONGITUD_CODIGO}
          onClick={() => verificar(codigo)}
        >
          Verificar e ingresar
        </Button>
        <Button variante="ejecutivo-suave" className="w-full" onClick={reenviar}>
          Reenviar código
        </Button>
      </>
    ),
    children: (
      <div className="flex flex-col gap-5">
        <CasillasDigitos
          longitud={LONGITUD_CODIGO}
          valor={codigo}
          onChange={(v) => {
            setCodigo(v)
            if (error) setError(null)
          }}
          onCompletar={verificar}
          etiqueta={`Código de verificación de ${LONGITUD_CODIGO} dígitos`}
          autoFocus
          autoComplete="one-time-code"
          error={error}
        />
        {desafio.expiraEn && <VigenciaCodigo expiraEn={desafio.expiraEn} />}
        {aviso && (
          <p role="status" className="text-sm text-grafito">
            {aviso}
          </p>
        )}
        {desafio.codigo && (
          <DemoNotice>
            Código simulado: <strong className="tabular-nums tracking-widest">{desafio.codigo}</strong>. En
            producción llega por WhatsApp.
          </DemoNotice>
        )}
      </div>
    ),
  }
}
