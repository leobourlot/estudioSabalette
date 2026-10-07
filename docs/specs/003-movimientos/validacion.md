# Validación 003 — Movimientos

Recorrido de `spec.md` requisito por requisito (tarea T32). Corrida del 2026-10-07, después de T31: `pnpm test` y `pnpm lint` sin errores.

| Paquete | Suite | Archivos | Tests |
|---|---|---|---|
| api | Unitarios (Vitest) | 27 | 649 |
| api | e2e contra la base de tests (Vitest + Supertest) | 42 | 429 |
| web | Vitest + Testing Library | 43 | 550 |
| | **Total** | **112** | **1628** |

Las cifras incluyen los tests de las specs 001 y 002, que siguen en verde.

Rutas abreviadas:
- **U**: tests unitarios de `api/src/...` (de `api/src/movimientos/` salvo que se indique otra carpeta).
- **E**: tests e2e de `api/test/...`.
- **W**: tests de `web/src/...`.

## Requisitos funcionales

| RF | Qué se verifica | Tests | Resultado |
|---|---|---|---|
| RF-1 | Datos del movimiento, lista cerrada de tipos, textos de hasta 2.000 caracteres | U `entidades.spec.ts`, `dto/dto.spec.ts`; E `carga-movimientos`, `migracion-movimientos`; W `formulario-movimiento.test.ts`, `presentacion-movimientos.test.ts`, `FormularioMovimiento.test.tsx` | ✅ |
| RF-2 | Quién cargó y quién modificó por última vez; la visibilidad, la anulación y la restauración cuentan como modificación | E `carga-movimientos`, `modificacion-movimientos`, `anulacion-movimientos`, `historial-cambios-movimientos`; W `presentacion-movimientos.test.ts` (`movementAuditLines`), `PanelMovimientoDetalle.test.tsx` | ✅ |
| RF-3 | Recorte de espacios y saltos de línea de los extremos; saltos intermedios conservados; texto para el cliente vacío como no informado | U `validadores/texto-movimiento.spec.ts`, `dto/dto.spec.ts`; E `carga-movimientos`, `modificacion-movimientos`; W `formulario-movimiento.test.ts`, `TextoLiteral.test.tsx` | ✅ |
| RF-4 | Caracteres permitidos (incluidos `¿ ? ¡ ! %`), sin emojis, tabulaciones ni signos de código; largo en caracteres | U `validadores/texto-movimiento.spec.ts`, `dto/dto.spec.ts`; W `formulario-movimiento.test.ts` | ✅ |
| RF-5 | Fechas del 01/01/1900 al 31/12/2099, incluidas las futuras | U `reglas-movimientos.spec.ts`, `dto/dto.spec.ts`; E `carga-movimientos`; W `formulario-movimiento.test.ts`, `FormularioMovimiento.test.tsx` | ✅ |
| RF-6 | Mensaje por campo y regla, sin repetir el valor recibido | U `dto/dto.spec.ts`; E `carga-movimientos`; W `FormularioMovimiento.test.tsx` | ✅ |
| RF-7 | Texto visible para el cliente: el texto para el cliente o, si no hay, la descripción | U `reglas-movimientos.spec.ts`, `movimiento-detalle.spec.ts`; E `carga-movimientos`, `consulta-movimientos`, `visibilidad-cliente`; W `formulario-movimiento.test.ts`, `PanelMovimientoDetalle.test.tsx` | ✅ |
| RF-8 | Carga no visible salvo que se lo marque, con su autor | E `carga-movimientos`; W `FormularioMovimiento.test.tsx`, `HistorialMovimientos.test.tsx` | ✅ |
| RF-9 | Al marcarlo visible, aviso informativo con el texto que verá el cliente y su origen | W `formulario-movimiento.test.ts`, `FormularioMovimiento.test.tsx` | ✅ |
| RF-10 | Los movimientos no modifican la causa | E `estado-causa-movimientos` | ✅ |
| RF-11 | Modificación de cada dato, solo de un movimiento no anulado de una causa activa | U `dto/dto.spec.ts`; E `modificacion-movimientos`; W `formulario-movimiento.test.ts`, `PanelMovimientoDetalle.test.tsx` | ✅ |
| RF-12 | Un movimiento no cambia de causa | U `dto/dto.spec.ts`; E `modificacion-movimientos`, `carga-movimientos` | ✅ |
| RF-13 | Aviso informativo al cambiar un movimiento visible | W `formulario-movimiento.test.ts`, `FormularioMovimiento.test.tsx`, `PanelMovimientoDetalle.test.tsx` | ✅ |
| RF-14 | Visibilidad en los dos sentidos, salvo anulado o causa desactivada | E `modificacion-movimientos`, `estado-causa-movimientos`; W `movimientos.test.ts` | ✅ |
| RF-15 | Un anulado no se modifica (también con una anulación simultánea) | E `modificacion-movimientos`, `estado-causa-movimientos`; W `PanelMovimientoDetalle.test.tsx` | ✅ |
| RF-16 | Anular sin borrar, conservando datos y visibilidad | E `anulacion-movimientos`, `historial-cambios-movimientos`; W `PanelMovimientoDetalle.test.tsx` | ✅ |
| RF-17 | Un visible anulado se sigue viendo, marcado como anulado | U `movimiento-detalle.spec.ts`; E `anulacion-movimientos`, `visibilidad-cliente` | ✅ |
| RF-18 | Restaurar con la visibilidad que tenía | E `anulacion-movimientos`; W `PanelMovimientoDetalle.test.tsx` | ✅ |
| RF-19 | Anular un anulado o restaurar uno que no lo está: 409 | E `anulacion-movimientos`; W `PanelMovimientoDetalle.test.tsx`, `movimientos.test.ts` | ✅ |
| RF-20 | Cada cambio con acción, autor, momento y valor anterior y nuevo | U `reglas-movimientos.spec.ts`, `entidades.spec.ts`; E `carga-movimientos`, `modificacion-movimientos`, `anulacion-movimientos`, `historial-cambios-movimientos`, `migracion-movimientos` | ✅ |
| RF-21 | El historial de cambios nunca se modifica ni se borra | E `historial-cambios-movimientos` | ✅ |
| RF-22 | Consulta con texto visible, auditoría e historial de cambios | U `movimiento-detalle.spec.ts`; E `consulta-movimientos`, `historial-cambios-movimientos`; W `HistorialCambios.test.tsx`, `PanelMovimientoDetalle.test.tsx` | ✅ |
| RF-23 | Historial de a 20, orden por fecha, carga e id, sin repetir ni omitir entre páginas | E `historial-movimientos`; W `HistorialMovimientos.test.tsx` | ✅ |
| RF-24 | Datos de cada fila, etiquetas "Anulado" y "Fecha futura" | U `movimiento-detalle.spec.ts`, `reglas-movimientos.spec.ts`; E `historial-movimientos`; W `FilaMovimiento.test.tsx`, `presentacion-movimientos.test.ts` | ✅ |
| RF-25 | Filtros por tipo, visibilidad, fechas y "Ocultar anulados", combinables | U `dto/listar-movimientos.dto.spec.ts`; E `historial-movimientos`, `busqueda-movimientos`; W `FiltrosMovimientos.test.tsx`, `HistorialMovimientos.test.tsx`, `movimientos.test.ts` | ✅ |
| RF-26 | Desde posterior a hasta: rechazo con el mensaje de la spec | U `dto/listar-movimientos.dto.spec.ts`; E `historial-movimientos`; W `formulario-movimiento.test.ts`, `FiltrosMovimientos.test.tsx` | ✅ |
| RF-27 | Búsqueda por fragmento en la descripción y el texto para el cliente, sin mayúsculas ni tildes | E `busqueda-movimientos`; W `HistorialMovimientos.test.tsx` | ✅ |
| RF-28 | Causa desactivada: solo consultar (también con una desactivación simultánea) | E `estado-causa-movimientos`, `consulta-movimientos`, `historial-movimientos`; W `HistorialMovimientos.test.tsx`, `PanelMovimientoDetalle.test.tsx`, `PanelCausaDetalle.test.tsx` | ✅ |
| RF-29 | Causa Archivada o Finalizada: gestión normal | E `estado-causa-movimientos`, `visibilidad-cliente` | ✅ |
| RF-30 | Un cliente ve un movimiento solo si es visible y está vinculado a su causa | E `visibilidad-cliente` | ✅ |
| RF-31 | Al cliente solo le llegan id, fecha, tipo, texto visible y la marca de anulado | U `movimiento-detalle.spec.ts`; E `visibilidad-cliente` | ✅ |
| RF-32 | Ve los cargados antes del vínculo; deja de verlos al desvincularlo | E `visibilidad-cliente` | ✅ |
| RF-33 | Oculto, ajeno o inexistente: siempre la misma respuesta | E `visibilidad-cliente` | ✅ |
| RF-34 | Causa inexistente y movimiento inexistente o de otra causa: 404 | E `consulta-movimientos`, `carga-movimientos`, `modificacion-movimientos`, `anulacion-movimientos`, `historial-movimientos` | ✅ |
| RF-35 | Solo administradores y abogados, controlado en el servidor | E `acceso-movimientos` (los 6 endpoints: 401 sin sesión, 403 a un cliente aunque sea parte); W `RutasMovimientos.test.tsx` | ✅ |
| RF-36 | Autores desactivados conservados y marcados | U `movimiento-detalle.spec.ts`; E `acceso-movimientos`; W `FilaMovimiento.test.tsx`, `HistorialCambios.test.tsx`, `presentacion-movimientos.test.ts` | ✅ |

