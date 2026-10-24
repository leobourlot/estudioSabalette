# Validación 008 — Identidad visual del portal, el panel y el ingreso

Recorrido de `spec.md` requisito por requisito (tarea T14). Corrida de la web del 2026-10-17, después de T13: 117 archivos y 1750 tests de Vitest, con 1746 en verde; `pnpm lint` sin errores y Prettier sin diferencias. Los 4 que fallan son del sitio público y no de esta spec (ver "Observaciones"). Esta spec no cambia la API. En `pnpm test` completo, los 50 archivos y 1263 tests unitarios de la API pasan; los e2e de la API no llegaron a terminar, porque pnpm corta la corrida cuando falla la web.

Rutas abreviadas:
- **W**: tests de `web/src/...`.

## Requisitos funcionales

| RF | Qué se verifica | Tests | Resultado |
|---|---|---|---|
| RF-1, RF-2 | Mismos datos, textos y reglas de las specs 001 a 006: sus tests siguen en verde, ajustados solo en lo que cambió de presentación ("Modelos de escritos", "Expte.", "Ver detalle de …", enlaces del menú dentro de la navegación) | W todos los tests de las specs 001 a 006 | ✅ |
| RF-3, RF-4 | Logo, colores, tipografía de los títulos y tarjetas con borde | W `MenuLateral.test.tsx`, `DisenoMarca.test.tsx`, `PortalInicio.test.tsx`, `PortalCausaDetalle.test.tsx`, `Disenos.test.tsx` | ✅ (colores y contraste: demo manual) |
| RF-5 | Menú con el logo (`alt=""`), el nombre en dos líneas, el nombre de la sección, las opciones con su ícono sin anunciar, el usuario y "Cerrar sesión" | W `MenuLateral.test.tsx`, `IconosMenu.test.tsx`, `Disenos.test.tsx` | ✅ |
| RF-6 | Las opciones de cada sección, en orden | W `menu-aplicacion.test.ts`, `Disenos.test.tsx`, `RutasModelos.test.tsx` | ✅ |
| RF-7 | La opción actual se anuncia como página actual, también en los detalles ("Mis causas" en el detalle de una causa del portal) | W `menu-aplicacion.test.ts` (todas las direcciones de `RutasAplicacion`), `MenuLateral.test.tsx` | ✅ |
| RF-8 | El logo del menú y el de la barra llevan al inicio de la sección | W `MenuLateral.test.tsx` | ✅ |
| RF-9 | "Menú" con `aria-expanded`; al abrir, foco en "Cerrar menú", contenido y barra inertes y la página sin desplazarse; se cierra al elegir, con "Cerrar menú", con Escape, al tocar el fondo y al pasar a 1024 px; el foco vuelve a "Menú" | W `MenuLateral.test.tsx` | ✅ (anchos: demo manual) |
| RF-10 | Nada en `localStorage` ni `sessionStorage` | W `MenuLateral.test.tsx` | ✅ |
| RF-11 | Ingreso: logo al sitio público, T-1, T-2 y T-3 contra el anexo, sin la frase quitada, la dirección y el WhatsApp sin mensaje y aparte, " · " solo con dirección | W `textos-aplicacion.test.ts`, `DisenoMarca.test.tsx`, `PaginaIngreso.test.tsx` | ✅ |
| RF-12 | Una columna debajo de 1024 px, el formulario sin desplazarse, lugar para el botón de WhatsApp | W `DisenoMarca.test.tsx` (`pb-24`) | ✅ (360 × 640 y teclado abierto: demo manual) |
| RF-13 | Mensajes, validación y destino de la spec 001; el aviso dentro de la tarjeta, arriba de los campos | W `PaginaIngreso.test.tsx` | ✅ |
| RF-14 | Cambio de contraseña con la marca, sin T-1, sin contacto y sin menú | W `PaginaCambiarContrasena.test.tsx` | ✅ |
| RF-15, RF-16 | Cada causa en su tarjeta: carátula, estado, "Expte." o "Sin asignar", "Último movimiento" solo con fecha, "Ver detalle de …"; títulos de grupo con línea | W `PortalInicio.test.tsx` | ✅ |
| RF-17 | Detalle de la causa en tres tarjetas | W `PortalCausaDetalle.test.tsx` | ✅ |
| RF-18, RF-19 | Línea de tiempo: un elemento por movimiento en el orden recibido, fecha, tipo, leyendas, división entre movimientos, sin línea en el último, punto hueco en el anulado | W `LineaDeTiempo.test.tsx`, `PortalCausaDetalle.test.tsx` | ✅ |
| RF-20 | El movimiento del portal en una tarjeta | W `PortalMovimientoDetalle.test.tsx` | ✅ (aspecto: demo manual) |
| RF-21 | Listado de causas: "Nueva causa" con el "+" sin anunciar, filtros y tabla en tarjetas, filas con línea, estado en etiqueta, desactivada con su fondo | W `PanelCausas.test.tsx` | ✅ |
| RF-22 | Cuentas en tabla; fallos y modelos en tarjetas | W `PanelUsuarios.test.tsx`, `PanelJurisprudencia.test.tsx`, `PanelModelos.test.tsx` (siguen en verde) | ✅ (aspecto: demo manual) |
| RF-23 | Barra azul o gris junto a "Visible" u "Oculto" | W `FilaMovimiento.test.tsx` | ✅ |
| RF-24 | Formularios, detalles y confirmaciones con los estilos del estudio | W tests de esos componentes y páginas, sin cambiar sus casos | ✅ (aspecto: demo manual) |
| RF-25 | Inicio del panel: saludo y un acceso por opción, con ícono, sin contadores | W `PanelInicio.test.tsx` | ✅ |
| RF-26, RF-27 | Transiciones de 0 con la reducción de movimiento, escalonado sin pasar de 0,6 s, contenido en el documento desde el primer momento | W `animaciones.test.tsx` | ✅ (cómo se ven: demo manual) |

