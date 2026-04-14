# Restauración de versiones

## Qué hace

Con una versión cualquiera seleccionada en la línea de tiempo, el usuario puede recuperarla como contenido actual del fichero pulsando **Restaurar esta versión**. Tras confirmar, el editor se carga con el texto de esa versión y el panel vuelve automáticamente al modo edición para que pueda seguir trabajando desde ahí.

## Experiencia del usuario

El botón **Restaurar esta versión** aparece junto a la cabecera del diff. Al pulsarlo:

1. Se pide confirmación explícita antes de reemplazar el contenido del fichero.
2. Si el usuario confirma, el editor se recarga con el contenido de la versión seleccionada.
3. El panel sale automáticamente del modo historial y vuelve al modo edición.
4. Durante ~2,5 segundos aparece el indicador **✓ Restaurado** como confirmación visual.
5. El fichero queda **guardado** con el contenido restaurado — el usuario no tiene que pulsar guardar aparte.

A partir de ese momento puede seguir editando desde la versión restaurada como si fuera el contenido más reciente. Si cambia de idea, basta con volver a entrar en el modo historial: la versión anterior sigue en la línea de tiempo.

## Invariantes

- Restaurar **nunca ocurre sin confirmación explícita** del usuario.
- Tras restaurar, el panel **siempre** vuelve al modo edición, sin dejar al usuario en el modo historial.
- La versión restaurada queda **persistida en disco** inmediatamente: no es un estado "en memoria" que se pueda perder al cerrar la app.
- El contenido previo del fichero **no se pierde**: queda como una versión más en la línea de tiempo, accesible del mismo modo.

## Implementación

Ver [../../historial.md](../../historial.md) para el handshake entre la vista de historial y el renderer del panel de edición.
