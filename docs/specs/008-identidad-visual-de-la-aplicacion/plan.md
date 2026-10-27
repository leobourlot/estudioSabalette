# Plan 008 — Identidad visual del portal, el panel y el ingreso

Plan técnico de la spec 008. Solo cambia `web/`: la API, la base, las sesiones y las cabeceras quedan como están [RF-2, RNF de seguridad].

## Arquitectura

### Principio 3
Los componentes solo muestran datos. Lo que decide algo sin React va en `src/servicios/` o en archivos `.ts` de `componentes/` que no importan React, como ya hace `animaciones.ts`:
- `servicios/menu-aplicacion.ts` (nuevo): las opciones del menú de cada sección, en orden, y `isSectionActive(opcion, pathname)`, que decide qué opción se marca [RF-6, RF-7].
- `componentes/animaciones.ts` (existente): suma las transiciones de las pantallas de la aplicación [RF-26, RF-27].
- `componentes/estilos-aplicacion.ts` (nuevo): las clases de Tailwind que comparten las pantallas: tarjeta, botones, campos, tabla, etiqueta de estado y foco [RF-3, RF-4, RF-21, RF-22, RF-24].

### Archivos nuevos de `web/src/`
- `servicios/menu-aplicacion.ts` y su test.
- `componentes/estilos-aplicacion.ts`.
- `componentes/MenuLateral.tsx`: el menú de RF-5 a RF-9, con la marca, las opciones, el usuario y "Cerrar sesión".
- `componentes/IconosMenu.tsx`: los íconos de las opciones, dibujados en SVG dentro del proyecto, con `aria-hidden` [RNF de stack y de accesibilidad].
- `componentes/AparecerAlCargar.tsx`: aparición al abrir una pantalla y escalonado de listas y de filas de tablas [RF-26].
- `servicios/textos-aplicacion.ts`: los textos T-1 a T-3 del ingreso, comparados con el anexo de la spec por su test.
- `paginas/PanelInicio.test.tsx`.
- `componentes/DisenoMarca.tsx`: el diseño de dos mitades del ingreso y del cambio de contraseña [RF-11, RF-12, RF-14].
- `componentes/LineaDeTiempo.tsx`: la línea de tiempo del portal [RF-18, RF-19].
- `componentes/MenuLateral.test.tsx`, `componentes/LineaDeTiempo.test.tsx`, `componentes/DisenoMarca.test.tsx`.

### Archivos existentes que se modifican
- Diseño y menú: `DisenoSeccion.tsx`, `DisenoPanel.tsx`, `DisenoPortal.tsx`, `BloqueContactoEstudio.tsx`.
- Arranque: `RutasAplicacion.tsx` (suma `LazyMotion`). Va en las rutas y no en `App.tsx` porque los tests montan `RutasAplicacion` sin `App`: así la aplicación y los tests usan el mismo árbol.
- Ingreso: `PaginaIngreso.tsx`, `PaginaCambiarContrasena.tsx`.
- Portal: `PortalInicio.tsx`, `ListaCausasPortal.tsx`, `PortalCausaDetalle.tsx`, `DatosCausaPortal.tsx`, `PartesPortal.tsx`, `MovimientosPortal.tsx`, `TarjetaMovimientoPortal.tsx`, `PortalMovimientoDetalle.tsx`, `Paginacion.tsx`, `MiCuenta.tsx`.
- Panel, listados: `PanelInicio.tsx`, `PanelCausas.tsx`, `PanelJurisprudencia.tsx`, `FilaFallo.tsx`, `PanelModelos.tsx`, `ListaModelos.tsx`, `FilaModelo.tsx`, `PanelUsuarios.tsx`.
- Panel, movimientos: `HistorialMovimientos.tsx`, `FilaMovimiento.tsx`, `FiltrosMovimientos.tsx`.
- Panel, formularios, detalles y confirmaciones (solo clases): `PanelCausaDetalle.tsx`, `PanelCausaNueva.tsx`, `PanelMovimientoDetalle.tsx`, `PanelFalloDetalle.tsx`, `PanelFalloNuevo.tsx`, `PanelModeloDetalle.tsx`, `PanelModeloNuevo.tsx`, `PanelCausaModelos.tsx`, `PanelEscrito.tsx`, `PanelUsuarioDetalle.tsx`, `PanelUsuarioNuevo.tsx`, `FormularioCausa.tsx`, `FormularioParte.tsx`, `FormularioMovimiento.tsx`, `FormularioFallo.tsx`, `FormularioModelo.tsx`, `EditorAbogados.tsx`, `AccionesCuenta.tsx`, `AccionesCausa.tsx`, `PreguntaConfirmacion.tsx`, `TablaPartes.tsx`, `FiltrosJurisprudencia.tsx`, `FiltrosModelos.tsx`, `CampoTexto.tsx`.
- Tests: los de esos componentes y páginas que buscan textos o estructuras que cambian (ver "Estrategia de tests").

