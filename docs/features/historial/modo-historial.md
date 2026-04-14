# Modo historial

## Qué hace

Permite alternar cualquier pestaña abierta entre el modo edición y el modo historial, para consultar las versiones anteriores del fichero sin abandonar la vista ni perder lo que el usuario estaba editando.

## Experiencia del usuario

Cada pestaña tiene un botón de reloj en su cabecera. Al pulsarlo, el panel deja de mostrar el editor y pasa a mostrar la vista de historial de ese fichero. La cabecera del panel cambia de la ruta habitual del fichero a `Historial: <nombre del fichero>`, y el botón de guardar desaparece. En su lugar aparece un botón **← Volver al editor** que devuelve el panel a su estado anterior.

El modo es **local a cada panel**. Si el usuario tiene dos pestañas abiertas en ficheros distintos, una puede estar en modo historial y la otra en modo edición al mismo tiempo sin interferirse.

La entrada y salida del modo historial también están disponibles desde el menú nativo y su atajo correspondiente — ver [../plataforma/atajos.md](../plataforma/atajos.md).

## Invariantes

- **Los cambios sin guardar del editor se preservan al entrar y salir del modo historial**. Si el usuario tenía el fichero sucio y pulsa el botón del reloj, al volver al modo edición se encuentra el texto exactamente como lo dejó, incluyendo la posición del cursor y el estado de sucio.
- **El modo es local al panel**. Entrar en historial en una pestaña nunca afecta al estado de otra pestaña.
- **Salir del modo historial nunca provoca un descarte silencioso**: nada que el usuario haya escrito en el editor se pierde por usar el historial.

## Implementación

Ver [../../historial.md](../../historial.md) para cómo el renderer del panel alterna entre el editor y la vista de historial preservando el estado.
