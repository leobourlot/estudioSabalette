# Tareas 003 — Movimientos

Derivadas de `spec.md` y `plan.md` de esta carpeta. Cada tarea dura entre 20 y 30 minutos y se hace en orden.

Reglas para todas las tareas:
- Primero se escriben los tests, después el código.
- Una tarea está terminada solo si, además de su "Hecho cuando", `pnpm test` y `pnpm lint` pasan sin errores.
- Ninguna tarea crea ni modifica archivos `.env`, `.env.test` ni ningún otro con credenciales, y ninguna se conecta a la base de producción. Los e2e usan la base de tests de la spec 001.
- No se agregan dependencias: el plan no prevé ninguna.
- Antes de modificar un archivo existente se pide aprobación (AGENTS.md). Las tareas que lo hacen lo indican con **(modifica existente)**.
- No se hacen commits sin pedido explícito.

## api

- [x] **T1 — Validador de textos del movimiento** [RF-3, RF-4]
  `movimientos/validadores/texto-movimiento.ts`: normalización a NFC, conversión de `\r\n` y `\r` en `\n`, recorte de espacios y saltos de línea de los extremos, regla de caracteres permitidos y largo en puntos de código. Constantes de largo máximo.
  Hecho cuando: los tests unitarios verifican:
  - Que se aceptan letras con tilde, ñ, ü, saltos de línea, líneas en blanco intermedias y cada símbolo permitido, incluidos `¿ ? ¡ ! %`.
  - Que se rechazan emojis, tabulaciones (también en un extremo), `<`, `>`, `{`, `}`, `[`, `]`, `\`, `|`, `=` y el acento grave.
  - Que solo se recortan espacios y saltos de línea de los extremos, y que `\r\n` cuenta como un carácter.
  - Que 2.000 caracteres pasan y 2.001 no, también con letras que ocupan dos unidades en UTF-16.

- [x] **T2 — Reglas puras** [RF-5 a RF-7, RF-20, RF-24]
  `movimientos/reglas-movimientos.ts`: `visibleText`, `diffMovement`, `isExistingDate`, `isDateInRange`, `todayInBuenosAires` e `isFutureDate`.
  Hecho cuando: los tests unitarios verifican:
  - `visibleText` con y sin texto para el cliente, y su origen.
  - `diffMovement` para cada campo, para varios a la vez, sin cambios, y con el texto para el cliente de valor a `NULL`.
  - 31/02, y 29/02 en año bisiesto y no bisiesto.
  - Los límites 1899-12-31, 1900-01-01, 2099-12-31 y 2100-01-01.
  - La fecha futura con el día siguiente y con el mismo día, y el cambio de día a las 02:59 y a las 03:00 UTC.

- [x] **T3 — Entidades** [RF-1, RF-2, RF-20]
  `movimiento.entity.ts` (con el índice `IDX_movimientos_historial` y `creadoEn` con microsegundos) y `cambio-movimiento.entity.ts` (con `cambios` en JSON y el índice `IDX_movimiento_cambios_movimiento`), con los campos, tipos y relaciones del plan.
  Hecho cuando: la api compila y un test unitario verifica que los enums de tipo y de acción tienen exactamente los valores del plan.

- [x] **T4 — Fechas como texto y registro de consultas apagado** [RF-1, RNF de fechas y de registros] **(modifica existente: `opciones-base-de-datos.ts` y su test)**
  `dateStrings: ['DATE']` en las opciones de conexión.
  Hecho cuando: el test unitario verifica que las opciones incluyen `dateStrings: ['DATE']` y no activan `logging`, y los e2e existentes siguen en verde (las columnas `DATETIME` no cambian).

- [x] **T5 — Migración** [RF-1, RF-2, RF-20] **(modifica existente: `esquema.ts`)**
  Migración `crear-movimientos-y-cambios` con las dos tablas, sus índices y sus claves foráneas. Se agregan las entidades y la migración a `esquema.ts`.
  Hecho cuando: un e2e corre `up` sobre la base de tests con las tablas de las specs 001 y 002, guarda un movimiento con fecha 2024-03-01 y la lee como el texto `2024-03-01`, y corre `down` sin errores.

- [x] **T6 — DTO de alta y modificación** [RF-1, RF-3 a RF-6, RF-11, RF-12]
  DTO de `POST` y de `PATCH` parcial, con los mensajes del plan y reutilizando `usuarios/dto/reglas.ts`.
  Hecho cuando: los tests unitarios cubren:
  - Fecha ausente, con formato inválido, inexistente y fuera de rango.
  - Tipo fuera de la lista.
  - Descripción vacía, solo con espacios o larga. Texto para el cliente largo, y vacío a `NULL`.
  - Visibilidad que no es booleana. Caracteres no permitidos.
  - En `PATCH`, el rechazo de `causaId`, `anulado` y otros campos desconocidos.
  - Que ningún mensaje repite el valor recibido.

- [x] **T7 — DTO de los parámetros del historial** [RF-23, RF-25, RF-26]
  DTO de `GET /` con `pagina`, `buscar`, `tipo`, `visibilidad`, `desde`, `hasta` y `ocultarAnulados`.
  Hecho cuando: los tests unitarios cubren los valores por defecto, una página inválida, un `buscar` de más de 100 caracteres, el tipo y la visibilidad fuera de lista, las fechas inválidas, y el 400 "La fecha desde no puede ser posterior a la fecha hasta".

- [x] **T8 — Armado de respuestas** [RF-22, RF-24, RF-31, RF-36]
  `movimiento-detalle.ts`: `AutorResumen`, `MovimientoResumen`, `MovimientoDetalle`, `CambioMovimiento` y `MovimientoCliente`, campo por campo.
  Hecho cuando: los tests unitarios verifican:
  - Que `MovimientoCliente` tiene solo id, fecha, tipo, texto y anulado; que el texto es el texto para el cliente cuando existe; y que nunca incluye la descripción en ese caso, ni autores, fechas de registro o cambios.
  - Que las respuestas del panel no incluyen email ni hashes y marcan a los autores desactivados.
  - Que `MovimientoDetalle` trae `textoVisible` y `origenTextoVisible`.

- [x] **T9 — Filtro global de errores sin datos** [RNF de registros] **(modifica existente: `configurar-aplicacion.ts`)**
  `configuracion/errores-sin-datos.filter.ts`, registrado en `configureApp`.
  Hecho cuando:
  - Los tests unitarios verifican que una `HttpException` se responde igual que antes.
  - También verifican que un `QueryFailedError` con un texto de prueba en el mensaje responde 500 "Ocurrió un error inesperado", y que lo registrado contiene el método, el patrón de la ruta, la clase y el código del error, pero no el texto, la URL real ni el query string.
  - Los e2e existentes siguen en verde.

- [x] **T10 — Módulo, controller y carga** [RF-2, RF-8, RF-20, RF-34, RF-35] **(modifica existente: `app.module.ts`, utilidades de e2e)**
  `MovimientosModule` importado en `app.module.ts` (importa `CausasModule`), `movimientos.controller.ts` con `@Roles('admin', 'abogado')`, la transacción `conCausaYMovimiento` (causa con bloqueo compartido y movimiento con bloqueo exclusivo) y `POST /`. Función de e2e para crear movimientos.
  Hecho cuando: los e2e verifican:
  - La carga no visible por defecto, la carga visible y el registro de quién la cargó.
  - El cambio `carga` con todos los valores iniciales.
  - El 404 de una causa inexistente o con id no numérico.
  - Que un 400 con un texto inválido que lleva una marca no repite la marca en la respuesta.

- [x] **T11 — Consulta de un movimiento e integridad** [RF-22, RF-34]
  `GET /:movimientoId` con el texto visible, la auditoría y los cambios.
  Hecho cuando: los e2e verifican el detalle completo, y el mismo 404 "No existe ese movimiento" para un movimiento inexistente, uno de otra causa y un id no numérico.

- [x] **T12 — Modificación y visibilidad** [RF-2, RF-11, RF-12, RF-14, RF-15, RF-20]
  `PATCH /:movimientoId` con `diffMovement`, registro de la modificación y cambio `modificacion`.
  Hecho cuando: los e2e verifican:
  - La modificación de cada dato y de la visibilidad en los dos sentidos, con `modificadoPor/En`.
  - Que borrar el texto para el cliente lo deja en `NULL`.
  - Que un `PATCH` sin cambios no registra nada.
  - El 400 con `causaId`.
  - El 409 sobre un movimiento anulado, también al cambiar solo la visibilidad.

- [x] **T13 — Anulación y restauración** [RF-2, RF-16 a RF-19]
  `POST /:movimientoId/anular` y `/restaurar`.
  Hecho cuando: los e2e verifican que las dos acciones conservan los datos y la visibilidad, registran `modificadoPor/En` y su cambio `anulacion` o `restauracion`, y que anular dos veces y restaurar uno no anulado responden 409 con sus mensajes.

- [x] **T14 — Historial de cambios completo** [RF-20 a RF-22]
  Recorrido completo del historial de cambios de un movimiento.
  Hecho cuando: un e2e con dos integrantes hace carga, modificación, cambio de visibilidad, anulación y restauración, y verifica el orden del más reciente al más antiguo, los autores, los valores anterior y nuevo, y que los cambios anteriores siguen idénticos después de cada operación.

- [x] **T15 — Estado de la causa y concurrencia** [RF-10, RF-15, RF-28, RF-29]
  Controles de causa desactivada y escrituras simultáneas.
  Hecho cuando: los e2e verifican:
  - Que cargar, modificar, anular y restaurar no cambian `modificadoPor/En` de la causa.
  - Que en una causa desactivada las cuatro escrituras responden 409 "La causa está desactivada", y la consulta responde 200.
  - Que en una causa Archivada o Finalizada las escrituras funcionan.
  - Que, con una anulación y una modificación simultáneas, si la anulación queda primero la modificación responde 409.
  - Que, con una desactivación de la causa y una carga simultáneas, si la desactivación queda primero la carga responde 409.

- [x] **T16 — Historial de la causa: orden, paginado y filtros** [RF-23 a RF-26, RF-28]
  `GET /` sin `buscar`, con `esFechaFutura`.
  Hecho cuando: los e2e verifican:
  - El orden por fecha, por momento de carga y por id con la misma fecha y el mismo `creadoEn`.
  - Que con 45 movimientos las tres páginas no repiten ni omiten ninguno.
  - Cada filtro por separado y combinado, incluidos "visibles" con anulados visibles, con y sin `ocultarAnulados`.
  - El 400 con desde > hasta, el 404 de una causa inexistente y el 200 de una causa desactivada.
  - `esFechaFutura`.

- [x] **T17 — Búsqueda en el historial** [RF-27]
  Parámetro `buscar` sobre la descripción y el texto para el cliente.
  Hecho cuando: los e2e verifican la búsqueda por fragmento en cada texto, en mayúsculas y sin tildes, que los comodines `%` y `_` se buscan como texto, que solo devuelve movimientos de la causa indicada, y su combinación con los filtros.

- [x] **T18 — Rendimiento del historial** [RNF de rendimiento]
  Prueba de volumen.
  Hecho cuando: un e2e inserta en bloque 5.000 movimientos en una causa y verifica que el historial con buscador y filtros responde en menos de 2 segundos.

- [x] **T19 — Visibilidad para el cliente** [RF-30 a RF-33]
  `visibilidad-cliente.service.ts` con `listVisible` y `findVisible`, exportado por `MovimientosModule`.
  Hecho cuando: los e2e sobre la base de tests verifican:
  - Que un cliente vinculado ve un movimiento visible con el texto para el cliente o, si no hay, con la descripción.
  - Que `findVisible` responde el mismo 404 para un movimiento oculto, uno de una causa no vinculada y uno inexistente.
  - Que un movimiento visible anulado se ve con `anulado: true`, y que uno cargado antes del vínculo también se ve.
  - Que el cliente deja de verlos al desvincularlo, al desactivar la causa y al desactivar su cuenta, y que los sigue viendo con la causa Archivada.
  - Que `listVisible` devuelve `null` para una causa no vinculada y respeta el orden del historial.

- [x] **T20 — Acceso e integrantes desactivados** [RF-35, RF-36]
  Recorrido de todos los endpoints de movimientos.
  Hecho cuando: los e2e verifican 401 sin sesión y 403 con un cliente en cada endpoint, y que un autor desactivado sigue figurando en el historial y en los cambios con `activo: false`.

## web

- [x] **T21 — Servicio de movimientos** [RF-8, RF-11, RF-14, RF-16, RF-18, RF-22 a RF-27] **(modifica existente: `ProveedorServicios.tsx`)**
  `servicios/movimientos.ts` con tipos y una función por endpoint, y `useMovimientosService` en `ProveedorServicios`.
  Hecho cuando: los tests con `fetch` simulado verifican la ruta, el método, el cuerpo y el query string de cada llamada.

- [x] **T22 — Presentación de movimientos** [RF-1, RF-22, RF-24]
  `servicios/presentacion-movimientos.ts`: etiquetas de tipo, de acción y de campo, `formatMovementDate`, recorte de la descripción a 200 caracteres y nombre del autor con "(desactivado)".
  Hecho cuando: los tests verifican cada etiqueta, que `formatMovementDate('2024-03-01')` da `01/03/2024` con la zona horaria del test en UTC y en Buenos Aires, y el recorte de un texto corto y de uno largo.

- [ ] **T23 — Validación del formulario y de los filtros** [RF-1, RF-3 a RF-6, RF-26]
  En `servicios/formulario-movimiento.ts`: `validateMovementForm`, armado del cuerpo de alta y del de edición (solo lo que cambió) y `validateMovementFilters`.
  Hecho cuando: los tests verifican cada mensaje con el texto de la API (incluidos los de caracteres, el largo en puntos de código y el rango de fechas), que el texto para el cliente vacío se envía como `null`, que la edición envía solo los datos cambiados, y el mensaje de desde > hasta.

- [ ] **T24 — Avisos de visibilidad** [RF-7, RF-9, RF-13]
  En `servicios/formulario-movimiento.ts`: `visibleTextPreview` y `needsVisibleChangeWarning`.
  Hecho cuando: los tests verifican que la vista previa usa el texto para el cliente o, si está vacío o solo tiene espacios, la descripción, con su origen; y que el aviso de cambio aparece solo si el movimiento era visible, sigue visible y cambió la fecha, el tipo, la descripción o el texto para el cliente.

- [ ] **T25 — Texto literal y regla de ESLint** [RF-3, RNF de textos seguros] **(modifica existente: `web/eslint.config.js`)**
  Componente `TextoLiteral` y regla `no-restricted-syntax` contra `dangerouslySetInnerHTML`.
  Hecho cuando: un test verifica que un texto con comillas, `&` y saltos de línea se muestra literal, con las líneas en blanco, y `pnpm lint` falla sobre un archivo de prueba temporal que usa `dangerouslySetInnerHTML` (después se lo borra) y pasa sobre el código real.

- [ ] **T26 — Ruta del detalle del movimiento** [RF-35] **(modifica existente: `RutasAplicacion.tsx`)**
  Ruta `/panel/causas/:id/movimientos/:movimientoId` con una página provisoria.
  Hecho cuando: los tests verifican que un integrante llega a la página y que un cliente que entra a esa ruta es llevado al portal.

- [ ] **T27 — Formulario de movimiento** [RF-8, RF-9, RF-11, RF-13]
  `FormularioMovimiento` para alta y edición.
  Hecho cuando: los tests verifican:
  - Que la casilla "Visible para el cliente" está desmarcada al cargar.
  - Los límites de la fecha y el contador de caracteres.
  - Los errores antes de enviar.
  - El aviso "El cliente verá:" con su origen al marcar la casilla, y el aviso de cambio en un movimiento visible.
  - Que ningún aviso impide guardar, y la muestra de los errores de la API.

- [ ] **T28 — Fila y filtros del historial** [RF-24, RF-25]
  `FilaMovimiento` y `FiltrosMovimientos`.
  Hecho cuando: los tests verifican que la fila muestra fecha, tipo, descripción recortada con "Ver completa", "Visible" u "Oculto", "Con texto para el cliente", el autor (marcado si está desactivado) y las etiquetas "Anulado" y "Fecha futura"; y que los filtros devuelven los valores elegidos y muestran el error de desde > hasta sin llamar al servicio.

- [ ] **T29 — Historial en el detalle de la causa** [RF-8, RF-23 a RF-28] **(modifica existente: `PanelCausaDetalle.tsx` y su test)**
  `HistorialMovimientos`, con el alta de movimientos, en `PanelCausaDetalle`.
  Hecho cuando: los tests con servicios simulados verifican:
  - Que buscar y cada filtro llaman al servicio con los parámetros correctos y vuelven a la página 1.
  - El paginado.
  - Que el alta recarga el historial.
  - Que en una causa desactivada no aparece "Nuevo movimiento".

  No se escribe nada en `localStorage` ni `sessionStorage`.

- [ ] **T30 — Historial de cambios** [RF-22]
  `HistorialCambios`.
  Hecho cuando: los tests verifican que cada cambio muestra fecha y hora en hora de Buenos Aires, acción, autor y, por cada dato, los valores anterior y nuevo, con los textos completos mediante `TextoLiteral` y la visibilidad como "Sí" o "No".

- [ ] **T31 — Detalle del movimiento** [RF-11, RF-15 a RF-19, RF-22, RF-28]
  `PanelMovimientoDetalle` en lugar de la página provisoria.
  Hecho cuando: los tests con servicios simulados verifican:
  - La muestra de los datos y del texto visible con su origen.
  - La edición.
  - Anular y restaurar, con los mensajes de 409.
  - Que un movimiento anulado no ofrece "Editar" y sí "Restaurar".
  - Que en una causa desactivada no hay acciones.

## Cierre

- [ ] **T32 — Validación de la spec**
  Recorrer `spec.md` requisito por requisito con su test, correr la migración `up` y `down` sobre la base de tests y hacer la demo manual de los criterios de finalización.
  Hecho cuando: cada RF tiene al menos un test en verde identificado, `pnpm test` y `pnpm lint` pasan, y la demo manual se completó sin errores.
