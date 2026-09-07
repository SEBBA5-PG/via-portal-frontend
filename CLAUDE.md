# VIA — Portal Web (demo)

Prototipo exploratorio del backoffice administrativo de VIA (18 categorías, 4 roles).
React + Vite + TypeScript + Tailwind CSS v4.

## Qué es esto y qué no es

- **Es** una línea de trabajo paralela y **no vinculante**: valida decisiones de diseño de
  forma visual antes de que se formalicen en el Cuestionario Maestro. No cierra preguntas
  `Q-`/`UQ-` de M15 ni de ninguna otra parte del Cuestionario.
- **No es** el repositorio de código de producción. Si esto madura hasta convertirse en la
  base real del portal, esa decisión se toma explícitamente — no se asume.

## Fuente de verdad del dominio

El proyecto de producto (fuentes del cliente, decisiones, wiki) vive en un repositorio
separado, **VIA BRAIN 2.0**:

```
/Users/sebasgol/Library/CloudStorage/GoogleDrive-sebbas05puentes@gmail.com/Mi unidad/VIA BRAIN 2.0
```

Ante cualquier duda de negocio (permisos, reglas, terminología, parámetros), se consulta
ahí — nunca se inventa un dato aquí. Lo relevante para el portal vive en
`decisiones/portal-web/abiertos/` (los 18 `PW-NN` + los 3 documentos maestros).

## Figma es solo lectura

Se consume vía Figma Dev Mode MCP únicamente para **estilo visual** (tipografía, color,
espaciado, forma de componentes) — nunca para funcionalidad o estructura de menú. El
archivo de referencia (`VIA-AP`) no tiene las 18 categorías reales ni la lógica de permisos
por rol: eso sale de `Portal Web — Matriz de Acceso por Rol` en VIA BRAIN, no de Figma.
Nunca editar, crear ni proponer cambios dentro de Figma.

## Datos

100% mock, persistidos en `localStorage` bajo el prefijo `via-portal-demo:`. Ningún dato de
una persona real. Las contraseñas de las cuentas de prueba están visibles a propósito en la
pantalla de login ("Ver cuentas de prueba") — es un demo local, no un sistema en producción.

## 2FA y WhatsApp: qué es real y qué es simulado

- **TOTP (2FA de Superadministrador/Administrador) es real**: usa `otpauth` + `qrcode`, se
  puede escanear con Google Authenticator/Authy de verdad y valida el código real.
- **WhatsApp (verificación y recuperación de contraseña) está simulado**: no hay backend ni
  integración real. El código se genera en el navegador y se muestra en un banner "Modo
  demo" — nunca se envía nada de verdad.

## Progreso por categoría

| Categoría | Estado |
|---|---|
| PW-01 — Acceso y sesión | **Resuelta y construida** |
| PW-02 a PW-18 | Andamiaje de menú (respeta la Matriz de Acceso por Rol), contenido "Próximamente" |

Actualizar esta tabla al cerrar cada categoría nueva.

## Idioma

UI, commits y comentarios en español. Identificadores de código en inglés (salvo términos
canónicos del dominio: Ágata, LÍNEAS_PODER, Bronce/Oro/Diamante, etc. — ver el Canon en VIA
BRAIN si aparecen en una categoría futura).
