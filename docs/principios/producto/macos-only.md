# Principio: macOS únicamente

## Definición

Contextura es una aplicación de macOS. Windows y Linux están explícitamente fuera de alcance como plataformas soportadas.

## Por qué

Es una decisión de producto, no una limitación accidental. Permite:

- **Decisiones de integración nativa sin abstracciones**: usar directamente Keychain (`security`) para guardar tokens, `open -a`, selectores de carpeta nativos de macOS, rutas bajo `~/Library/Application Support/`, etc.
- **Superficie de testing pequeña**: un único SO, una única arquitectura efectiva (universal binary que cubre arm64 + x64).
- **Distribución simple**: un DMG. No MSI, no `.deb`, no AppImage, no Snap.
- **Menos matriz en CI y menos edge cases por SO**.
- **Foco de producto**: la organización objetivo usa macOS de forma homogénea.

Abrir soporte multiplataforma, incluso solo como "nice to have", fragmentaría cada decisión de integración futura y multiplicaría el coste de mantenimiento sin un beneficio claro para el usuario actual.

## Cómo aplicar

Antes de añadir una dependencia, una integración del sistema o un feature, preguntarse:

1. **¿Estoy introduciendo una abstracción cross-platform "por si acaso"?** → No. Usa directamente la API de macOS.
2. **¿Estoy proponiendo un CI job para Windows/Linux?** → No. El pipeline solo construye macOS.
3. **¿Estoy añadiendo una feature que depende de una herramienta exclusiva de otro SO?** → Rechazarla o buscar el equivalente macOS.
4. **¿El README o la documentación mencionan "multiplataforma" o "cross-platform"?** → No. Ser explícitos: es macOS-only.

## Ejemplos

| Situación | Correcto | Incorrecto |
|---|---|---|
| Guardar el token de release | `security add-generic-password` (Keychain macOS), leído desde `release.sh` | Usar `keytar` u otra abstracción cross-platform "por si mañana soportamos Linux" |
| Selector de carpeta | `dialog.showOpenDialog` de Electron con config nativa macOS | Implementar un selector custom para uniformar entre SO |
| Ruta de configuración | `~/Library/Application Support/Contextura/` vía `app.getPath('userData')` | Usar `~/.config/contextura` "para ser compatibles con XDG" |
| CI de builds | Un único runner macOS | Matrix con `macos-latest`, `windows-latest`, `ubuntu-latest` |
| Documentar la instalación | README explicando DMG, click derecho y Gatekeeper | Sección "Windows users" o "Linux users" |

## Ámbito de aplicación

Aplica a todas las decisiones de producto, código, distribución, documentación y proceso de release. La excepción son módulos puramente lógicos (parsing, lógica de negocio en `server.mjs`, `lib/scanner.mjs`, etc.) que por naturaleza corren en cualquier Node: esos no necesitan introducir dependencias macOS-only, pero tampoco deben complicarse para ser portables.

El día que este principio se revoque hará falta revisar: flujo de release, `release.sh`, ubicación de config, instrucciones del README, integración Keychain, `electron-builder.yml` y la matriz de CI.
