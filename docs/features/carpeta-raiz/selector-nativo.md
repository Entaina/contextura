# Selector nativo de carpeta

## Qué hace

Al arrancar Contextura por primera vez, o cada vez que el usuario pide cambiar de carpeta, la aplicación abre el diálogo nativo de selección de carpeta de macOS para que elija cualquier directorio del sistema.

## Experiencia del usuario

El diálogo es el de macOS, no uno propio: se ve y se comporta igual que los diálogos de abrir del resto de aplicaciones nativas. El usuario puede:

- Navegar por el sistema de ficheros con la barra lateral del diálogo y la vista de carpetas.
- Seleccionar cualquier carpeta existente.
- **Crear una carpeta nueva** desde el propio diálogo si todavía no tiene una para Contextura.

Contextura **no restringe** qué carpeta se puede elegir. No está atada a un repositorio concreto, ni a una ubicación especial del sistema: cualquier carpeta normal es válida, tenga o no tenga ficheros markdown dentro. Si la carpeta está vacía, Contextura arranca con un árbol vacío y el usuario puede empezar a crear ficheros dentro (ver [../navegacion/creacion-inline.md](../navegacion/creacion-inline.md)).

El diálogo aparece en dos situaciones:

1. **Primer arranque** — Contextura todavía no tiene carpeta guardada y necesita que el usuario elija una.
2. **Cambio posterior** — desde el menú **Archivo → Abrir carpeta…** el usuario puede invocar el diálogo para cambiar a otra carpeta. Ver [swap-carpeta.md](swap-carpeta.md).

## Invariantes

- El diálogo es **siempre** el de macOS, no un diálogo propio.
- El usuario **puede crear una carpeta nueva** desde el propio diálogo sin salir a Finder.
- **Cualquier carpeta** del sistema es válida; Contextura no exige que sea un repositorio ni que contenga ficheros markdown.
- Cancelar el diálogo no cambia nada: la carpeta anterior (si había) sigue siendo la activa.

## Implementación

Ver [../../electron.md](../../electron.md) para el flujo del diálogo nativo y su integración con el resto del proceso.
