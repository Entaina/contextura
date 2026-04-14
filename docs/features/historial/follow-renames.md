# Seguimiento de renames

## Qué hace

Cuando un fichero ha cambiado de nombre o de ubicación a lo largo de su historia, la línea de tiempo sigue la pista del mismo fichero a través de esos movimientos, de modo que el usuario ve una única historia continua en lugar de un historial truncado en el rename.

## Experiencia del usuario

Si el fichero actual se llamaba antes de otra manera, o vivía en otra carpeta, la línea de tiempo incluye también las versiones previas al cambio de nombre. No importa si fue un rename simple o un rename con edición simultánea: ambas cosas se muestran como parte de la misma historia.

Las versiones en las que hubo un movimiento se marcan con un icono específico:

- **Movimiento puro** — "se movió de ubicación": el fichero cambió de nombre o de carpeta pero su contenido no cambió.
- **Movimiento con edición** — el fichero cambió de nombre o de carpeta *y* su contenido cambió en el mismo paso.
- **Copia** — se creó a partir de otro fichero existente.

Al seleccionar una de estas versiones en la línea de tiempo, el diff aparece sobre el contenido correcto (no sobre el fichero vacío), porque el sistema sabe cómo se llamaba el fichero en ese momento. En el caso de movimiento puro, el diff está vacío y un banner explica que solo cambió la ruta — ver [banners-contextuales.md](banners-contextuales.md).

## Invariantes

- La línea de tiempo muestra **una historia continua** aunque el fichero haya cambiado de nombre varias veces.
- Los distintos tipos de movimiento se distinguen con iconos diferenciados; el usuario nunca ve las banderas técnicas originales. Ver [anti-jerga-git.md](anti-jerga-git.md).
- El diff de una versión previa al rename se calcula contra el **nombre antiguo** del fichero, no contra el actual.

## Implementación

Ver [../../historial.md](../../historial.md) para cómo se obtienen y exponen los renames en la capa técnica.
