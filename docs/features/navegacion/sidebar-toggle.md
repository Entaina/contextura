# Ocultar y mostrar la barra lateral

## Qué hace

Permite plegar completamente la barra lateral para dedicar toda la ventana al área de edición, y volver a mostrarla cuando el usuario la necesita para navegar.

## Experiencia del usuario

El usuario puede ocultar la barra lateral desde tres sitios:

- El botón **Ocultar barra lateral** de la cabecera de la barra (ver [botones-sidebar.md](botones-sidebar.md)).
- El menú **Ver → Alternar barra lateral** del menú nativo (ver [../plataforma/menu-nativo.md](../plataforma/menu-nativo.md)).
- El atajo de teclado equivalente (ver [../plataforma/atajos.md](../plataforma/atajos.md)).

Al ocultarse, la barra lateral se desliza hacia la izquierda con una transición breve, y el área de edición se expande para ocupar el espacio que deja libre. En su lugar aparece un **botón flotante** discreto en la parte superior izquierda que permite volver a mostrarla.

Volver a mostrar la barra también usa una transición suave y le devuelve el mismo ancho que tenía antes (ver [sidebar-resize.md](sidebar-resize.md)).

El estado de visibilidad se **recuerda entre sesiones**: si el usuario cierra Contextura con la barra lateral oculta, al reabrir la aplicación sigue oculta.

## Invariantes

- Mientras la barra está oculta, **siempre** hay un botón visible y alcanzable para volver a mostrarla — el usuario nunca puede "quedarse sin navegación" sin salida.
- El ancho de la barra **no se pierde** al ocultarla.
- El estado visible/oculto **se mantiene entre sesiones**.
- Las tres maneras de ocultar (botón, menú, atajo) producen exactamente el mismo efecto.

## Implementación

Ver [../../frontend.md](../../frontend.md) para la animación y la persistencia del estado.
