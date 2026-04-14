# Producto

## Qué es Contextura

Contextura es un editor nativo de macOS pensado para que una organización gestione su biblioteca de contexto en markdown: prompts, documentación, playbooks, y cualquier otro fichero que sus equipos y herramientas de IA consumen como referencia.

La propuesta es funcionar como un VS Code minimalista específico para markdown, sentado encima de repos git de conocimiento. Apuntas la app a una carpeta, navegas el árbol, editas en WYSIWYG, y la app te muestra el historial completo del fichero con diffs inline sin tener que bajar a un terminal.

## Para quién

Organizaciones que ya tienen (o quieren tener) su conocimiento en markdown versionado con git y necesitan una capa de edición usable por todo el equipo, no solo por desarrolladores.

## Features

El catálogo completo de features del producto, descritas desde el punto de vista del usuario con sus flujos e invariantes, vive en [features/index.md](features/index.md) agrupado por módulos. Este documento deliberadamente no duplica esa lista para que añadir o retirar features no obligue a actualizar dos sitios.

Los detalles técnicos de cómo se implementan esas features (qué librerías, qué ficheros, qué patrones) viven en los documentos de arquitectura del índice [index.md](index.md).

## Plataformas soportadas

macOS únicamente, por decisión de producto. Ver [principios/producto/macos-only.md](principios/producto/macos-only.md).

## Código fuente y distribución

El código fuente vive en el mismo repositorio que las releases binarias: [github.com/Entaina/contextura](https://github.com/Entaina/contextura). La aplicación se desarrolló originalmente dentro del monorepo [Entaina/para](https://github.com/Entaina/para) en `tools/contextura/` y fue extraída a este repositorio en abril de 2026.

La distribución al usuario final (descarga, instalación, auto-actualización) está documentada en [README.md](../README.md). El proceso de publicación de una release está en [release.md](release.md).

## Fuera de alcance (v1.1+)

Decisiones deliberadamente aparcadas:

- **GitHub Actions CI para releases**: diferido hasta post-extracción para evitar construir dos veces.
- **Firma Apple Developer ID + notarización** (~99€/año): eliminaría la fricción de click derecho → Abrir tras cada actualización.
- **Design System vendorizado**: servir CSS/fuentes desde `public/vendor/` para que el arranque en frío funcione sin internet. Contexto en [design-system.md](design-system.md).
- **Builds para Windows / Linux**: fuera de alcance por decisión de producto. Ver [principios/producto/macos-only.md](principios/producto/macos-only.md).
- **Landing propia en `contextura.entaina.ai`**: hospedada en Cloudflare Pages, autodetecta arquitectura y redirige al DMG correcto.
- **Crash reporting / telemetría**: ninguna.
- **Icono bespoke**: el actual es Pi_01 sobre gris Marengo; un icono diseñado podría llegar en un pase de branding v1.2.
