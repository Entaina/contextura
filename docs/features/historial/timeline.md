# Línea de tiempo

## Qué hace

Muestra, en el pane lateral derecho contextual, la lista cronológica de las versiones del fichero actualmente activo: desde la más reciente hasta la más antigua, cada una con su fecha, su autor y una descripción breve del cambio.

## Experiencia del usuario

La lista ocupa el pane contextual de la derecha y se actualiza automáticamente cada vez que el usuario cambia de pestaña en el editor — siempre refleja el fichero activo. Cada entrada de la lista incluye:

- **Fecha relativa en español** — "hace 2 días", "ayer", "hace un momento". Al pasar el cursor por encima, aparece la fecha absoluta completa ("14 de abril de 2026, 15:08").
- **Nombre de pila del autor** — solo el primer nombre, para que la lista sea visualmente compacta.
- **Descripción breve del cambio** — la primera línea del mensaje asociado a esa versión.
- **Un pequeño icono de estado** — que indica si en esa versión el fichero fue *creado*, *editado*, *movido* o *copiado*. Los estados de movimiento se cubren en [follow-renames.md](follow-renames.md) y las variantes de "cambios sin commitear" en [uncommitted.md](uncommitted.md).

Las versiones están ordenadas de la más nueva a la más antigua. El usuario selecciona una versión con un clic y el panel del editor activo pasa a mostrar el diff correspondiente — ver [diff-google-docs.md](diff-google-docs.md) y [modo-historial.md](modo-historial.md).

La línea de tiempo incluye como mucho las **50 versiones más recientes**. Cuando hay más, el usuario ve en la última entrada el mensaje "Último commit del historial" descrito en [banners-contextuales.md](banners-contextuales.md).

## Invariantes

- La línea de tiempo **nunca muestra identificadores técnicos** de las versiones. Solo fecha, autor y descripción. Ver [anti-jerga-git.md](anti-jerga-git.md) para la lista completa de términos prohibidos.
- El orden es **estrictamente cronológico descendente**.
- El nombre mostrado es **el primer nombre** del autor, nunca el apellido, email o handle.

## Implementación

Ver [../../historial.md](../../historial.md) para el componente que dibuja la lista y el origen de sus datos.
