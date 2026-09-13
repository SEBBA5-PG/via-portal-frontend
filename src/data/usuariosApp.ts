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

const SEMILLAS: Semilla[] = [
  ['ua-01', 'Juan David Moreno', 'juanda_soacha', '1075234189', 't-soacha', 'activo', 'activa', 3, 'facilitador', 4820, 'd-01', '2026-09-12'],
  ['ua-02', 'Luisa Fernanda Castro', 'lufer', '1075881203', 't-soacha', 'activo', 'activa', 2, 'explorador', 1310, 'd-02', '2026-09-11'],
  ['ua-03', 'Carlos Arturo Méndez', 'carlitos.m', '1075990456', 't-soacha', 'activo', 'bajo_auditoria', 4, 'facilitador', 7120, 'd-03', '2026-09-09'],
  ['ua-04', 'Carlos A. Méndez', 'cmendez2', '1075990457', 't-soacha', 'activo', 'activa', 1, 'explorador', 220, 'd-03', '2026-09-08'],
  ['ua-05', 'Marta Lucía Pardo', 'martica', '1075112233', 't-soacha', 'inscrito', 'provisional', 1, 'explorador', 150, 'd-05', '2026-08-30'],
  ['ua-06', 'Óscar Iván Rincón', 'oscar_r', '1075445566', 't-soacha', 'activo', 'bloqueada', 2, 'explorador', 980, 'd-06', '2026-08-21', 'evidencia_falsa'],
  ['ua-07', 'Natalia Gómez Ruiz', 'nata.gomez', '1020304050', 't-bogota', 'activo', 'activa', 6, 'mentor', 18450, 'd-07', '2026-09-12'],
  ['ua-08', 'Felipe Andrés Torres', 'pipe_torres', '1020998877', 't-bogota', 'activo', 'activa', 5, 'facilitador', 9900, 'd-08', '2026-09-10'],
  ['ua-09', 'Andrea Paola Silva', 'andre_ps', '1020556677', 't-bogota', 'activo', 'inactiva', 2, 'explorador', 640, 'd-09', '2026-05-02'],
  ['ua-10', 'Esteban Rojas', 'xXestebanXx', '1020123123', 't-bogota', 'activo', 'bloqueada', 1, 'explorador', 40, 'd-10', '2026-09-12', 'otp'],
  ['ua-11', 'Valeria Quintero', 'vale_q', '1032667788', 't-zipaquira', 'inscrito', 'provisional', 1, 'explorador', 90, 'd-11', '2026-09-01'],
  ['ua-12', 'Sebastián Arango', 'sebas.arango', '1036445521', 't-medellin', 'activo', 'activa', 7, 'mentor', 25300, 'd-12', '2026-09-12'],
  ['ua-13', 'Daniela Restrepo', 'dani_rest', '1036778812', 't-medellin', 'activo', 'activa', 4, 'facilitador', 6200, 'd-13', '2026-09-11'],
  ['ua-14', 'Mateo Zapata', 'mateoz', '1036990011', 't-bello', 'activo', 'bloqueada', 3, 'facilitador', 3100, 'd-14', '2026-08-02', 'fraude_gps'],
  ['ua-15', 'Camila Ossa', 'cami_ossa', '1036223344', 't-envigado', 'activo', 'activa', 2, 'explorador', 1450, 'd-15', '2026-09-07'],
  ['ua-16', 'Usuario eliminado', 'Usuario_Eliminado_ua-16', '1036000016', 't-envigado', 'activo', 'eliminada', 1, 'explorador', 0, 'd-16', '2026-06-10'],
  ['ua-17', 'Kevin Barrios', 'kevin_bq', '1044556677', 't-barranquilla', 'activo', 'activa', 5, 'facilitador', 11200, 'd-17', '2026-09-12'],
  ['ua-18', 'Yuliana Pertuz', 'yuli.p', '1044889900', 't-barranquilla', 'activo', 'activa', 3, 'explorador', 2750, 'd-18', '2026-09-06'],
  ['ua-19', 'Jhon Fredy Mercado', 'jfmercado', '1044112200', 't-soledad', 'inscrito', 'activa', 1, 'explorador', 300, 'd-19', '2026-09-03'],
  ['ua-20', 'Isabella Cuero', 'isa_cuero', '1144556600', 't-cali', 'activo', 'activa', 6, 'mentor', 16800, 'd-20', '2026-09-12'],
  ['ua-21', 'Brayan Ocoró', 'brayan_o', '1144778899', 't-cali', 'activo', 'bajo_auditoria', 2, 'explorador', 5400, 'd-21', '2026-09-11'],
  ['ua-22', 'Brayan S. Ocoró', 'bocoro', '1144778800', 't-cali', 'activo', 'activa', 1, 'explorador', 120, 'd-21', '2026-09-10'],
  ['ua-23', 'Gloria Inés Palacios', 'gloriaip', '1113660022', 't-palmira', 'activo', 'inactiva', 3, 'facilitador', 2100, 'd-23', '2026-04-18'],
  ['ua-24', 'Hernán Darío Lozano', 'hernan_l', '1075667700', 't-soacha', 'activo', 'activa', 5, 'mentor', 13400, 'd-24', '2026-09-12'],
]

export const USUARIOS_APP_SEED: UsuarioApp[] = SEMILLAS.map(
  ([id, nombre, alias, cedula, municipioId, canal, estado, playa, rol, agatas, dispositivo, ultima, motivo], i) => ({
    id,
    nombreLegal: nombre,
    alias,
    cedula,
    celular: `+57 31${i % 10} ${String(200 + i * 7).padStart(3, '0')} ${String(1000 + i * 37).slice(-4)}`,
    municipioId,
    barrio: ['Centro', 'San Mateo', 'La Esperanza', 'El Porvenir', 'Villa del Río'][i % 5],
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
