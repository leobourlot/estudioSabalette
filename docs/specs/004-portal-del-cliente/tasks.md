# Tareas 004 — Portal del cliente

Derivadas de `spec.md` y `plan.md` de esta carpeta. Cada tarea dura entre 20 y 30 minutos y se hace en orden.

Reglas para todas las tareas:
- Primero se escriben los tests, después el código.
- Una tarea está terminada solo si, además de su "Hecho cuando", `pnpm test` y `pnpm lint` pasan sin errores.
- Ninguna tarea crea ni modifica archivos `.env`, `.env.test` ni ningún otro con credenciales, y ninguna se conecta a la base de producción. Los e2e usan la base de tests de la spec 001.
- No se agregan dependencias: el plan no prevé ninguna.
- Antes de modificar un archivo existente se pide aprobación (AGENTS.md). Las tareas que lo hacen lo indican con **(modifica existente)**.
- No se hacen commits sin pedido explícito.
- T1 a T4 corrigen la spec 001 (sesión por rol y dirección única del sitio). Cuando se pida el commit, van juntas en uno solo, con la actualización de `plan.md` de la spec 001 (principio 2).

## Corrección de la spec 001

- [x] **T1 — Duración de la sesión por rol** [RF-4; spec 001, RF-12] **(modifica existente: `constantes.ts`, `autenticacion.service.ts`, `cookies-de-sesion.ts`, `usuarios/sesion.entity.ts` y `autenticacion.service.spec.ts`)**
  `SESSION_TTL_MS` se reemplaza por `SESSION_IDLE_TTL_MS`, `sessionTtlMs(rol)` y `REFRESH_COOKIE_MAX_AGE_MS`. El ingreso lee también el rol, y el ingreso y la renovación fijan `venceEn` según el rol. La cookie de renovación pasa a vivir 75 minutos. Se actualiza el comentario de `venceEn` en la entidad.
  Hecho cuando: los tests unitarios verifican:
  - `sessionTtlMs` para cada rol: 20 minutos para `cliente` y 60 para `admin` y `abogado`.
  - Que el ingreso y la renovación de un cliente fijan `venceEn` a ahora + 20 minutos, y los de un integrante a ahora + 1 hora. Reemplazan las verificaciones de 7 días.
  - Que la cookie de renovación lleva `maxAge` de 75 minutos.

- [x] **T2 — Extensión de la sesión en cada consulta** [RF-4; spec 001, RF-12] **(modifica existente: `autenticacion.guard.ts` y `autenticacion.guard.spec.ts`)**
  Después de validar la sesión, el guard corre `venceEn` a ahora + `sessionTtlMs(usuario.rol)`, con la condición `revocadaEn IS NULL`.
  Hecho cuando: los tests unitarios verifican que una petición válida extiende `venceEn` según el rol vigente, que una sesión vencida o revocada responde 401 sin extenderse, y que una ruta `@Public` no extiende nada.

- [x] **T3 — e2e de la sesión por rol** [RF-4; spec 001, RF-12] **(modifica existente: `renovacion.e2e-spec.ts`)**
  Suite nueva `sesion-por-rol.e2e-spec.ts`. `renovacion.e2e-spec.ts` reemplaza los 7 días por la duración del rol.
  Hecho cuando: los e2e verifican:
  - Que el ingreso de un cliente deja `venceEn` a 20 minutos y el de un abogado a 1 hora (con un margen de un minuto).
  - Que una petición autenticada, también `GET /api/sesion/usuario`, lo corre de nuevo, y que `POST /api/sesion/cerrar` no.
  - Que con `venceEn` en el pasado, la petición y la renovación responden 401.
  - Que la renovación lo corre según el rol, y que la cookie de renovación dura 75 minutos.