No se modifica nada de `servicios/` salvo lo nuevo, ni el sitio público, ni `tailwind.config.js`: los colores del estudio ya están (`estudio.oscuro`, `estudio.azul`, `estudio.blanco`), y los tonos tenues salen de ellos con opacidad (`bg-estudio-azul/10`) y de los grises de Tailwind.

## Identidad visual [RF-3, RF-4]
- Fondo de las pantallas del portal y del panel: `bg-estudio-azul/15` (el azul del logo al 15 %), cambiado por el estudio el 24/10/2026 para que las tarjetas blancas se distingan mejor; antes era `bg-slate-100`.
- Tarjeta (`CARD`): `rounded-xl border border-slate-300 bg-white shadow-sm`. El borde `slate-300` y el blanco de la tarjeta sobre el fondo azul dan el corte entre tarjetas que pide RF-4; el contraste de 3 a 1 lo piden los bordes de controles, no los de las tarjetas, que se separan además por el espacio.
- Título principal de cada pantalla (`PAGE_TITLE`): `font-titulos text-3xl font-semibold text-estudio-oscuro`.
- Botón principal (`PRIMARY_BUTTON`): el de `estilos-sitio.ts`, `bg-estudio-oscuro` con texto blanco y `hover:bg-estudio-azul`. Botón secundario (`SECONDARY_BUTTON`): `border border-slate-500 bg-white text-estudio-oscuro hover:bg-slate-50`. Los dos con `min-h-11` en el portal y `min-h-9` en el panel, que se usa con el mouse.
- Campo (`INPUT`): `rounded-md border border-slate-500 bg-white` con foco `focus-visible:outline-estudio-azul`. El borde `slate-500` sobre blanco da 4,8 a 1; `slate-400` no alcanza (2,6 a 1).
- Etiqueta de estado (`STATUS_BADGE`): `rounded-full bg-estudio-azul/10 px-2.5 py-0.5 text-xs font-medium text-estudio-oscuro`; 10,7 a 1.
- Foco: `FOCUS_RING` del sitio, en `estudio-azul`. Sobre el menú (`FOCUS_RING_ON_DARK`), `outline-estudio-blanco`.
- Contraste medido con la fórmula de WCAG: blanco sobre `#2C3256`, 12,3 a 1; sobre `#415789`, 7,1 a 1; `slate-300` (`#CBD5E1`, texto de las opciones no marcadas) sobre `#2C3256`, 8,3 a 1, y sobre `#415789`, al final del degradado, 4,8 a 1; `estudio-oscuro` sobre `slate-100`, 11,3 a 1.

## Menú lateral [RF-5 a RF-10]

### `servicios/menu-aplicacion.ts`
- `PANEL_MENU` y `PORTAL_MENU`: `{ to, label, icon, end? }[]` en el orden de RF-6. `icon` es un nombre (`'carpeta'`, `'balanza'`, …) que `IconosMenu` traduce a un dibujo, así el servicio no importa React.
- `isSectionActive(opcion, pathname)`: con `end`, solo la dirección exacta ("Inicio", "Mis causas"); sin `end`, la dirección o cualquiera que empiece con ella seguida de `/` ("Causas" en `/panel/causas/7/movimientos/3`). Además, cada opción puede llevar `details`, otras direcciones cuyos detalles son suyos: "Mis causas" se marca en `/portal/causas/…`, que no está debajo de `/portal` sin marcar también "Mi cuenta". Por eso el menú no usa la regla de `NavLink`: usa `Link` con `aria-current="page"` según esta función.
- `SECTION_NAMES`: "Panel del estudio" y "Portal de clientes".

