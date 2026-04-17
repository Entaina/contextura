# Changelog

All notable changes to Contextura are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases are managed automatically by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/) in the git history.

## [0.7.0](https://github.com/Entaina/contextura/compare/v0.6.0...v0.7.0) (2026-04-17)


### Features

* **chat:** add conversation session management with history and new session ([bf1fb59](https://github.com/Entaina/contextura/commit/bf1fb59853cc3271386bac9ee98aa537823ed6a5))
* **chat:** add integrated chat panel powered by Claude CLI ([968a21a](https://github.com/Entaina/contextura/commit/968a21aebecb7a59bcd942bf5767a33adec78e38))
* **chat:** add options bar and slash commands to chat panel ([951f210](https://github.com/Entaina/contextura/commit/951f2108470aabcdc557a39e2c7e4f45ce9646b2))
* **chat:** scan slash commands from all Claude Code sources ([1997cb9](https://github.com/Entaina/contextura/commit/1997cb9b07a90fe26173d35baa9a6bcf39e48590))
* **context-pane:** render per-file history timeline in right pane ([1cad038](https://github.com/Entaina/contextura/commit/1cad0380e28b60a20b89abdb440cfcee0123d9b9))
* **context-pane:** scaffold right-side contextual pane ([b7a43d1](https://github.com/Entaina/contextura/commit/b7a43d1c559d4c4a74493a2ffa67cd0a01f351a6))
* **frontend:** add ⌘W close-tab shortcut with unsaved confirm ([f6cc580](https://github.com/Entaina/contextura/commit/f6cc580657ba13e3d8224070333e77bde243435d))
* import Contextura source from PARA monorepo ([450dce5](https://github.com/Entaina/contextura/commit/450dce54c08a85455375bbeefca0f518b14cfa61))
* **prefs:** add preferences window with Claude CLI binary path config ([596d767](https://github.com/Entaina/contextura/commit/596d767dbb43425a0184a7e3042bdc943d819692))
* **theme:** rebuild UI on own light theme from DS palette ([9dac3a4](https://github.com/Entaina/contextura/commit/9dac3a4328fa3b1236b9bb9afa4d0752f41295ac))


### Bug Fixes

* **chat:** cancel streaming via AbortController instead of server-side cancel ([9a76525](https://github.com/Entaina/contextura/commit/9a76525a19085d3c0f72fb0bdc9baa37f0d081b3))
* **chat:** remove duplicate display flex from chat-view ([7345bd7](https://github.com/Entaina/contextura/commit/7345bd7556cdd95ebb5fce1afa917af04559da7b))
* **ci:** install Playwright chromium before e2e tests ([a991e9d](https://github.com/Entaina/contextura/commit/a991e9d8217cf2dd086e89a9a90be2317a4bddb2))
* **context-pane:** remove 1px border sliver and reshape show button ([8616c9d](https://github.com/Entaina/contextura/commit/8616c9dba4050763adc461129f3d31499aa4aedd))
* **frontend:** remove unused vars flagged by lint ([e376ba6](https://github.com/Entaina/contextura/commit/e376ba666228512dca0b244517d33db683fb015c))
* **shutdown:** ensure clean quit by closing idle sockets and watcher timer ([0b5f49d](https://github.com/Entaina/contextura/commit/0b5f49d398b210d76671fc9960477df7279e55a5))


### Code Refactoring

* **chat:** move chat from dockview tab to context pane ([a3395da](https://github.com/Entaina/contextura/commit/a3395dae69a43e56c3ec426c12d6bc25c19b9985))
* **frontend:** extract api, storage, stores and leaf helpers from app.js ([99818b9](https://github.com/Entaina/contextura/commit/99818b94f75a4784a6e45c1c18fc2b162ba8de4d))
* **frontend:** extract dockview welcome, dirty-tab and layout-store ([1329a6b](https://github.com/Entaina/contextura/commit/1329a6be0b38e260e0a7ed849527f281012fc0d9))
* **frontend:** extract editor-panel and history-view modules ([b9aee9a](https://github.com/Entaina/contextura/commit/b9aee9adeb71b5dfb8848e8df023c278a94b2c94))
* **frontend:** extract sse-client and electron-bridge ([3c8f87d](https://github.com/Entaina/contextura/commit/3c8f87db593f542ad0aa370535a7e04f732d1ce2))
* **frontend:** extract tree UI, sidebar, keybindings and dockview-setup ([98d7512](https://github.com/Entaina/contextura/commit/98d7512985e8494fcefdfe58ef037d1ec1f079a2))
* **frontend:** simplify — review fixes after splitting app.js ([8aca5b4](https://github.com/Entaina/contextura/commit/8aca5b482cca926e9fe166a572e8314dc1043d53))
* **history:** split timeline + diff, deprecate inline history mode ([7cc0f75](https://github.com/Entaina/contextura/commit/7cc0f75081461f920c75c1b349a89f763f58f20a))
* **history:** unify "Versión actual" entry and diff against live editor ([ea7f44e](https://github.com/Entaina/contextura/commit/ea7f44e7a14c777dbc138f67801559eb83bcdee1))
* **layout:** titlebar-integrated toggles + tab restyle ([857deeb](https://github.com/Entaina/contextura/commit/857deeb6a2120f8ef79e40ae1bf8dc3a54bd825e))
* **layout:** VS Code-style app-bar with unified layout toggles ([f9c4d53](https://github.com/Entaina/contextura/commit/f9c4d53f9bead3a049cb0e574bbfd6ebb1f06d09))
* resolve remaining lint errors manually ([3c420c0](https://github.com/Entaina/contextura/commit/3c420c0eb49a198da884d12008b310eb67067fbc))

## [0.6.0](https://github.com/Entaina/contextura/compare/v0.5.0...v0.6.0) (2026-04-17)


### Features

* **prefs:** add preferences window with Claude CLI binary path config ([596d767](https://github.com/Entaina/contextura/commit/596d767dbb43425a0184a7e3042bdc943d819692))

## [0.5.0](https://github.com/Entaina/contextura/compare/v0.4.1...v0.5.0) (2026-04-16)


### Features

* **chat:** add conversation session management with history and new session ([bf1fb59](https://github.com/Entaina/contextura/commit/bf1fb59853cc3271386bac9ee98aa537823ed6a5))
* **chat:** add integrated chat panel powered by Claude CLI ([968a21a](https://github.com/Entaina/contextura/commit/968a21aebecb7a59bcd942bf5767a33adec78e38))
* **chat:** add options bar and slash commands to chat panel ([951f210](https://github.com/Entaina/contextura/commit/951f2108470aabcdc557a39e2c7e4f45ce9646b2))
* **chat:** scan slash commands from all Claude Code sources ([1997cb9](https://github.com/Entaina/contextura/commit/1997cb9b07a90fe26173d35baa9a6bcf39e48590))


### Bug Fixes

* **chat:** cancel streaming via AbortController instead of server-side cancel ([9a76525](https://github.com/Entaina/contextura/commit/9a76525a19085d3c0f72fb0bdc9baa37f0d081b3))
* **chat:** remove duplicate display flex from chat-view ([7345bd7](https://github.com/Entaina/contextura/commit/7345bd7556cdd95ebb5fce1afa917af04559da7b))
* **ci:** install Playwright chromium before e2e tests ([a991e9d](https://github.com/Entaina/contextura/commit/a991e9d8217cf2dd086e89a9a90be2317a4bddb2))


### Code Refactoring

* **chat:** move chat from dockview tab to context pane ([a3395da](https://github.com/Entaina/contextura/commit/a3395dae69a43e56c3ec426c12d6bc25c19b9985))

## [0.4.1](https://github.com/Entaina/contextura/compare/v0.4.0...v0.4.1) (2026-04-15)


### Bug Fixes

* **shutdown:** ensure clean quit by closing idle sockets and watcher timer ([0b5f49d](https://github.com/Entaina/contextura/commit/0b5f49d398b210d76671fc9960477df7279e55a5))

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