- [x] **T4 — Plan de la spec 001 y dirección única del sitio** [spec 001, RF-12; plan 004, "Dirección única del sitio"] **(modifica existente: `docs/specs/001-autenticacion-y-roles/plan.md` y `web/public/.htaccess`)**
  En `plan.md` de la spec 001 se actualizan la tabla `sesiones`, "Credenciales", "Ingreso", "Cada petición protegida", "Renovación", "Topología" y "Cobertura de RF", según el plan 004. En `.htaccess` se agrega la redirección a HTTPS sin www, con `R=302`, antes de las reglas que sirven `index.html`.
  Hecho cuando:
  - `plan.md` de la spec 001 ya no menciona los 7 días y describe la duración por rol, la extensión en el guard, la cookie de 75 minutos y la dirección sin www con HTTPS.
  - `.htaccess` tiene la redirección antes de las reglas existentes, conserva la ruta y los parámetros con `%{REQUEST_URI}` y no escribe el dominio.
  - Queda anotado como pendiente del despliegue (ver T28) que, ya en producción, hay que probar `http://www…`, `http://…` y `https://www…` (incluida una ruta con `?pagina=`), revisar que Hostinger no duplique la redirección y recién después pasar a `R=301`.

## api

- [x] **T5 — Respuestas sin caché** [RF-6] **(modifica existente: `configurar-aplicacion.ts`)**
  Middleware de Express que pone `Cache-Control: no-store` en todas las respuestas de la API.
  Hecho cuando: un e2e verifica el encabezado en una respuesta 200 del panel, en una 401 y en una 404.

- [x] **T6 — Visibilidad para el cliente: causa, página y movimiento** [RF-20, RF-24, RF-26, RF-29] **(modifica existente: `visibilidad-cliente.service.ts` y `visibilidad-cliente.e2e-spec.ts`)**
  `canSeeCausa` pasa a ser público. `listVisible(clienteId, causaId, pagina, ahora)` pide 21 filas y devuelve `{ items, pagina, haySiguiente }` sin `total`. `findVisible(clienteId, causaId, movimientoId, ahora)` busca también por causa.
  Hecho cuando: los e2e existentes de visibilidad pasan con las firmas nuevas, y además verifican:
  - Que `findVisible` responde el mismo 404 para un movimiento visible de otra causa vinculada.
  - Que con 21 movimientos visibles y 5 ocultos, la página 1 trae 20 y `haySiguiente: true`, la página 2 trae 1 y `haySiguiente: false`, y ninguna incluye `total`.

- [x] **T7 — Fecha del último movimiento y fecha futura del cliente** [RF-8, RF-21] **(modifica existente: `visibilidad-cliente.service.ts`, `movimiento-detalle.ts` y sus tests)**
  `lastVisibleDates(causaIds, hoy)` en `ClientVisibilityService`. `toMovimientoCliente(m, ahora)` suma `esFechaFutura`, que es falso en un anulado.
  Hecho cuando:
  - Un test unitario verifica `esFechaFutura` en un movimiento futuro, en uno de hoy y en uno anulado futuro, y que `toMovimientoCliente` sigue sin descripción interna, autores ni cambios.
  - Los e2e verifican que `lastVisibleDates` toma la fecha más reciente de los visibles no anulados hasta hoy, sin contar ocultos, anulados ni futuros, y que una causa sin ninguno no aparece en el mapa.

- [x] **T8 — Reglas puras del portal** [RF-10, RF-11, RF-14, RF-24, RF-25]
  `portal/reglas-portal.ts`: `caseGroup`, `comparePortalCausas`, `portalParty`, `comparePortalParties` y `pageOf`, con `Intl.Collator('es', { sensitivity: 'base' })`.
  Hecho cuando: los tests unitarios verifican:
  - `caseGroup` para cada estado.
  - El orden de causas por grupo, por fecha descendente con las que no tienen al final del grupo, por carátula sin distinguir mayúsculas ni tildes (con la ñ después de la n) y por `id` descendente.
  - El nombre de la parte para una persona física, una jurídica cliente y una jurídica no cliente; el orden por rol y después por apellido o razón social y nombre; y `esVos` solo para la parte del cliente que consulta.
  - `pageOf` en la primera página, en la última y en una posterior a la última.