### `MenuLateral`
- Un único `<aside>` con, de arriba abajo:
  - La marca (solo desde `lg`): `Link` al inicio de la sección con el logo (`LOGO_PATH`, `alt=""`, 48 × 48) y `NombreEstudio`, y debajo el nombre de la sección en `text-xs uppercase tracking-wider`. [RF-5, RF-8]
  - En el celular, arriba a la derecha, el botón "Cerrar menú" (`lg:hidden`).
  - `<nav aria-label="Panel">` o `"Portal"`, con un `NavLink` por opción: ícono y nombre, `min-h-11`, `rounded-lg`. Marcada: `bg-estudio-azul font-semibold text-estudio-blanco` y una barra de 4 px a la izquierda (`before:`); `NavLink` pone `aria-current="page"`. [RF-7]
  - Al final (`mt-auto`), el nombre del usuario, con `break-words`, y "Cerrar sesión", que conserva la lógica actual de `DisenoSeccion` (portapapeles y `logout`).
- Fondo: `bg-gradient-to-b from-estudio-oscuro to-estudio-azul`, texto `slate-300` y blanco.
- Desde `lg` (1024 px): `sticky top-0 h-screen w-64 shrink-0`, con `overflow-y-auto` para el texto agrandado [casos límite].

### Plegado en el celular [RF-9]
- `DisenoSeccion` guarda `abierto` en un `useState` (nunca en el navegador) [RF-10].
- Barra de arriba (`<header>`, `lg:hidden`): el logo de 40 × 40, `NombreEstudio` en `text-sm` y el botón "Menú" con `aria-expanded` y `aria-controls`. Alto de unos 64 px, para no ocupar la pantalla en horizontal.
- El `<aside>` es el mismo elemento en los dos anchos: en el celular, `fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw]`, con `-translate-x-full invisible` cerrado y `translate-x-0 visible` abierto, y `transition-[transform,visibility] duration-300 motion-reduce:transition-none`; desde `lg`, `lg:visible lg:translate-x-0 lg:static`. Se usa CSS y no Motion porque el mismo elemento es fijo desde 1024 px: un `transform` en línea de Motion pisaría `lg:translate-x-0` [RF-26]. `invisible` lo saca del recorrido con Tab y del lector de pantalla mientras está cerrado.
- El fondo oscuro (`fixed inset-0 z-30 bg-estudio-oscuro/60`, `lg:hidden`) es un `m.div` con `AnimatePresence` y opacidad; al tocarlo se cierra el menú.
- Mientras está abierto: el contenido y la barra llevan `inert`, así el Tab queda dentro del menú y no se puede usar lo de atrás; `document.body` lleva `overflow-hidden` para que no se desplace. Al abrir, el foco va a "Cerrar menú".
- Se cierra al elegir una opción (`onClick` de cada `NavLink`), al tocar el fondo, con "Cerrar menú" y con Escape (escucha de `keydown` en `document` mientras está abierto). Con Escape o "Cerrar menú", el foco vuelve a "Menú".
- `useAnchoEscritorio()` en `DisenoSeccion`: con `matchMedia('(min-width: 1024px)')`, si la ventana pasa a 1024 px o más con el menú abierto, lo cierra, así no queda `inert` en el contenido [casos límite]. Sin `matchMedia` (jsdom), no hace nada.

### `DisenoSeccion`
- Estructura: `<div class="min-h-screen bg-estudio-azul/15 lg:flex">`, con el acceso "Saltar al contenido" primero (`sr-only focus:not-sr-only`, a `#contenido`), la barra, el fondo, `MenuLateral` y `<div id="contenido" tabIndex={-1} class="min-w-0 flex-1">` con el `Outlet` y el `footer`.
- El `Outlet` va dentro de `AparecerAlCargar` con `key={pathname}`: cada pantalla aparece al abrirla [RF-26].
- `DisenoPanel` y `DisenoPortal` le pasan el menú de `menu-aplicacion.ts`, el nombre de la sección y, en el portal, el `BloqueContactoEstudio` y el botón de WhatsApp como hoy.
- `BloqueContactoEstudio` pasa a ser una tarjeta al final del contenido, con el mismo `aria-label` y los mismos datos (spec 004, RF-18), y conserva el margen inferior para el botón de WhatsApp (spec 004, RF-19).

## Ingreso y cambio de contraseña [RF-11 a RF-14]
- `DisenoMarca({ marca, children })`: `lg:grid lg:grid-cols-2 min-h-screen`.
  - Izquierda: `bg-gradient-to-r from-estudio-oscuro to-estudio-azul text-estudio-blanco`, con el `<a href="/">` del logo y el nombre (como hoy: enlace común al sitio público, spec 007, RF-33) y lo que pase cada pantalla en `marca`. No usa animaciones: se ve desde el primer momento [RF-26].
  - Derecha: `bg-slate-100`, centra la tarjeta (`max-w-sm`, con el borde y la sombra de `CARD` pero sobre `bg-estudio-azul/10`), que aparece con `AparecerAlCargar`.
