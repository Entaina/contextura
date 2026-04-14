# Confirmación al cerrar

## Qué hace

Cuando el usuario intenta cerrar una pestaña que tiene cambios sin guardar, Contextura muestra una confirmación antes de descartar el contenido, para impedir la pérdida silenciosa de trabajo.

## Experiencia del usuario

Las pestañas se pueden cerrar pulsando la **×** de la pestaña o con el atajo estándar del sistema (ver [../plataforma/atajos.md](../plataforma/atajos.md)). Si la pestaña tiene el indicador de sucio, el cierre no ocurre directamente: aparece un diálogo preguntando al usuario si quiere perder los cambios sin guardar.

El usuario puede:

- **Confirmar** → la pestaña se cierra y los cambios sin guardar se descartan.
- **Cancelar** → la pestaña sigue abierta con su estado intacto, incluido el contenido sin guardar.

Las pestañas sin cambios se cierran directamente sin diálogo.

## Invariantes

- Una pestaña sucia **nunca** se cierra sin confirmación explícita del usuario.
- Si el usuario cancela, el estado de la pestaña **queda exactamente como estaba**: mismo contenido en el editor, misma posición del cursor, mismo indicador de sucio.
- El diálogo de confirmación **solo** aparece cuando hay cambios sin guardar — no molesta al usuario cerrando pestañas limpias.

## Implementación

Ver [../../frontend.md](../../frontend.md) para el renderer de pestaña que intercepta el cierre.
