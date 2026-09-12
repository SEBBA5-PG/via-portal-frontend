import { useEffect, useState } from 'react'

// Cuenta regresiva de un código OTP. Al llegar a cero anuncia el vencimiento: la pantalla que lo
// usa no debe repetir ese mensaje como error.
export function VigenciaCodigo({ expiraEn }: { expiraEn: number }) {
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
