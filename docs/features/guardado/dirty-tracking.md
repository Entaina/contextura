# Indicador de cambios sin guardar

## Qué hace

Marca claramente en la interfaz cualquier pestaña que tenga modificaciones sin guardar, para que el usuario pueda distinguir de un vistazo qué ficheros tiene pendientes de guardar entre todas las pestañas abiertas.

## Experiencia del usuario

Cuando el usuario escribe cualquier cambio en el editor, la pestaña correspondiente muestra un **punto** a la izquierda de su título. El punto desaparece en cuanto el fichero se guarda y el contenido vuelve a coincidir con el de disco.

La cabecera del panel también refleja el estado: cuando hay cambios sin guardar muestra el texto **Sin guardar**; cuando no, la cabecera está vacía (o muestra brevemente **Guardado** tras una acción de guardar — ver [guardar.md](guardar.md)).

### Caso borde: falsos positivos por normalización

El editor aplica una normalización interna al markdown al abrirlo (uniformiza espacios, comillas, saltos de línea, etc.). Sin cuidado, esta normalización podría marcar como "sin guardar" un fichero que el usuario no ha tocado. Contextura compara el contenido actual con el original **después de la normalización**, de modo que abrir un fichero y cerrarlo sin tocar nada nunca marca la pestaña como sucia.

## Invariantes

- Una pestaña **nunca** está marcada como sucia si su contenido coincide con el de disco tras normalización.
- Una pestaña **siempre** está marcada como sucia si el usuario ha escrito algo que aún no se ha guardado.
- El indicador de pestaña y el texto de la cabecera **están sincronizados**: ambos reflejan el mismo estado al mismo tiempo.
- El paso de normalización evita falsos positivos, pero **nunca** oculta un cambio real del usuario.

## Implementación

Ver [../../frontend.md](../../frontend.md) para el renderer de pestaña con indicador y la detección de dirty state tras normalización.
