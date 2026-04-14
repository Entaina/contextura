# Carpeta raíz

## Acerca de este índice

Contextura trabaja siempre sobre una **carpeta raíz** que el usuario elige: todo el árbol, la búsqueda y el historial se refieren a ficheros que viven dentro de ella. Este módulo agrupa las features que determinan cómo se elige esa carpeta, cómo se cambia por otra, y cómo se recuerda entre sesiones.

La implementación técnica vive en [../../electron.md](../../electron.md) (selector nativo, persistencia y swap en caliente) y en [../../backend.md](../../backend.md) (servidor ligado a la raíz).

## Features

- [selector-nativo.md](selector-nativo.md): Diálogo nativo de macOS para elegir carpeta en el primer arranque y en cambios posteriores
  - Leer al tocar el flujo de selección de carpeta

- [swap-carpeta.md](swap-carpeta.md): Cambiar de carpeta raíz sin reiniciar la aplicación
  - Leer al tocar el cambio de carpeta en caliente

- [persistencia-raiz.md](persistencia-raiz.md): Memoria de la última carpeta raíz entre sesiones
  - Leer al tocar cómo Contextura recuerda qué carpeta abrir
