# Ancho de la barra lateral

## Qué hace

La barra lateral se puede ensanchar o estrechar arrastrando el borde derecho, y el ancho elegido se recuerda entre sesiones para que el usuario no tenga que reajustarlo cada vez que abre la aplicación.

## Experiencia del usuario

Al pasar el cursor por el borde derecho de la barra lateral, el cursor cambia al de redimensionado. El usuario arrastra ese borde hacia la derecha o hacia la izquierda y la barra se ajusta al nuevo ancho en tiempo real.

El ancho tiene **un mínimo y un máximo razonables**: la barra nunca puede ser tan estrecha que el árbol se vuelva inusable, ni tan ancha que ocupe una proporción excesiva de la ventana y deje al área de edición sin espacio.

Al soltar el ratón, el nuevo ancho queda **recordado**: la próxima vez que el usuario abra Contextura la barra lateral aparecerá con ese mismo ancho.

El ancho es independiente de si la barra está oculta o visible: recuperar la barra después de haberla ocultado la devuelve al ancho que tenía. Ver [sidebar-toggle.md](sidebar-toggle.md).

## Invariantes

- El ancho de la barra **se mantiene entre sesiones**.
- El usuario **nunca** puede llevar la barra a un ancho inusable (demasiado estrecho para leer nombres) ni a un ancho que ahogue el área de edición.
- El ancho es **independiente** del estado de visibilidad: ocultar y volver a mostrar la barra no resetea su ancho.

## Implementación

Ver [../../frontend.md](../../frontend.md) para el gestor del handle de redimensionado y la persistencia del valor.
