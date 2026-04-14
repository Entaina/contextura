# Integración con el Design System

Contextura consume **solo la paleta de colores** del Entaina Design System. No hereda ninguno de sus temas semánticos (`technology`, `innovation`, `people`); en su lugar define su propio tema local construido sobre las variables crudas de la paleta.

## Qué carga Contextura del DS

Una única hoja via CDN: `https://design-system.entaina.ai/tokens/css/colors.css`

Publica en `:root`:

- Familias de color crudas: `--hoki-{50..950}`, `--chicago-{50..950}`, `--copperfield-{50..950}`, `--golden-tainoi-{50..950}`, `--green-{50..950}`, `--red-{50..950}`, `--orange-{50..950}`, `--blue-{50..950}`, `--marengo-{50..950}`
- Neutros genéricos: `--on-dark`, `--on-light`

No carga `variables.css` (paquete completo con temas + tipografía) para evitar que los cambios en los temas semánticos del DS se propaguen a la app sin revisión.

## Filosofía del tema propio

El DS establece dos reglas no negociables que Contextura respeta:

1. **Canvas blanco por defecto** (`estilo-visual.md`): *"The base of any Entaina page or document is white. The brand colors appear as accents, sections and highlights — never as the overall background."* Los colores de marca nunca son el fondo dominante.
2. **Los tres pilares siempre presentes** (`pilares.md`), pero con **dominancia** — uno lidera, otro apoya, el tercero acentúa. Temas neutros sin pilares están prohibidos.

## Distribución 60 / 30 / 10

Contextura elige **Innovation (Copperfield)** como pilar dominante porque es un editor creativo en evolución permanente — el *permanent draft* de Entaina. El resto de la composición sigue el 60/30/10 estándar del DS:

| Peso | Familia | Rol | Dónde aparece |
|---|---|---|---|
| ~60% | **Chicago** (neutro) | Canvas, chrome, texto, bordes | Fondo editor, sidebar, barra de tabs, headers, cuerpo de texto |
| ~30% | **Copperfield 400** `#de865c` (seed — Innovation) | Marca, acción, estado activo | Active file en sidebar, dirty indicator, watermark del welcome, indicador de drag-over en dockview, links del diff viewer |
| ~8% | **Golden Tainoi 200 / 500** `#f8cf73` (seed — People) | Historial | Timeline activo, botón restaurar, dot del commit seleccionado |
| ~2% | **Hoki 500** `#6b859f` (seed — Technology) | Marca silenciosa, estructura | Isotipo de tres semillas en la sidebar, badges de move/copy en el historial, banner de ficheros movidos |

## Cómo se definen los tokens semánticos

El bloque `:root` al inicio de [`public/style.css`](../public/style.css) define las variables que usa el resto del CSS. Están agrupadas por propósito y **todas** resuelven a colores crudos del DS:

- **Superficies** (`--background`, `--surface`, `--surface-alt`, `--border`): escala chicago
- **Texto** (`--text`, `--text-subtle`, `--text-muted`): escala chicago
- **Primario** (`--primary`, `--primary-seed`, `--primary-light`, `--primary-soft`, `--primary-dark`): escala copperfield
- **Secundario** (`--secondary`, `--secondary-fill`, `--secondary-light`, `--secondary-soft`, `--secondary-dark`): escala golden-tainoi
- **Acento** (`--accent`, `--accent-light`, `--accent-soft`, `--accent-dark`): escala hoki
- **Feedback funcional** (`--success`, `--danger`, `--warning`): green / red / orange — **no se mezclan con la marca**; son semántica universal de estado (éxito, error, aviso) y deben permanecer puros

**Regla operativa**: si hace falta un color nuevo, se añade un token semántico al bloque `:root` que referencie la paleta cruda del DS. **Nunca un literal hexadecimal** fuera de ese bloque (la única excepción es el `backgroundColor` de la ventana Electron en [`electron/main.cjs`](../electron/main.cjs), porque el proceso main no puede leer CSS).

## Feedback funcional vs. marca — por qué no se tocan

El botón Save es **verde** (`--success`), no copperfield. Razón: "guardar" es confirmación universal, no identidad. Mezclar marca con semántica funcional rompe la intuición del usuario cuando aparecen alertas reales. La marca vive en *estados* e *identidad* (active file, dirty dot, watermark), no en *acciones semánticas*.

## Tipografía

Contextura define sus fuentes localmente en el mismo bloque `:root` (`--font-display: Comfortaa`, `--font-body: Lato`, `--font-mono: JetBrains Mono`). Las webfonts se cargan desde Google Fonts en `public/index.html`. No se consume ningún token de tipografía del DS.

## Icono de la app

El icono de macOS (`assets/icon.icns`) se genera desde el isotipo oficial de marca del DS (`brand/icon.png`). El fichero fuente vive en `assets/source/brand-icon.png`.

## Limitación conocida: primer arranque requiere internet

La app cachea `colors.css` después del primer load, pero un arranque en frío sin red no renderiza los colores correctamente. Vendorizar los assets del DS en `public/vendor/` está tracked como nice-to-have de v1.1 (ver [producto.md](producto.md)) precisamente para eliminar esta limitación.
