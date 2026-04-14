# Memoria de la ventana

## Qué hace

Recuerda el tamaño y la posición de la ventana de Contextura entre sesiones, para que al reabrir la aplicación aparezca exactamente donde el usuario la dejó y con el mismo tamaño.

## Experiencia del usuario

Cada vez que el usuario redimensiona la ventana de Contextura o la mueve a otro sitio de la pantalla, la aplicación memoriza esa información. Al cerrar y volver a abrir:

- La ventana reaparece en el **mismo sitio** de la pantalla.
- Con el **mismo tamaño** que tenía.

El resultado es que Contextura respeta el entorno de trabajo del usuario: si él tenía la ventana maximizada a la izquierda del monitor principal, ahí la encuentra al volver.

Hay un **tamaño mínimo**: Contextura impide que la ventana se haga tan pequeña que la barra lateral y el área de edición ya no sean usables.

En el primer arranque, cuando todavía no hay ningún tamaño memorizado, la ventana aparece con un tamaño por defecto razonable.

## Invariantes

- El tamaño y la posición **se mantienen entre sesiones**.
- El usuario **nunca** puede reducir la ventana a un tamaño inusable por accidente.
- La memoria de la ventana es **independiente** del layout de pestañas y paneles — son persistencias separadas.

## Implementación

Ver [../../electron.md](../../electron.md) para la gestión del ciclo de vida de la ventana y la persistencia de sus dimensiones.
