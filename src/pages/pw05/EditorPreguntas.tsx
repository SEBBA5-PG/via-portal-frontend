import { TextField } from '../../components/ui/TextField'
import type { OpcionPregunta, Pregunta, Subtipo } from '../../data/misiones'

/*
  Constructor de preguntas para Trivia/Encuesta (observación del usuario, 2026-09-14): en vez
  de la Descripción genérica de una misión digital cualquiera, estos dos subtipos necesitan
  contenido real — pregunta + opciones de respuesta. [DECISIÓN BORRADOR]: la wiki (Retos y
  Mecánicas de Juego §Pendiente de validar) deja el esquema de datos de misiones para
  desarrollo, así que esta es la propuesta del asistente, no algo ya cerrado.

  Trivia y Encuesta comparten el mismo componente porque comparten forma — la diferencia es
  solo si se pide marcar una opción correcta y su explicación (Trivia, autoevaluada) o no
  (Encuesta, sin respuesta "correcta").
*/

function idAleatorio(): string {
  return Math.random().toString(36).slice(2, 10)
}

function opcionVacia(): OpcionPregunta {
  return { id: idAleatorio(), texto: '' }
}

function preguntaVacia(): Pregunta {
  return { id: idAleatorio(), enunciado: '', opciones: [opcionVacia(), opcionVacia()] }
}

export { preguntaVacia }

function IconoBasura() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h12" />
      <path d="M7.5 6V4.5h5V6" />
      <path d="M5.5 6l.7 9.5a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9L14.5 6" />
    </svg>
  )
}

