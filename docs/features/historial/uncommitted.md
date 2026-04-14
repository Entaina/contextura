# Cambios sin versionar

## Qué hace

Cuando el fichero abierto tiene cambios en disco que todavía no han sido incorporados al historial del repositorio, la línea de tiempo añade una entrada especial al principio llamada **Versión actual**, para que el usuario vea claramente que el estado actual del fichero es distinto del de la última versión guardada.

## Experiencia del usuario

La línea de tiempo tiene dos fuentes de información combinadas: las versiones ya incorporadas al historial del repositorio y el estado actual del fichero en disco. Cuando ambos coinciden, la línea empieza en la versión más reciente; cuando no coinciden, aparece antes una entrada sintetizada titulada **Versión actual** con estos subtipos:

- **Cambios sin confirmar** — el fichero existe en el historial pero tiene modificaciones en disco todavía no guardadas como versión.
- **Fichero nuevo** — el fichero se acaba de crear y aún no tiene ninguna versión en el historial.

Al seleccionar la entrada **Versión actual**, el diff compara el contenido en disco con la última versión guardada (si existe). En un fichero completamente nuevo el diff muestra todo el texto como inserción.

La entrada nunca aparece si el fichero actual y la última versión guardada son idénticos byte a byte: solo se dibuja cuando hay algo que mostrar.

## Invariantes

- La entrada **Versión actual** siempre aparece en **primer lugar** en la línea de tiempo, antes que cualquier otra.
- La entrada **nunca aparece** si el contenido del fichero en disco coincide exactamente con el de la última versión guardada.
- Los dos subestados ("cambios sin confirmar" y "fichero nuevo") son **visualmente distinguibles**: el usuario sabe en qué caso está sin tener que inferirlo.
- El usuario nunca ve la terminología técnica del control de versiones para describir estos estados. Ver [anti-jerga-git.md](anti-jerga-git.md).

## Implementación

Ver [../../historial.md](../../historial.md) para cómo se detecta la divergencia entre el disco y la última versión del historial.
