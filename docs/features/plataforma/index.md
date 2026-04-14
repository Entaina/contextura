# Plataforma

## Acerca de este índice

Este módulo agrupa las features que hacen que Contextura se comporte como una aplicación nativa de macOS y no como una página web: el menú nativo, los atajos de teclado del sistema, la actualización automática silenciosa, la memoria del tamaño y la posición de la ventana, y la persistencia de la configuración del usuario en el sitio canónico del sistema.

La implementación técnica vive en [../../electron.md](../../electron.md).

## Features

- [menu-nativo.md](menu-nativo.md): Menú de la aplicación integrado con la barra de menús de macOS
  - Leer al tocar qué aparece en el menú o cómo reacciona

- [atajos.md](atajos.md): Atajos de teclado del sistema y sus acciones
  - Leer al añadir, cambiar o renombrar atajos

- [auto-update.md](auto-update.md): Actualización automática en segundo plano
  - Leer al tocar el flujo de actualización que experimenta el usuario

- [window-bounds.md](window-bounds.md): Memoria del tamaño y la posición de la ventana
  - Leer al tocar cómo se restaura la ventana al arrancar

- [config-persistente.md](config-persistente.md): Ubicación y forma de la configuración del usuario
  - Leer al tocar qué se guarda entre sesiones o cómo resetear Contextura
