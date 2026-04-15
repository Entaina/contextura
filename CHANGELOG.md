# Changelog

All notable changes to Contextura are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases are managed automatically by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/) in the git history.

## [0.4.0](https://github.com/Entaina/contextura/compare/v0.3.0...v0.4.0) (2026-04-15)


### Features

* **context-pane:** render per-file history timeline in right pane ([1cad038](https://github.com/Entaina/contextura/commit/1cad0380e28b60a20b89abdb440cfcee0123d9b9))
* **context-pane:** scaffold right-side contextual pane ([b7a43d1](https://github.com/Entaina/contextura/commit/b7a43d1c559d4c4a74493a2ffa67cd0a01f351a6))


### Bug Fixes

* **context-pane:** remove 1px border sliver and reshape show button ([8616c9d](https://github.com/Entaina/contextura/commit/8616c9dba4050763adc461129f3d31499aa4aedd))


### Code Refactoring

* **history:** split timeline + diff, deprecate inline history mode ([7cc0f75](https://github.com/Entaina/contextura/commit/7cc0f75081461f920c75c1b349a89f763f58f20a))
* **history:** unify "Versión actual" entry and diff against live editor ([ea7f44e](https://github.com/Entaina/contextura/commit/ea7f44e7a14c777dbc138f67801559eb83bcdee1))
* **layout:** titlebar-integrated toggles + tab restyle ([857deeb](https://github.com/Entaina/contextura/commit/857deeb6a2120f8ef79e40ae1bf8dc3a54bd825e))
* **layout:** VS Code-style app-bar with unified layout toggles ([f9c4d53](https://github.com/Entaina/contextura/commit/f9c4d53f9bead3a049cb0e574bbfd6ebb1f06d09))

## [0.3.0](https://github.com/Entaina/contextura/compare/v0.2.0...v0.3.0) (2026-04-14)


### Features

* **theme:** rebuild UI on own light theme from DS palette ([9dac3a4](https://github.com/Entaina/contextura/commit/9dac3a4328fa3b1236b9bb9afa4d0752f41295ac))

## [0.2.0](https://github.com/Entaina/contextura/compare/v0.1.1...v0.2.0) (2026-04-14)


### Features

* **frontend:** add ⌘W close-tab shortcut with unsaved confirm ([f6cc580](https://github.com/Entaina/contextura/commit/f6cc580657ba13e3d8224070333e77bde243435d))
* import Contextura source from PARA monorepo ([450dce5](https://github.com/Entaina/contextura/commit/450dce54c08a85455375bbeefca0f518b14cfa61))


### Bug Fixes

* **frontend:** remove unused vars flagged by lint ([e376ba6](https://github.com/Entaina/contextura/commit/e376ba666228512dca0b244517d33db683fb015c))


### Code Refactoring

* **frontend:** extract api, storage, stores and leaf helpers from app.js ([99818b9](https://github.com/Entaina/contextura/commit/99818b94f75a4784a6e45c1c18fc2b162ba8de4d))
* **frontend:** extract dockview welcome, dirty-tab and layout-store ([1329a6b](https://github.com/Entaina/contextura/commit/1329a6be0b38e260e0a7ed849527f281012fc0d9))
* **frontend:** extract editor-panel and history-view modules ([b9aee9a](https://github.com/Entaina/contextura/commit/b9aee9adeb71b5dfb8848e8df023c278a94b2c94))
* **frontend:** extract sse-client and electron-bridge ([3c8f87d](https://github.com/Entaina/contextura/commit/3c8f87db593f542ad0aa370535a7e04f732d1ce2))
* **frontend:** extract tree UI, sidebar, keybindings and dockview-setup ([98d7512](https://github.com/Entaina/contextura/commit/98d7512985e8494fcefdfe58ef037d1ec1f079a2))
* **frontend:** simplify — review fixes after splitting app.js ([8aca5b4](https://github.com/Entaina/contextura/commit/8aca5b482cca926e9fe166a572e8314dc1043d53))
* resolve remaining lint errors manually ([3c420c0](https://github.com/Entaina/contextura/commit/3c420c0eb49a198da884d12008b310eb67067fbc))

## [Unreleased]
