import type { ReactNode } from 'react'

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-acento/60 bg-acento/10 px-4 py-3 text-sm text-cafe">
      <p className="font-heading font-bold mb-1 text-xs uppercase tracking-wide">Modo demo</p>
      <div>{children}</div>
    </div>
  )
}
