import type { ReactNode } from 'react'

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-control border border-dashed border-ambar bg-ambar/10 px-4 py-3 text-sm text-grafito">
      <p className="mb-1 font-heading text-[11px] font-bold uppercase tracking-wider text-grafito/70">Modo demo</p>
      <div>{children}</div>
    </div>
  )
}
