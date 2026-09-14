/*
  Usuarios de la app — PW-03. Ninguna persona aquí es real.

  NO son las cuentas administrativas del portal (eso es PW-04, src/data/cuentas.ts): son las
  personas que usan la app y la landing. Las reglas salen de VIA BRAIN,
  wiki/Perfil, Datos Personales y Ciclo de Vida del Usuario.md — PW-03 todavía es andamiaje y
  no define pantallas propias.
*/

// wiki §Ciclo de vida — los seis valores literales de `estado_cuenta`.
export type EstadoCuentaApp =
  | 'provisional'
  | 'activa'
  | 'inactiva'
  | 'bajo_auditoria'
  | 'bloqueada'
  | 'eliminada'

export const ESTADOS_CUENTA_APP: Record<EstadoCuentaApp, string> = {
  provisional: 'Provisional',
  activa: 'Activa',
  inactiva: 'Inactiva',
  bajo_auditoria: 'Bajo auditoría',
  bloqueada: 'Bloqueada',
  eliminada: 'Eliminada',
}

// Inscrito Activo / Usuario Activo NO son estados de cuenta: son la dimensión
// Canal/Engagement (wiki/Actores, Roles y Permisos §Tipos de usuario).
export type CanalUsuario = 'inscrito' | 'activo'

export const CANALES: Record<CanalUsuario, string> = {
  inscrito: 'Inscrito Activo',
  activo: 'Usuario Activo',
}

// Rol gamificado: título del juego, no rol de sistema ni permiso.
export type RolJuego = 'explorador' | 'facilitador' | 'mentor'

export const ROLES_JUEGO: Record<RolJuego, string> = {
  explorador: 'Explorador',
  facilitador: 'Facilitador',
  mentor: 'Mentor',
}

// wiki §Motivos de bloqueo.
export type MotivoBloqueo = 'otp' | 'fraude_gps' | 'evidencia_falsa' | 'bots' | 'ofensivo' | 'manual'

export const MOTIVOS_BLOQUEO: Record<MotivoBloqueo, string> = {
  otp: 'Más de 3 OTP en 15 minutos (automático, 1 hora)',
  fraude_gps: 'Fraude de geolocalización',
  evidencia_falsa: 'Evidencia falsa reincidente',
  bots: 'Uso de bots',
  ofensivo: 'Comportamiento ofensivo',
  manual: 'Decisión manual de un administrador',
}

// Las bóvedas consultadas solo nombran los extremos de las Playas (1 Achira … 7 Huila). Las
// intermedias se muestran por número en vez de inventarles nombre.
export function nombrePlaya(numero: number): string {
  if (numero === 1) return 'Playa 1 · Achira'
  if (numero === 7) return 'Playa 7 · Huila'
  return `Playa ${numero}`
}

export interface UsuarioApp {
  id: string
  nombreLegal: string
  alias: string
  cedula: string
  celular: string
  municipioId: string
  barrio: string
  canal: CanalUsuario
  estado: EstadoCuentaApp
  motivoBloqueo?: MotivoBloqueo
  playa: number
  rolJuego: RolJuego
  agatas: number
  fechaRegistro: string
  ultimaActividad: string
  // Deduplicación (wiki): máximo 2 cuentas por dispositivo, la 3.ª queda bajo auditoría.
  // Dos usuarios con el mismo id de dispositivo se señalan como posible duplicado.
  dispositivoId: string
  fusionadoCon?: string
}

type Semilla = [
  id: string,
  nombre: string,
  alias: string,
  cedula: string,
  municipioId: string,
  canal: CanalUsuario,
  estado: EstadoCuentaApp,
  playa: number,
  rol: RolJuego,
  agatas: number,
  dispositivo: string,
  ultimaActividad: string,
  motivo?: MotivoBloqueo,
]

// Municipios corregidos al 2026-09-14: `territorios.ts` acotó el árbol a solo el Huila
// (departamento → 4 subregiones → sus municipios) — estos 24 registros traían ids de fuera
// de ese árbol (t-soacha, t-bogota, t-medellin...), heredados de un borrador anterior al
// recorte. Con esos ids, `territoriosAlcanzados` nunca los encuentra: para cualquier cuenta
// con alcance en el Huila (todas las del demo), `alcanza()` daba `false` siempre y estos 24
// usuarios eran invisibles pase lo que pase — el mismo bug rompía las cuentas de
// `cuentas.ts` con `territorioIds` fuera del árbol. Remapeados a un municipio real del Huila
// por persona, conservando a quién representaban (capital → Neiva, segunda ciudad →
// Pitalito, etc.) para no tener que reescribir los casos de prueba que ya cuelgan de ellos
// (duplicados por dispositivo, fraude, cuenta eliminada...).
const BARRIOS = ['Centro', 'San Mateo', 'La Esperanza', 'El Porvenir', 'Villa del Río']

