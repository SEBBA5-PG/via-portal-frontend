import { useEffect, useRef } from 'react'

// Q-1252: paleta de nodos — solo azules/turquesas, sin colores multicolor sueltos.
// https://coolors.co/palette/03045e-023e8a-0077b6-0096c7-00b4d8-48cae4-90e0ef-ade8f4-caf0f8
const AZULES: Array<[number, number, number]> = [
  [3, 4, 94],
  [2, 62, 138],
  [0, 119, 182],
  [0, 150, 199],
  [0, 180, 216],
  [72, 202, 228],
  [144, 224, 239],
]
// Paleta minimalista (Q-1252, revisión "nodos fijos"): fondo casi negro, nodos
// azules, líneas grises — y TODA activación (pulso ambiente, pulso de cursor,
// descarga, tinte al acercarse) en el mismo blanco, para no meter más color
// del necesario en la interfaz.
const BLANCO_SENAL: [number, number, number] = [255, 255, 255]
// Modo claro automático del acceso (2026-09-13): sobre el fondo claro del portal, blanco
// puro sería invisible — la señal/pulso pasa a usar el mismo azul sólido del reskin
// (--side-bg, #002db2) en su lugar. Los nodos y la línea gris quedan igual: ya son
// azules/grises y funcionan sobre ambos fondos.
const AZUL_SENAL_CLARO: [number, number, number] = [0, 45, 178]
// Gris azulado apagado — se distingue del negro del fondo y de los azules
// vivos de los nodos, sin competir con ninguno de los dos.
const GRIS_LINEA: [number, number, number] = [98, 106, 120]

const N_MIN = 35
const N_MAX = 130
const N_DIVISOR = 21000 // densidad: 1 nodo cada N_DIVISOR px² de pantalla
const DIST_CONEXION = 240 // cercanía "natural" — lo que no alcance, lo asegura el árbol mínimo
const DIST_MOUSE = 260 // dispersión + tinte del nodo al acercarse
const ILUMINA_RADIO = 150 // radio en el que el cursor revela una conexión antes invisible
const IGNICION_RADIO = 45 // radio en el que el cursor fuerza a encender un nodo apagado
const TOQUE_RADIO = 95 // radio de la descarga de comunicación
const COOLDOWN_PULSO = 220
const COOLDOWN_DESCARGA = 90 // la descarga se repite más seguido que el pulso normal
const MAX_DESCARGAS = 5
const ANCHO_LINEA = 2.2
const EMPUJE_MAX = 34 // dispersión notoria al pasar el cursor cerca
const UMBRAL_VISIBLE = 0.12 // por debajo de esto un nodo no cuenta para conexiones

type EstadoNodo = 'off' | 'encendiendo' | 'on' | 'apagando'

interface Nodo {
  bx: number
  by: number
  x: number
  y: number
  ox: number
  oy: number
  vx: number
  vy: number
  r: number
  colorBase: [number, number, number]
  estado: EstadoNodo
  alpha: number
  proximoCambio: number
}

interface Pulso {
  i: number
  j: number
  invertido: boolean
  t: number
}

function crearNodo(w: number, h: number): Nodo {
  const bx = Math.random() * w
  const by = Math.random() * h
  return {
    bx,
    by,
    x: bx,
    y: by,
    ox: 0,
    oy: 0,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.18,
    r: 4.6 + Math.random() * 3.4,
    colorBase: AZULES[Math.floor(Math.random() * AZULES.length)],
    // El nodo existe siempre, nunca nace ni muere. Lo único que cambia es si
    // participa de la red (visible + conectable) o no — ver el ciclo en step().
    estado: 'off',
    alpha: 0,
    // escalonado: cada nodo espera un tiempo distinto antes de su primer
    // encendido, así nunca se encienden todos a la vez.
    proximoCambio: Math.random() * 9000,
  }
}

// La curva de una conexión no es simétrica entre sus dos extremos. Para que una
// señal nunca se dibuje espejada respecto a la línea real, siempre se calcula en
// el mismo orden con que se dibuja esa línea (i < j); el sentido de viaje se
// resuelve aparte, invirtiendo t — nunca intercambiando a y b (Q-1252).
function puntoEnCurva(a: Nodo, b: Nodo, t: number): [number, number] {
  const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.04
  const my = (a.y + b.y) / 2 + (a.x - b.x) * 0.04
  const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * mx + t ** 2 * b.x
  const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * my + t ** 2 * b.y
  return [x, y]
}

