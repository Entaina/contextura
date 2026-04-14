# Recarga automática al cambiar ficheros en disco

## Qué hace

Cuando un fichero de la carpeta raíz se crea, se borra, se modifica o se renombra fuera de Contextura (por ejemplo, desde otra aplicación, desde la terminal o por una sincronización), la aplicación refleja ese cambio automáticamente: el árbol se actualiza y el contenido mostrado en el editor se refresca sin intervención del usuario.

## Experiencia del usuario

Contextura vigila de forma continua la carpeta raíz. Cualquier cambio que ocurra en disco se propaga a la interfaz:

- **Fichero nuevo** → aparece en el árbol en su sitio.
- **Fichero borrado** → desaparece del árbol. Si estaba abierto en una pestaña, la pestaña queda en un estado visible para que el usuario sepa que ya no existe.
- **Fichero modificado** → si estaba abierto en una pestaña, el contenido mostrado se actualiza para reflejar la versión nueva.
- **Fichero renombrado** → el árbol refleja el nuevo nombre, y las pestañas abiertas se actualizan en consecuencia.

Los cambios se agrupan con un **debounce corto** para que rachas rápidas de cambios (típicas de herramientas que escriben varios ficheros seguidos) no produzcan parpadeos ni redibuje la interfaz una vez por fichero.

### Interacción con cambios sin guardar

Si el usuario tiene cambios sin guardar en un fichero y ese mismo fichero es modificado fuera de Contextura, la aplicación **no sobrescribe** lo que el usuario está editando en silencio. La edición del usuario tiene prioridad: su trabajo nunca se pierde por un cambio externo.

## Invariantes

- Los cambios externos en disco se reflejan en Contextura **sin que el usuario tenga que recargar manualmente**.
- Una racha de cambios rápidos **no** produce parpadeos visibles.
- Un cambio externo **nunca** sobrescribe edición sin guardar del usuario de forma silenciosa.
- El árbol **siempre** refleja el contenido real del disco.

## Implementación

Ver [../backend.md](../backend.md) para el vigilante de ficheros y el canal que notifica al cliente los cambios.