- [x] **T9 — Armado de respuestas del portal** [RF-13 a RF-17, RF-30]
  `portal/portal-detalle.ts`: `CausaPortalResumen`, `CausaPortalDetalle` y `PartePortal`, campo por campo.
  Hecho cuando: los tests unitarios comparan las claves exactas de cada respuesta, verifican que ninguna incluye `dni`, `cuit`, `tipoPersona`, `clienteId`, ids de partes o integrantes, emails, colaboradores, `activa` ni auditoría, y que un responsable desactivado sale como `null`.

- [x] **T10 — Módulo, controller y lista de causas** [RF-1, RF-2, RF-7, RF-9, RF-12] **(modifica existente: `app.module.ts` y `api/test/utilidades/datos-de-prueba.ts`)**
  `PortalModule`, `PortalController` con `@Roles('cliente')` y sus cuatro rutas `GET`, DTO de `pagina` con el mensaje de los listados existentes, pipes de ids con los 404 de la spec 003, y `PortalService.listCausas`. Las utilidades de e2e suman una función para vincular un cliente a una causa como parte.
  Hecho cuando: los e2e verifican:
  - Que un cliente ve solo sus causas vinculadas, incluidas una Archivada y una Finalizada, sin una desactivada, una de la que fue desvinculado ni una de otro cliente.
  - Las claves de cada causa de la lista.
  - Que un cliente sin causas recibe `items` vacío.
  - Que `pagina=0` y `pagina=abc` responden 400.

- [x] **T11 — Orden y paginación de la lista de causas** [RF-8, RF-10, RF-11, RF-24, RF-25]
  Orden y página con las reglas de T8 y las fechas de T7, con `ahora` controlado en el service.
  Hecho cuando: los e2e verifican:
  - Los grupos y el orden con la fecha del último movimiento, y que esa fecha cambia al pasar el día en Buenos Aires.
  - Que con 45 causas las tres páginas no repiten ni omiten ninguna y no incluyen `total`.
  - Que una página posterior a la última devuelve `items` vacío y `haySiguiente: false`.

- [x] **T12 — Detalle de la causa** [RF-13 a RF-17, RF-28]
  `PortalService.getCausa`, con `canSeeCausa`, partes vigentes y responsable.
  Hecho cuando: los e2e verifican:
  - Las claves exactas, "Vos" en la parte propia y el orden de las partes.
  - Dos clientes en la misma causa, cada uno con "Vos" en la suya.
  - Un cliente persona jurídica con su razón social, y una parte desvinculada ausente.
  - El responsable activo y, al desactivarlo, `null`.
  - Que un recorrido recursivo de la respuesta no encuentra ninguna clave prohibida.

- [x] **T13 — Movimientos y movimiento** [RF-20 a RF-23, RF-26, RF-27, RF-29]
  `PortalService.listMovimientos` y `getMovimiento`, con `ClientVisibilityService`.
  Hecho cuando: los e2e verifican:
  - Solo los visibles, anulados incluidos, en el orden del panel, con el texto para el cliente o, si no hay, la descripción.
  - `esFechaFutura` en uno futuro y no en uno anulado futuro.
  - Que con 45 visibles y 10 ocultos la paginación recorre solo los visibles y no incluye `total`.
  - Que el detalle de un movimiento incluye `causa: { id, caratula }`.

- [x] **T14 — Respuestas indistinguibles, acceso y siguiente acción** [RF-1 a RF-3, RF-27 a RF-29]
  Recorrido de las cuatro rutas del portal.
  Hecho cuando: los e2e verifican:
  - Que una causa de otro cliente, una desactivada, una inexistente y `abc` reciben el mismo cuerpo 404, comparado byte a byte, en las cuatro rutas.
  - Que un movimiento oculto, uno inexistente, uno de otra causa vinculada y `abc` reciben el mismo cuerpo 404.
  - 401 para un visitante, y 403 para un administrador, un abogado y un cliente con cambio pendiente, en cada ruta. `POST` y `PATCH` responden 404.
  - Que después de desvincular al cliente, desactivar la causa, ocultar un movimiento o desactivar al responsable, la siguiente petición ya refleja el cambio.

