import type { ReactNode } from 'react'
import logo from '../assets/via-logo.png'

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
    <div className="min-h-screen flex items-center justify-center bg-institucional px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <img src={logo} alt="VIA" className="h-16 w-auto" />
        </div>
        <div className="rounded-panel bg-gradient-to-br from-card-from to-card-to p-8 shadow-md">
          <h1 className="font-heading font-extrabold text-2xl text-cafe mb-1 text-center">{titulo}</h1>
          {subtitulo && <p className="text-sm text-cafe-muted mb-6 text-center">{subtitulo}</p>}
          <div className={subtitulo ? '' : 'mt-6'}>{children}</div>
        </div>
      </div>
    </div>
  )
}
