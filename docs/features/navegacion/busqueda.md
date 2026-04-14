# Búsqueda en la barra lateral

## Qué hace

Un campo de búsqueda en la cabecera de la barra lateral permite filtrar el árbol por nombre o por ruta, para encontrar rápidamente un fichero aunque esté varias carpetas adentro.

## Experiencia del usuario

En la cabecera de la barra lateral hay un campo de texto. A medida que el usuario escribe:

- El árbol se filtra para mostrar solo los ficheros cuyo nombre o cuya ruta contienen el texto escrito.
- Las carpetas que contienen matches se expanden automáticamente, para que el usuario vea los resultados sin tener que desplegar manualmente cada nivel.
- Los trozos de texto coincidentes aparecen **resaltados** en los nombres que cumplen la búsqueda.
- La búsqueda es **insensible a mayúsculas y minúsculas**.

Al borrar el texto del campo, el árbol vuelve a su estado anterior sin perder las carpetas que el usuario tenía expandidas antes de empezar a buscar.

### Alcance de la búsqueda

La búsqueda cubre **el nombre y la ruta** de los ficheros y carpetas del árbol; no busca dentro del contenido de los ficheros. Para buscar por contenido, el usuario sigue dependiendo del editor abierto.

## Invariantes

- La búsqueda **nunca** cambia el orden del árbol: los resultados se presentan dentro de su jerarquía natural, no en una lista plana.
- Las carpetas **excluidas** no aparecen entre los resultados, igual que no aparecen en el árbol normal. Ver [arbol-ficheros.md](arbol-ficheros.md).
- Al vaciar el campo de búsqueda, el árbol **recupera el estado de expansión** que tenía el usuario antes de empezar a buscar.

## Implementación

Ver [../../frontend.md](../../frontend.md) para el filtrado del árbol y el resaltado de coincidencias.