- [x] **T15 — Rendimiento del portal** [RNF de rendimiento]
  Suite con 100 causas vinculadas a un cliente y 5.000 movimientos en una, insertados en bloque.
  Hecho cuando: un e2e verifica que cada ruta del portal responde en menos de 2 segundos. Si no se cumple, la tarea se detiene y se consulta antes de agregar el índice que prevé el plan.

## web

- [x] **T16 — Datos del estudio** [RF-18, RF-19] **(modifica existente: `DisenoSeccion.tsx`)**
  `servicios/datos-estudio.ts` con `STUDIO_CONTACT` (nombre "Estudio Sabalette", dirección y WhatsApp genéricos, marcados para reemplazar) y `whatsappUrl()`. `DisenoSeccion` toma el nombre de ahí.
  Hecho cuando: un test verifica que `whatsappUrl()` arma `https://wa.me/<número>` sin mensaje, y el test existente de los diseños sigue mostrando "Estudio Sabalette".

- [x] **T17 — Actividad e inactividad** [RF-4, RF-5] **(modifica existente: `cliente-http.ts` y su test)**
  `servicios/inactividad.ts` con `CLIENT_IDLE_LIMIT_MS` e `isIdleExpired`. El cliente HTTP suma `onActivity`.
  Hecho cuando: los tests verifican `isIdleExpired` un milisegundo antes y justo a los 20 minutos, y que `onActivity` se llama una vez por petición, también al renovar, y deja de llamarse al dejar de escuchar.

- [x] **T18 — Cierre por inactividad en la pantalla** [RF-4, RF-5] **(modifica existente: `ProveedorSesion.tsx` y su test)**
  Mientras el usuario es cliente, control cada 30 segundos y al volver a la pestaña (`visibilitychange` y `focus`). Si venció, `endSession("Tu sesión se cerró por inactividad. Volvé a ingresar")`, sin llamar a la API.
  Hecho cuando: los tests, con reloj simulado, verifican:
  - Que un cliente sin actividad durante 20 minutos queda sin usuario y con el aviso, sin ninguna petición.
  - Que con actividad no se vacía, y que al volver a la pestaña después de 20 minutos se vacía sin esperar los 30 segundos.
  - Que un integrante no se vacía por este control.

- [x] **T19 — Caché del navegador** [RF-6] **(modifica existente: `ProveedorSesion.tsx`, su test y `web/public/.htaccess`)**
  `pageshow` con `persisted` recarga la aplicación. `.htaccess` agrega `Cache-Control: no-store` solo para `index.html`, dentro de `<IfModule mod_headers.c>`.
  Hecho cuando: un test verifica que `pageshow` con `persisted: true` llama a la recarga y con `false` no, y `.htaccess` tiene el encabezado solo para `index.html`, sin afectar los archivos con hash.

- [x] **T20 — Servicio del portal** [RF-7, RF-13, RF-20, RF-22] **(modifica existente: `ProveedorServicios.tsx`)**
  `servicios/portal.ts` con los tipos y una función por ruta.
  Hecho cuando: los tests con `fetch` simulado verifican la ruta y el `pagina` de cada función.

- [x] **T21 — Presentación del portal** [RF-9, RF-10, RF-13, RF-21, RF-25]
  `servicios/presentacion-portal.ts`: `groupCausas`, títulos de grupo, "Sin asignar", `movementLegend`, `truncateClientText` y `parsePageParam`.
  Hecho cuando: los tests verifican:
  - `groupCausas` con una página que empieza a mitad de un grupo y con otra de un solo grupo.
  - `truncateClientText` con 300 y 301 caracteres, también con caracteres de dos unidades en UTF-16.
  - `movementLegend` en las cuatro combinaciones de anulado y fecha futura.
  - `parsePageParam` con vacío, `1`, `3`, `0`, `-1`, `1.5` y `abc`.

