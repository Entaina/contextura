# Anti-jerga-git

## Qué hace

Codifica la invariante de producto que rige toda la experiencia del modo historial: a nadie que use Contextura se le presenta terminología técnica de control de versiones. Lo que en otras herramientas aparecería como "commit abc123 de main" aquí se presenta como una versión con fecha, autor y descripción, nada más.

## Experiencia del usuario

El usuario que nunca ha usado una herramienta de control de versiones debe poder consultar y restaurar versiones sin aprender vocabulario nuevo. El modo historial se parece al *historial de versiones* de Google Docs, Notion o Dropbox Paper, no a una interfaz de desarrollador.

En particular, el usuario nunca ve:

- Identificadores técnicos de versiones ("hashes", "SHAs").
- La palabra **commit** en ningún contexto.
- Ramas, remotos, merges, rebase, stash ni ningún otro término de flujo de trabajo técnico.
- Banderas de estado crudas tipo `M`, `A`, `?`, `R100`.
- Mensajes de error que mencionen el CLI ("fatal:", "error: …").

En su lugar ve: fechas relativas en español, nombre de pila del autor, descripciones cortas del cambio, iconos de estado con etiquetas en lenguaje natural ("creación", "edición", "se movió de ubicación"), y mensajes contextuales redactados en prosa — ver [banners-contextuales.md](banners-contextuales.md).

## Invariantes

Esta es la invariante más estricta del módulo. Cualquier cadena de texto visible al usuario en el modo historial tiene que pasar este filtro:

- **Ningún identificador técnico de versión**, ni completo ni abreviado, en ningún tooltip, mensaje o etiqueta.
- **La palabra "commit" está prohibida** en la UI. La alternativa es "versión".
- **Las banderas crudas de estado se traducen** a frases en lenguaje natural.
- **Los errores que provienen de fallos técnicos internos se capturan y se presentan** como mensajes neutros del tipo "No se pudo cargar la versión", sin exponer el mensaje original.

Cualquier cambio en el modo historial que introduzca terminología prohibida debe corregirse antes de llegar al usuario.

## Implementación

Esta feature no tiene una implementación concreta: es una regla que constriñe al resto de las features del módulo. El punto de control práctico está en los ficheros de [../../historial.md](../../historial.md) y en los textos embebidos en la vista del historial.
