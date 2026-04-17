# Panel contextual con pestañas

## Qué hace

El pane derecho de la aplicación aloja dos pestañas — Historial y Chat — que comparten el mismo espacio y se alternan con un clic.

## Experiencia del usuario

En la parte superior del pane derecho hay dos pestañas con icono: un reloj para el historial y un bocadillo para el chat. Al pulsar una pestaña, su contenido se muestra y la otra se oculta.

- La pestaña de **Historial** muestra la línea de tiempo del fichero activo (ver [../historial/index.md](../historial/index.md)).
- La pestaña de **Chat** muestra la conversación actual con el asistente (ver [conversaciones.md](conversaciones.md)).

### Persistencia

- La pestaña seleccionada se recuerda entre sesiones — al reabrir la aplicación, el pane muestra la misma pestaña que estaba activa al cerrar.
- El ancho del pane se puede ajustar arrastrando su borde izquierdo y se recuerda entre sesiones.

### Visibilidad

El pane se puede ocultar y mostrar con los atajos de teclado (ver [../plataforma/atajos.md](../plataforma/atajos.md)) o desde el menú (ver [../plataforma/menu-nativo.md](../plataforma/menu-nativo.md)).

## Invariantes

- Al cambiar de pestaña, el contenido de la otra **no se pierde** — volver a la pestaña de historial muestra el mismo fichero, y volver al chat muestra la misma conversación.
- El historial sigue **actualizándose en segundo plano** cuando la pestaña visible es el chat — al volver, refleja el fichero activo actual.

## Implementación

Ver [../../chat.md](../../chat.md) para la implementación del host de pestañas y la persistencia de estado. Ver [../../historial.md](../../historial.md) para la pestaña de historial.
