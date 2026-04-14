# Integración con el Design System

Contextura consume el Entaina Design System vía CDN.

## Dependencias

- **Variables CSS**: `https://design-system.entaina.ai/tokens/css/variables.css`
- **Config de Tailwind**: `https://design-system.entaina.ai/tokens/tailwind/tailwind.config.js`

El tema se activa con `data-theme="technology"` en el elemento `<html>`.

## Sidebar en modo oscuro

El Design System actualmente no publica un tema oscuro. La sidebar de Contextura usa manualmente tonos oscuros de la paleta hoki del Design System para conseguir el look oscuro sin esperar a un release futuro del tema. Es una desviación consciente — el día que el Design System añada un dark theme oficial, la sidebar migrará a consumirlo.

## Limitación conocida: primer arranque requiere internet

La app cachea los assets del Design System después del primer load, pero un arranque en frío sin red no renderiza los estilos correctamente. Vendorizar los assets en `public/vendor/` está tracked como nice-to-have de v1.1 (ver [producto.md](producto.md)) precisamente para eliminar esta limitación.
