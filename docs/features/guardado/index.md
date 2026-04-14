# Guardado

## Acerca de este índice

Este módulo agrupa las features relacionadas con el ciclo de guardado de un fichero: cómo se detecta que tiene cambios sin guardar, cómo se guarda, y qué ocurre si el usuario intenta cerrar una pestaña sucia. Son tres features pequeñas pero con invariantes fuertes, porque tocan datos que el usuario no quiere perder.

La implementación técnica vive en [../../frontend.md](../../frontend.md) (integración con el editor y detección del estado sucio) y en [../../backend.md](../../backend.md) (endpoint de escritura y garantías de path).

## Features

- [dirty-tracking.md](dirty-tracking.md): Indicadores visuales de cambios sin guardar en la pestaña y en la cabecera del panel
  - Leer al tocar indicadores de estado del editor

- [guardar.md](guardar.md): Acción de guardar, su atajo, su feedback visual y su comportamiento sobre ficheros nuevos
  - Leer al tocar el flujo de guardado

- [confirmacion-cerrar.md](confirmacion-cerrar.md): Confirmación obligatoria al cerrar una pestaña con cambios sin guardar
  - Leer al tocar el cierre de pestañas o la lógica de descarte
