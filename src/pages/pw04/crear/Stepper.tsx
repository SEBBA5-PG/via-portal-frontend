/*
  Stepper horizontal del asistente de alta de cuenta (4 pasos). Puramente visual: quien lo usa
  decide cuándo avanza (validación por paso vive en CrearCuentaPage). Tres estados por nodo —
  actual, completado, futuro — con la misma paleta que el resto del sistema: `exito` para lo ya
  hecho (Badge.tsx), `primario` para el paso activo, `borde`/`texto-tenue` para lo que falta.
*/

export function Stepper({ pasos, pasoActual }: { pasos: string[]; pasoActual: number }) {
  return (
    <ol className="flex items-start">
      {pasos.map((paso, indice) => {
        const completado = indice < pasoActual
        const actual = indice === pasoActual
        const esUltimo = indice === pasos.length - 1

        return (
          <li key={paso} className={`flex items-center ${esUltimo ? '' : 'flex-1'}`}>
            <div className="flex flex-col items-center gap-2">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full border-2 font-heading text-sm font-extrabold transition-colors duration-300 motion-reduce:transition-none ${
                  actual
                    ? 'border-[var(--color-primario)] bg-[var(--color-primario)] text-white'
                    : completado
                      ? 'border-exito bg-exito text-white'
                      : 'border-borde bg-white text-texto-tenue'
                }`}
              >
                {completado ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                ) : (
                  indice + 1
                )}
              </span>
              <span
                className={`max-w-[7.5rem] text-center text-xs leading-tight transition-colors duration-300 motion-reduce:transition-none ${
                  actual ? 'font-bold text-grafito' : completado ? 'text-exito' : 'text-texto-tenue'
                }`}
              >
                {paso}
              </span>
            </div>
            {!esUltimo && (
              <div
                aria-hidden="true"
                className={`mx-2 mt-[18px] h-0.5 flex-1 rounded-full border-t-2 transition-colors duration-300 motion-reduce:transition-none ${
                  completado ? 'border-exito' : 'border-borde'
                }`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
