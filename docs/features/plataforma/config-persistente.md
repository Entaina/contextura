# Configuración persistente

## Qué hace

Guarda la configuración del usuario (la última carpeta raíz y las dimensiones de la ventana) en el sitio estándar de macOS para datos de aplicación, de modo que sobrevive entre sesiones y entre actualizaciones de Contextura.

## Experiencia del usuario

El usuario no interactúa directamente con la configuración persistente: simplemente observa que Contextura recuerda lo que debería recordar. Específicamente, la aplicación guarda:

- La **última carpeta raíz** elegida. Ver [../carpeta-raiz/persistencia-raiz.md](../carpeta-raiz/persistencia-raiz.md).
- Las **dimensiones y posición** de la ventana. Ver [window-bounds.md](window-bounds.md).

El fichero vive en la ubicación canónica de macOS para "Application Support". Un usuario avanzado que quiera **resetear Contextura** a su estado de primer arranque puede borrar ese fichero manualmente: al siguiente arranque la aplicación le volverá a pedir una carpeta y arrancará con un tamaño de ventana por defecto.

Otras persistencias (como el layout de pestañas, el ancho de la barra lateral o el modo del editor por fichero) **no** viven aquí: son persistencias independientes del navegador interno y se gestionan desde el código de la interfaz, no desde la configuración del sistema. Esto significa que borrar el fichero de configuración del sistema no las afecta.

### Directorio obsoleto

Versiones antiguas de Contextura (antes del rename) podían haber creado un directorio con otro nombre en la misma carpeta de Application Support. Ese directorio antiguo es residual y se puede borrar sin riesgo; Contextura actual solo usa su propia ubicación.

## Invariantes

- La configuración vive en la **ubicación canónica de macOS** para datos de aplicación, no en el escritorio ni en la carpeta del usuario.
- El contenido del fichero es **mínimo**: solo carpeta raíz y geometría de ventana, ninguna otra preferencia.
- Borrar el fichero **nunca** corrompe Contextura: la aplicación cae elegantemente al flujo de primer arranque.

## Implementación

Ver [../../electron.md](../../electron.md) para la ruta concreta del fichero y el esquema de los datos que guarda.
