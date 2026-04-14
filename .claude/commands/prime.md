---
description: Carga contexto de Contextura sobre un dominio concreto desde docs/
argument-hint: <tema> (ej: "electron", "historial", "release", vacío para listar dominios)
---

# Prime — Carga de contexto de Contextura

## Purpose

Carga de forma filtrada el contexto del repositorio Contextura leyendo los ficheros relevantes de `docs/` para un dominio que describe el usuario en lenguaje natural. Evita que Claude tenga que explorar el repositorio a ciegas al arrancar una sesión.

Cada dominio de `docs/` tiene un fichero dueño según el principio MECE: no hay contenido duplicado entre ficheros, así que cargar el fichero correcto carga todo lo que se necesita saber del dominio.

## Variables

QUERY: $ARGUMENTS — tema o dominio del que cargar contexto (opcional, en lenguaje natural)

## Relevant Files

- `docs/index.md` — Índice raíz con la lista de dominios y sus criterios de "leer cuando…"
- `docs/principios/index.md` — Lista de principios transversales y cuándo aplicarlos
- `CLAUDE.md` — Mapa breve del repositorio (overview + reglas de trabajo)

## Instructions

- La búsqueda debe ser semántica y bilingüe (español/inglés). Evalúa si el tema del usuario se relaciona con el nombre o descripción de cada dominio en `docs/index.md`. Algunas equivalencias esperables:
  - "electron", "escritorio", "app nativa", "main process" → `docs/electron.md`
  - "historial", "history", "diff", "git history", "versiones" → `docs/historial.md`
  - "servidor", "backend", "api", "endpoints" → `docs/backend.md`
  - "ui", "frontend", "editor", "dockview", "tabs" → `docs/frontend.md`
  - "producto", "scope", "out of scope", "roadmap" → `docs/producto.md`
  - "release", "publish", "dmg", "auto-update" → `docs/release.md`
  - "design system", "estilos", "css", "tokens" → `docs/design-system.md`
  - "dev", "desarrollo", "npm run", "setup" → `docs/desarrollo.md`
  - "ci", "pipeline", "github actions", "lint", "sast", "codeql", "dependabot", "secretos", "audit" → `docs/ci.md`
- Si no hay coincidencia clara, informa al usuario y lista los dominios disponibles desde `docs/index.md`.
- Si hay varias coincidencias razonables, presenta las opciones y pregunta cuál cargar antes de leer nada más.
- **Siempre** al final: leer `docs/principios/index.md` y listar los principios aplicables agrupados por los dos niveles (producto y documentación). Los dos principios de documentación (`mece`, `independencia-conocimiento`) se listan **siempre**, porque cualquier edición de `docs/` los invoca. Los principios de producto se listan **selectivamente** según el dominio cargado (ver tabla en Ejemplos).
- No invoques ningún comando de shell, no leas ficheros de código fuente. Este comando es puramente semántico: solo lee markdown de `docs/`.

## Workflow

### Paso 1: Validar entrada

Si QUERY está vacío, lee `docs/index.md` y presenta los dominios disponibles agrupados por categoría (Producto, Desarrollo, Arquitectura, Operación). Pregunta al usuario qué quiere explorar.

### Paso 2: Mapear QUERY a dominio(s)

Aplica la búsqueda semántica descrita en Instructions. Si el resultado es:

- **Ningún match**: informa al usuario, lista los dominios disponibles, y pide que reformule.
- **Un único match**: continúa al Paso 3.
- **Múltiples matches razonables**: presenta las opciones como una lista y pregunta cuál cargar.

### Paso 3: Cargar el dominio

1. Lee el fichero `docs/<dominio>.md` correspondiente.
2. Si ese fichero enlaza a otros ficheros de `docs/` como lectura necesaria para entender el tema, léelos también. No leas ficheros enlazados "por si acaso" — solo los que el fichero dueño presenta como necesarios.
3. Lee `docs/principios/index.md` para identificar qué principios aplican al dominio cargado.

### Paso 4: Presentar el resumen

```
## Contexto cargado: [dominio]

**Fichero dueño**: docs/[dominio].md
**Ficheros leídos**: [lista]

### Resumen
[Síntesis de 2-4 líneas sobre qué contiene y cuándo es relevante]

### Principios aplicables

**Producto** (al tocar código del dominio cargado):
- [principio] — [criterio de "leer cuando…"]

**Documentación** (al editar cualquier fichero de docs/):
- mece — [criterio de "leer cuando…"]
- independencia-conocimiento — [criterio de "leer cuando…"]

---
Contexto listo. ¿En qué quieres trabajar?
```

## Ejemplos

Los principios de **documentación** se listan siempre. Los principios de **producto** se listan según el dominio cargado:

| Dominio | Principios de producto aplicables |
|---|---|
| `backend` | vanilla-zero-build |
| `frontend` | vanilla-zero-build |
| `electron` | electron-cjs, macos-only |
| `historial` | vanilla-zero-build |
| `release` | macos-only |
| `producto` | macos-only |
| `design-system` | (ninguno específico) |
| `desarrollo` | vanilla-zero-build, electron-cjs, macos-only |
| `ci` | vanilla-zero-build, macos-only |

| Invocación | Comportamiento |
|---|---|
| `/prime` | Lee `docs/index.md` y presenta los dominios disponibles |
| `/prime electron` | Carga `docs/electron.md`. Producto: electron-cjs, macos-only. Documentación: mece, independencia |
| `/prime historial` | Carga `docs/historial.md`. Producto: vanilla-zero-build. Documentación: mece, independencia |
| `/prime release` | Carga `docs/release.md`. Producto: macos-only. Documentación: mece, independencia |
| `/prime frontend` | Carga `docs/frontend.md`. Producto: vanilla-zero-build. Documentación: mece, independencia |
| `/prime backend` | Carga `docs/backend.md`. Producto: vanilla-zero-build. Documentación: mece, independencia |
| `/prime producto` | Carga `docs/producto.md`. Producto: macos-only. Documentación: mece, independencia |
| `/prime ci` | Carga `docs/ci.md`. Producto: vanilla-zero-build, macos-only. Documentación: mece, independencia |
| `/prime algo-inexistente` | Informa y lista los dominios disponibles |
