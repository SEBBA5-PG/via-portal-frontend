// Cédula en pantalla: solo los últimos 4 dígitos, mismo criterio de PII enmascarada.
export function enmascararCedula(cedula: string): string {
  return `•••• ${cedula.slice(-4)}`
}
