# Diff estilo Google Docs

## Qué hace

Al seleccionar una versión en la línea de tiempo, la parte derecha del panel muestra los cambios de esa versión como un diff inline: el texto eliminado aparece tachado en rojo y el texto añadido aparece resaltado en verde, intercalados dentro del mismo párrafo.

## Experiencia del usuario

El diff se presenta como un documento continuo, **no** como dos columnas enfrentadas. El usuario lee el contenido del fichero tal y como lo vería en el editor, con los cambios marcados inline:

- Texto **insertado** → resaltado con fondo verde.
- Texto **eliminado** → tachado con fondo rojo.
- Texto **sin cambios** → estilo normal.

Los cambios conservan su formato visual (negritas, listas, encabezados, tablas…), porque el diff se calcula sobre el resultado visual del markdown, no sobre el texto plano. Cambios como convertir una línea en lista, o subir un encabezado de nivel, se ven reflejados como el usuario los percibiría al abrir el fichero.

### Casos borde

- **Ficheros muy grandes** — cuando el contenido de la versión supera cierto tamaño, el diff no se calcula (sería muy lento y visualmente inmanejable) y en su lugar aparece un banner de aviso. Ver [banners-contextuales.md](banners-contextuales.md).
- **Primera versión de un fichero** — no hay "versión anterior" contra la que comparar, así que el diff muestra todo el contenido como inserción y aparece el banner de "Primera versión".
- **Versiones que solo son un rename** — si el contenido es idéntico, el diff está vacío y el banner correspondiente explica que solo cambió la ruta del fichero. Ver [follow-renames.md](follow-renames.md).

## Invariantes

- El diff **nunca muestra marcadores crudos** de diff como `+`, `-`, `@@` o nombres de ficheros con hashes. Es un diff visual, no textual. Ver [anti-jerga-git.md](anti-jerga-git.md).
- El formato del documento **se preserva siempre**: el usuario ve los cambios tal y como los percibiría al leer el fichero, con sus listas, tablas y encabezados intactos.

## Implementación

Ver [../../historial.md](../../historial.md) para el pipeline de renderizado y la librería usada para calcular el diff visual.
