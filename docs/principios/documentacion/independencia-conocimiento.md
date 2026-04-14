# Principio de Independencia del conocimiento

## Definición

`docs/` contiene documentación pura del producto Contextura. Describe qué es la app, cómo está construida, cómo se opera y por qué. **No** referencia a las herramientas que lo consumen — comandos, skills, hooks, configuración de Claude Code, etc.

La dirección de dependencia es siempre unidireccional: **las herramientas referencian al conocimiento, nunca al revés**.

## Por qué

Si `docs/` referenciase a sus consumidores, se acoplaría a una implementación concreta. Cambiar de herramienta (de Claude Code a otra, o añadir una segunda) requeriría modificar la documentación de producto, que debería ser estable e independiente.

La independencia permite que:

- El mismo contenido sirva a distintos consumidores (Claude Code, otros agentes LLM, humanos navegando ficheros, scripts de build de documentación).
- Las herramientas evolucionen sin tocar el conocimiento.
- El conocimiento se mantenga por su valor propio, no como soporte de una herramienta.

Dicho al revés: si mañana borrásemos `.claude/` entero, `docs/` debería seguir siendo un cuerpo de documentación coherente y útil por sí solo.

## Cómo aplicar

Antes de escribir o modificar un fichero de `docs/`, preguntarse:

1. **¿Estoy referenciando una herramienta concreta?** → Si sí, probablemente ese contenido pertenece a la documentación de la herramienta, no a `docs/`.
2. **¿Este fichero seguiría teniendo sentido si quitásemos Claude Code, skills, comandos y todo `.claude/`?** → Si no, está acoplado. Mueve la parte acoplada a la herramienta.
3. **¿Estoy añadiendo instrucciones de uso de un comando dentro de la documentación de producto?** → Esas instrucciones pertenecen al comando (`.claude/commands/...`), no al fichero de `docs/`.

## Ejemplos

| Situación | Correcto | Incorrecto |
|---|---|---|
| Documentar el historial inline de Contextura | Describir `HistoryView`, su flujo y la UX en [historial.md](../../historial.md) como conocimiento puro del producto | Añadir "usa `/prime historial` antes de tocar esto" dentro de `historial.md` |
| Documentar el backend | Describir `server.mjs`, endpoints y `safePath()` en [backend.md](../../backend.md) | Incluir "el comando `/prime backend` carga este fichero" dentro de `backend.md` |
| Documentar cómo un colaborador debe arrancar el dev server | Poner los comandos `npm run ...` en [desarrollo.md](../../desarrollo.md) | Incluir "Claude Code debe invocar esto" dentro del fichero |

## Ámbito de aplicación

Este principio aplica a todos los ficheros de `docs/` incluyendo los principios. No aplica a:

- [CLAUDE.md](../../../CLAUDE.md) — vive al servicio de Claude Code y **sí** puede (y debe) referenciar `docs/` y comandos.
- `.claude/` — comandos, skills, agentes y hooks son herramientas; pueden y deben referenciar `docs/`.
- Scripts de build, release y utilidades (`scripts/`) — son infraestructura de operación, no conocimiento de producto.
- [README.md](../../../README.md) — orientado a usuarios finales, no a desarrolladores.
