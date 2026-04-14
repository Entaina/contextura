# Modo de editor por fichero

## Qué hace

Recuerda, por cada fichero abierto, si el usuario prefería verlo en modo WYSIWYG o en modo texto, y lo reabre la próxima vez en el mismo modo en el que lo dejó.

## Experiencia del usuario

Al cambiar el modo del editor en un fichero concreto, Contextura memoriza esa elección asociada al fichero. Cuando el usuario vuelve a abrir ese fichero (durante la misma sesión o en una sesión posterior), el editor lo presenta directamente en el modo que había elegido.

Ficheros distintos pueden vivir en modos distintos simultáneamente: el usuario puede tener, por ejemplo, las notas de reunión siempre en WYSIWYG y los fragmentos de código siempre en texto, sin tener que alternar el modo cada vez que los abre.

Si un fichero se abre por primera vez, aparece en un modo por defecto (WYSIWYG). Esa elección inicial se recuerda desde la primera vez que el usuario alterne al otro modo.

## Invariantes

- La preferencia de modo es **por fichero**, nunca global.
- La preferencia **se mantiene entre sesiones**: cerrar y reabrir Contextura no olvida qué modo tenía cada fichero.
- Cambiar el modo de un fichero **nunca** afecta al modo de otros ficheros ya abiertos.

## Implementación

Ver [../../frontend.md](../../frontend.md) para las claves de persistencia por fichero.
