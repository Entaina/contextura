# Principio MECE: Exclusividad de dominio

## Definición

Los ficheros de `docs/` siguen el principio MECE (Mutually Exclusive, Collectively Exhaustive):

- **Exclusividad**: cada fichero es dueño exclusivo de su dominio de conocimiento. Si un fichero necesita referirse a información que pertenece a otro, debe enlazar al fichero propietario — nunca resumir ni duplicar el contenido.
- **Exhaustividad**: cada fichero cubre su dominio por completo. Un lector no debería necesitar buscar en otro fichero información que lógicamente pertenece al actual.

## Por qué

La duplicación crea deuda de mantenimiento. Cuando la misma información existe en dos lugares, cualquier cambio requiere actualizar ambos. La divergencia es inevitable: un fichero se actualiza y el otro no, generando inconsistencias que confunden tanto a humanos como a agentes automáticos.

En Contextura esto es especialmente importante porque `docs/` es consumido por múltiples lectores distintos (colaboradores humanos, scripts de build de documentación, agentes). Cada duplicación multiplica el coste de cada cambio futuro por el número de consumidores.

## Cómo aplicar

Antes de escribir contenido, preguntarse:

1. **¿Existe ya un fichero que es dueño de esta información?** → Si sí, enlazar con `[texto](ruta-relativa)`. No resumir.
2. **¿Este contenido pertenece lógicamente a este fichero o a otro?** → Si pertenece a otro, moverlo o enlazarlo.
3. **¿Estoy creando un resumen de conveniencia?** → Los resúmenes se desactualizan. Preferir siempre la referencia directa.

## Ejemplos

| Situación | Correcto | Incorrecto |
|---|---|---|
| `frontend.md` necesita mencionar el historial inline | "El modo historial se documenta en [historial.md](../../historial.md)" | Copiar el flujo de `_enterHistoryMode` dentro de `frontend.md` |
| `backend.md` necesita mencionar las API del historial | "Los endpoints están respaldados por [historial.md](../../historial.md)" | Resumir `getFileHistory`, `getFileDiff`, etc. dentro de `backend.md` |
| `electron.md` necesita mencionar que el proceso main es CJS | "Ver [principios/producto/electron-cjs.md](../producto/electron-cjs.md)" | Explicar los ESM caveats de Electron 33 dentro de `electron.md` |
| `desarrollo.md` necesita mencionar cómo se publica | "Ver [release.md](../../release.md)" | Copiar los pasos del script de release |

## Ámbito de aplicación

Este principio aplica a todos los ficheros de `docs/` del repositorio, incluyendo los principios entre sí. Un principio no debería redefinir otro; debería enlazarlo cuando lo necesite.

No aplica a código fuente (comentarios técnicos en el código se rigen por otras normas) ni al README, que está orientado al usuario final y puede repetir contenido de `docs/producto.md` con un tono distinto.
