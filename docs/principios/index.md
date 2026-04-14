# Principios de Contextura

## Acerca de este índice

Los principios del repositorio se dividen en **dos niveles** con audiencias y criterios de lectura distintos. Una misma tarea puede requerir leer solo uno de los niveles, ambos, o ninguno — cada entrada declara cuándo aplica.

- **Nivel de producto** — gobiernan el diseño y desarrollo de Contextura como aplicación. Responden a la pregunta *"¿cómo se hace Contextura?"*. Audiencia: quien edita código, añade dependencias o decide alcance.
- **Nivel de documentación** — gobiernan cómo se escribe y organiza la documentación que sirve como contexto a humanos y agentes de desarrollo. Responden a la pregunta *"¿cómo se escribe `docs/`?"*. Audiencia: quien crea o edita ficheros de `docs/`.

Los principios de documentación viven dentro de `docs/` por pragmatismo — son el único hogar de principios del repositorio — aunque conceptualmente son meta-reglas *sobre* `docs/`, no conocimiento del producto.

## Nivel de producto

- [producto/vanilla-zero-build.md](producto/vanilla-zero-build.md): Contextura es vanilla JS/CSS + Node puro, sin paso de build
  - Leer cuando se proponga añadir un bundler, transpilador, TypeScript o framework de frontend
  - Leer cuando se evalúe una dependencia nueva y se detecte que requiere build
  - Leer al tocar [public/app.js](../../public/app.js), [server.mjs](../../server.mjs) o [lib/](../../lib/)

- [producto/electron-cjs.md](producto/electron-cjs.md): Todo el proceso main de Electron es CommonJS
  - Leer al crear o modificar cualquier fichero en [electron/](../../electron/)
  - Leer cuando alguien proponga migrar el proceso main a ESM
  - Leer al decidir cómo una dependencia nueva encaja en el proceso main

- [producto/macos-only.md](producto/macos-only.md): Contextura es macOS únicamente por decisión de producto
  - Leer cuando se proponga un feature, dependencia o job de CI cross-platform
  - Leer antes de abstraer APIs de macOS (Keychain, rutas, selectores nativos)
  - Leer al redactar documentación orientada a usuarios

## Nivel de documentación

- [documentacion/mece.md](documentacion/mece.md): Principio MECE — cada fichero es dueño exclusivo de su dominio; referenciar sin duplicar
  - Leer cuando se cree o edite cualquier fichero en `docs/`
  - Leer cuando se detecte información duplicada entre ficheros
  - Leer cuando se decida cómo estructurar contenido relacionado entre múltiples ficheros

- [documentacion/independencia-conocimiento.md](documentacion/independencia-conocimiento.md): Principio de Independencia — `docs/` describe el producto, no las herramientas que lo consumen
  - Leer cuando se añada contenido que mencione Claude Code, comandos, skills o cualquier otra herramienta
  - Leer cuando se decida si algo pertenece a `docs/` o a `.claude/`
  - Leer cuando se diseñe un comando o skill nuevo que consuma `docs/`
