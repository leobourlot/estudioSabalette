# Tareas 008 — Identidad visual del portal, el panel y el ingreso

Derivadas de `spec.md` y `plan.md` de esta carpeta. Cada tarea dura entre 20 y 30 minutos y se hace en orden. Todas son de `web/`.

Reglas para todas las tareas:
- Primero se escriben los tests, después el código.
- Una tarea está terminada solo si, además de su "Hecho cuando", la suite de la web, los tipos (`npx tsc --noEmit -p tsconfig.app.json`), `pnpm lint` y Prettier pasan sin errores. `pnpm test` completo se corre al final (T14).
- Ninguna tarea toca la API, la base, `.env` ni credenciales.
- No se agregan dependencias: `motion` ya está en `web/` (plan, "Dependencias nuevas").
- Antes de modificar un archivo existente se pide aprobación (AGENTS.md). Las tareas que lo hacen lo indican con **(modifica existente)**.
- Los tests existentes solo se ajustan en lo que cambia de presentación (spec, RF-2): ningún caso se borra.
- No se hacen commits sin pedido explícito.

## Base

- [x] **T1 — Opciones del menú** [RF-6, RF-7]
  `servicios/menu-aplicacion.ts`: `PANEL_MENU`, `PORTAL_MENU`, `SECTION_NAMES` e `isSectionActive`.
  Hecho cuando: los tests verifican el orden y los nombres de RF-6, y que `isSectionActive` marca la opción correcta en cada dirección de `RutasAplicacion`, también en los detalles, y ninguna otra.

- [x] **T2 — Estilos y animaciones compartidos** [RF-3, RF-4, RF-26, RF-27] **(modifica existente: `componentes/animaciones.ts`, `componentes/animaciones.test.tsx`, `RutasAplicacion.tsx`)**
  `componentes/estilos-aplicacion.ts`; `PAGE_ENTER`, `PAGE_SHOWN`, `pageTransition` y `staggerDelay` en `animaciones.ts`; `AparecerAlCargar`; `LazyMotion` en `RutasAplicacion.tsx`.
  Hecho cuando: los tests verifican que `pageTransition` dura 0 con la reducción de movimiento, que ninguna aparición escalonada termina después de 0,6 s, y que `AparecerAlCargar` muestra su contenido en el DOM desde el primer momento.

- [x] **T3 — Íconos del menú** [RF-5, RNF de accesibilidad]
  `componentes/IconosMenu.tsx`: un dibujo por cada `icon` de `menu-aplicacion.ts`.
  Hecho cuando: los tests verifican que hay un ícono para cada opción de los dos menús, y que todos llevan `aria-hidden` y `focusable="false"`.

## Menú lateral

- [x] **T4 — Menú lateral** [RF-5 a RF-8, RNF de accesibilidad] **(modifica existente: `componentes/DisenoSeccion.tsx`, `DisenoPanel.tsx`, `DisenoPortal.tsx`, `Disenos.test.tsx`, `RutasModelos.test.tsx`)**
  `MenuLateral` con la marca, las opciones, el usuario y "Cerrar sesión"; "Saltar al contenido"; la pantalla aparece al abrirla.
  Hecho cuando: los tests verifican el logo con `alt=""` y el nombre en dos líneas, el nombre de la sección, las opciones en orden con "Modelos de escritos", `aria-current` en la opción actual y en sus detalles, el logo que lleva al inicio de la sección, el usuario, "Cerrar sesión" con su lógica de hoy (portapapeles incluido) y "Saltar al contenido" que lleva a `#contenido`.

- [x] **T5 — Menú plegado** [RF-9, RF-10] **(modifica existente: `componentes/DisenoSeccion.tsx`)**
  La barra de arriba con "Menú", el fondo, `inert`, el cierre y el foco, y `useAnchoEscritorio`.
  Hecho cuando: los tests verifican `aria-expanded`; que al abrir el foco va a "Cerrar menú" y el contenido queda `inert`; que se cierra al elegir una opción, con "Cerrar menú", con Escape y al tocar el fondo; que con Escape y "Cerrar menú" el foco vuelve a "Menú"; que al pasar a 1024 px se cierra; y que `localStorage` y `sessionStorage` quedan vacíos.

- [x] **T6 — Contacto del portal en tarjeta** [RF-4; spec 004, RF-18, RF-19] **(modifica existente: `componentes/BloqueContactoEstudio.tsx`, `Disenos.test.tsx`)**
  Hecho cuando: los tests de `BloqueContactoEstudio` y `DisenoPortal` siguen verificando los mismos datos y el margen para el botón de WhatsApp.

## Ingreso

- [x] **T7 — Diseño de la marca e ingreso** [RF-11 a RF-13] **(modifica existente: `paginas/PaginaIngreso.tsx`, `PaginaIngreso.test.tsx`)**
  `DisenoMarca` y `ContactoIngreso`; T-1, T-2 y T-3.
  Hecho cuando: los tests verifican T-1, T-2 y T-3 contra el anexo; que no aparece "Clientes e integrantes del estudio ingresan desde acá"; el logo que lleva a `/`; el WhatsApp sin mensaje y aparte; la dirección con " · " solo cuando está informada; y que los mensajes, la validación y el destino de hoy siguen en verde.