// Árbol mínimo (Prim), solo sobre los nodos actualmente encendidos: garantiza
// que todo nodo activo tenga al menos una conexión, sin importar qué tan
// disperso quede el mapa. Los apagados no participan en absoluto.
function arbolMinimo(nodos: Nodo[], indices: number[]): Array<[number, number]> {
  if (indices.length < 2) return []
  const enArbol = new Set([indices[0]])
  const bordes: Array<[number, number]> = []
  while (enArbol.size < indices.length) {
    let mejor: [number, number] | null = null
    let mejorD = Infinity
    for (const i of enArbol) {
      for (const j of indices) {
        if (enArbol.has(j)) continue
        const d = Math.hypot(nodos[i].x - nodos[j].x, nodos[i].y - nodos[j].y)
        if (d < mejorD) {
          mejorD = d
          mejor = [i, j]
        }
      }
    }
    if (!mejor) break
    bordes.push(mejor)
    enArbol.add(mejor[1])
  }
  return bordes
}

// Fondo animado del flujo de acceso (Q-1251/Q-1252): campo de nodos fijos que
// nunca se regeneran, apagados por defecto y que se encienden al azar (destello
// propio, no generación). AuthLayout la monta una sola vez a pantalla completa;
// cédula, PIN, 2FA y recuperación la comparten como piel fija de fondo.
interface Props {
  // Modo claro automático del acceso (2026-09-13): true cuando prefers-color-scheme del SO
  // es 'light'. Solo cambia el color de la señal/pulso (ver AZUL_SENAL_CLARO arriba) — nodos
  // y línea gris quedan iguales en ambos esquemas.
  claro?: boolean
}