## Requisitos no funcionales

| RNF | Verificación | Resultado |
|---|---|---|
| Plataformas (360 px, tablas, 44 px, horizontal) | Tablas en `overflow-x-auto` (W `PanelCausas.test.tsx`); `min-h-11` en el menú, la barra y "Ver detalle" | ⏳ Demo manual (paso 4) |
| Accesibilidad | W: "Saltar al contenido" primero, navegación con nombre, un único `<h1>`, íconos y puntos sin anunciar, `aria-current`, foco al cerrar el menú | ✅; contraste (medido en el plan), teclado y lector de pantalla: demo manual (paso 5) |
| Rendimiento | `LazyMotion` en `RutasAplicacion`: la parte de la aplicación pesa 41,5 KB comprimidos con las animaciones (build de T14) | ✅ |
| Seguridad y aislamiento | Sin cambios en la API, las sesiones ni las cabeceras; nada en el navegador | ✅ |
| Stack | Sin dependencias nuevas: `motion` ya estaba; íconos propios en SVG | ✅ |
| Idioma | Todos los textos en español | ✅ |

## Observaciones
- **Fallos del sitio público, ajenos a esta spec.** Fallan 4 tests de la spec 007, por cambios que ya estaban en el árbol sin commitear antes de esta spec: el pie con `pb-10` en lugar de `pb-28` (RF-28), el acceso de ingreso que pasa al menú debajo de 768 px en lugar de 420 px (RF-4) y el pie que muestra el número de WhatsApp en lugar de "WhatsApp" (RF-44). Contradicen la spec 007: hay que decidir si se actualiza la spec o se vuelve atrás el cambio.
- **Datos del estudio.** El estudio informó la dirección, el email e Instagram (17/10/2026). Se actualizaron la spec 007 (RF-22, casos límite, dudas abiertas) y los tests que daban por hecho que faltaban (`datos-estudio`, `ContactoSitio`, `cabecera-pagina`, `Disenos`).
- **Desvíos del plan, ya anotados en él.** `LazyMotion` va en `RutasAplicacion.tsx` y no en `App.tsx`; el menú usa `isSectionActive` con `details` en lugar de la regla de `NavLink`; los filtros usan `FIELD_SMALL`; los textos del ingreso viven en `servicios/textos-aplicacion.ts`.
- **RF-22 corregido.** Jurisprudencia y modelos no son tablas: la spec pasó a pedir sus elementos en tarjetas con borde.

## Criterios de finalización
- [x] Todos los RF con al menos un test en verde, salvo lo que solo se puede ver.
- [x] Tests de cada punto de la lista de la spec.
- [ ] `pnpm test` y `pnpm lint` sin errores: `pnpm lint` pasa; `pnpm test` queda con los 4 fallos del sitio público de "Observaciones".
- [ ] Demo manual (ver la guía siguiente).

## Guía de la demo manual

### Preparación
1. `pnpm dev`. La web queda en `http://localhost:5173`.
2. Tener a mano un cliente con causas y movimientos visibles (alguno anulado) y un abogado.

### Pasos
1. En una computadora, abrir `/ingresar`: a la izquierda el degradado con el logo, el nombre y "Seguí tu caso desde donde estés.", y abajo "Pueyrredón Nº 47, Concordia · +54 9 3455 41-4147"; a la derecha la tarjeta con "Ingresar", "Usá el email y la contraseña…", los campos, el botón y "¿Olvidaste tu contraseña?…".
2. Ingresar como cliente: el menú lateral con el logo, "Portal de clientes" y "Mis causas" marcada; cada causa en su tarjeta, bien separada. Abrir una causa: tres tarjetas, "Mis causas" sigue marcada, y los movimientos en la línea de tiempo, con el anulado de punto hueco.
3. Ingresar como abogado: el menú del panel, el inicio con sus accesos, el listado de causas con sus filas separadas y resaltadas al pasar el puntero, el historial de movimientos de una causa con sus barras azul y gris, y los listados de jurisprudencia, modelos y cuentas.
4. Repetir los pasos 1 a 3 con el navegador a 360 px: la barra de arriba en una línea (logo, nombre y "Menú"); "Menú" abre el menú desde la izquierda y se cierra al elegir; las tablas se desplazan dentro de su tarjeta; el formulario de ingreso se ve sin desplazarse y el botón de WhatsApp no lo tapa, tampoco con el teclado del celular abierto.
5. Recorrer el ingreso, el portal y el panel solo con el teclado: "Saltar al contenido" aparece con el primer Tab, el menú plegado no deja salir el foco y se cierra con Escape, y el foco siempre se ve, también sobre el azul del menú.
6. Mirar las animaciones (aparición de la pantalla, tarjetas y filas escalonadas, menú plegado, respuesta al puntero). Activar la reducción de movimiento en el dispositivo, volver a cargar y verificar que todo aparece sin movimiento.
