# Guardar un fichero

## Qué hace

Escribe en disco el contenido actual del fichero abierto en la pestaña activa y da feedback visual breve al usuario para que sepa que el guardado ha ocurrido.

## Experiencia del usuario

El usuario puede guardar de dos maneras:

- Con el **atajo de teclado** estándar del sistema — ver [../plataforma/atajos.md](../plataforma/atajos.md).
- Desde el menú **Archivo → Guardar** del menú nativo — ver [../plataforma/menu-nativo.md](../plataforma/menu-nativo.md).

Al guardar con éxito:

1. El contenido del fichero se escribe en disco.
2. El indicador de sucio desaparece — ver [dirty-tracking.md](dirty-tracking.md).
3. La cabecera del panel muestra durante ~2 segundos la palabra **Guardado** como feedback visual. Pasados los 2 segundos, la cabecera vuelve a su estado neutro.
4. El botón de guardar (si la configuración lo muestra) queda oculto hasta que haya nuevos cambios.

Si el fichero no existía en disco todavía, el guardado lo crea. Las carpetas intermedias que haga falta se crean también automáticamente, de modo que guardar un fichero bajo una ruta profunda nunca falla por falta de carpetas.

### Caso borde: formatos no soportados

Contextura solo guarda ficheros markdown. Intentar guardar un fichero con otra extensión falla de forma visible: el usuario ve un error y el contenido no se escribe.

## Invariantes

- Guardar **nunca** sobrescribe un fichero que no existía en memoria: siempre se guarda el contenido exacto del editor de la pestaña activa.
- El feedback visual **siempre** aparece al guardar con éxito — el usuario nunca se queda sin saber si su acción tuvo efecto.
- El guardado es **síncrono desde el punto de vista del usuario**: cuando ve el feedback **Guardado**, el fichero ya está en disco.
- Los ficheros que no son markdown **no se guardan jamás**.

## Implementación

Ver [../../frontend.md](../../frontend.md) para el flujo desde el editor y [../../backend.md](../../backend.md) para la escritura en disco y la validación de extensión.