const SEMILLAS: Semilla[] = [
  ['ua-01', 'Juan David Moreno', 'juanda_neiva', '1075234189', 't-neiva', 'activo', 'activa', 3, 'facilitador', 4820, 'd-01', '2026-09-12'],
  ['ua-02', 'Luisa Fernanda Castro', 'lufer', '1075881203', 't-neiva', 'activo', 'activa', 2, 'explorador', 1310, 'd-02', '2026-09-11'],
  ['ua-03', 'Carlos Arturo Méndez', 'carlitos.m', '1075990456', 't-neiva', 'activo', 'bajo_auditoria', 4, 'facilitador', 7120, 'd-03', '2026-09-09'],
  ['ua-04', 'Carlos A. Méndez', 'cmendez2', '1075990457', 't-neiva', 'activo', 'activa', 1, 'explorador', 220, 'd-03', '2026-09-08'],
  ['ua-05', 'Marta Lucía Pardo', 'martica', '1075112233', 't-neiva', 'inscrito', 'provisional', 1, 'explorador', 150, 'd-05', '2026-08-30'],
  ['ua-06', 'Óscar Iván Rincón', 'oscar_r', '1075445566', 't-neiva', 'activo', 'bloqueada', 2, 'explorador', 980, 'd-06', '2026-08-21', 'evidencia_falsa'],
  ['ua-07', 'Natalia Gómez Ruiz', 'nata.gomez', '1020304050', 't-pitalito', 'activo', 'activa', 6, 'mentor', 18450, 'd-07', '2026-09-12'],
  ['ua-08', 'Felipe Andrés Torres', 'pipe_torres', '1020998877', 't-pitalito', 'activo', 'activa', 5, 'facilitador', 9900, 'd-08', '2026-09-10'],
  ['ua-09', 'Andrea Paola Silva', 'andre_ps', '1020556677', 't-pitalito', 'activo', 'inactiva', 2, 'explorador', 640, 'd-09', '2026-05-02'],
  ['ua-10', 'Esteban Rojas', 'xXestebanXx', '1020123123', 't-pitalito', 'activo', 'bloqueada', 1, 'explorador', 40, 'd-10', '2026-09-12', 'otp'],
  ['ua-11', 'Valeria Quintero', 'vale_q', '1032667788', 't-garzon', 'inscrito', 'provisional', 1, 'explorador', 90, 'd-11', '2026-09-01'],
  ['ua-12', 'Sebastián Arango', 'sebas.arango', '1036445521', 't-laplata', 'activo', 'activa', 7, 'mentor', 25300, 'd-12', '2026-09-12'],
  ['ua-13', 'Daniela Restrepo', 'dani_rest', '1036778812', 't-laplata', 'activo', 'activa', 4, 'facilitador', 6200, 'd-13', '2026-09-11'],
  ['ua-14', 'Mateo Zapata', 'mateoz', '1036990011', 't-campoalegre', 'activo', 'bloqueada', 3, 'facilitador', 3100, 'd-14', '2026-08-02', 'fraude_gps'],
  ['ua-15', 'Camila Ossa', 'cami_ossa', '1036223344', 't-rivera', 'activo', 'activa', 2, 'explorador', 1450, 'd-15', '2026-09-07'],
  ['ua-16', 'Usuario eliminado', 'Usuario_Eliminado_ua-16', '1036000016', 't-rivera', 'activo', 'eliminada', 1, 'explorador', 0, 'd-16', '2026-06-10'],
  ['ua-17', 'Kevin Barrios', 'kevin_bq', '1044556677', 't-palermo', 'activo', 'activa', 5, 'facilitador', 11200, 'd-17', '2026-09-12'],
  ['ua-18', 'Yuliana Pertuz', 'yuli.p', '1044889900', 't-palermo', 'activo', 'activa', 3, 'explorador', 2750, 'd-18', '2026-09-06'],
  ['ua-19', 'Jhon Fredy Mercado', 'jfmercado', '1044112200', 't-aipe', 'inscrito', 'activa', 1, 'explorador', 300, 'd-19', '2026-09-03'],
  ['ua-20', 'Isabella Cuero', 'isa_cuero', '1144556600', 't-acevedo', 'activo', 'activa', 6, 'mentor', 16800, 'd-20', '2026-09-12'],
  ['ua-21', 'Brayan Ocoró', 'brayan_o', '1144778899', 't-acevedo', 'activo', 'bajo_auditoria', 2, 'explorador', 5400, 'd-21', '2026-09-11'],
  ['ua-22', 'Brayan S. Ocoró', 'bocoro', '1144778800', 't-acevedo', 'activo', 'activa', 1, 'explorador', 120, 'd-21', '2026-09-10'],
  ['ua-23', 'Gloria Inés Palacios', 'gloriaip', '1113660022', 't-gigante', 'activo', 'inactiva', 3, 'facilitador', 2100, 'd-23', '2026-04-18'],
  ['ua-24', 'Hernán Darío Lozano', 'hernan_l', '1075667700', 't-neiva', 'activo', 'activa', 5, 'mentor', 13400, 'd-24', '2026-09-12'],
]