- [x] **T8 — Cambio de contraseña** [RF-14] **(modifica existente: `paginas/PaginaCambiarContrasena.tsx`, `PaginaCambiarContrasena.test.tsx`)**
  Hecho cuando: los tests verifican la marca con el logo, sin T-1, sin contacto y sin menú, y los casos de hoy siguen en verde.

## Portal

- [x] **T9 — Tarjetas de causas** [RF-15, RF-16, RF-26] **(modifica existente: `componentes/ListaCausasPortal.tsx`, `paginas/PortalInicio.tsx`, `componentes/Paginacion.tsx`, `PortalInicio.test.tsx`)**
  Hecho cuando: los tests verifican cada causa en su tarjeta con la carátula, el estado, "Expte." con el número o "Sin asignar", el recuadro "Último movimiento" solo con fecha, y "Ver detalle de …" que lleva al detalle; los títulos de los grupos; y que los casos de grupos, orden y páginas de hoy siguen en verde.

- [x] **T10 — Línea de tiempo y detalle de la causa** [RF-17 a RF-20] **(modifica existente: `componentes/MovimientosPortal.tsx`, `TarjetaMovimientoPortal.tsx`, `DatosCausaPortal.tsx`, `PartesPortal.tsx`, `paginas/PortalCausaDetalle.tsx`, `PortalMovimientoDetalle.tsx`, `MiCuenta.tsx` y sus tests)**
  `LineaDeTiempo`; el detalle en tres tarjetas; la pantalla del movimiento en una tarjeta.
  Hecho cuando: los tests verifican un elemento por movimiento en el orden recibido, con fecha, tipo y leyendas, el punto hueco del anulado y sin línea en el último; las tres tarjetas del detalle; y que "Ver más", "Ver menos", "Abrir", los mensajes y las páginas de hoy siguen en verde.

## Panel

- [x] **T11 — Inicio y listado de causas** [RF-21, RF-25] **(modifica existente: `paginas/PanelInicio.tsx`, `PanelCausas.tsx`, `PanelCausas.test.tsx`)**
  Hecho cuando: los tests verifican el saludo y un acceso por opción del menú en el inicio; en el listado, el enlace "Nueva causa" (con el "+" sin anunciar), los filtros, la etiqueta de estado y la de desactivada; y que los casos de búsqueda, filtros y páginas de hoy siguen en verde.

- [x] **T12 — Demás listados y movimientos del panel** [RF-22, RF-23] **(modifica existente: `paginas/PanelJurisprudencia.tsx`, `FilaFallo.tsx`, `PanelModelos.tsx`, `ListaModelos.tsx`, `FilaModelo.tsx`, `PanelUsuarios.tsx`, `HistorialMovimientos.tsx`, `FilaMovimiento.tsx`, `FiltrosMovimientos.tsx`, `FiltrosJurisprudencia.tsx`, `FiltrosModelos.tsx` y sus tests)**
  Hecho cuando: los tests verifican la barra de visible u oculto de cada movimiento junto a su etiqueta, y los casos de hoy de los listados y del historial siguen en verde.

- [x] **T13 — Formularios, detalles y confirmaciones** [RF-24] **(modifica existente: los archivos de "Panel, formularios, detalles y confirmaciones" del plan)**
  Solo clases: tarjetas, botones y campos de `estilos-aplicacion.ts`.
  Hecho cuando: los tests de esos componentes y páginas siguen en verde sin cambiar sus casos.

- [x] **T15 — Saludo en los inicios y fondos más marcados** [RF-4, RF-25, RF-28] **(modifica existente: `servicios/textos-aplicacion.ts`, `paginas/PanelInicio.tsx`, `paginas/PortalInicio.tsx`, `componentes/DisenoSeccion.tsx`, `componentes/DisenoMarca.tsx`, `pruebas/aplicacion-de-prueba.tsx` y los tests que esperaban el título "Panel" o "Mis causas" como `<h1>`, `spec.md`, `plan.md`, `validacion.md`)**
  Pedido por el estudio el 24/10/2026: `greeting(nombre)` ("Hola, <nombre>.") como único `<h1>` del inicio del panel y del portal, con "Mis causas" como `<h2>` en el portal; el fondo de las pantallas en `bg-estudio-azul/15` y la tarjeta del ingreso en `bg-estudio-azul/10`. Los tests reconocen el inicio del panel con `findPanelHome` (el saludo y la navegación "Panel").
  Hecho cuando: los tests verifican el saludo como único título principal en el panel, el saludo y debajo "Mis causas" en el portal, y el formato del saludo contra la spec; y los tests de ingreso, cambio de contraseña, rutas y menú siguen llegando al inicio de cada sección.

## Cierre

- [ ] **T14 — Validación** **(crea `validacion.md`)**
  `validacion.md` con cada RF y su test, `pnpm test` y `pnpm lint` completos, y la demo manual de la spec.
  Hecho cuando: cada RF tiene su test o su paso de la demo, y la suite completa está en verde.
