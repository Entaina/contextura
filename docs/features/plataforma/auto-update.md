# Actualización automática

## Qué hace

Contextura comprueba en segundo plano si hay una versión nueva disponible y, cuando existe, se la descarga y la instala en silencio. La próxima vez que el usuario cierre y vuelva a abrir la aplicación, se encuentra con la nueva versión sin haber tenido que hacer nada.

## Experiencia del usuario

Al arrancar, Contextura pregunta discretamente si hay una versión más reciente. Si la hay:

1. La descarga ocurre **en segundo plano**, sin interrumpir el trabajo del usuario ni mostrar barras de progreso molestas.
2. Cuando la descarga termina, la nueva versión queda **preparada para instalarse al cerrar**.
3. La próxima vez que el usuario cierre Contextura, la actualización se aplica automáticamente.
4. Al reabrir, el usuario está en la versión nueva.

El usuario nunca ve diálogos del tipo "hay una actualización, ¿quieres instalarla ahora?". El flujo es **silencioso por diseño**: el producto asume que el usuario quiere la última versión sin ser interrumpido.

### Caveat del primer arranque

La primera vez que el usuario abre Contextura tras una actualización, macOS puede mostrar su propio diálogo de confirmación de aplicación no identificada, porque la versión nueva es un binario distinto que el sistema aún no ha visto. Este caveat está documentado en la guía de instalación para usuarios (ver el README del repositorio) y es externo a Contextura: no hay forma de evitarlo sin firmar la aplicación.

### Cuándo no ocurre

La actualización automática solo se activa en la aplicación instalada para usuarios finales. Cuando Contextura se ejecuta en un entorno de desarrollo local, no hay comprobación ni descarga: el flujo está deshabilitado para que el desarrollador controle manualmente su versión.

## Invariantes

- La actualización **nunca** interrumpe el trabajo del usuario con diálogos emergentes.
- La instalación **siempre** ocurre al cerrar la aplicación, no en medio de una sesión.
- El usuario **no necesita** hacer clic en nada para recibir la actualización.
- El flujo está **desactivado en desarrollo**: el desarrollador nunca recibe actualizaciones automáticas de su build local.

## Implementación

Ver [../../electron.md](../../electron.md) para el wrapper de actualización y [../../release.md](../../release.md) para cómo se publica una versión nueva.