- `PaginaIngreso`: la marca lleva T-1 en un `<p>` con `font-titulos text-4xl` (el único `<h1>` sigue siendo "Ingresar"), y abajo `ContactoIngreso`: `[direccion, ' · ', WhatsApp]`, con la dirección solo si `STUDIO_CONTACT.direccion` no es `null` y el enlace `whatsappUrl()` sin mensaje, con `target="_blank"` y `rel="noopener noreferrer"`. Antes del número, dentro del enlace, `IconoRedColor red="WhatsApp"`: el mismo ícono verde con contorno blanco del bloque de contacto del sitio. La tarjeta suma T-2 debajo del título y T-3 debajo del botón. Los mensajes, la validación y el destino no cambian [RF-13].
- En el celular, la marca es una franja con el logo de 40 px, el nombre y T-1 en `text-2xl`; `ContactoIngreso` se renderiza dos veces, con `hidden lg:block` y con `lg:hidden`, para ir abajo de la marca o abajo de la tarjeta [RF-12]. La copia que el ancho oculta queda con `display: none`, que ya la saca del lector de pantalla y del recorrido con Tab.
- La tarjeta deja `pb-24` debajo en el celular, como hoy, para el botón de WhatsApp [RF-12; spec 007, RF-28].
- `PaginaCambiarContrasena`: usa `DisenoMarca` sin `marca` extra [RF-14]; el formulario, los mensajes y el botón de WhatsApp para clientes no cambian.

## Portal [RF-15 a RF-20, RF-28]
- `PortalInicio`: `<h1>` con `greeting(nombre)` y debajo `<h2>` "Mis causas", los dos con `PAGE_TITLE`, y la lista. El usuario siempre está: la pantalla va dentro de `RutaProtegida` [RF-28].
- `ListaCausasPortal`:
  - Título de grupo: `<h2>` con `border-b border-slate-300 pb-2 font-titulos text-xl` [RF-16].
  - Cada causa, un `<li>` con `CARD p-5`, separadas por `space-y-4`. Arriba, `flex justify-between gap-3`: `<h3>` con la carátula (`font-titulos text-xl line-clamp-2 break-words`) y la etiqueta de estado (`STATUS_BADGE`, `shrink-0`). Debajo, "Expte. " y `orNotAssigned(numeroExpediente)`. Si hay fecha, un recuadro `rounded-lg bg-slate-100 px-4 py-3` con "Último movimiento" en `text-xs font-semibold` y la fecha. Al final, `Link` "Ver detalle" con `SECONDARY_BUTTON` y `<span class="sr-only"> de {caratula}</span>` [RF-15].
  - Toda la tarjeta deja de ser un enlace: el enlace es "Ver detalle". La tarjeta responde al puntero con `motion-safe:hover:shadow-md` [RF-26].
  - La lista usa `AparecerAlCargar` en modo escalonado, con la `key` de cada causa [RF-27].
- `PortalCausaDetalle`: "Volver a mis causas" arriba; una `CARD` con el `<h1>` (`PAGE_TITLE`, `break-words`) y `DatosCausaPortal`; otra con `PartesPortal` y el responsable; otra con `MovimientosPortal`. Los textos y los mensajes no cambian [RF-17].
- `MovimientosPortal` pasa los movimientos a `LineaDeTiempo`.
- `LineaDeTiempo` (`<ol>`):
  - Cada movimiento es un `<li class="relative pl-8 pb-6">` con su contenido de `TarjetaMovimientoPortal`.
  - La línea: un `<span aria-hidden>` `absolute left-[7px] top-4 bottom-0 w-0.5 bg-slate-300`, que no lleva el último elemento (`last:` en el `<li>`, con la línea en un hijo `group-last:hidden`) [casos límite: un solo movimiento].
  - El punto: `<span aria-hidden>` `absolute left-0 top-1.5 h-4 w-4 rounded-full`, siempre lleno (`border-2 border-estudio-oscuro bg-estudio-oscuro`): el cliente nunca recibe anulados [RF-19].
  - Entre movimientos, `border-b border-slate-200` en el contenido del `<li>`, salvo el último [RF-18].
  - Escalonado con `AparecerAlCargar` [RF-26].
