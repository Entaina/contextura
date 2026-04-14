# Botones de la barra lateral

## Qué hace

La cabecera de la barra lateral incluye un grupo de botones de acción rápida para las operaciones más frecuentes sobre el árbol: crear, plegar y ocultar.

## Experiencia del usuario

Los botones disponibles son:

- **Nuevo fichero** — abre el campo de creación inline para un fichero nuevo. Ver [creacion-inline.md](creacion-inline.md).
- **Nueva carpeta** — abre el campo de creación inline para una carpeta nueva, que se creará con un `index.md` inicial.
- **Plegar todo** — colapsa todas las carpetas del árbol a su nivel raíz. Útil después de haber estado navegando por varias carpetas profundas.
- **Ocultar barra lateral** — pliega la barra lateral. Ver [sidebar-toggle.md](sidebar-toggle.md).

Cada botón muestra un icono discreto y una etiqueta al pasar el cursor por encima. La disposición es compacta para no comerse el espacio del árbol.

## Invariantes

- Los botones **solo** actúan sobre la barra lateral y el árbol; no tocan el área de edición.
- La operación **Plegar todo** nunca cierra ficheros abiertos ni cambia el contenido del árbol, solo cambia qué carpetas están expandidas.
- **Ocultar barra lateral** desde el botón produce exactamente el mismo efecto que desde el menú o el atajo de teclado — ver [sidebar-toggle.md](sidebar-toggle.md).

## Implementación

Ver [../../frontend.md](../../frontend.md) para la cabecera de la barra lateral y los manejadores de cada botón.
