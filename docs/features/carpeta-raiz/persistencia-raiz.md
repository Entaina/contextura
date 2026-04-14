# Memoria de la carpeta raíz

## Qué hace

Recuerda cuál fue la última carpeta raíz que el usuario usó, de modo que la próxima vez que abra Contextura la aplicación arranque directamente en esa carpeta sin volver a preguntar.

## Experiencia del usuario

Una vez el usuario ha elegido una carpeta raíz, esa elección queda guardada. Al cerrar y reabrir la aplicación:

- Si la carpeta **sigue existiendo**, Contextura arranca directamente en ella. El árbol aparece poblado, el layout se restaura (ver [../edicion/layout-persistente.md](../edicion/layout-persistente.md)) y el usuario puede continuar donde lo dejó.
- Si la carpeta **ya no existe** (el usuario la borró, la movió o el disco externo no está montado), Contextura muestra el diálogo de selección de carpeta para que elija otra — ver [selector-nativo.md](selector-nativo.md).

La memoria es **una sola carpeta**: Contextura no guarda una lista de carpetas recientes; recuerda solo la última. Para cambiar de carpeta el usuario usa el flujo de [swap-carpeta.md](swap-carpeta.md).

## Invariantes

- La carpeta raíz **se recuerda entre sesiones**, incluyendo entre reinicios completos del sistema.
- Si la carpeta recordada ya no existe, Contextura **no falla**: cae elegantemente al flujo de primer arranque mostrando el selector.
- Solo se recuerda **la última** carpeta usada, no un historial de varias.

## Implementación

Ver [../../electron.md](../../electron.md) para la ubicación concreta de la configuración persistente.