- `TarjetaMovimientoPortal` deja de ser una tarjeta: es el contenido del elemento, con la fecha en `font-semibold`, el tipo, las leyendas, el texto y los mismos "Ver más", "Ver menos" y "Abrir". `PortalMovimientoDetalle` muestra lo mismo dentro de una `CARD` [RF-20].
- `PartesPortal`, `DatosCausaPortal`, `Paginacion` y `MiCuenta`: solo clases.

## Panel [RF-21 a RF-25]
- `estilos-aplicacion.ts`, tabla:
  - `TABLE_CARD`: `CARD overflow-x-auto`; la tabla se desplaza dentro de su tarjeta [RNF de plataformas].
  - `TABLE`: `w-full min-w-[48rem] text-left text-sm`.
  - `TABLE_HEAD`: `bg-slate-100 text-slate-700`, celdas `px-4 py-3 font-semibold`.
  - `TABLE_ROW`: `border-t border-slate-300 transition-colors hover:bg-estudio-azul/5 motion-reduce:transition-none`. El borde `slate-300` es la línea visible de RF-21.
- `PanelCausas`: título con `PAGE_TITLE` y "+ Nueva causa" (`PRIMARY_BUTTON`). El "+" va dentro de un `<span aria-hidden>`, así el enlace se sigue llamando "Nueva causa". Los filtros en una `CARD p-5` en grilla (`sm:grid-cols-2 lg:grid-cols-4`), con el buscador y su botón en la primera fila. La tabla con las clases de arriba, la carátula en `font-semibold text-estudio-oscuro` y el estado con `STATUS_BADGE`. La causa desactivada conserva `bg-slate-50` y su etiqueta [RF-21].
- `PanelUsuarios`: las mismas clases de tabla [RF-22].
- `PanelJurisprudencia` (`FilaFallo`) y `PanelModelos` (`ListaModelos`, `FilaModelo`) no son tablas: cada fallo y cada modelo es una `CARD p-5` que responde al puntero, separadas por `space-y-4` [RF-22].
- Los filtros del panel usan `FIELD_SMALL`: el mismo campo que `INPUT`, más bajo y sin ancho completo.
- `FilaMovimiento`: `CARD` con `border-l-4`, `border-l-estudio-azul` si es visible y `border-l-slate-400` si no; conserva las etiquetas. `HistorialMovimientos` pasa de `divide-y` a `space-y-4` [RF-23].
- Formularios, detalles y confirmaciones: el contenido en `CARD p-6`, botones con `PRIMARY_BUTTON` y `SECONDARY_BUTTON` y campos con `INPUT`. No cambian textos, orden ni comportamiento [RF-24].
- `PanelInicio`: el saludo `greeting(nombre)` de `servicios/textos-aplicacion.ts` ("Hola, <nombre>.") como único `<h1>`, y una grilla (`sm:grid-cols-2 lg:grid-cols-3`) con un `Link` por opción de `PANEL_MENU` salvo "Inicio", cada uno una `CARD` con su ícono y su nombre, con `motion-safe:hover:-translate-y-0.5 hover:shadow-md`. Hoy la pantalla tiene el enlace "Gestionar cuentas": pasa a ser la tarjeta "Cuentas" [RF-25].

## Animaciones [RF-26, RF-27]
- `RutasAplicacion.tsx` envuelve las rutas con `<LazyMotion features={domAnimation} strict>`, como `SitioPublico.tsx`. `main.tsx` ya separa el sitio público de la aplicación: cada uno carga Motion en su parte del código, y la del portal y el panel se carga una sola vez [RNF de rendimiento].
- `animaciones.ts` suma:
  - `PAGE_ENTER = { opacity: 0, y: 8 }` y `PAGE_SHOWN = { opacity: 1, y: 0 }`.
  - `pageTransition(reduceMotion)`: 0,3 s, o 0 con la reducción.
  - `staggerDelay(index)`: `Math.min(index * STAGGER_S, MAX_DURATION_S - 0.3)`, así ninguna aparición termina después de los 0,6 s.