const USUARIOS_CURADOS: UsuarioApp[] = SEMILLAS.map(
  ([id, nombre, alias, cedula, municipioId, canal, estado, playa, rol, agatas, dispositivo, ultima, motivo], i) => ({
    id,
    nombreLegal: nombre,
    alias,
    cedula,
    celular: `+57 31${i % 10} ${String(200 + i * 7).padStart(3, '0')} ${String(1000 + i * 37).slice(-4)}`,
    municipioId,
    barrio: BARRIOS[i % BARRIOS.length],
    canal,
    estado,
    motivoBloqueo: motivo,
    playa,
    rolJuego: rol,
    agatas,
    fechaRegistro: `2026-0${1 + (i % 7)}-1${i % 9}`,
    ultimaActividad: ultima,
    dispositivoId: dispositivo,
  }),
)

/*
  Volumen sintético para que el home (PW-02) tenga algo real que agregar por territorio y
  por Playa — con solo los 24 de arriba, la mayoría de los 33 municipios del Huila queda en
  cero y "dónde están los usuarios" no dice nada. Determinista (nada de `Math.random`): la
  misma recarga produce siempre los mismos 56 usuarios, para que capturas de pantalla y
  demos no cambien de una sesión a otra.

  "Hoy" de la ficción es 2026-09-14 (última fecha que aparece en el resto del demo). Los
  registros se reparten en las 16 semanas antes de esa fecha, con más peso en las semanas
  recientes — así "Nuevos usuarios (promedio semanal)" en el home tiene una tendencia real
  que mostrar, no una serie plana.
*/
const HOY_FICCION = new Date('2026-09-14T12:00:00')

function fechaMenosDias(dias: number): string {
  const fecha = new Date(HOY_FICCION)
  fecha.setDate(fecha.getDate() - dias)
  return fecha.toISOString().slice(0, 10)
}

// Un municipio aparece tantas veces como peso tiene: Neiva (capital) y Pitalito (segunda
// ciudad) concentran la mayoría de la población del departamento; el resto de cabeceras de
// subregión pesa menos, y los municipios pequeños aparecen una sola vez cada uno.
const MUNICIPIOS_PONDERADOS = [
  ...Array(10).fill('t-neiva'),
  ...Array(6).fill('t-pitalito'),
  ...Array(3).fill('t-garzon'),
  ...Array(3).fill('t-laplata'),
  ...Array(2).fill('t-campoalegre'),
  ...Array(2).fill('t-rivera'),
  ...Array(2).fill('t-palermo'),
  ...Array(2).fill('t-aipe'),
  ...Array(2).fill('t-acevedo'),
  ...Array(2).fill('t-gigante'),
  't-algeciras', 't-tello', 't-hobo', 't-yaguara', 't-teruel', 't-baraya', 't-iquira',
  't-suaza', 't-tarqui', 't-elagrado', 't-guadalupe', 't-pital', 't-santamaria',
  't-timana', 't-isnos', 't-sanagustin', 't-oporapa', 't-palestina', 't-saladoblanco', 't-elias',
  't-laargentina', 't-nataga', 't-paicol', 't-tesalia', 't-villavieja', 't-colombia-huila',
]

// Playa como embudo: la wiki fija Playa 1 en apenas 1-5 vinculados directos, así que la
// mayoría de una base real recién registrada está ahí — pocos llegan a Playa 6-7.
const PLAYAS_PONDERADAS = [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 6, 7]

// ~62% activa, resto repartido entre inactiva, provisional, bloqueada y bajo_auditoria —
// ninguna `eliminada` sintética, con la de ua-16 alcanza para ese caso de prueba.
const ESTADOS_PONDERADOS: EstadoCuentaApp[] = [
  'activa', 'activa', 'activa', 'activa', 'activa', 'activa', 'activa', 'activa',
  'inactiva', 'inactiva', 'provisional', 'bloqueada', 'bajo_auditoria',
]

