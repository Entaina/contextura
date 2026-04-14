# Modo historial

## Qué hace

Permite consultar las versiones anteriores de un fichero sin abandonar la vista ni perder lo que el usuario estaba editando. El usuario entra al modo historial haciendo click en una versión concreta desde el timeline del panel lateral derecho; el propio editor pasa a mostrar los cambios de esa versión y vuelve al estado de edición con un botón **← Volver al editor**.

## Experiencia del usuario

El panel lateral derecho siempre muestra la lista de versiones del fichero activo (timeline). Cuando el usuario hace click en una versión, el panel del editor del fichero activo deja de mostrar el editor y pasa a mostrar los cambios de esa versión. La cabecera del panel cambia de la ruta habitual del fichero a `Historial: <nombre del fichero>`, y el botón de guardar desaparece. En su lugar aparece un botón **← Volver al editor** que devuelve el panel a su estado anterior.

El modo es **local a cada panel**. Si el usuario tiene dos pestañas abiertas en ficheros distintos, una puede estar en modo historial y la otra en modo edición al mismo tiempo sin interferirse — cada click en el timeline del pane contextual afecta únicamente al panel activo.

## Invariantes

- **Los cambios sin guardar del editor se preservan al entrar y salir del modo historial**. Si el usuario tenía el fichero sucio y entra en historial clickando una versión, al volver al modo edición se encuentra el texto exactamente como lo dejó, incluyendo la posición del cursor y el estado de sucio.
- **El modo es local al panel**. Entrar en historial en una pestaña nunca afecta al estado de otra pestaña.
- **Salir del modo historial nunca provoca un descarte silencioso**: nada que el usuario haya escrito en el editor se pierde por usar el historial.

## Implementación

Ver [../../historial.md](../../historial.md) para cómo el timeline del pane contextual se acopla al fichero activo y cómo el renderer del panel alterna entre el editor y la vista de diff preservando el estado.
