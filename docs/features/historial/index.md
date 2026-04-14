# Historial

## Acerca de este índice

El modo historial es la feature distintiva de Contextura: permite recorrer las versiones anteriores de un fichero, ver los cambios inline con el estilo visual de Google Docs, y restaurar cualquier versión con un clic. El timeline de versiones vive permanentemente en el pane contextual derecho, acoplado al fichero activo; al hacer click en una versión, el panel del editor correspondiente muestra los cambios de esa versión sin perder el estado de edición.

Este módulo agrupa las features atómicas que construyen esa experiencia: la entrada/salida del modo, la línea de tiempo, el diff inline, la restauración, y las garantías de UX que el producto hace al usuario (anti-jerga, seguimiento de renames, detección de cambios sin commitear, banners contextuales).

La implementación técnica (cómo se obtienen los datos de git y cómo se embebe la vista en el panel del editor) vive en [../../historial.md](../../historial.md).

## Features

- [modo-historial.md](modo-historial.md): Entrada y salida del modo historial, local por panel, sin perder los cambios sin guardar
  - Leer cuando se diseñe algo que alterne entre modos dentro del mismo panel
  - Leer cuando se evalúe el impacto de un cambio sobre el estado del editor

- [timeline.md](timeline.md): Lista cronológica de versiones con fechas relativas, nombre de pila del autor y asunto
  - Leer al tocar el formato de la lista de versiones o el orden

- [diff-google-docs.md](diff-google-docs.md): Diff inline renderizado sobre el HTML del markdown, con inserciones en verde y borrados en rojo
  - Leer al tocar la manera en que se muestran las diferencias entre versiones

- [restauracion.md](restauracion.md): Botón "Restaurar esta versión" y vuelta automática al editor
  - Leer al tocar el flujo de restauración o el feedback posterior

- [anti-jerga-git.md](anti-jerga-git.md): Invariante de producto — nunca se muestra terminología de git al usuario final
  - Leer antes de añadir información visible al usuario en el modo historial
  - Leer al evaluar si un texto nuevo es aceptable

- [follow-renames.md](follow-renames.md): Seguimiento del fichero a través de renames y movimientos
  - Leer cuando se investigue cómo se trata un fichero que cambió de nombre

- [uncommitted.md](uncommitted.md): Detección y representación de los cambios sin commitear como "versión actual"
  - Leer al tocar cómo se muestra el estado del working tree

- [banners-contextuales.md](banners-contextuales.md): Mensajes contextuales ("Primera versión", "Último commit del historial", "Demasiado grande para diff"…)
  - Leer al añadir o cambiar los mensajes informativos de la línea de tiempo