const MOTIVOS_CICLABLES: MotivoBloqueo[] = ['otp', 'fraude_gps', 'evidencia_falsa', 'bots', 'ofensivo', 'manual']

// Nombres y apellidos frecuentes en el Huila (Perdomo, Trujillo, Cuéllar, Losada, Cabrera,
// Polanía, Artunduaga, Cerquera, Dussán, Charry, Bahamón son apellidos de la región) — no
// son personas reales, solo evitan que el lote sintético suene genérico.
const NOMBRES = [
  'Camila', 'Juliana', 'Mariana', 'Valentina', 'Santiago', 'Andrés', 'Diego', 'Laura',
  'Paula', 'Nicolás', 'Sofía', 'Manuela', 'Esteban', 'Julián', 'Daniela', 'Alejandra',
  'Cristian', 'Yesenia', 'Jorge', 'Liliana', 'Fabián', 'Angélica', 'Mauricio', 'Carolina',
]
const APELLIDOS = [
  'Perdomo', 'Trujillo', 'Cuéllar', 'Losada', 'Vargas', 'Cabrera', 'Polanía', 'Tovar',
  'Ipia', 'Muñoz', 'Artunduaga', 'Cerquera', 'Ospina', 'Dussán', 'Guzmán', 'Charry',
  'Motta', 'Bahamón', 'Rojas', 'Salazar',
]

function rolJuegoPorPlaya(playa: number): RolJuego {
  if (playa >= 6) return 'mentor'
  if (playa >= 3) return 'facilitador'
  return 'explorador'
}

function generarUsuariosSinteticos(cantidad: number): UsuarioApp[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const nombre = `${NOMBRES[i % NOMBRES.length]} ${APELLIDOS[(i * 7) % APELLIDOS.length]}`
    const estado = ESTADOS_PONDERADOS[i % ESTADOS_PONDERADOS.length]
    // Provisional = Inscrito Activo sin instalar la app todavía: no tiene Playa real ni
    // Ágatas ganadas, y su "última actividad" es el registro mismo (wiki §Estados de cuenta).
    const playa = estado === 'provisional' ? 1 : PLAYAS_PONDERADAS[i % PLAYAS_PONDERADAS.length]
    const canal: CanalUsuario = estado === 'provisional' ? 'inscrito' : i % 6 === 0 ? 'inscrito' : 'activo'

    // Sesgo hacia semanas recientes: más apariciones de offsets bajos que altos.
    const semanasAtras = [
      0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 7, 8, 9, 10, 11,
    ][i % 29]
    const diaEnLaSemana = (i * 3) % 7
    const fechaRegistro = fechaMenosDias(semanasAtras * 7 + diaEnLaSemana)

    const ultimaActividad =
      estado === 'provisional'
        ? fechaRegistro
        : estado === 'inactiva'
          ? fechaMenosDias(20 + (i % 60)) // > INACTIVIDAD_DIAS (10 días), a propósito
          : estado === 'bloqueada'
            ? fechaMenosDias(2 + (i % 10))
            : fechaMenosDias(i % 4) // activa / bajo_auditoria: actividad reciente

    return {
      id: `ua-g${i + 1}`,
      nombreLegal: nombre,
      alias: `${nombre.split(' ')[0].toLowerCase()}.${(i + 1).toString().padStart(2, '0')}`,
      cedula: String(200_000_000 + i * 3_017),
      celular: `+57 32${i % 10} ${String(300 + i * 11).padStart(3, '0')} ${String(4000 + i * 53).slice(-4)}`,
      municipioId: MUNICIPIOS_PONDERADOS[i % MUNICIPIOS_PONDERADOS.length],
      barrio: BARRIOS[(i + 2) % BARRIOS.length],
      canal,
      estado,
      motivoBloqueo: estado === 'bloqueada' ? MOTIVOS_CICLABLES[i % MOTIVOS_CICLABLES.length] : undefined,
      playa,
      rolJuego: rolJuegoPorPlaya(playa),
      agatas: estado === 'provisional' ? (i * 53) % 200 : Math.round(playa * 620 + ((i * 173) % 900)),
      fechaRegistro,
      ultimaActividad,
      dispositivoId: `d-g${i + 1}`,
    }
  })
}

export const USUARIOS_APP_SEED: UsuarioApp[] = [...USUARIOS_CURADOS, ...generarUsuariosSinteticos(56)]
