# Contextura

Editor nativo (macOS) para gestionar y editar contextos organizacionales en markdown. Con historial de versiones, diffs tipo Google Docs y live reload.

![Status](https://img.shields.io/badge/status-early%20access-orange)
![Platform](https://img.shields.io/badge/platform-macOS-black)

## Qué es

Contextura es la herramienta donde tu organización mantiene viva su biblioteca de contextos: prompts, playbooks, documentación, cualquier cosa que tus equipos y herramientas de IA consumen como referencia. Piensa en ella como un VS Code minimalista y específico para markdown, con un historial de versiones inline tipo Google Docs para que puedas ver quién escribió qué y cuándo, sin bajarte a un terminal.

Diseñada para ser la capa de edición encima de repos git de conocimiento: apuntas la app a una carpeta, navegas el árbol, editas en WYSIWYG, ves diffs inline de cualquier fichero, y la app se mantiene actualizada sola.

## Descargar

Ve a [**Releases**](https://github.com/Entaina/contextura/releases/latest) y descarga:

- **Apple Silicon (M1/M2/M3/M4)**: `Contextura-<version>-arm64.dmg`
- **Intel**: `Contextura-<version>.dmg`

¿No sabes qué Mac tienes? Menú Apple  → Acerca de este Mac. Si dice "Apple M1/M2/M3/M4" bajas el arm64; si dice "Intel Core" bajas el otro.

## Instalar

1. Abre el `.dmg` descargado
2. Arrastra **Contextura** a tu carpeta **Applications**
3. Ve a Applications y haz **click derecho sobre Contextura → Abrir** (importante: no doble click)
4. macOS te avisará que es de un "desarrollador no identificado". Pulsa **Abrir** en el diálogo.
5. A partir de aquí ábrela normal con doble click.

**Este paso del click derecho solo es necesario la primera vez tras cada actualización**, por la razón que explico abajo.

## Primer uso

Al arrancar te pedirá elegir una carpeta raíz. Apunta a cualquier carpeta que contenga ficheros markdown (repos git funcionan mejor — activas la vista de historial inline con diffs).

Puedes cambiar la carpeta en cualquier momento desde el menú **File → Open Folder…**.

## Actualizaciones automáticas

Contextura se auto-actualiza en segundo plano. Cuando se publica una versión nueva:

1. La app la detecta al arrancar o cada ~6 horas de uso
2. La descarga sin interrumpirte
3. La instala automáticamente la próxima vez que cierres la app
4. La primera vez que reabres tras una actualización puede pedirte otra vez click derecho → Abrir (ver más abajo)

No tienes que hacer nada. Solo cerrar y reabrir la app cuando te apetezca recibir la mejora.

## Por qué hay que hacer right-click la primera vez

Contextura se distribuye **sin firmar con Apple Developer ID**, porque es una herramienta interna y la firma cuesta ~99€/año que no justificamos todavía. macOS Gatekeeper bloquea por defecto cualquier ejecutable sin firma en su primer arranque para protegerte. El click derecho → Abrir es la forma de decirle a macOS "sí, confío en esta app".

Es el mismo mecanismo que usas cuando instalas cualquier herramienta de desarrollo open source distribuida como .dmg. No es un bug ni un riesgo de seguridad — solo fricción.

Si te resulta molesto, dilo y valoraremos pagar la firma.

## Soporte y feedback

Contextura es una herramienta interna en early access. Si algo no funciona o tienes ideas, escribe directamente a **Javier**.

## Código fuente

Hoy el código vive dentro del monorepo PARA de Entaina (privado) en `tools/contextura/`. Eventualmente se extraerá a este mismo repo; cuando eso pase, los usuarios instalados no notarán nada — las actualizaciones siguen funcionando igual.

Si trabajas en Entaina y quieres echar un ojo o contribuir, pregunta a Javier.

## License

© 2026 Entaina. Todos los derechos reservados.
