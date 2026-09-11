import type { Rol } from './roles'

// Cuentas ficticias para el demo. Ningún dato aquí es de una persona real.
export interface DemoUser {
  id: string
  nombre: string
  cedula: string
  pin: string
  rol: Rol
  email: string
  telefonoWhatsapp: string
  // Legacy de la etapa de recuperación anterior (password por correo) — se reemplaza cuando
  // esa pantalla se rediseñe a cédula + OTP por WhatsApp (con correo de respaldo).
  password: string
  totpSecret: string | null
  totpConfigurado: boolean
  whatsappVerificado: boolean
}

export const SEED_USERS: DemoUser[] = [
  {
    id: 'u-superadmin',
    nombre: 'María Fernanda Rojas',
    cedula: '1000000001',
    pin: '1234',
    rol: 'S',
    email: 'maria.rojas@demo.via',
    telefonoWhatsapp: '+57 300 111 2233',
    password: 'Demo#2026S',
    totpSecret: null,
    totpConfigurado: false,
    whatsappVerificado: false,
  },
  {
    id: 'u-admin',
    nombre: 'Andrés Camilo Pérez',
    cedula: '1000000002',
    pin: '2345',
    rol: 'A',
    email: 'andres.perez@demo.via',
    telefonoWhatsapp: '+57 300 222 3344',
    password: 'Demo#2026A',
    totpSecret: null,
    totpConfigurado: false,
    whatsappVerificado: false,
  },
  {
    id: 'u-coordinador',
    nombre: 'Laura Medina',
    cedula: '1000000003',
    pin: '3456',
    rol: 'C',
    email: 'laura.medina@demo.via',
    telefonoWhatsapp: '+57 300 333 4455',
    password: 'Demo#2026C',
    totpSecret: null,
    totpConfigurado: false,
    whatsappVerificado: false,
  },
]