## Requisitos no funcionales

| RNF | Tests | Resultado |
|---|---|---|
| Validación en el servidor y campos desconocidos rechazados | U `dto/dto.spec.ts`, `dto/listar-movimientos.dto.spec.ts`; E `carga-movimientos`, `modificacion-movimientos` | ✅ |
| Textos seguros: siempre como texto literal | U `validadores/texto-movimiento.spec.ts`; W `TextoLiteral.test.tsx`; la regla de ESLint contra `dangerouslySetInnerHTML` (`pnpm lint`) | ✅ |
| Registros del servidor: sin textos de movimientos | U `configuracion/errores-sin-datos.filter.spec.ts`, `base-de-datos/opciones-base-de-datos.spec.ts` (sin `logging`); E `carga-movimientos` (un 400 no repite el texto) | ✅ |
| Aislamiento: la regla de RF-30 decide todo lo que ve un cliente | `ClientVisibilityService` exportado para la spec 004; E `visibilidad-cliente` | ✅ |
| Privacidad por defecto: nada es visible sin una acción expresa | E `carga-movimientos`; W `FormularioMovimiento.test.tsx` | ✅ |
| Persistencia: nada de movimientos en el almacenamiento del navegador | W `HistorialMovimientos.test.tsx` (sin escrituras en `localStorage` ni `sessionStorage`) | ✅ |
| Rendimiento: menos de 2 segundos con 5.000 movimientos | E `rendimiento-movimientos` | ✅ |
| Fechas en hora de Buenos Aires; la fecha del movimiento sin corrimientos | U `reglas-movimientos.spec.ts` (cambio de día a las 03:00 UTC), `base-de-datos/opciones-base-de-datos.spec.ts` (`dateStrings`); E `migracion-movimientos`, `carga-movimientos`; W `presentacion-movimientos.test.ts` (con distintas zonas horarias) | ✅ |
| Idioma: mensajes en español | Todos los tests verifican los mensajes exactos | ✅ |