- `AparecerAlCargar({ children, indice?, as? })`: `m.div` (o `m.li`) con `initial={PAGE_ENTER}` y `animate={PAGE_SHOWN}`. Se anima al montarse: como cada elemento de una lista lleva la `key` de su dato, al pasar de página o filtrar solo aparecen con movimiento los elementos nuevos, y lo que no cambia (filtros, títulos) no se vuelve a montar [RF-27]. No usa `whileInView`: la aplicación no se prerenderiza, así que no hace falta la marca `data-aparecer` del sitio.
- Los avisos (`role="alert"`) y "Cargando…" (`role="status"`) quedan fuera de `AparecerAlCargar`, salvo el que ya está dentro de la pantalla que aparece: la aparición de la pantalla dura 0,3 s, no demora el anuncio (el elemento está en el DOM desde el primer momento) [RF-27].
- Hover y foco: clases de Tailwind con `motion-safe:` y `motion-reduce:transition-none`, como en el sitio [RF-26, RF-27].

## Dependencias nuevas
Ninguna. `motion` ya está en `web/` (plan 007, "Dependencia nueva").

| Uso nuevo | Para qué | Alternativa descartada | Motivo |
|---|---|---|---|
| `motion` (`motion/react`) en el portal y el panel | Aparición de pantallas y escalonado de listas, fondo del menú plegado [RF-26] | Animaciones solo con CSS | El estudio pidió Motion, como en el sitio. Ya está instalado y probado (reducción de movimiento, `AnimatePresence`), y con `LazyMotion` suma unos 30 KB comprimidos a la parte de la aplicación (plan 007, T39), sin tocar el sitio público. |

## Estrategia de tests (Vitest + Testing Library)
- Nuevos:
  - `menu-aplicacion.test.ts`: el orden y los nombres de RF-6, y `isSectionActive` con cada dirección de `RutasAplicacion` [RF-6, RF-7].
  - `MenuLateral.test.tsx`: marca con el logo (`alt=""`) y el nombre en dos líneas, nombre de la sección, opciones con su ícono `aria-hidden`, `aria-current` en la actual y en sus detalles, usuario, "Cerrar sesión", logo al inicio de la sección [RF-5 a RF-8]. Plegado: "Menú" con `aria-expanded`, al abrir el foco en "Cerrar menú" y el contenido con `inert`; se cierra al elegir una opción, con "Cerrar menú", con Escape y al tocar el fondo, y el foco vuelve a "Menú" [RF-9]. `localStorage` y `sessionStorage` vacíos después de abrir y cerrar [RF-10].
  - `DisenoMarca.test.tsx` y `PaginaIngreso.test.tsx`: T-1, T-2 y T-3 contra el anexo, el WhatsApp sin mensaje y aparte, la dirección con " · " solo cuando está informada, sin la frase que el estudio pidió quitar [RF-11]. `PaginaCambiarContrasena.test.tsx`: la marca sin T-1 ni contacto y sin menú [RF-14].
  - `LineaDeTiempo.test.tsx`: un `<li>` por movimiento en el orden recibido, fecha, tipo y leyenda, punto lleno, sin línea en el último [RF-18, RF-19].
  - `PanelInicio`: el saludo como título principal y un acceso por opción [RF-25]. `PortalInicio`: el saludo como título principal y "Mis causas" como `<h2>` [RF-28]. Los tests que esperan llegar al inicio del panel lo reconocen por el saludo y la navegación "Panel" (`findPanelHome`), porque el portal saluda igual.
  - `animaciones.test.tsx`: `pageTransition` dura 0 con la reducción, y `staggerDelay` nunca supera el límite [RF-27].
- Ajustes de tests existentes, solo en lo que cambia de presentación [RF-2]:
  - `Disenos.test.tsx`: "Modelos de escritos"; la marca, que ya no está en el `banner` desde `lg`; la navegación con nombre.
  - `RutasModelos.test.tsx`: el enlace del menú se llama "Modelos de escritos"; el título de la pantalla sigue siendo "Modelos".
  - `PortalInicio.test.tsx`: "Expte. 1234/2024" y "Expte. Sin asignar"; el enlace es "Ver detalle de …".
  - `PortalCausaDetalle.test.tsx`, `PortalMovimientoDetalle.test.tsx`, `FilaMovimiento.test.tsx`, `HistorialMovimientos.test.tsx`: estructura de la lista.
  - `PanelCausas.test.tsx`: "Nueva causa" sigue siendo el nombre del enlace (el "+" no se anuncia).
- `RF-12`, los colores, los contrastes y las animaciones a la vista: demo manual (spec, criterios de finalización).

## Orden de trabajo
Ver `tasks.md`. Cada tarea deja la suite de la web, los tipos, el lint y Prettier en verde. Como esta spec solo toca `web/`, alcanza con la suite de la web por tarea y `pnpm test` completo al final (memoria del proyecto: la suite completa tarda unos 25 minutos).
