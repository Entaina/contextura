# Menú nativo

## Qué hace

Contextura instala un menú nativo en la barra de menús de macOS con las acciones propias de la aplicación, de modo que el usuario pueda invocarlas desde el sitio en el que busca los menús en cualquier otra aplicación nativa.

## Experiencia del usuario

La barra de menús muestra los grupos habituales:

- **Contextura** — entrada de la aplicación. Incluye "Acerca de", "Salir" y el resto de entradas canónicas del grupo de aplicación de macOS.
- **Archivo** — acciones sobre ficheros y carpetas: abrir carpeta, crear un fichero nuevo, guardar el fichero activo.
- **Edición** — acciones estándar: deshacer, rehacer, cortar, copiar, pegar, seleccionar todo.
- **Ver** — alternar barra lateral, alternar modo historial, recargar, herramientas de desarrollo, zoom, pantalla completa.
- **Ventana** — controles estándar de ventana de macOS.
- **Ayuda** — enlace al repositorio de Contextura.

Cada acción de menú funciona exactamente igual si se invoca desde la barra de menús, desde el atajo de teclado asociado (ver [atajos.md](atajos.md)) o desde un botón equivalente de la interfaz (por ejemplo, el botón del reloj abre el mismo modo historial que la entrada del menú).

## Invariantes

- Toda acción disponible en el menú **también** tiene un atajo de teclado o un botón en la interfaz — nunca es la única vía.
- Invocar la misma acción desde distintos sitios (menú, atajo, botón) **produce exactamente el mismo efecto**.
- El grupo **Contextura** sigue el formato canónico de una aplicación macOS: el usuario encuentra "Acerca de" y "Salir" donde los busca.

## Implementación

Ver [../../electron.md](../../electron.md) para la definición del menú y el reenvío de sus acciones a la interfaz.