## Verificaciones adicionales

- **Ningún endpoint de movimientos responde a un cliente:** los 6 endpoints de `/api/panel/causas/:causaId/movimientos` responden 403 a un cliente, aunque sea parte de la causa, y 401 sin sesión (E `acceso-movimientos`).
- **Ninguna respuesta incluye datos de las cuentas:** las respuestas se arman campo por campo y nunca traen emails ni hashes de los autores (U `movimiento-detalle.spec.ts`; E `carga-movimientos`, `consulta-movimientos`, `historial-movimientos`).
- **Migración:** `up` sobre la base con las tablas de las specs 001 y 002 crea las dos tablas con la intercalación `utf8mb4_unicode_ci`, los índices del historial y las 5 claves foráneas. El esquema queda igual a las entidades, y `down` elimina las tablas sin tocar las anteriores (E `migracion-movimientos`). Además, `down` de todas las migraciones deja la base vacía (E `migraciones`).
- **Concurrencia:** una anulación y una modificación simultáneas, y una desactivación de la causa y una carga simultáneas, se ejecutan de a una (E `estado-causa-movimientos`).

## Observaciones

- **Fallos intermitentes en e2e de specs anteriores:** durante la implementación fallaron una vez `administrador-principal` (spec 001) y una vez el `beforeAll` de `integrantes-causas` (spec 002). Los dos pasaron solos y en la corrida completa siguiente, y no usan nada de esta spec. La hipótesis es que el `beforeAll` contra la base remota supera el límite de 10 segundos de los hooks de Vitest (`vitest.config.e2e.ts` solo sube el de los tests a 30 segundos). No se cambió la configuración: queda para decidir.

## Criterios de finalización

- [x] Todos los RF con al menos un test en verde.
- [x] Tests de que un movimiento nuevo es no visible, de la regla de visibilidad para el cliente con sus casos, de lo que se le expone, de las escrituras rechazadas en una causa desactivada, del historial de cambios y su inmutabilidad, de los caracteres rechazados, de los textos fuera de los registros y del acceso.
- [x] `pnpm test` y `pnpm lint` sin errores.
- [x] Demo manual (ver la guía siguiente): completada sin errores el 2026-10-07.

## Guía de la demo manual

Contra la base de **desarrollo**. Cada paso dice qué hacer y qué tenés que ver; si algo no coincide, anotá el número de paso.

### Preparación

