# Árbol de ficheros

## Qué hace

Presenta los ficheros markdown de la carpeta raíz como un árbol navegable en la barra lateral, con carpetas expandibles y un solo clic para abrir cualquier fichero en el editor.

## Experiencia del usuario

La barra lateral muestra el contenido de la carpeta raíz en forma de árbol. Solo aparecen:

- Ficheros con extensión **`.md`**.
- Carpetas que contienen (directa o indirectamente) al menos un fichero `.md`. Una carpeta vacía o que solo contiene otros tipos de ficheros no aparece.

Las carpetas se abren y cierran con un clic. Al entrar por primera vez en una carpeta que nunca se había expandido, el árbol carga su contenido en ese momento, de modo que en carpetas raíz enormes la experiencia se mantiene rápida.

Un solo clic sobre un fichero lo abre en el editor. Ver [../edicion/tabs-splits.md](../edicion/tabs-splits.md) para el comportamiento detallado al abrir.

### Carpetas excluidas

Para que el árbol muestre solo contenido relevante, algunas carpetas se ocultan por defecto (por ejemplo, las carpetas ocultas del sistema o carpetas conocidas de herramientas). El usuario puede personalizar qué se excluye creando un fichero **`.indexignore`** en la raíz de la carpeta, con un patrón de exclusión por línea. Cuando el fichero existe, sustituye a la lista por defecto.

### Actualizaciones automáticas

Los ficheros y carpetas creados, borrados o renombrados fuera de Contextura (por ejemplo, desde otra herramienta) aparecen y desaparecen del árbol automáticamente. Ver [../../live-reload.md](../../live-reload.md).

## Invariantes

- El árbol **solo** incluye ficheros `.md` y las carpetas que contienen alguno.
- Las carpetas excluidas **nunca** aparecen, ni siquiera sus nombres, ni en el árbol ni en los resultados de búsqueda.
- El árbol **se mantiene sincronizado** con el disco sin que el usuario tenga que recargar manualmente.
- Un clic simple **siempre** abre el fichero en el área de edición.

## Implementación

Ver [../../backend.md](../../backend.md) para la construcción del árbol y el soporte de `.indexignore`, y [../../frontend.md](../../frontend.md) para el renderer del árbol en la interfaz.
