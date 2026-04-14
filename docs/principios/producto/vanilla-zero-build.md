# Principio: Vanilla y cero build

## Definición

Contextura se construye con JavaScript y CSS de vainilla sobre Node.js puro. **No hay paso de build**: ni bundler, ni transpilador, ni TypeScript, ni preprocesador. El código que se escribe es literalmente el código que se ejecuta.

Toast UI Editor, Dockview y el resto de dependencias de UI se cargan como módulos ES directamente desde `node_modules`, sin procesarlos.

## Por qué

- **Tiempos de arranque**: `npm run desktop` pasa de cero a ventana abierta en segundos porque no hay build.
- **Auditabilidad**: lo que se debugea en DevTools es el mismo código que está en el repo. No hay source maps que seguir, no hay bundles ofuscados.
- **Empaquetado Electron trivial**: el DMG lleva los ficheros tal cual, sin tener que configurar builders de frontend encadenados con electron-builder.
- **Longevidad**: los frameworks de build tienen ciclos de obsolescencia rápidos; HTML/CSS/JS puros no.
- **Ningún conocimiento previo de build requerido para contribuir**: cualquier persona que sepa JS puede abrir `public/app.js` y entender lo que ve sin aprender antes un bundler.

## Cómo aplicar

Antes de añadir una dependencia o de proponer un cambio arquitectónico, preguntarse:

1. **¿Necesita un paso de build?** → Si la respuesta es sí (bundler, transpilador, loader), la dependencia está descartada por defecto. Si aún así parece imprescindible, debe justificarse explícitamente contra este principio antes de merge.
2. **¿Existe una alternativa en vainilla o en Node estándar?** → Preferirla siempre. El frontend actual resuelve drag-and-drop, splits, tabs, WYSIWYG y live reload sin framework.
3. **¿La librería se carga como módulo ES nativo?** → Si sí, OK. Si requiere CommonJS en el navegador o un loader concreto, evaluar si se puede esquivar.

Para la particularidad del proceso main de Electron (que es CJS por otro motivo técnico), ver [electron-cjs.md](electron-cjs.md).

## Ejemplos

| Situación | Correcto | Incorrecto |
|---|---|---|
| Añadir estado reactivo al frontend | Implementarlo con objetos y eventos en vainilla dentro de `public/app.js` | Introducir React/Vue/Svelte "porque es más limpio" |
| Reemplazar el diff HTML | Buscar una librería que se sirva como módulo ES directo | Adoptar una que requiera rollup/webpack para funcionar |
| Tipado para prevenir bugs | Usar JSDoc + checkJS del lenguaje | Migrar a TypeScript con `tsc` en el pipeline |
| Preprocesar CSS | Escribir CSS moderno (nesting, variables, custom properties) | Introducir Sass/Less |

## Ámbito de aplicación

Aplica a todo el código frontend ([public/](../../../public/)) y al backend ([server.mjs](../../../server.mjs), [lib/](../../../lib/)). No aplica a scripts de desarrollo en [scripts/](../../../scripts/) ni al proceso de release — esos pueden usar las herramientas que mejor hagan su trabajo.
