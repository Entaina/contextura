# Memoria del layout

## Qué hace

Recuerda exactamente qué pestañas y paneles tenía el usuario abiertos al cerrar la aplicación, y los restaura tal cual al volver a abrirla: mismos ficheros, misma distribución en splits, mismos tamaños.

## Experiencia del usuario

Si el usuario tenía, por ejemplo, tres pestañas en un panel principal y un split lateral con otras dos, al reabrir Contextura vuelve a ver exactamente esa distribución: los mismos cinco ficheros, en los mismos paneles, en el mismo orden, con los paneles redimensionados igual que antes.

La memoria incluye:

- **Los ficheros abiertos** en cada panel.
- **El orden** de las pestañas dentro de cada panel.
- **La pestaña activa** de cada panel.
- **La estructura de splits** (qué paneles existen, horizontal o vertical, anidados).
- **Los tamaños relativos** de cada panel.

El ancho y el estado de visibilidad de la barra lateral también se recuerdan — eso se cubre en [../navegacion/sidebar-resize.md](../navegacion/sidebar-resize.md) y [../navegacion/sidebar-toggle.md](../navegacion/sidebar-toggle.md).

### Caso borde: fichero desaparecido

Si entre sesiones se borra un fichero que estaba abierto, al reabrir Contextura la pestaña correspondiente no aparece (no puede cargarla) pero el resto del layout se restaura con normalidad.

## Invariantes

- La distribución se restaura tras **cerrar y reabrir** la aplicación, no solo entre navegaciones dentro de una misma sesión.
- El estado del editor (si estaba en WYSIWYG o texto) se restaura junto con cada pestaña, gracias a [modo-editor-por-fichero.md](modo-editor-por-fichero.md).
- Si el usuario no había guardado cambios al cerrar, esos cambios **no se conservan** — el layout recuerda los ficheros abiertos, no su contenido sin guardar.

## Implementación

Ver [../../frontend.md](../../frontend.md) para la serialización y restauración del layout.
