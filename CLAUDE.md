# CLAUDE.md — Contextura

Guía para Claude Code (claude.ai/code) al trabajar sobre Contextura.

## Overview

Contextura es un editor nativo de macOS para que una organización gestione su biblioteca de contexto en markdown (prompts, docs, playbooks, lo que su equipo y sus herramientas de IA consumen como referencia). El código fuente vive en este mismo repositorio ([github.com/Entaina/contextura](https://github.com/Entaina/contextura)).

La fuente única de verdad sobre el producto, la arquitectura y la operación está en [docs/](docs/). **Este fichero solo es un mapa** — no repitas información de `docs/` aquí.

## Cómo navegar este repositorio

**Arranque rápido recomendado**: invoca `/prime <tema>` para cargar contexto filtrado. Si no sabes por dónde empezar, usa `/prime` sin argumentos y te mostrará los dominios disponibles.

**Manualmente**: empieza por [docs/index.md](docs/index.md), que lista cada dominio con criterios de "leer cuando…".

## Mapa de dominios

| Necesitas entender… | Lee… |
|---|---|
| Qué es el producto y para quién | [docs/producto.md](docs/producto.md) |
| Cómo correr la app en dev | [docs/desarrollo.md](docs/desarrollo.md) |
| Servidor HTTP, endpoints, scanner, watcher | [docs/backend.md](docs/backend.md) |
| UI, Dockview, Toast UI, dirty tracking | [docs/frontend.md](docs/frontend.md) |
| Proceso main de Electron, menú, config, ESM caveats | [docs/electron.md](docs/electron.md) |
| Historial inline, diffs estilo Google Docs | [docs/historial.md](docs/historial.md) |
| Integración con el Design System | [docs/design-system.md](docs/design-system.md) |
| Pipeline de CI, SAST, auditoría de dependencias | [docs/ci.md](docs/ci.md) |
| Publicar una release, auto-update | [docs/release.md](docs/release.md) |

## Reglas de trabajo

1. **Antes de editar cualquier fichero, consulta [docs/principios/index.md](docs/principios/index.md)**. Los principios del repositorio están divididos en dos niveles — productos y documentación — y son reglas transversales no opcionales:
   - **Producto** (al tocar código): [vanilla / cero build](docs/principios/producto/vanilla-zero-build.md), [Electron CJS](docs/principios/producto/electron-cjs.md), [macOS-only](docs/principios/producto/macos-only.md).
   - **Documentación** (al editar cualquier fichero de `docs/`): [MECE](docs/principios/documentacion/mece.md), [Independencia del conocimiento](docs/principios/documentacion/independencia-conocimiento.md).

2. **No dupliques contenido entre `docs/` y este fichero**. Si necesitas explicar algo, encuentra el fichero dueño en `docs/` (o créalo si no existe) y enlázalo desde donde lo necesites.

3. **Si creas un comando, skill o hook nuevo**, colócalo en `.claude/` y haz que referencie `docs/`, nunca al revés.
