# Release

Las releases de Contextura se publican manualmente desde el Mac del mantenedor a [github.com/Entaina/contextura/releases](https://github.com/Entaina/contextura/releases) (el mismo repositorio que aloja el código). Releases vía GitHub Actions son una mejora potencial pero no son necesarias todavía.

## Setup único

### 1. Token de GitHub

Crea un personal access token en https://github.com/settings/tokens con scope `repo`. Guárdalo en el Keychain de macOS — nunca en `.env` ni en el historial de la shell:

```bash
security add-generic-password \
  -a contextura \
  -s github-release-token \
  -w ghp_xxxxxxxxxxxxxxxxxxxxxxxx
```

`scripts/release.sh` lee el token del Keychain en tiempo de release.

### 2. Icono de la app

El repo ya incluye `assets/icon.icns` generado. Solo hay que regenerarlo si cambia el PNG fuente:

```bash
./scripts/build-icon.sh
```

Lee `assets/source/Pi_01.png` (mascota de marca Entaina) y lo encuadra a 1024×1024 sobre fondo gris Marengo (#6c6e72). Idempotente.

### 3. Dependencias instaladas

`npm install` (electron, electron-builder, electron-updater ya están en `devDependencies`).

## Cortar una release

```bash
./scripts/release.sh patch    # 0.1.0 → 0.1.1
./scripts/release.sh minor    # 0.1.0 → 0.2.0
./scripts/release.sh major    # 0.1.0 → 1.0.0
./scripts/release.sh --no-bump  # usa la versión actual de package.json (para la primerísima release)
```

Qué hace el script, en orden:

1. Verifica árbol de git limpio, icono presente y dependencias instaladas.
2. Carga `GH_TOKEN` del Keychain.
3. Bumpea la versión en `package.json` + `package-lock.json`, commitea y etiqueta como `contextura-v<version>`.
4. Ejecuta `electron-builder --mac dmg --publish always`, que:
   - Construye `Contextura-<version>-arm64.dmg` y `Contextura-<version>.dmg`.
   - Sube los DMGs, sus blockmaps y `latest-mac.yml` a una nueva release de GitHub en `Entaina/contextura`.
5. Pushea el commit de versión y el tag al remoto.

Tarda ~3–4 minutos end-to-end (el grueso es el build del DMG x64).

## Verificación

Cuando `scripts/release.sh` termine limpiamente:

- `gh release view v<version> --repo Entaina/contextura` debe listar 5 assets (2 DMGs, 2 blockmaps, 1 yml).
- Visita `https://github.com/Entaina/contextura/releases/tag/v<version>` y confirma que los DMGs descargan.
- `curl -I https://github.com/Entaina/contextura/releases/latest/download/latest-mac.yml` debe devolver 200 — esto es lo que `electron-updater` lee desde los clientes instalados.

## Flujo de auto-update (clientes instalados)

El `electron-updater` embebido en cada build consulta el feed de releases de GitHub:

- Una vez al arrancar.
- Cada 6 horas mientras esté abierto.
- Compara la versión de `latest-mac.yml` contra la versión local del bundle.
- Si hay una más nueva, la descarga en background y la aplica al siguiente cierre (`autoInstallOnAppQuit: true`).

No hay hooks, no hay prompts al usuario, no hay opt-in: la actualización simplemente ocurre en silencio. Cierra y reabre la app para ver una versión nueva.

### Caveat de builds sin firmar

macOS Gatekeeper vuelve a poner en cuarentena cada DMG recién descargado, incluso cuando viene por auto-update. El primer arranque después de una actualización puede requerir click derecho → Abrir una vez (o la vía de System Settings en Sequoia+, detallada en [README.md](../README.md)).

Para eliminar esta fricción habría que firmar los builds con un Apple Developer ID. Está documentado como pendiente en [producto.md](producto.md).
