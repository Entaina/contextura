# Principio: Electron main process en CommonJS

## Definición

Todos los ficheros del proceso main de Electron son CommonJS (`.cjs`). El código ESM solo puede entrar al proceso main vía `await import()` dinámico **después** de que la app haya inicializado, nunca vía sentencias `import` estáticas.

Esto aplica a `electron/main.cjs`, `electron/preload.cjs`, `electron/config.cjs`, `electron/updater.cjs` y cualquier fichero nuevo que se añada al proceso main.

## Por qué

Es una restricción técnica, no una preferencia estética. El loader ESM de Electron 33 falla con:

```
TypeError: Cannot read properties of undefined (reading 'exports')
```

...al encontrarse un `import from 'electron'` en tiempo de link del proceso main. El único workaround robusto hoy es mantener los ficheros del proceso main como CommonJS.

Los detalles de cómo esta restricción se cumple en la práctica (carga dinámica de `server.mjs`, uso de `createRequire` para chokidar en `lib/watcher.mjs`) están en [electron.md](../../electron.md).

## Cómo aplicar

Antes de crear un fichero nuevo en [electron/](../../../electron/) o de refactorizar uno existente, preguntarse:

1. **¿Es código que corre en el proceso main?** → Si sí, debe ser `.cjs`, con `require()` y `module.exports`.
2. **¿Necesito usar un módulo ESM desde el proceso main?** → Usa `await import()` dinámico dentro de una función async que corra después del arranque, como hace [main.cjs](../../../electron/main.cjs) con `server.mjs`.
3. **¿Necesito usar una dependencia que solo publica ESM en un fichero que corre en Node pero se invoca desde Electron?** → Consulta cómo lo resuelve [lib/watcher.mjs](../../../lib/watcher.mjs) (`createRequire` + `require` síncrono).

Si un colaborador propone convertir `electron/*.cjs` a ESM "porque está más de moda" o "porque simplifica la sintaxis", este principio es la respuesta: la restricción viene de Electron, no nuestra. Cuando Electron publique una versión con un loader ESM robusto para el proceso main, este principio podrá revisarse. Hasta entonces se mantiene.

## Ejemplos

| Situación | Correcto | Incorrecto |
|---|---|---|
| Crear un nuevo módulo auxiliar en `electron/` | `electron/foo.cjs` con `module.exports = ...` | `electron/foo.mjs` con `export default ...` |
| Cargar el servidor HTTP desde `main.cjs` | `const { startServer } = await import('../server.mjs')` dentro de `app.whenReady()` | `import { startServer } from '../server.mjs'` en top-level |
| Usar chokidar desde un módulo que puede ejecutarse bajo Electron | `const chokidar = createRequire(import.meta.url)('chokidar')` | `import chokidar from 'chokidar'` |
| Proponer migrar todo `electron/` a ESM para modernizar | Documentar el blocker actual y esperar a un Electron que lo soporte | Hacer la migración y descubrir el TypeError en runtime |

## Ámbito de aplicación

Aplica estrictamente al proceso main de Electron: [electron/](../../../electron/) y a cualquier módulo invocado desde él. **No** aplica al servidor HTTP ([server.mjs](../../../server.mjs), [lib/](../../../lib/)), que es ESM puro, ni al frontend ([public/](../../../public/)), que es módulos ES nativos.
