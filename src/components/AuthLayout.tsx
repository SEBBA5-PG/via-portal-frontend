import type { ReactNode } from 'react'
import { ViaLogo } from './ViaLogo'
import { AscensoPlayas } from './auth/AscensoPlayas'

export function AuthLayout({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string
  subtitulo?: string
  children: ReactNode
}) {
  return (
    // Un solo fondo a pantalla completa con la card flotando encima, igual en todos los
    // tamaños. AscensoPlayas va `fixed`: así cubre siempre la ventana y no se estira ni se
    // recorta cuando el contenido es más alto que la pantalla (el paso de configuración del
    // 2FA, con su QR, es el caso largo) — el contenido scrollea por encima.
    <div className="relative min-h-screen">
      <AscensoPlayas />
      <div className="relative z-10 grid min-h-screen place-items-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <ViaLogo className="h-16" />
          </div>
          <div className="rounded-panel bg-gradient-to-br from-card-from to-card-to p-8 shadow-2xl">
            <h1 className="font-heading font-extrabold text-2xl text-cafe mb-1 text-center">{titulo}</h1>
            {subtitulo && <p className="text-sm text-cafe-muted mb-6 text-center">{subtitulo}</p>}
            <div className={subtitulo ? '' : 'mt-6'}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