- [x] **T22 — Contacto y WhatsApp** [RF-2, RF-18, RF-19] **(modifica existente: `DisenoPortal.tsx`, `PaginaCambiarContrasena.tsx` y sus tests)**
  `BloqueContactoEstudio` y `BotonWhatsapp`. `DisenoPortal` suma el bloque, el botón, el enlace "Cambiar contraseña" y el margen inferior. `PaginaCambiarContrasena` muestra el botón a los clientes.
  Hecho cuando: los tests verifican:
  - En el portal: el enlace "Cambiar contraseña", el nombre, la dirección y el enlace de WhatsApp con `target="_blank"` y `rel="noopener noreferrer"`, y el botón con su `aria-label`.
  - En el cambio de contraseña: el botón sin el bloque para un cliente, y ninguno de los dos para un integrante.

- [x] **T23 — Lista de causas** [RF-7 a RF-12, RF-24, RF-25] **(modifica existente: `PortalInicio.tsx` y su test)**
  `PortalInicio` reescrita con `ListaCausasPortal` y `Paginacion`, y la página leída de `?pagina=`.
  Hecho cuando: los tests con servicios simulados verifican:
  - Los títulos de grupo, "Sin asignar", el estado, la fecha del último movimiento y el corte de la carátula en dos líneas (clase `line-clamp-2`).
  - "No tenés causas para consultar" solo en la página 1, y nada en una página posterior a la última.
  - Que con `?pagina=abc` no hay petición ni mensaje.
  - "Anterior" y "Siguiente" según la página y `haySiguiente`, sin totales.

- [ ] **T24 — Detalle de la causa** [RF-13 a RF-17, RF-28] **(modifica existente: `RutasAplicacion.tsx`)**
  Ruta `/portal/causas/:id` y página `PortalCausaDetalle`, con `DatosCausaPortal` y `PartesPortal`.
  Hecho cuando: los tests verifican los datos con "Sin asignar" y la leyenda de incidente, las partes con "Vos", el responsable presente y ausente, y que ante un 404 solo se muestra "No existe esa causa".

- [ ] **T25 — Movimientos de la causa** [RF-20, RF-21, RF-23, RF-24]
  `MovimientosPortal` y `TarjetaMovimientoPortal` en `PortalCausaDetalle`, con la página de `?pagina=`.
  Hecho cuando: los tests verifican:
  - La fecha, el tipo y las leyendas "Anulado" y "Fecha futura".
  - El texto recortado con "Ver más", que lo despliega sin otra petición.
  - "Todavía no hay movimientos para mostrar" en la página 1.
  - El enlace "Abrir" con la página actual, y la paginación sin totales.

- [ ] **T26 — Detalle del movimiento** [RF-22, RF-29] **(modifica existente: `RutasAplicacion.tsx`)**
  Ruta `/portal/causas/:id/movimientos/:movimientoId` y página `PortalMovimientoDetalle`.
  Hecho cuando: los tests verifican el texto completo, la carátula, "Volver a la causa" con la misma página y que ante un 404 solo se muestra "No existe ese movimiento".

- [ ] **T27 — Acceso y persistencia en la web** [RF-1, RNF de persistencia]
  Recorrido de las rutas del portal.
  Hecho cuando: los tests verifican que un visitante va a `/ingresar`, un integrante al panel y un cliente con cambio pendiente a `/cambiar-contrasena` en cada ruta nueva, y que el flujo del portal no escribe en `localStorage` ni en `sessionStorage`.

## Cierre

- [ ] **T28 — Validación de la spec**
  Recorrer `spec.md` requisito por requisito con su test, y hacer la demo manual de los criterios de finalización, incluidos el celular, la vuelta atrás después de cerrar sesión y los 20 minutos de inactividad.
  Hecho cuando: cada RF tiene al menos un test en verde identificado, `pnpm test` y `pnpm lint` pasan, y la demo manual se completó sin errores. La prueba de la redirección en producción y el paso a `R=301` (T4) quedan registrados como pendientes del despliegue si todavía no se hicieron.
