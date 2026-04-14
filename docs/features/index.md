# Features de Contextura

## Acerca de este índice

Este directorio (`docs/features/`) es el catálogo de lo que el usuario puede hacer con Contextura, descrito siempre desde su punto de vista: flujos, atajos, invariantes y persistencia tal y como él los percibe. La implementación técnica (librerías, ficheros, funciones) vive en los documentos de arquitectura en el nivel superior: [../backend.md](../backend.md), [../frontend.md](../frontend.md), [../electron.md](../electron.md) y [../historial.md](../historial.md). Ningún fichero de este catálogo repite contenido técnico — se referencia por enlace.

La separación entre estas dos capas es un principio explícito del repositorio: ver [../principios/documentacion/features.md](../principios/documentacion/features.md) antes de crear o modificar un fichero aquí.

El catálogo está organizado en **módulos** — carpetas que agrupan features relacionadas — y en **features transversales** que no pertenecen a un módulo concreto porque afectan a toda la aplicación.

## Módulos

- [navegacion/](navegacion/index.md): Barra lateral — árbol de ficheros, búsqueda, creación inline, redimensionado y plegado
  - Leer al tocar cualquier elemento de la barra lateral

- [carpeta-raiz/](carpeta-raiz/index.md): Elección, cambio y memoria de la carpeta raíz sobre la que Contextura trabaja
  - Leer al tocar cómo se elige o se cambia la carpeta sobre la que trabaja la aplicación

- [edicion/](edicion/index.md): Pestañas, splits, editor, pantalla inicial, persistencia del layout
  - Leer al tocar el área de edición

- [guardado/](guardado/index.md): Ciclo de guardado, indicadores de cambios sin guardar y confirmaciones al cerrar
  - Leer al tocar el ciclo de guardado

- [historial/](historial/index.md): Modo historial inline con línea de tiempo, diff visual estilo Google Docs y restauración
  - Leer al tocar el modo historial

- [plataforma/](plataforma/index.md): Integración nativa con macOS — menú, atajos, auto-update, ventana, configuración
  - Leer al tocar comportamientos específicos de aplicación nativa

## Features transversales

- [live-reload.md](live-reload.md): Recarga automática cuando los ficheros cambian en disco fuera de la aplicación
  - Leer al tocar cómo Contextura reacciona a cambios externos en disco