export function FondoConexiones({ claro = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Ref (no estado): la simulación de nodos vive en closures de este efecto y nunca se
  // remonta mientras dura la sesión de acceso (ver comentario de la función). Si `claro`
  // cambiara de prop en deps del efecto, reiniciaría todo el campo de nodos. Con un ref
  // leído en cada frame, el color de la señal reacciona en vivo sin tocar la simulación.
  const claroRef = useRef(claro)
  useEffect(() => {
    claroRef.current = claro
  }, [claro])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const context = ctx
    context.lineCap = 'round'
    context.lineJoin = 'round'

    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h

    const nodos: Nodo[] = []
    function objetivoN(ancho: number, alto: number) {
      return Math.max(N_MIN, Math.min(N_MAX, Math.round((ancho * alto) / N_DIVISOR)))
    }
    for (let i = 0; i < objetivoN(w, h); i++) nodos.push(crearNodo(w, h))

    // El canvas puede cambiar de tamaño por algo más que redimensionar la
    // ventana (maximizar, arrastrar a otro monitor, rotar el dispositivo). Los
    // nodos existentes se reescalan a la nueva área para no quedar encerrados
    // en la región vieja — nunca se regeneran, solo se reubican en proporción.
    // Si el área creció, se agregan los nodos nuevos que hagan falta (nunca se
    // quitan los que ya estaban, ni cuando el área se reduce).
    function resize() {
      const nuevoW = window.innerWidth
      const nuevoH = window.innerHeight
      if (nuevoW === w && nuevoH === h) return
      const escalaX = nuevoW / w
      const escalaY = nuevoH / h
      for (const n of nodos) {
        n.bx *= escalaX
        n.by *= escalaY
        n.x = n.bx + n.ox
        n.y = n.by + n.oy
      }
      w = canvas!.width = nuevoW
      h = canvas!.height = nuevoH
      const faltan = objetivoN(w, h) - nodos.length
      for (let i = 0; i < faltan; i++) nodos.push(crearNodo(w, h))
    }
    window.addEventListener('resize', resize)

    const mouse = { x: -9999, y: -9999 }
    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    function onMouseLeave() {
      mouse.x = -9999
      mouse.y = -9999
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)

    let pulsoCursor: Pulso | null = null
    let ultimoPulsoCursor = 0
    let pulsoAmbiente: Pulso | null = null
    let proximaSenalAmbiente = 0
    let descargas: Pulso[] = []
    let ultimaDescarga = 0
    // revelado.get(clave) = qué tan visible es una conexión ahora mismo (0
    // invisible, 1 plena). Por defecto todo empieza en 0: las conexiones NO se
    // ven hasta que el cursor pasa cerca de alguno de sus dos extremos.
    const revelado = new Map<string, number>()
    let frame = 0

    // Señal suave: un solo trazo curvo con degradé de opacidad a lo largo de su
    // propio recorrido (nunca segmentos rectos sueltos) y un halo (shadowBlur)
    // para que no se vea "cuadrada" sino difuminada.
    function dibujarSenalLinea(
      p: Pulso,
      color: [number, number, number],
      velocidad: number,
      conexionesVivas: Set<string>,
      pico: number,
    ): Pulso | null {
      const clave = p.i < p.j ? `${p.i}-${p.j}` : `${p.j}-${p.i}`
      if (!conexionesVivas.has(clave)) return null
      p.t += velocidad
      const SIGMA = 0.13
      const MUESTRAS = 34
      if (p.t - SIGMA * 3 > 1) return null
      const a = nodos[p.i]
      const b = nodos[p.j]
      context.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.9)`
      let anterior: [number, number] | null = null
      for (let k = 0; k <= MUESTRAS; k++) {
        const t = k / MUESTRAS
        const dist = t - p.t
        const intensidad = Math.exp(-(dist * dist) / (2 * SIGMA * SIGMA)) * pico
        const tCurva = p.invertido ? 1 - t : t
        const punto = puntoEnCurva(a, b, Math.max(0, Math.min(1, tCurva)))
        if (anterior && intensidad > 0.015) {
          context.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${intensidad})`
          context.lineWidth = ANCHO_LINEA * (0.85 + intensidad * 0.4)
          context.shadowBlur = 5 + intensidad * 7
          context.beginPath()
          context.moveTo(anterior[0], anterior[1])
          context.lineTo(punto[0], punto[1])
          context.stroke()
        }
        anterior = punto
      }
      context.shadowBlur = 0
      return p
    }

    function step(ahora: number) {
      context.clearRect(0, 0, w, h)

      for (const n of nodos) {
        // deriva ambiental de siempre — todos se mueven, estén o no encendidos
        n.bx += n.vx
        n.by += n.vy
        if (n.bx < 0 || n.bx > w) n.vx *= -1
        if (n.by < 0 || n.by > h) n.vy *= -1

        // el cursor dispersa: empuje fuerte y reacción rápida, retorno lento —
        // se nota como una "explosión" suave que luego se reacomoda sola
        const dCursor = Math.hypot(n.bx - mouse.x, n.by - mouse.y)
        let tx = 0
        let ty = 0
        if (dCursor < DIST_MOUSE && dCursor > 0.01) {
          const fuerza = (1 - dCursor / DIST_MOUSE) ** 1.4 * EMPUJE_MAX
          tx = ((n.bx - mouse.x) / dCursor) * fuerza
          ty = ((n.by - mouse.y) / dCursor) * fuerza
        }
        const lerp = tx !== 0 || ty !== 0 ? 0.16 : 0.045
        n.ox += (tx - n.ox) * lerp
        n.oy += (ty - n.oy) * lerp
        n.x = n.bx + n.ox
        n.y = n.by + n.oy

        // el cursor puede forzar el encendido de un nodo apagado con el que se
        // topa, por delante de su propio temporizador — misma animación de siempre
        if (n.estado === 'off' && dCursor < IGNICION_RADIO) {
          n.estado = 'encendiendo'
        }

        // ciclo apagado → encendiéndose → encendido → apagándose → apagado.
        // El nodo nunca nace ni muere: solo entra y sale de la red visible.
        if (n.estado === 'off') {
          n.alpha = Math.max(0, n.alpha - 0.05)
          if (ahora >= n.proximoCambio) n.estado = 'encendiendo'
        } else if (n.estado === 'encendiendo') {
          n.alpha = Math.min(1, n.alpha + 0.035)
          if (n.alpha >= 1) {
            n.estado = 'on'
            n.proximoCambio = ahora + 3200 + Math.random() * 3600 // tiempo encendido
          }
        } else if (n.estado === 'on') {
          n.alpha = 1
          if (ahora >= n.proximoCambio) n.estado = 'apagando'
        } else if (n.estado === 'apagando') {
          n.alpha = Math.max(0, n.alpha - 0.035)
          if (n.alpha <= 0) {
            n.estado = 'off'
            n.proximoCambio = ahora + 5000 + Math.random() * 9000 // tiempo apagado
          }
        }
      }

      // solo los nodos con suficiente presencia entran a la red — los
      // apagados no se ven ni se conectan a nada
      const activos: number[] = []
      for (let i = 0; i < nodos.length; i++) if (nodos[i].alpha > UMBRAL_VISIBLE) activos.push(i)

      // grafo estructural (quién PODRÍA conectarse) — no implica que se dibuje
      const conexiones: Array<[number, number]> = []
      const yaConectado = new Set<string>()
      for (let a = 0; a < activos.length; a++) {
        for (let b = a + 1; b < activos.length; b++) {
          const i = activos[a]
          const j = activos[b]
          const d = Math.hypot(nodos[i].x - nodos[j].x, nodos[i].y - nodos[j].y)
          if (d < DIST_CONEXION) {
            conexiones.push([i, j])
            yaConectado.add(`${i}-${j}`)
          }
        }
      }
      for (const [i, j] of arbolMinimo(nodos, activos)) {
        const ci = Math.min(i, j)
        const cj = Math.max(i, j)
        const clave = `${ci}-${cj}`
        if (!yaConectado.has(clave)) conexiones.push([ci, cj])
      }

      const conexionesVivas = new Set<string>()
      const clavesVigentes = new Set<string>()
      for (const [i, j] of conexiones) {
        const clave = `${i}-${j}` // ya viene canónico (i<j) de ambos orígenes arriba
        conexionesVivas.add(clave)
        clavesVigentes.add(clave)

        // solo el cursor revela: sube rápido si está cerca de cualquiera de los
        // dos extremos, y decae solo cuando se aleja — deja un rastro breve
        const a = nodos[i]
        const b = nodos[j]
        const cerca =
          Math.hypot(a.x - mouse.x, a.y - mouse.y) < ILUMINA_RADIO ||
          Math.hypot(b.x - mouse.x, b.y - mouse.y) < ILUMINA_RADIO
        const previo = revelado.get(clave) || 0
        const nuevo = cerca ? Math.min(1, previo + 0.22) : previo * 0.9
        if (nuevo > 0.01) revelado.set(clave, nuevo)
        else revelado.delete(clave)

        if (nuevo <= 0.015) continue // invisible: no se dibuja nada de esta conexión
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        const alphaLinea = Math.max(0.06, (1 - d / (DIST_CONEXION * 1.6)) * 0.4) * Math.min(a.alpha, b.alpha) * nuevo
        context.shadowBlur = 3 * nuevo
        context.shadowColor = `rgba(${GRIS_LINEA[0]}, ${GRIS_LINEA[1]}, ${GRIS_LINEA[2]}, 0.5)`
        context.strokeStyle = `rgba(${GRIS_LINEA[0]}, ${GRIS_LINEA[1]}, ${GRIS_LINEA[2]}, ${alphaLinea})`
        context.lineWidth = ANCHO_LINEA
        context.beginPath()
        context.moveTo(a.x, a.y)
        const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.04
        const my = (a.y + b.y) / 2 + (a.x - b.x) * 0.04
        context.quadraticCurveTo(mx, my, b.x, b.y)
        context.stroke()
        context.shadowBlur = 0
      }
      // limpia el rastro de conexiones que ya no existen (nodos apagados, etc.)
      for (const clave of revelado.keys()) if (!clavesVigentes.has(clave)) revelado.delete(clave)

      // el mouse cerca de la red dispara UNA señal hacia un vecino al azar
      if (!pulsoCursor && ahora - ultimoPulsoCursor > COOLDOWN_PULSO) {
        const cercanos = conexiones.filter(
          ([i, j]) =>
            Math.hypot(nodos[i].x - mouse.x, nodos[i].y - mouse.y) < DIST_MOUSE ||
            Math.hypot(nodos[j].x - mouse.x, nodos[j].y - mouse.y) < DIST_MOUSE,
        )
        if (cercanos.length) {
          const [i, j] = cercanos[Math.floor(Math.random() * cercanos.length)]
          const dI = Math.hypot(nodos[i].x - mouse.x, nodos[i].y - mouse.y)
          const dJ = Math.hypot(nodos[j].x - mouse.x, nodos[j].y - mouse.y)
          const masCercano = dI < dJ ? i : j
          pulsoCursor = { i, j, invertido: masCercano === j, t: 0 }
          ultimoPulsoCursor = ahora
        }
      }

      // descarga: cuando el cursor TOCA de cerca una conexión (radio más
      // ceñido que el de dispersión/despertar), se dispara una ráfaga de
      // señales extra sobre esa conexión y sus vecinas — encima de la
      // activación normal que ya existía, no en su lugar.
      if (ahora - ultimaDescarga > COOLDOWN_DESCARGA && descargas.length < MAX_DESCARGAS) {
        const tocadas = conexiones.filter(
          ([i, j]) =>
            Math.hypot(nodos[i].x - mouse.x, nodos[i].y - mouse.y) < TOQUE_RADIO ||
            Math.hypot(nodos[j].x - mouse.x, nodos[j].y - mouse.y) < TOQUE_RADIO,
        )
        if (tocadas.length) {
          const [i, j] = tocadas[Math.floor(Math.random() * tocadas.length)]
          descargas.push({ i, j, invertido: Math.random() < 0.5, t: 0 })
          ultimaDescarga = ahora
        }
      }

      // Sobre fondo claro el blanco de la señal sería invisible: se reemplaza por el azul
      // sólido del reskin (AZUL_SENAL_CLARO). Nodos y línea gris no cambian.
      const colorSenal = claroRef.current ? AZUL_SENAL_CLARO : BLANCO_SENAL
      if (pulsoAmbiente) pulsoAmbiente = dibujarSenalLinea(pulsoAmbiente, colorSenal, 0.0045, conexionesVivas, 0.55)
      if (pulsoCursor) pulsoCursor = dibujarSenalLinea(pulsoCursor, colorSenal, 0.022, conexionesVivas, 1)
      descargas = descargas
        .map((d) => dibujarSenalLinea(d, colorSenal, 0.05, conexionesVivas, 1.1))
        .filter((d): d is Pulso => d !== null)

      // la red respira sola de fondo, independiente del cursor
      if (!pulsoAmbiente && ahora > proximaSenalAmbiente && conexiones.length) {
        const [i, j] = conexiones[Math.floor(Math.random() * conexiones.length)]
        pulsoAmbiente = { i, j, invertido: Math.random() < 0.5, t: 0 }
        proximaSenalAmbiente = ahora + 1400 + Math.random() * 2000
      }

      // nodos — solo se dibujan los que tienen algo de presencia
      for (const n of nodos) {
        if (n.alpha <= 0.01) continue

        const dCursor = Math.hypot(n.x - mouse.x, n.y - mouse.y)
        const despierto = dCursor < DIST_MOUSE ? 1 - dCursor / DIST_MOUSE : 0

        const [br, bg, bb] = n.colorBase
        const r = br + (BLANCO_SENAL[0] - br) * despierto * 0.75
        const g = bg + (BLANCO_SENAL[1] - bg) * despierto * 0.75
        const b = bb + (BLANCO_SENAL[2] - bb) * despierto * 0.75
        const radio = n.r * (2.2 + despierto * 1.6)
        const alpha = Math.min(1, n.alpha * (0.75 + despierto * 0.45))

        context.shadowColor = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha * 0.6})`
        context.shadowBlur = 6 + despierto * 6
        const grad = context.createRadialGradient(n.x, n.y, 0, n.x, n.y, radio)
        grad.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha})`)
        grad.addColorStop(0.4, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha * 0.5})`)
        grad.addColorStop(0.75, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${alpha * 0.18})`)
        grad.addColorStop(1, `rgba(${r | 0}, ${g | 0}, ${b | 0}, 0)`)
        context.beginPath()
        context.arc(n.x, n.y, radio, 0, Math.PI * 2)
        context.fillStyle = grad
        context.fill()
      }
      context.shadowBlur = 0

      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 h-full w-full bg-fondo-acceso" />
}
