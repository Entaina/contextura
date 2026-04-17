# Comandos rápidos

## Qué hace

Al escribir `/` como primer carácter en el campo de entrada del chat, aparece un menú de comandos rápidos que permiten cambiar opciones o ejecutar acciones sin escribir un mensaje completo al asistente.

## Experiencia del usuario

Al teclear `/` aparece un popup sobre el campo de entrada con los comandos disponibles. La lista se filtra automáticamente a medida que el usuario sigue escribiendo.

### Navegación del popup

- Flechas arriba/abajo para moverse entre comandos.
- Enter para ejecutar el comando seleccionado.
- Escape para cerrar el popup sin ejecutar nada.
- Tab para autocompletar el nombre del comando en el campo de entrada.

### Tipos de comandos

- **Comandos locales**: se ejecutan inmediatamente sin enviar un mensaje al asistente — por ejemplo, cambiar el modelo, el esfuerzo, el modo, o limpiar la conversación.
- **Comandos que se envían al asistente**: se pasan como mensaje y el asistente los procesa — por ejemplo, compactar la conversación o mostrar ayuda.
- **Comandos del proyecto**: definidos en la carpeta del proyecto y cargados automáticamente. Aparecen agrupados por origen (proyecto, usuario, skills, plugins).

El botón **`/`** junto a las opciones de configuración (ver [opciones.md](opciones.md)) también abre el popup de comandos.

## Implementación

Ver [../../chat.md](../../chat.md) para el registro de comandos y el popup de autocompletado.
