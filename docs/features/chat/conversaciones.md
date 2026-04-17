# Conversaciones

## Qué hace

Permite mantener conversaciones con un asistente integrado que conoce el proyecto abierto. Las conversaciones se guardan automáticamente y se pueden retomar en cualquier momento.

## Experiencia del usuario

El chat está disponible en la pestaña "Chat" del pane contextual derecho (ver [panel-contextual.md](panel-contextual.md)).

Al escribir un mensaje y pulsar Enter, el asistente responde en streaming — las palabras aparecen progresivamente mientras se genera la respuesta. El asistente conoce la carpeta raíz abierta, el fichero activo en el editor y el texto seleccionado.

### Gestión de conversaciones

- Botón **+** en la barra superior para iniciar una conversación nueva.
- Botón de **historial** para ver las conversaciones anteriores en un desplegable, ordenadas de la más reciente a la más antigua.
- Seleccionar una conversación del historial la carga con todos sus mensajes anteriores y permite continuarla.
- Cada conversación del historial tiene un botón para eliminarla.
- El título se genera automáticamente a partir del primer mensaje.

### Cancelación

Si la respuesta está tardando o no va en la dirección esperada, un botón de **parar** sustituye al botón de enviar mientras el asistente responde. Pulsarlo detiene la generación de inmediato sin perder los mensajes anteriores de la conversación.

### Disponibilidad

El chat requiere que el asistente esté instalado y autenticado en el sistema. Si no lo está, el campo de entrada se deshabilita y el panel muestra un aviso.

Si el asistente detecta que está facturando por API en lugar de usar la suscripción del usuario, muestra un aviso informativo.

## Invariantes

- Las conversaciones se guardan **automáticamente** al recibir cada respuesta — el usuario nunca pierde una conversación por no haber guardado manualmente.
- El asistente siempre tiene **contexto del proyecto abierto** — no hace falta explicarle qué carpeta o fichero se está editando.
- **Cancelar una respuesta en curso no pierde** los mensajes anteriores de la conversación.
- Al reabrir la aplicación, se **restaura la última conversación activa** tal como se dejó.

## Implementación

Ver [../../chat.md](../../chat.md) para el relay del subproceso, el almacén de conversaciones y el componente de la interfaz.
