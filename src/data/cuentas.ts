import type { Rol } from './roles'
import { SEED_USERS, type DemoUser } from './mockUsers'

/*
  Cuentas administrativas del portal — PW-04. Ninguna persona aquí es real.

  Esto NO son los usuarios de la app (eso es PW-03): son las cuentas del personal que hace
  login en el backoffice. El identificador de login es la CÉDULA, no el celular, a
  diferencia del resto del sistema (PW-01, carve-out del portal).

  Las tres primeras se derivan de SEED_USERS para que el listado de PW-04 y las cuentas con
  las que de verdad se puede entrar al demo nunca digan cosas distintas. Las demás existen
  solo como registros administrables: no tienen credenciales de acceso en este demo.
*/

export type EstadoCuenta = 'provisional' | 'activa' | 'inactiva' | 'bloqueada'

export const ESTADOS_CUENTA: Record<EstadoCuenta, string> = {
  provisional: 'Provisional',
  activa: 'Activa',
  inactiva: 'Inactiva',
  bloqueada: 'Bloqueada',
}

export interface CuentaAdmin extends Omit<DemoUser, 'pin'> {
  /*
    Nace `provisional` hasta el primer login con cambio de PIN exitoso (PW-04). Describe
    únicamente la credencial — que la persona aún no cambió su PIN temporal — no si tiene
    rol, territorio o permisos asignados: esas dos cosas son independientes.
  */
  estado: EstadoCuenta
  // El alcance va por cuenta, no por permiso. Ver territorios.ts.
  territorioIds: string[]
  /*
    Overrides individuales sobre la plantilla del rol (M02 Q-0050). Solo las claves que se
    apartan del default viven aquí; el resto se resuelve contra la plantilla en tiempo de
    lectura. Guardar la plantilla completa por cuenta haría que editar la plantilla de un
    rol no tuviera efecto sobre nadie, que es justo lo contrario de Q-1254.
  */
  overrides: Record<string, boolean>
  /*
    La cuenta raíz nace con el despliegue del sistema, tiene todos los permisos y es
    IRREVOCABLE — nunca se le puede quitar `accounts:create` ni `permissions:grant`.
    Uso exclusivo de arranque y emergencias extremas (PW-04, `[DECISIÓN BORRADOR]`).
  */
  esRaiz?: boolean
  // Metadata de auditoría de la cuenta (PW-04, `[DECISIÓN BORRADOR]`).
  fechaCreacion: string
  fechaEdicion: string
  creadoPor: string | null
  // Último login exitoso. Sirve para detectar cuentas administrativas inactivas por mucho
  // tiempo — "un riesgo de seguridad silencioso" (PW-04).
  ultimoAcceso: string | null
}

// Umbral a partir del cual el listado marca una cuenta como dormida. No hay decisión de la
// bóveda que fije este número: es una propuesta de este demo, pendiente de validar.
export const DIAS_INACTIVIDAD_SOSPECHOSA = 60

const [SUPERADMIN, ADMIN, COORDINADOR, CANDIDATO] = SEED_USERS

