# VIA — Portal Web (demo)

Prototipo exploratorio del backoffice administrativo de VIA (18 categorías, 4 roles).
React + Vite + TypeScript + Tailwind CSS v4.

## Ramas

Este repo maneja 3 ambientes:

| Rama | Qué es |
|---|---|
| `main` | Andamiaje del proyecto únicamente. Libre de código de producto — se mantiene limpia hasta que algo se promueva explícitamente aquí. |
| `qa` | Igual que `main` por ahora. Destino de promoción cuando algo esté listo para revisión. |
| `dev` | **Trabajo activo.** Todo el desarrollo real (categorías del portal, componentes, estado) sucede aquí. |

Esta rama (`main`) solo trae la configuración base (Vite, TypeScript, Tailwind, tooling de
Claude Code). Para ver el trabajo construido, cambia a `dev`.

## Qué es esto y qué no es

- **Es** una línea de trabajo paralela y **no vinculante**: valida decisiones de diseño de
  forma visual antes de que se formalicen en el Cuestionario Maestro de VIA BRAIN. No cierra
  preguntas `Q-`/`UQ-` de M15 ni de ninguna otra parte del Cuestionario.
- **No es** (todavía) el repositorio de código de producción. Si esto madura hasta convertirse
  en la base real del portal, esa decisión se toma explícitamente — no se asume.

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

## Idioma

UI, commits y comentarios en español. Identificadores de código en inglés (salvo términos
canónicos del dominio: Ágata, LÍNEAS_PODER, Bronce/Oro/Diamante, etc.).
