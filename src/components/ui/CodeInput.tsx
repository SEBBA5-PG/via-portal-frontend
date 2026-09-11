interface Props {
  value: string
  onChange: (valor: string) => void
  autoFocus?: boolean
}

export function CodeInput({ value, onChange, autoFocus }: Props) {
  return (
    <input
      autoFocus={autoFocus}
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="one-time-code"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="······"
      aria-label="Código de 6 dígitos"
      className="w-full rounded-2xl border border-institucional-sidebar bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-cafe outline-none focus:border-acento"
    />
  )
}
