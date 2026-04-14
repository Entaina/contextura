# Release

Las releases de Contextura se publican automáticamente desde [GitHub Actions](../.github/workflows/release.yml) a [github.com/Entaina/contextura/releases](https://github.com/Entaina/contextura/releases). El flujo está guiado por [release-please](https://github.com/googleapis/release-please), que mantiene un pull request abierto con el siguiente bump de versión y la entrada correspondiente de [CHANGELOG.md](../CHANGELOG.md) a partir de los [Conventional Commits](https://www.conventionalcommits.org/) mergeados en `main`.

Este fichero describe cómo se corta, verifica y reparte una release. La definición operativa del pipeline vive en `.github/workflows/release.yml`; tratarlo como la fuente de verdad.

## Flujo normal

1. **Mergea commits a `main`** con prefijos conventional (`feat:`, `fix:`, `refactor:`, `perf:`, `chore(deps):`…). La clasificación de cada tipo en el CHANGELOG vive en [`.release-please-config.json`](../.release-please-config.json).
2. **release-please abre o actualiza un pull request** titulado `chore(main): release <version>` con:
   - El bump de versión en `package.json` + `package-lock.json`.
   - La nueva sección del `CHANGELOG.md` generada a partir de los commits desde la última release.
3. **Revisa el release PR** cuando quieras cortar una versión. Es una oportunidad de pre-visualizar qué entrará en la release, qué versión propone el bot, y ajustar el CHANGELOG a mano si algún commit necesita más contexto.
4. **Mergealo**. En cuanto el PR queda en `main`, el workflow `Release`:
   - Job `release-please`: crea el tag `v<version>` y un **GitHub Release en modo draft**.
   - Job `build-mac` (sólo si se creó release): corre en `macos-latest`, ejecuta `npx electron-builder --mac --publish always`, sube los assets al draft y verifica que estén todos.
   - Step final: `gh release edit --draft=false` publica el release de forma atómica.
5. **electron-updater** en los clientes instalados detecta la nueva versión al arrancar o en el próximo ciclo de polling (≤ 6h).

El job `build-mac` tarda ~6–10 minutos en total. Durante ese tiempo el release está en draft y los clientes siguen viendo la versión anterior como `latest` — así evitamos la ventana en la que `latest-mac.yml` podría responder 404.

## Cómo ajustar qué entra en una release

- **Saltar un tipo de commit en el CHANGELOG**: editar `changelog-sections` en `.release-please-config.json` (`hidden: true`).
- **Forzar una versión concreta** (por ejemplo pasar a `1.0.0`): añadir `Release-As: 1.0.0` como footer en un commit que vaya a `main`. release-please respeta ese override en el siguiente PR.
- **Indicar breaking change**: usar `feat!:`, `fix!:` o un footer `BREAKING CHANGE:`. Pre-1.0 Contextura tiene `bump-minor-pre-major: true`, así que un breaking no escala a mayor automáticamente — debes forzarlo con `Release-As`.
- **Editar el release PR a mano**: cualquier commit que hagas sobre la rama del PR de release-please será preservado; el bot no reescribe lo que tú editas.

## Setup único del pipeline

Por política de la organización Entaina, `GITHUB_TOKEN` (el token built-in del workflow) no puede abrir pull requests. release-please necesita poder hacerlo para mantener el release PR, así que usa un PAT guardado como secret del repo.

**Crear el secret** (una sola vez):

1. Crea un [fine-grained PAT](https://github.com/settings/personal-access-tokens/new) limitado a `Entaina/contextura` con permisos:
   - `Contents: Read and write`
   - `Pull requests: Read and write`
   - `Workflows: Read and write`
2. Guárdalo como secret del repo:

   ```bash
   gh secret set RELEASE_PLEASE_TOKEN --repo Entaina/contextura
   ```

   (O reutiliza el token existente del Keychain: `security find-generic-password -a contextura -s github-release-token -w | gh secret set RELEASE_PLEASE_TOKEN --repo Entaina/contextura`).

El resto del workflow (build, upload de assets, flip draft→published) sigue usando el `GITHUB_TOKEN` built-in — sólo el step de release-please-action necesita el PAT.

## Versiones y tags

- Formato de tag: **`v<version>`**. El tag histórico `contextura-v0.1.1` queda archivado y no se renombra; a partir de `v0.1.2` usamos el prefijo plano.
- La versión en `package.json` es la fuente única de verdad para electron-updater y la UI de la app. release-please mantiene `package.json`, `package-lock.json` y `.release-please-manifest.json` en sincronía.
- El formato del `CHANGELOG.md` sigue [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).

## Verificación tras una release

Cuando el workflow termine limpiamente:

```bash
TAG=v<version>

# 1. Estado del release (no draft, con los 3 assets esperados)
gh release view "$TAG" --repo Entaina/contextura \
  --json isDraft,assets --jq '{isDraft, assets: [.assets[].name]}'
# → { "isDraft": false, "assets": ["Contextura-<version>.dmg", "Contextura-<version>.dmg.blockmap", "latest-mac.yml"] }

# 2. El feed del auto-updater es reachable
curl -I https://github.com/Entaina/contextura/releases/latest/download/latest-mac.yml
# → HTTP 200

# 3. El YAML declara la versión recién publicada
curl -sL https://github.com/Entaina/contextura/releases/latest/download/latest-mac.yml
# → version: <version>
```

Después, prueba la descarga humana:

- Abrir `https://github.com/Entaina/contextura/releases/tag/v<version>`, descargar el DMG, montar, arrastrar a Applications.
- Click-derecho → Abrir la primera vez para saltarse Gatekeeper (firma ad-hoc, no notarizada).
- Confirmar que la app arranca y muestra la versión correcta.

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

## Break-glass: release manual desde el Mac del mantenedor

`scripts/release.sh` sigue existiendo como fallback para cuando GitHub Actions esté caído o para bootstrapping. Úsalo **solo en emergencia**: no actualiza `CHANGELOG.md` y deja la automatización desincronizada, así que después tendrás que reconciliar el manifest a mano.

Prerrequisitos:

- Token de GitHub con scope `repo` guardado en Keychain:

  ```bash
  security add-generic-password \
    -a contextura \
    -s github-release-token \
    -w ghp_xxxxxxxxxxxxxxxxxxxx
  ```

- `assets/icon.icns` presente (`./scripts/build-icon.sh` si no lo está).
- `npm install` ejecutado.
- Árbol de git limpio.

Invocación:

```bash
./scripts/release.sh patch      # 0.1.1 → 0.1.2
./scripts/release.sh minor      # 0.1.1 → 0.2.0
./scripts/release.sh major      # 0.1.1 → 1.0.0
./scripts/release.sh --no-bump  # usa la versión actual de package.json
```

El script bumpea versión, tagea como `v<version>`, corre `npm run dist -- --publish always` contra el token del Keychain y hace push del commit + tag. Tarda ~3–4 minutos. Después tendrás que editar `CHANGELOG.md` y `.release-please-manifest.json` en otro commit para que el siguiente PR de release-please no se confunda con el estado.
