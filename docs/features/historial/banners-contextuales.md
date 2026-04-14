# Banners contextuales

## Qué hace

Cuando la versión seleccionada en la línea de tiempo tiene alguna particularidad que el diff por sí solo no podría comunicar, el panel muestra un banner de texto corto en lenguaje natural explicando qué está viendo el usuario y por qué.

## Experiencia del usuario

Los banners aparecen en la parte superior del área del diff y cubren estos casos:

- **Primera versión** — el fichero se creó en esta versión. No hay "versión anterior" contra la que comparar, así que todo el contenido aparece marcado como inserción.
- **Cambios sin confirmar** — el usuario ha seleccionado la entrada **Versión actual** y está viendo los cambios en disco todavía no incorporados al historial. Ver [uncommitted.md](uncommitted.md).
- **Último commit del historial** — el usuario ha llegado al final de la línea de tiempo (p. ej. la versión número 50). Informa de que hay más versiones que quedan fuera del alcance por el límite de la línea de tiempo.
- **Se movió de ubicación** — la versión seleccionada es un rename puro: el fichero cambió de nombre o carpeta pero su contenido no cambió. El diff está vacío. Ver [follow-renames.md](follow-renames.md).
- **Demasiado grande para diff** — el contenido de esta versión es lo bastante grande como para que calcular el diff visual sea inviable. El banner ofrece la explicación y evita mostrar una pantalla vacía sin pista.

Cada banner es una frase corta y tiene un tono explicativo, no técnico.

## Invariantes

- Los banners **siempre** se redactan en lenguaje natural — ver [anti-jerga-git.md](anti-jerga-git.md).
- Un banner explica **qué** está viendo el usuario y **por qué**, nunca enuncia simplemente una condición técnica.
- Cuando el diff estaría vacío por una razón no obvia (p. ej. un rename puro), el banner es **obligatorio**: el usuario nunca debe quedarse mirando un diff en blanco sin explicación.

## Implementación

Ver [../../historial.md](../../historial.md) para cómo se deciden y componen los banners en el render del diff.