1. Aplicar la migración de la spec 003 en la base de desarrollo: `pnpm --filter api migration:run`. Tiene que terminar sin errores.
2. Levantar todo con `pnpm dev` y abrir `http://localhost:5173/ingresar`.
3. Tener dos integrantes, **A** y **B**, y una causa activa con al menos una parte. Ingresar como **A** y abrir el detalle de esa causa: debajo de las partes aparece la sección **Movimientos**, con "Todavía no hay movimientos." y el botón **Nuevo movimiento**.

### 1. Carga y orden (RF-1, RF-5, RF-8, RF-23, RF-24)

1. **Nuevo movimiento** → fecha *10/05/1998*, tipo *Escrito presentado*, una descripción → **Guardar movimiento**. La casilla **Visible para el cliente** tiene que arrancar desmarcada. El movimiento aparece como **Oculto**.
2. Cargá otro con una fecha futura (por ejemplo, dentro de un mes), tipo *Audiencia*: aparece primero, con la etiqueta **Fecha futura**.
3. Cargá dos movimientos con la **misma fecha**: el último cargado aparece arriba del otro.

### 2. Validaciones (RF-3 a RF-6)

1. Intentá guardar con la fecha *1890*: "La fecha debe estar entre el 01/01/1900 y el 31/12/2099". Lo mismo con una fecha de *2100*.
2. Una descripción con un emoji o con `<`: se rechaza con el mensaje de los caracteres permitidos.
3. El *31/12/2099* se acepta.
4. Una descripción con dos párrafos separados por una línea en blanco: el historial y el detalle la muestran con la línea en blanco.

### 3. Visibilidad (RF-7, RF-9)

1. Al marcar **Visible para el cliente** sin texto para el cliente, aparece "El cliente verá la descripción (no hay texto para el cliente):" con la descripción.
2. Al escribir un **Texto para el cliente**, el aviso pasa a "El cliente verá el texto para el cliente:" con ese texto. Guardá: el movimiento aparece como **Visible** y **Con texto para el cliente**.

### 4. Edición de un movimiento visible (RF-11, RF-13)

1. **Ver detalle** del movimiento visible → **Editar** → cambiá la descripción. Aparece "Este movimiento es visible para el cliente; el cambio se verá en el portal". El aviso no impide guardar: **Guardar cambios** guarda.
2. El registro muestra "Modificado por última vez por A el …", con la hora de Buenos Aires.

### 5. Anular y restaurar (RF-15 a RF-19)

1. En el detalle del movimiento visible, **Anular** → "¿Anular este movimiento?" → **Sí, anular**. Aparece la etiqueta **Anulado**, desaparecen **Editar** y **Anular**, y queda **Restaurar**. La sección "Lo que ve el cliente" dice que el cliente lo ve marcado como anulado.
2. Anulá también un movimiento oculto: la sección dice que el cliente no lo ve.
3. **Restaurar** uno de los dos: vuelve a poder editarse y conserva su visibilidad.

### 6. Historial de cambios (RF-20 a RF-22)

1. Con **B**, modificá el mismo movimiento que modificó A (por ejemplo, ocultalo).
2. En el detalle, **Historial de cambios** muestra, del más reciente al más antiguo, cada acción con su fecha y hora, su autor y los valores **Antes** y **Después** de cada dato. La carga muestra los valores iniciales.

### 7. Filtros y búsqueda (RF-25 a RF-27)

1. En la sección **Movimientos** de la causa, probá **Tipo**, **Visibilidad** (con "Visibles para el cliente" aparecen también los visibles anulados), **Desde**, **Hasta** y **Ocultar anulados** (no aparece ningún anulado).
2. Con **Desde** posterior a **Hasta**: "La fecha desde no puede ser posterior a la fecha hasta".
3. Buscá un fragmento de una descripción, en mayúsculas y sin tildes: lo encuentra. Buscá un fragmento del texto para el cliente: también.

### 8. Causa desactivada (RF-10, RF-28)

1. Antes de desactivar, fijate el registro de la causa ("Modificada por última vez…"): cargar y modificar movimientos no lo cambió, y la causa no subió en el listado.
2. Desactivá la causa: la sección **Movimientos** sigue mostrando el historial pero sin **Nuevo movimiento**, y el detalle de un movimiento dice que solo se puede consultar, sin acciones.
3. Reactivá la causa.

### 9. Acceso (RF-35)

1. Ingresá como un **cliente** y escribí la dirección del detalle de un movimiento (`/panel/causas/<id>/movimientos/<id>`). Te lleva al portal.

## Veredicto

La spec 003 está **cumplida**: los 36 RF y los RNF tienen tests en verde, `pnpm test` y `pnpm lint` pasan, y la demo manual se completó sin errores el 2026-10-07.
