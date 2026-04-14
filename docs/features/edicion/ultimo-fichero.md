# Reabrir el último fichero

## Qué hace

Si al arrancar no hay un layout previo que restaurar (por ejemplo, porque el usuario cerró todas las pestañas antes de salir), Contextura abre automáticamente el último fichero que tocó, para que la aplicación nunca arranque vacía sin pistas.

## Experiencia del usuario

Hay dos niveles de memoria entre sesiones:

1. **Layout completo** — si al cerrar había pestañas abiertas, al reabrir se restaura la distribución entera. Ver [layout-persistente.md](layout-persistente.md).
2. **Último fichero** — si al cerrar no había pestañas (o el layout no se puede restaurar por alguna razón), pero el usuario había estado trabajando con algún fichero durante la sesión, al reabrir se abre ese último fichero en una pestaña nueva.

Ambos niveles son complementarios: el primero tiene prioridad y cubre el caso habitual; el segundo cubre el caso en que el usuario cierra todo antes de salir.

Si el usuario nunca ha abierto ningún fichero en la carpeta actual, ni hay layout que restaurar, Contextura arranca con la pantalla de bienvenida — ver [welcome-watermark.md](welcome-watermark.md).

## Invariantes

- El layout completo **tiene prioridad** sobre el último fichero: nunca se mezclan.
- Si el último fichero ya no existe en disco al reabrir, Contextura **no falla**: muestra la pantalla de bienvenida.
- La memoria es **por carpeta raíz**: cambiar de carpeta raíz empieza con historia limpia.

## Implementación

Ver [../../frontend.md](../../frontend.md) para la lógica de fallback de restauración.
