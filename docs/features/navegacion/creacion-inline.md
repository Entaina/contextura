# Creación inline de ficheros y carpetas

## Qué hace

Permite crear un fichero o una carpeta nueva directamente en el árbol, con un campo de texto que aparece en el sitio del nuevo elemento, sin abrir ningún diálogo modal.

## Experiencia del usuario

Al pulsar el botón **Nuevo fichero** o **Nueva carpeta** (ver [botones-sidebar.md](botones-sidebar.md)), aparece un campo de texto embebido en el árbol, en la posición donde quedará el nuevo elemento. El usuario escribe el nombre directamente ahí:

- **Intro** → confirma y crea el elemento.
- **Escape** → cancela la creación sin dejar rastro.
- **Clic fuera** → equivale a confirmar si hay un nombre válido, o cancelar si está vacío.

El elemento se crea dentro de la carpeta que el usuario tenía seleccionada (o en la raíz si no había selección).

### Detalles de creación

- **Ficheros** — si el usuario no añade la extensión `.md`, Contextura la añade automáticamente. Crear ficheros con otra extensión no es posible desde esta entrada.
- **Carpetas** — al crear una carpeta nueva, Contextura pone dentro un fichero `index.md` vacío, de modo que la carpeta aparezca inmediatamente en el árbol (que solo muestra carpetas con contenido `.md` — ver [arbol-ficheros.md](arbol-ficheros.md)) y el usuario tenga un sitio donde empezar a escribir.

Tras crear el fichero o el `index.md`, Contextura lo abre automáticamente en una pestaña nueva para que el usuario pueda empezar a editarlo sin un paso extra.

## Invariantes

- Escape **siempre** cancela sin crear nada.
- Los ficheros creados **siempre** tienen extensión `.md`, aunque el usuario no la escriba.
- Las carpetas nuevas **siempre** contienen un `index.md` inicial para ser visibles en el árbol desde el primer momento.
- No hay diálogos modales ni ventanas emergentes: el campo aparece **en su sitio final** dentro del árbol.

## Implementación

Ver [../../frontend.md](../../frontend.md) para el input embebido en el árbol y [../../backend.md](../../backend.md) para la creación del fichero en disco.
