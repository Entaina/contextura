# Cambio de carpeta en caliente

## Qué hace

Permite al usuario cambiar la carpeta raíz de Contextura en cualquier momento sin tener que reiniciar la aplicación. El árbol, los paneles y el historial se refrescan apuntando al nuevo contenido de forma inmediata.

## Experiencia del usuario

Desde el menú **Archivo → Abrir carpeta…** el usuario invoca el diálogo nativo descrito en [selector-nativo.md](selector-nativo.md). Tras elegir una nueva carpeta:

- La barra lateral se actualiza con el árbol de la nueva carpeta.
- Las pestañas abiertas de la carpeta anterior se cierran (no tendría sentido mantenerlas: sus rutas no pertenecen a la nueva raíz).
- El layout de edición se reinicia al estado correspondiente de la nueva carpeta — si el usuario ya había trabajado antes con esa carpeta, se restaura su layout; si no, aparece la pantalla de bienvenida. Ver [../edicion/layout-persistente.md](../edicion/layout-persistente.md) y [../edicion/welcome-watermark.md](../edicion/welcome-watermark.md).
- El modo historial se refiere al nuevo contenido: no hay historial cruzado entre carpetas.

Cancelar el diálogo en medio del flujo deja la carpeta anterior intacta, como si no hubiera habido ningún cambio.

### Cambios sin guardar

Si al invocar **Abrir carpeta…** hay pestañas con cambios sin guardar, el flujo de confirmación al cerrar ([../guardado/confirmacion-cerrar.md](../guardado/confirmacion-cerrar.md)) protege esos cambios exactamente igual que al cerrar una pestaña a mano.

## Invariantes

- El cambio de carpeta **nunca** requiere reiniciar la aplicación.
- Los cambios sin guardar **están protegidos**: Contextura no puede cerrar en silencio pestañas sucias durante un cambio de carpeta.
- El layout y las pestañas **son por carpeta**: lo que el usuario tenía abierto en la carpeta A no aparece al abrir la carpeta B.
- Cancelar el flujo **deja todo como estaba**, sin estados a medio camino.

## Implementación

Ver [../../electron.md](../../electron.md) para el intercambio del servidor interno cuando cambia la carpeta raíz.
