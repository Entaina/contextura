# Pestañas y splits

## Qué hace

Permite al usuario abrir varios ficheros a la vez, repartirlos entre paneles divididos horizontal o verticalmente, y reorganizar la distribución arrastrando pestañas entre paneles, como en un editor de código moderno.

## Experiencia del usuario

### Abrir un fichero

Al hacer clic en un fichero del árbol se abre en una nueva pestaña dentro del panel activo. Si ya estaba abierto en cualquier panel, la pestaña existente se activa en lugar de crear otra nueva.

### Abrir en un panel nuevo (split)

Al hacer clic con la tecla **modificadora de split** (la tecla de comando del sistema), el fichero se abre a la derecha del panel activo, dividiendo el área de edición. El usuario puede repetir el gesto para crear más splits.

### Reorganizar

El usuario puede **arrastrar** la pestaña de un fichero:

- A otro panel ya existente → el fichero se mueve a ese panel.
- Al borde de un panel → se crea un split nuevo con ese fichero.
- Al centro de un panel → el fichero se añade como pestaña más a ese panel.

Todos los paneles se pueden **redimensionar** arrastrando los bordes.

### Cerrar

Cada pestaña tiene un botón **×** para cerrarla. Al cerrar la última pestaña de un panel, el panel desaparece y su espacio se redistribuye entre los paneles vecinos. Si no queda ningún panel abierto, aparece la pantalla de bienvenida — ver [welcome-watermark.md](welcome-watermark.md).

Al cerrar pestañas con cambios sin guardar, Contextura pide confirmación — ver [../guardado/confirmacion-cerrar.md](../guardado/confirmacion-cerrar.md).

## Invariantes

- Hacer clic en un fichero que ya estaba abierto **siempre** activa la pestaña existente en lugar de duplicarla.
- Cerrar el último panel **siempre** deja al usuario en la pantalla de bienvenida, nunca en una vista vacía sin pistas.
- El arrastre de pestañas **nunca** hace desaparecer un fichero: al soltar la pestaña en cualquier lugar válido, el fichero sigue abierto en alguna parte.

## Implementación

Ver [../../frontend.md](../../frontend.md) para el gestor de layout tabulado que provee las pestañas, el drag de pestañas y los splits.
