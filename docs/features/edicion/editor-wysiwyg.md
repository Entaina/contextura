# Editor WYSIWYG

## Qué hace

Proporciona un editor de markdown con dos modos complementarios: un modo **WYSIWYG** que renderiza el formato mientras el usuario escribe, y un modo **texto** que muestra el markdown crudo. El usuario puede alternar entre ambos en cualquier momento.

## Experiencia del usuario

### Modos del editor

- **WYSIWYG** — el texto aparece con su formato final: los encabezados en tamaño grande, las listas con sus viñetas, las tablas como tablas, los enlaces como enlaces. Es el modo más cercano a una herramienta de ofimática.
- **Texto** — el markdown se muestra en crudo. Útil para usuarios que prefieren ver la sintaxis y manipularla directamente, o para pegar grandes bloques de markdown sin interferencia.

El usuario alterna entre modos con un control en el propio editor. La preferencia se recuerda por fichero — ver [modo-editor-por-fichero.md](modo-editor-por-fichero.md).

### Barra de herramientas

En ambos modos hay una barra de herramientas con las acciones más habituales:

- Encabezados (niveles 1-6).
- Negrita, cursiva, tachado.
- Listas, listas ordenadas, listas de tareas.
- Citas, líneas horizontales.
- Tablas.
- Enlaces.
- Bloques de código (inline y de bloque).

Las acciones de la barra funcionan igual en WYSIWYG que en texto: aplican el formato correspondiente a la selección actual, o insertan una estructura nueva en la posición del cursor.

### Normalización al guardar

Al guardar, el contenido se escribe como markdown normalizado (espacios, guiones de lista, saltos de línea uniformes). Esta normalización **no** marca falsos cambios sin guardar — ver [../guardado/dirty-tracking.md](../guardado/dirty-tracking.md).

## Invariantes

- Alternar entre modos **nunca** pierde ni altera el contenido del fichero.
- La barra de herramientas está **disponible en los dos modos**.
- La normalización del markdown al guardar **no** produce cambios visibles al usuario más allá de los que él mismo hace.

## Implementación

Ver [../../frontend.md](../../frontend.md) para la integración del editor embebido y su pipeline de normalización.
