# Contextura

Editor nativo (macOS) para gestionar y editar contextos organizacionales en markdown. Con historial de versiones, diffs tipo Google Docs y live reload.

![Status](https://img.shields.io/badge/status-early%20access-orange)
![Platform](https://img.shields.io/badge/platform-macOS-black)

## Qué es

Contextura es la herramienta donde tu organización mantiene viva su biblioteca de contextos: prompts, playbooks, documentación, cualquier cosa que tus equipos y herramientas de IA consumen como referencia. Piensa en ella como un VS Code minimalista y específico para markdown, con un historial de versiones inline tipo Google Docs para que puedas ver quién escribió qué y cuándo, sin bajarte a un terminal.

Diseñada para ser la capa de edición encima de repos git de conocimiento: apuntas la app a una carpeta, navegas el árbol, editas en WYSIWYG, ves diffs inline de cualquier fichero, y la app se mantiene actualizada sola.

## Descargar

Ve a [**la última release**](https://github.com/Entaina/contextura/releases/latest) y baja **`Contextura-X.Y.Z.dmg`**.

Es un único fichero **universal** que funciona tanto en Apple Silicon (M1/M2/M3/M4) como en Intel — no tienes que elegir.

## Instalar

1. Abre el `.dmg` que descargaste
2. Arrastra **Contextura** a tu carpeta **Applications**
3. Cierra el DMG y ve a Applications
4. **Click derecho sobre Contextura → Abrir** (importante: click derecho, no doble click)
5. macOS te avisará "no se puede abrir porque es de un desarrollador no identificado". Pulsa **Abrir** en el diálogo
6. Listo. La próxima vez puedes abrirla con doble click normal

> **Importante**: el paso 4 (click derecho → Abrir) hay que hacerlo **una vez por cada versión nueva** que se instale. Cuando la app se auto-actualice y la reabras, puede volver a pedírtelo. Es molesto pero solo es un click extra cada vez.

### Cómo se hace click derecho en Mac

Tres formas, usa la que te funcione:

- **Trackpad (MacBook)**: tap con **dos dedos** a la vez sobre el icono
- **Magic Mouse**: toca en la mitad derecha del ratón (tiene que estar activado en Ajustes del Sistema → Ratón → "Click secundario")
- **La universal, siempre funciona**: mantén pulsada la tecla **`Control`** y haz **click normal**. Esto es equivalente a click derecho en cualquier Mac con cualquier ratón/trackpad. Si dudas, usa esta

### Si en el diálogo solo hay "Move to Trash" y "Done" (no aparece "Abrir")

En macOS Sequoia (versión 15+) Apple quitó el botón "Abrir" de ese diálogo para apps sin firmar. Entonces hay que ir por **Ajustes del Sistema**:

1. En el diálogo actual pulsa **Done** (NO "Move to Trash", eso borraría la app)
2. Abre **Ajustes del Sistema** (System Settings) desde el menú  Apple
3. Ve a **Privacidad y Seguridad** (Privacy & Security)
4. **Baja hasta el final** de la página. Verás un aviso tipo: *"Contextura fue bloqueado porque no es de un desarrollador identificado"*
5. Pulsa el botón **"Abrir de todas formas"** (Open Anyway) junto a ese aviso
6. macOS te pedirá tu contraseña del Mac o Touch ID para confirmar
7. Vuelve a Applications, doble click en Contextura y ya se abre normal

Esta es la vía "oficial" de Apple para apps no notarizadas. Funciona en cualquier macOS reciente y es la opción a prueba de fallos si el click derecho no te saca el botón "Abrir".

### ¿Por qué toda esta ceremonia?

Contextura se distribuye sin firmar con un Apple Developer ID (~99€/año), porque por ahora es una herramienta interna. macOS Gatekeeper no reconoce la firma como "verificada por Apple" y por defecto bloquea el primer arranque. Tanto el click derecho → Abrir como la vía de Ajustes del Sistema son formas estándar de decirle a macOS "sí, confío en esta app".

No es un bug ni un riesgo de seguridad: es el mismo proceso que sigues con cualquier herramienta open source distribuida fuera del Mac App Store. Si te resulta molesto, dilo y valoraremos pagar la firma para eliminar la fricción del todo.

### Si te dice "está dañado y no se puede abrir" en lugar del aviso normal

Eso significa que descargaste una versión muy antigua (anterior a la 0.1.1) que no estaba firmada en absoluto. **Borra esa app y descarga la última desde [Releases](https://github.com/Entaina/contextura/releases/latest)**. La 0.1.1 y posteriores funcionan con los pasos de arriba.

## Primer uso

Al arrancar te pedirá elegir una carpeta raíz. Apunta a cualquier carpeta que contenga ficheros markdown — repos git funcionan especialmente bien porque activas la vista de historial inline con diffs.

Puedes cambiar de carpeta en cualquier momento desde el menú **File → Open Folder…**.

## Actualizaciones automáticas

Contextura se auto-actualiza en segundo plano. Cuando se publica una versión nueva:

1. La app la detecta al arrancar o cada ~6 horas mientras está abierta
2. La descarga sin interrumpirte
3. La instala automáticamente la próxima vez que cierres la app
4. La primera vez que reabres tras una actualización, vuelve a pedir click derecho → Abrir (ver sección de instalación)

No tienes que hacer nada activamente. Solo cerrar y reabrir la app cuando te apetezca recibir la mejora.

## Soporte y feedback

Contextura es una herramienta interna en early access. Si algo no funciona o tienes ideas, escribe directamente a **Javier**.

## Código fuente

Hoy el código vive dentro del monorepo PARA de Entaina (privado) en `tools/contextura/`. Eventualmente se extraerá a este mismo repo; cuando eso pase, los usuarios instalados no notarán nada — las actualizaciones siguen funcionando igual.

Si trabajas en Entaina y quieres echar un ojo o contribuir, pregunta a Javier.

## License

© 2026 Entaina. Todos los derechos reservados.
