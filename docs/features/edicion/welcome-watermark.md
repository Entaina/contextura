# Pantalla de bienvenida

## Qué hace

Cuando no hay ninguna pestaña abierta, el área de edición muestra un mensaje discreto en el centro invitando al usuario a seleccionar un fichero desde la barra lateral.

## Experiencia del usuario

La pantalla de bienvenida aparece en dos situaciones:

1. **Primer arranque sobre una carpeta nueva** — el usuario acaba de elegir una carpeta raíz y todavía no ha abierto ningún fichero.
2. **Después de cerrar todas las pestañas** — el usuario ha cerrado una a una todas las pestañas que tenía abiertas.

El mensaje es breve y no interactivo: sirve para indicar al usuario que la aplicación está lista pero vacía, y que el siguiente paso es elegir un fichero del árbol. La barra lateral sigue completamente funcional mientras tanto.

En cuanto el usuario abre un fichero (con clic, arrastre o cualquier otro gesto), la pantalla de bienvenida desaparece y se convierte en el primer panel de edición.

## Invariantes

- La pantalla de bienvenida **solo** aparece cuando no hay ningún panel abierto.
- Nunca compite visualmente con un panel de edición: los dos no coexisten.
- El mensaje es **estático e informativo**, no un diálogo con acciones.

## Implementación

Ver [../../frontend.md](../../frontend.md) para el watermark del área de edición.