export const CUENTAS_SEED: CuentaAdmin[] = [
  {
    id: 'c-root',
    nombre: 'Cuenta raíz del sistema',
    cedula: '1000000000',
    rol: 'S',
    email: 'root@demo.via',
    telefonoWhatsapp: '+57 300 000 0000',
    estado: 'activa',
    territorioIds: ['t-co'],
    overrides: { 'accounts:create': true, 'permissions:grant': true },
    esRaiz: true,
    fechaCreacion: '2026-01-15',
    fechaEdicion: '2026-01-15',
    creadoPor: null,
    ultimoAcceso: '2026-02-03',
  },
  {
    id: SUPERADMIN.id,
    nombre: SUPERADMIN.nombre,
    cedula: SUPERADMIN.cedula,
    rol: SUPERADMIN.rol,
    email: SUPERADMIN.email,
    telefonoWhatsapp: SUPERADMIN.telefonoWhatsapp,
    estado: 'activa',
    territorioIds: ['t-co'],
    // Superadministradora "empoderada": recibió por cesión individual los dos permisos de
    // nivel 2 del modelo de tres niveles, cada uno con Doble Firma de dos S distintos.
    overrides: { 'accounts:create': true, 'permissions:grant': true },
    fechaCreacion: '2026-01-20',
    fechaEdicion: '2026-08-30',
    creadoPor: 'c-root',
    ultimoAcceso: '2026-09-12',
  },
  {
    id: ADMIN.id,
    nombre: ADMIN.nombre,
    cedula: ADMIN.cedula,
    rol: ADMIN.rol,
    email: ADMIN.email,
    telefonoWhatsapp: ADMIN.telefonoWhatsapp,
    estado: 'activa',
    territorioIds: ['t-co'],
    overrides: {},
    fechaCreacion: '2026-02-02',
    fechaEdicion: '2026-02-02',
    creadoPor: 'u-superadmin',
    ultimoAcceso: '2026-09-11',
  },
  {
    id: COORDINADOR.id,
    nombre: COORDINADOR.nombre,
    cedula: COORDINADOR.cedula,
    rol: COORDINADOR.rol,
    email: COORDINADOR.email,
    telefonoWhatsapp: COORDINADOR.telefonoWhatsapp,
    estado: 'activa',
    territorioIds: ['t-soacha'],
    overrides: {},
    fechaCreacion: '2026-03-11',
    fechaEdicion: '2026-07-19',
    creadoPor: 'u-superadmin',
    ultimoAcceso: '2026-09-10',
  },
  {
    /*
      El caso de origen de M02 Q-0050, escrito literal en PW-04: "un Superadministrador
      puede ser el candidato, con permiso para aprobar decisiones sensibles pero sin
      permisos operativos técnicos, por seguridad y por no tener el conocimiento para
      ejercerlos. La UI tiene que soportar ese caso, no tratarlo como una excepción rara."
      Es una cuenta con el rol más alto y la plantilla RECORTADA.
    */
    id: CANDIDATO.id,
    nombre: CANDIDATO.nombre,
    cedula: CANDIDATO.cedula,
    rol: CANDIDATO.rol,
    email: CANDIDATO.email,
    telefonoWhatsapp: CANDIDATO.telefonoWhatsapp,
    estado: 'activa',
    territorioIds: ['t-co'],
    overrides: {
      'users:delete_account': false,
      'content:edit_strings': false,
      'system:edit_global_params': false,
      'referrals:reassign': false,
      'rewards:cancel_refund': false,
    },
    fechaCreacion: '2026-02-14',
    fechaEdicion: '2026-06-01',
    creadoPor: 'u-superadmin',
    ultimoAcceso: '2026-09-09',
  },
  {
    // Administrador con una AMPLIACIÓN vigente sobre su plantilla: ya pasó por Doble Firma.
    id: 'c-jorge',
    nombre: 'Jorge Iván Cardona',
    cedula: '1000000005',
    rol: 'A',
    email: 'jorge.cardona@demo.via',
    telefonoWhatsapp: '+57 300 555 6677',
    estado: 'activa',
    territorioIds: ['t-ant'],
    overrides: { 'economy:adjust_manual': true },
    fechaCreacion: '2026-04-03',
    fechaEdicion: '2026-08-21',
    creadoPor: 'u-superadmin',
    ultimoAcceso: '2026-09-08',
  },
  {
    // Coordinadora con PII ampliada para su territorio. Muestra que un override puede
    // levantar un permiso que su rol no trae, sin que sea un techo fijo.
    id: 'c-diana',
    nombre: 'Diana Marcela Ospina',
    cedula: '1000000006',
    rol: 'C',
    email: 'diana.ospina@demo.via',
    telefonoWhatsapp: '+57 300 666 7788',
    estado: 'activa',
    territorioIds: ['t-medellin', 't-bello'],
    overrides: { 'users:view_pii': true },
    fechaCreacion: '2026-05-09',
    fechaEdicion: '2026-09-01',
    creadoPor: 'u-superadmin',
    ultimoAcceso: '2026-09-05',
  },
  {
    // Alta reciente que todavía no ha hecho su primer login: sigue con el PIN temporal.
    id: 'c-nueva',
    nombre: 'Camilo Andrés Bermúdez',
    cedula: '1000000007',
    rol: 'C',
    email: 'camilo.bermudez@demo.via',
    telefonoWhatsapp: '+57 300 777 8899',
    estado: 'provisional',
    territorioIds: ['t-barranquilla'],
    overrides: {},
    fechaCreacion: '2026-09-10',
    fechaEdicion: '2026-09-10',
    creadoPor: 'u-superadmin',
    ultimoAcceso: null,
  },
  {
    // El riesgo silencioso: cuenta viva, con permisos de Administrador, sin entrar en meses.
    id: 'c-ricardo',
    nombre: 'Ricardo Peñaloza',
    cedula: '1000000008',
    rol: 'A',
    email: 'ricardo.penaloza@demo.via',
    telefonoWhatsapp: '+57 300 888 9900',
    estado: 'activa',
    territorioIds: ['t-co'],
    overrides: {},
    fechaCreacion: '2026-01-28',
    fechaEdicion: '2026-01-28',
    creadoPor: 'c-root',
    ultimoAcceso: '2026-03-04',
  },
  {
    // Offboarding ya ejecutado: desactivación lógica, nunca borrado físico.
    id: 'c-paula',
    nombre: 'Paula Andrea Quintero',
    cedula: '1000000009',
    rol: 'C',
    email: 'paula.quintero@demo.via',
    telefonoWhatsapp: '+57 300 999 0011',
    estado: 'inactiva',
    territorioIds: ['t-cali'],
    overrides: {},
    fechaCreacion: '2026-02-20',
    fechaEdicion: '2026-08-15',
    creadoPor: 'u-superadmin',
    ultimoAcceso: '2026-08-14',
  },
]

export function nombreDeCuenta(id: string | null, cuentas: CuentaAdmin[]): string {
  if (!id) return 'Despliegue del sistema'
  return cuentas.find((c) => c.id === id)?.nombre ?? id
}

// PII enmascarada por defecto: el enmascaramiento lo aplica el backend, no un formateador
// de frontend — "si el dato viaja completo hasta el navegador, ya se filtró" (Reglas
// Transversales de UI). En este demo no hay backend, así que la función marca la intención
// y la pantalla la respeta.
export function enmascararCedula(cedula: string): string {
  return `${'•'.repeat(Math.max(cedula.length - 4, 0))}${cedula.slice(-4)}`
}

export function enmascararCelular(celular: string): string {
  return `${celular.slice(0, 4)} ••• •• ${celular.slice(-2)}`
}

export function diasDesde(fecha: string | null, hoy: Date): number | null {
  if (!fecha) return null
  const ms = hoy.getTime() - new Date(`${fecha}T12:00:00`).getTime()
  return Math.floor(ms / 86_400_000)
}

export function rolesQuePuedeVer(rol: Rol): Rol[] {
  // Un Administrador solo gestiona roles inferiores al suyo (wiki §Asignación y revocación).
  if (rol === 'A') return ['C']
  return ['S', 'A', 'C']
}
