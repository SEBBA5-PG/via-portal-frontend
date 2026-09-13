// Selector compacto para barras de filtro (alto 40, sin texto de ayuda). Para formularios se
// usa SelectField, que sigue el alto 48 de TextField.
export function FiltroSelect({
  etiqueta,
  valor,
  onCambiar,
  opciones,
  deshabilitado,
}: {
  etiqueta: string
  valor: string
  onCambiar: (valor: string) => void
  opciones: [string, string][]
  deshabilitado?: boolean
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-heading text-xs font-bold text-texto-suave">{etiqueta}</span>
      <select
        value={valor}
        disabled={deshabilitado}
        onChange={(e) => onCambiar(e.target.value)}
        className="h-10 rounded-full border-[1.5px] border-borde/40 bg-fondo/[0.05] px-4 text-sm text-grafito outline-none transition focus:border-primario focus:ring-4 focus:ring-ambar/30 disabled:opacity-60"
      >
        {opciones.map(([v, texto]) => (
          <option key={v} value={v} className="bg-[#111823] text-grafito">
            {texto}
          </option>
        ))}
      </select>
    </label>
  )
}