export function EditorPreguntas({
  subtipo,
  preguntas,
  onCambiar,
  disabled,
}: {
  subtipo: Subtipo
  preguntas: Pregunta[]
  onCambiar: (preguntas: Pregunta[]) => void
  disabled?: boolean
}) {
  const esTrivia = subtipo === 'trivia'

  const actualizarPregunta = (id: string, cambios: Partial<Pregunta>) =>
    onCambiar(preguntas.map((p) => (p.id === id ? { ...p, ...cambios } : p)))

  const eliminarPregunta = (id: string) => onCambiar(preguntas.filter((p) => p.id !== id))

  const agregarPregunta = () => onCambiar([...preguntas, preguntaVacia()])

  const actualizarOpcion = (preguntaId: string, opcionId: string, cambios: Partial<OpcionPregunta>) =>
    actualizarPregunta(preguntaId, {
      opciones: preguntas
        .find((p) => p.id === preguntaId)!
        .opciones.map((o) => (o.id === opcionId ? { ...o, ...cambios } : o)),
    })

  const marcarCorrecta = (preguntaId: string, opcionId: string) =>
    actualizarPregunta(preguntaId, {
      opciones: preguntas
        .find((p) => p.id === preguntaId)!
        .opciones.map((o) => ({ ...o, correcta: o.id === opcionId })),
    })

  const agregarOpcion = (preguntaId: string) =>
    actualizarPregunta(preguntaId, { opciones: [...preguntas.find((p) => p.id === preguntaId)!.opciones, opcionVacia()] })

  const eliminarOpcion = (preguntaId: string, opcionId: string) =>
    actualizarPregunta(preguntaId, {
      opciones: preguntas.find((p) => p.id === preguntaId)!.opciones.filter((o) => o.id !== opcionId),
    })

  return (
    <div className="flex flex-col gap-4">
      {preguntas.length === 0 && (
        <div className="rounded-[16px] border border-dashed border-borde px-5 py-6 text-center text-sm text-texto-suave">
          Todavía no hay preguntas. Agrega la primera.
        </div>
      )}

      {preguntas.map((p, i) => (
        <div key={p.id} className="rounded-[16px] border border-borde bg-surface-sunken/40 p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="mt-2.5 font-heading text-xs font-bold uppercase tracking-wide text-texto-suave">Pregunta {i + 1}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => eliminarPregunta(p.id)}
              aria-label={`Eliminar pregunta ${i + 1}`}
              className="grid size-8 shrink-0 place-items-center rounded-full text-texto-suave outline-none transition-colors hover:bg-peligro/10 hover:text-peligro focus-visible:ring-4 focus-visible:ring-ambar/40 disabled:opacity-50"
            >
              <IconoBasura />
            </button>
          </div>

          <div className="mt-1">
            <TextField
              etiqueta="Enunciado"
              placeholder={esTrivia ? '¿Cuál es la capital del Huila?' : '¿Qué tan satisfecho estás con...?'}
              value={p.enunciado}
              disabled={disabled}
              onChange={(e) => actualizarPregunta(p.id, { enunciado: e.target.value })}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <span className="font-heading text-sm font-bold text-grafito">
              Opciones de respuesta{esTrivia && <span className="ml-1 font-normal text-texto-suave">— marca la correcta</span>}
            </span>
            {p.opciones.map((o, j) => (
              <div key={o.id} className="flex flex-col gap-1.5 rounded-[12px] border border-borde bg-white px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  {esTrivia && (
                    <input
                      type="radio"
                      name={`correcta-${p.id}`}
                      checked={Boolean(o.correcta)}
                      disabled={disabled}
                      onChange={() => marcarCorrecta(p.id, o.id)}
                      aria-label={`Marcar opción ${j + 1} como correcta`}
                      className="size-4 shrink-0 accent-exito outline-none focus-visible:ring-4 focus-visible:ring-ambar/40"
                    />
                  )}
                  <input
                    value={o.texto}
                    disabled={disabled}
                    onChange={(e) => actualizarOpcion(p.id, o.id, { texto: e.target.value })}
                    placeholder={`Opción ${j + 1}`}
                    aria-label={`Texto de la opción ${j + 1}`}
                    className="h-10 flex-1 rounded-full border border-borde/60 bg-fondo/[0.04] px-4 text-sm text-grafito outline-none transition focus:border-primario focus:ring-4 focus:ring-ambar/30 disabled:opacity-60"
                  />
                  {esTrivia && o.correcta && (
                    <span className="shrink-0 rounded-full bg-exito/10 px-2.5 py-1 text-xs font-bold text-exito">Correcta</span>
                  )}
                  <button
                    type="button"
                    disabled={disabled || p.opciones.length <= 2}
                    onClick={() => eliminarOpcion(p.id, o.id)}
                    aria-label={`Eliminar opción ${j + 1}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-texto-suave outline-none transition-colors hover:bg-peligro/10 hover:text-peligro focus-visible:ring-4 focus-visible:ring-ambar/40 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <IconoBasura />
                  </button>
                </div>
                {esTrivia && (
                  <input
                    value={o.explicacion ?? ''}
                    disabled={disabled}
                    onChange={(e) => actualizarOpcion(p.id, o.id, { explicacion: e.target.value })}
                    placeholder={o.correcta ? 'Por qué es correcta (se le muestra al usuario)' : 'Por qué es incorrecta (opcional)'}
                    aria-label={`Explicación de la opción ${j + 1}`}
                    className="ml-[26px] h-9 rounded-full border border-borde/40 bg-transparent px-3.5 text-xs text-texto-suave outline-none transition focus:border-primario focus:ring-4 focus:ring-ambar/30 disabled:opacity-60"
                  />
                )}
              </div>
            ))}
            <button
              type="button"
              disabled={disabled}
              onClick={() => agregarOpcion(p.id)}
              className="w-fit text-xs font-bold text-primario outline-none transition-colors hover:text-primario-600 focus-visible:ring-4 focus-visible:ring-ambar/40 disabled:opacity-50"
            >
              + Agregar opción
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={agregarPregunta}
        className="w-fit rounded-full border border-primario/30 bg-primario/[0.06] px-4 py-2 font-heading text-sm font-bold text-primario outline-none transition-colors hover:bg-primario/[0.12] focus-visible:ring-4 focus-visible:ring-ambar/40 disabled:opacity-50"
      >
        + Agregar pregunta
      </button>
    </div>
  )
}
