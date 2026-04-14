# Ruta del fichero en la cabecera

## Qué hace

Cada panel de edición muestra en su cabecera la ruta del fichero que contiene, relativa a la carpeta raíz, para que el usuario pueda orientarse de un vistazo incluso cuando tiene varias pestañas con nombres parecidos.

## Experiencia del usuario

La cabecera del panel muestra la ruta del fichero desde la carpeta raíz, no solo el nombre. Por ejemplo, un fichero `notas.md` vivo en `proyectos/q1/` aparece en cabecera como algo legible del estilo `proyectos / q1 / notas.md`, para que el usuario distinga dos `notas.md` de carpetas distintas sin tener que pasar el cursor por encima de cada pestaña.

La cabecera es sensible al modo del panel:

- En el modo edición habitual muestra la ruta.
- En el modo historial muestra el prefijo **Historial:** seguido del nombre del fichero. Ver [../historial/modo-historial.md](../historial/modo-historial.md).

Junto al texto de la cabecera viven otros elementos del panel (el botón de reloj del historial, el indicador de guardado), pero la ruta siempre es visible y ocupa el espacio principal.

## Invariantes

- La ruta mostrada es **siempre relativa a la carpeta raíz**, nunca absoluta, para no filtrar detalles del sistema de ficheros del usuario.
- El texto de cabecera **refleja el modo actual** del panel sin ambigüedad: el usuario sabe si está editando o viendo el historial.
- La cabecera **nunca** se queda vacía mientras el panel tiene un fichero cargado.

## Implementación

Ver [../../frontend.md](../../frontend.md) para el renderer del panel y su cabecera.
