# VIA — Portal Web (demo)

Prototipo exploratorio del backoffice administrativo de VIA (18 categorías, 3 roles): una
plataforma CRM independiente de la app, sobre su funcionamiento, uso y datos.
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
espaciado, forma de componentes) — nunca para funcionalidad o estructura de menú. Nunca
editar, crear ni proponer cambios dentro de Figma.

- `VIA-AP`: referencia de AppShell/Home. No tiene las 18 categorías reales ni la lógica de
  permisos por rol: eso sale de `Portal Web — Matriz de Acceso por Rol` en VIA BRAIN.
- `CRM UI Kit for SaaS Dashboards` (nodo `9077:792`, "Sign In"): referencia de estructura y
  medidas del login (formulario a la izquierda, panel de marca a la derecha). Se toma su
  estructura, no su tipografía (Lato) ni su azul: la tipografía sigue siendo la del canon
  (Nunito + Plus Jakarta Sans).

## Datos

100% mock, persistidos en `localStorage` bajo el prefijo `via-portal-demo:`. Ningún dato de
una persona real. **Las credenciales de las cuentas de prueba no se muestran en la UI**:
están documentadas en VIA BRAIN, en
`decisiones/portal-web/Portal Web — Cuentas de prueba del demo.md`. Si cambian las cuentas
de `src/data/mockUsers.ts`, se actualiza ese documento en el mismo cambio.

## Login y recuperación (PW-01)

- Login en dos pantallas: cédula, luego PIN de 6 dígitos en casillas (`CasillasDigitos`).
- Recuperación de PIN: cédula → 2 últimos dígitos del celular registrado (el número nunca se
  muestra) → código de 6 dígitos por WhatsApp (3 min, antiabuso de 3 solicitudes cada 15 min)
  → PIN nuevo. Recuperar el PIN no levanta un bloqueo duro.

## 2FA y WhatsApp: qué es real y qué es simulado

- **TOTP (2FA de Superadministrador/Administrador) es real**: usa `otpauth` + `qrcode`, se
  puede escanear con Google Authenticator/Authy de verdad y valida el código real. Todavía no
  está enganchado al login nuevo (Etapa 2FA pendiente).
- **WhatsApp (verificación y recuperación de PIN) está simulado**: no hay backend ni
  integración real. El código se genera en el navegador y se muestra en un banner "Modo
  demo" — nunca se envía nada de verdad.

## Sistema de diseño

Paleta **provisional** (no canon) de la línea ejecutiva del login, en `src/index.css`. Se pule
visualmente en el canvas **VIA Portal — Sistema de diseño** (Claude Design, privado):
https://claude.ai/code/artifact/bd7f052f-0794-4674-8b0e-aad32f9ed56d

- **Canvas:** taller visual. Ahí se editan y guardan colores, tipografía, componentes y las
  pantallas de login y recuperación (escritorio y móvil).
- **Este repo:** implementación. Tras guardar cambios en el canvas, pedir "sincroniza el
  sistema de diseño": se lee el canvas, se actualizan los tokens (`src/index.css`) y los
  componentes (`src/components/ui/`, `AuthLayout.tsx`) y se verifica en el navegador.
- **VIA BRAIN:** solo valores aprobados, en `wiki/Constantes del Sistema.md`, pasando antes por
  una decisión en `decisiones/portal-web/`.

El canvas reproduce el código del 2026-09-11. Si el código cambia primero, se actualiza el
canvas en el mismo cambio.

## Progreso por categoría

| Categoría | Estado |
|---|---|
| PW-01 — Acceso y sesión | **Construida**: login ejecutivo en dos pasos y recuperación por OTP; falta enganchar 2FA de S/A |
| PW-02 a PW-18 | Andamiaje de menú (respeta la Matriz de Acceso por Rol), contenido "Próximamente" |

Actualizar esta tabla al cerrar cada categoría nueva.

## Idioma

UI, commits y comentarios en español. Identificadores de código en inglés (salvo términos
canónicos del dominio: Ágata, LÍNEAS_PODER, Bronce/Oro/Diamante, etc. — ver el Canon en VIA
BRAIN si aparecen en una categoría futura).
