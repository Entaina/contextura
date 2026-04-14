# Arrastrar ficheros desde la barra lateral

## Qué hace

Permite abrir un fichero arrastrándolo desde la barra lateral al área de edición, eligiendo con el gesto el panel concreto donde quiere que se abra (en una pestaña nueva o creando un split).

## Experiencia del usuario

El usuario arrastra cualquier entrada del árbol de la barra lateral con el ratón. Durante el arrastre aparece una etiqueta fantasma con el nombre del fichero, para que sepa qué está moviendo.

Puede soltar el fichero:

- **Sobre un panel existente** → se añade como pestaña nueva a ese panel.
- **Sobre el borde de un panel** → se crea un split nuevo con ese fichero.
- **Sobre un área vacía del editor** → se abre como nuevo panel.

Durante el arrastre, los paneles destino resaltan la zona que se usará como destino del drop, para que el usuario sepa qué va a ocurrir antes de soltar el ratón.

Este gesto complementa — no reemplaza — el clic normal sobre un fichero del árbol, que sigue abriéndolo en el panel activo. Ver [tabs-splits.md](tabs-splits.md).

## Invariantes

- El arrastre **nunca** mueve el fichero físicamente: el árbol sigue intacto, solo cambia dónde está abierto el fichero en la edición.
- Arrastrar un fichero ya abierto a otro panel **lo mueve** a ese panel (no duplica la pestaña).
- El indicador visual durante el arrastre **siempre** muestra el nombre del fichero que se está arrastrando.

## Implementación

Ver [../../frontend.md](../../frontend.md) para el gestor de drop y la identificación del tipo de arrastre.
