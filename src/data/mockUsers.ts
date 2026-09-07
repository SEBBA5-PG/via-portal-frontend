import type { Rol } from './roles'

// Cuentas ficticias para el demo. Ningún dato aquí es de una persona real.
export interface DemoUser {
  id: string
  nombre: string
  email: string
  password: string
  rol: Rol
  telefonoWhatsapp: string
  totpSecret: string | null
  totpConfigurado: boolean
  whatsappVerificado: boolean
}

export const SEED_USERS: DemoUser[] = [
  {
    id: 'u-superadmin',
    nombre: 'María Fernanda Rojas',
    email: 'maria.rojas@demo.via',
    password: 'Demo#2026S',
    rol: 'S',
    telefonoWhatsapp: '+57 300 111 2233',
    totpSecret: null,
    totpConfigurado: false,
    whatsappVerificado: false,
  },
  {
    id: 'u-admin',
    nombre: 'Andrés Camilo Pérez',
    email: 'andres.perez@demo.via',
    password: 'Demo#2026A',
    rol: 'A',
    telefonoWhatsapp: '+57 300 222 3344',
    totpSecret: null,
    totpConfigurado: false,
    whatsappVerificado: false,
  },
  {
    id: 'u-coordinador',
    nombre: 'Laura Medina',
    email: 'laura.medina@demo.via',
    password: 'Demo#2026C',
    rol: 'C',
    telefonoWhatsapp: '+57 300 333 4455',
    totpSecret: null,
    totpConfigurado: false,
    whatsappVerificado: false,
  },
  {
    id: 'u-operador',
    nombre: 'Jorge Salazar',
    email: 'jorge.salazar@demo.via',
    password: 'Demo#2026O',
    rol: 'O',
    telefonoWhatsapp: '+57 300 444 5566',
    totpSecret: null,
    totpConfigurado: false,
    whatsappVerificado: false,
  },
]
