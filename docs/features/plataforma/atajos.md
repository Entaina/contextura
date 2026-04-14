# Atajos de teclado

## Qué hace

Expone las acciones más usadas a través de atajos de teclado estándar de macOS, para que el usuario pueda trabajar sin levantar las manos del teclado.

## Experiencia del usuario

Los atajos disponibles son los canónicos del sistema, asociados a las acciones del menú nativo (ver [menu-nativo.md](menu-nativo.md)):

| Acción | Atajo |
|---|---|
| Abrir carpeta | ⌘O |
| Nuevo fichero | ⌘N |
| Guardar | ⌘S |
| Alternar barra lateral | ⌘B |
| Alternar modo historial | ⌘H |

Los atajos de edición estándar (⌘Z/⌘⇧Z para deshacer/rehacer, ⌘X/⌘C/⌘V para cortar/copiar/pegar, ⌘A para seleccionar todo) funcionan dentro del editor como en cualquier aplicación nativa.

Los atajos funcionan **en toda la aplicación**, no solo cuando el foco está en el menú. Por ejemplo, ⌘S guarda el fichero activo sin importar dónde esté el cursor.

### Consistencia con la interfaz

Cada atajo tiene una ruta alternativa por interfaz — ver [menu-nativo.md](menu-nativo.md) para la regla general. Un usuario que no conozca los atajos siempre puede llegar a la misma acción desde el menú o desde un botón visible.

## Invariantes

- Los atajos son **los canónicos de macOS**: ⌘+letra, no combinaciones exóticas.
- Invocar un atajo produce **exactamente el mismo efecto** que invocar la acción equivalente desde el menú o desde el botón correspondiente.
- Los atajos **funcionan en toda la aplicación**, no solo en un foco concreto.

## Implementación

Ver [../../electron.md](../../electron.md) para el mapeo de atajos en el menú y el reenvío de acciones.
