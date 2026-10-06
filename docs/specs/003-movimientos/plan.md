# Plan 003 — Movimientos

Implementa `spec.md` de esta carpeta. Respeta `docs/constitution.md` y se apoya en lo construido en las specs 001 y 002: guards globales y roles, auditoría, `ClientLinkService` (vínculo cliente-causa), bloqueo por causa, cliente HTTP y patrones de listado. Cada sección indica entre corchetes los RF que cubre.

No se agregan dependencias ni variables de entorno.

## Arquitectura

### Módulos de NestJS (`api/src/`)

| Carpeta | Contenido | RF |
|---|---|---|
| `migraciones/` | Migración `crear-movimientos-y-cambios`. | RF-1, RF-2, RF-20 |
| `movimientos/` (nuevo) | Ver detalle debajo. | RF-1 a RF-36 |
| `causas/` | Sin cambios. `MovimientosModule` importa `CausasModule` para usar `ClientLinkService`, que ya se exporta. | RF-30 |
| `base-de-datos/opciones-base-de-datos.ts` | Suma `dateStrings: ['DATE']`. Ver "Fecha del movimiento". | RF-1, RNF de fechas |
| `base-de-datos/esquema.ts` | Suma las dos entidades nuevas y la migración al final de las listas. | — |
| `configurar-aplicacion.ts` | Registra el filtro global de errores sin datos. Ver "Errores y registros del servidor". | RNF de registros |
| `app.module.ts` | Importa `MovimientosModule`. | — |

Contenido de `movimientos/`:
- Entidades: `movimiento.entity.ts` y `cambio-movimiento.entity.ts`.
- `movimientos.controller.ts` y `movimientos.service.ts`: carga, consulta, historial de la causa, modificación, anulación y restauración.
- `visibilidad-cliente.service.ts`: la regla de RF-30 a RF-33, para la spec 004. Esta spec no tiene endpoints para clientes.
- `reglas-movimientos.ts`: reglas puras, sin acceso a la base (texto visible, diferencias entre versiones, rango de fechas, fecha futura).
- `movimiento-detalle.ts`: armado explícito de las respuestas del panel y del cliente.
- `validadores/texto-movimiento.ts`: normalización, caracteres permitidos y largo.
- `dto/`.

`movimientos.controller.ts` lleva `@Roles('admin', 'abogado')`: los guards globales de la spec 001 rechazan a clientes (403) y visitantes (401) antes de llegar al controller [RF-35]. Los controllers solo validan con DTO y delegan (principio 3).

El filtro global de errores vive en `configuracion/errores-sin-datos.filter.ts` (nuevo), junto a `errores-de-validacion.ts`.

### Carpetas de `web/src/`

| Carpeta | Contenido | RF |
|---|---|---|
| `servicios/movimientos.ts` (nuevo) | Tipos y una función por endpoint de `/api/panel/causas/:id/movimientos`. | RF-8, RF-11, RF-14, RF-16, RF-18, RF-22 a RF-27 |
| `servicios/formulario-movimiento.ts` (nuevo) | Validación del formulario con los mismos mensajes que la API, armado de los cuerpos (en la edición, solo lo que cambió), validación de los filtros y decisión de los avisos de RF-9 y RF-13. | RF-1, RF-3 a RF-7, RF-9, RF-13, RF-26 |
| `servicios/presentacion-movimientos.ts` (nuevo) | Etiquetas de tipo, de acción y de campo del historial de cambios. Formato de la fecha del movimiento. Recorte de la descripción. | RF-1, RF-22, RF-24 |
| `componentes/` | Nuevos: `HistorialMovimientos.tsx` (sección de la causa: filtros, buscador, lista, paginado y alta), `FiltrosMovimientos.tsx`, `FormularioMovimiento.tsx` (alta y edición, con los avisos), `FilaMovimiento.tsx`, `HistorialCambios.tsx` y `TextoLiteral.tsx`. `ProveedorServicios.tsx` suma el servicio de movimientos. | RF-8, RF-9, RF-11, RF-13, RF-22 a RF-27 |
| `paginas/` | Nueva: `PanelMovimientoDetalle` (datos, texto visible, edición, anular y restaurar, historial de cambios). `PanelCausaDetalle` suma la sección `HistorialMovimientos`. | RF-11, RF-15 a RF-19, RF-22, RF-23, RF-28 |
| `RutasAplicacion.tsx` | Ruta nueva del panel. | — |

Nada en `src/servicios/` importa React (principio 3).

### Archivos existentes que se modifican
- `api/src/base-de-datos/esquema.ts`, `api/src/app.module.ts` y `api/src/configurar-aplicacion.ts`.
- `api/src/base-de-datos/opciones-base-de-datos.ts`, con su test.
- Las utilidades de los e2e (`api/test/utilidades/datos-de-prueba.ts`), que suman una función para crear movimientos.
- `web/src/paginas/PanelCausaDetalle.tsx`, con su test.
- `web/src/componentes/ProveedorServicios.tsx`.
- `web/src/RutasAplicacion.tsx`.
- `web/eslint.config.js`. Ver "Textos seguros".

Ninguna tabla de las specs 001 y 002 cambia.

## Entidades de TypeORM y migración [RF-1, RF-2, RF-20]

Mismas convenciones que en las specs anteriores: `DATETIME` en hora de Buenos Aires, tablas `utf8mb4_unicode_ci`, ids autoincrementales y claves foráneas `NO ACTION` (nada se borra).

### `movimientos`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int autoincremental | PK. También es el orden de registro en el sistema (RF-23). |
| `causaId` | FK `causas` | Un movimiento pertenece a una sola causa y no cambia (RF-1, RF-12). |
| `fecha` | date | Día del hecho, sin hora. RF-1, RF-5 |
| `tipo` | enum `escrito_presentado`, `providencia`, `resolucion`, `sentencia`, `notificacion`, `audiencia`, `pericia`, `oficio`, `otro` | RF-1 |
| `descripcion` | varchar(2000) | RF-1, RF-3, RF-4 |
| `textoCliente` | varchar(2000), nullable | `NULL` si no se informa. RF-1, RF-3 |
| `visible` | boolean, default false | RF-8, RF-14 |
| `anulado` | boolean, default false | RF-16, RF-18 |
| `creadoPorId`, `creadoEn` | FK `usuarios`, datetime(6) | RF-2. Con microsegundos, para el desempate de RF-23. |
| `modificadoPorId`, `modificadoEn` | FK `usuarios` nullable, datetime nullable | RF-2: cualquier cambio de datos, visibilidad, anulación o restauración. |

Índice `IDX_movimientos_historial` sobre `(causaId, fecha, creadoEn, id)`: sirve al filtro por causa y al orden del historial (RF-23).

No hay columnas para quién anuló o restauró: cada anulación y restauración queda en `movimiento_cambios`, con su autor y su momento, y además actualiza `modificadoPor/En` (RF-2, RF-16, RF-18).

### `movimiento_cambios`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int autoincremental | PK |
| `movimientoId` | FK `movimientos` | |
| `accion` | enum `carga`, `modificacion`, `anulacion`, `restauracion` | Un cambio de visibilidad es una `modificacion` (RF-2, RF-20). |
| `usuarioId` | FK `usuarios` | Quién hizo el cambio. |
| `fechaHora` | datetime(6) | El mismo instante que se guarda en `modificadoEn` (o `creadoEn` en la carga). |
| `cambios` | json | Lista de `{ campo, anterior, nuevo }`, solo con los datos que cambiaron. En la carga, `anterior` es `null` y están todos los datos (RF-20). |

Índice `IDX_movimiento_cambios_movimiento` sobre `(movimientoId, id)`.

`campo` es uno de `fecha`, `tipo`, `descripcion`, `textoCliente`, `visible` y `anulado`. Los valores se guardan tal como en `movimientos`: la fecha como `AAAA-MM-DD`, el tipo con su clave y `textoCliente` vacío como `null`.

La migración crea las dos tablas con sus índices y claves foráneas, y es reversible (`down` las elimina en orden inverso). `synchronize` siempre en `false`.

### Fecha del movimiento [RF-1, RF-5, RNF de fechas]
La fecha es un día del calendario y no debe correrse por zona horaria. Por defecto, `mysql2` convierte una columna `DATE` en un `Date` a la medianoche del huso de la conexión (`-03:00`). Si después se la formatea en otro huso, puede mostrarse el día anterior. Por eso:
- `opciones-base-de-datos.ts` suma `dateStrings: ['DATE']`: solo las columnas `DATE` llegan como texto `AAAA-MM-DD`. Las `DATETIME` de las specs 001 y 002 no cambian. Hoy ninguna tabla tiene columnas `DATE`, así que el cambio no afecta lo existente.
- La API recibe y devuelve la fecha como `AAAA-MM-DD`. Los rangos se comparan como texto, que en ese formato equivale a comparar fechas.
- La interfaz la muestra como `dd/mm/aaaa` reordenando el texto, sin `new Date(fecha)`: interpretar `AAAA-MM-DD` como fecha en UTC y mostrarla en Buenos Aires da el día anterior.

## Contrato de la API

Errores con el formato de las specs anteriores (`statusCode`, `message`, en español). Ningún mensaje repite el texto recibido (RNF de registros). Los ids de ruta que no son números responden 404 con el mensaje de la causa o del movimiento.

### Movimientos — `/api/panel/causas/:causaId/movimientos` (roles `admin` y `abogado`) [RF-35]

| Método y ruta | Cuerpo | Respuesta | Errores | RF |
|---|---|---|---|---|
| `GET /?pagina&buscar&tipo&visibilidad&desde&hasta&ocultarAnulados` | — | 200 `{ items: MovimientoResumen[], total, pagina, porPagina: 20 }` | 400, 404 | RF-23 a RF-27, RF-28 |
| `GET /:movimientoId` | — | 200 `MovimientoDetalle` | 404 | RF-22, RF-28 |
| `POST /` | `{ fecha, tipo, descripcion, textoCliente?, visible? }` | 201 `MovimientoDetalle` | 400, 404, 409 | RF-1, RF-3 a RF-6, RF-8, RF-20, RF-28 |
| `PATCH /:movimientoId` | Parcial: `{ fecha?, tipo?, descripcion?, textoCliente?, visible? }`. `null` o vacío borra el texto para el cliente. | 200 `MovimientoDetalle` | 400, 404, 409 | RF-11, RF-12, RF-14, RF-15, RF-20, RF-28 |
| `POST /:movimientoId/anular` | — | 200 `MovimientoDetalle` | 404, 409 | RF-16, RF-17, RF-19, RF-20, RF-28 |
| `POST /:movimientoId/restaurar` | — | 200 `MovimientoDetalle` | 404, 409 | RF-18 a RF-20, RF-28 |

- Las rutas se anidan bajo la causa, como las partes en la spec 002. Así cada operación indica la causa y el service puede controlar RF-28 y RF-34.
- `causaId` y `anulado` no se declaran en el DTO de `PATCH`, y enviarlos responde "El campo … no está permitido" [RF-11, RF-12]. La visibilidad se cambia con el mismo `PATCH`: el cambio queda como una modificación más (RF-2, RF-14).
- La consulta y el historial funcionan también sobre una causa desactivada (RF-28).

**Parámetros del historial** [RF-23 a RF-27]:
- `pagina`: entero desde 1, por defecto 1.
- `buscar`: hasta 100 caracteres, recortado.
- `tipo`: uno de la lista.
- `visibilidad`: `todos` (por defecto), `visibles` u `ocultos`.
- `desde` y `hasta`: `AAAA-MM-DD`, opcionales e inclusive.
- `ocultarAnulados`: `true` o `false` (por defecto `false`).

**Tipos:**
- `AutorResumen`: `{ id, nombre, apellido, activo }`. `activo` permite mostrar al autor como desactivado (RF-36).
- `MovimientoResumen`: `{ id, fecha, tipo, descripcion, visible, tieneTextoCliente, anulado, esFechaFutura, creadoPor: AutorResumen, creadoEn }`.
  - La descripción va completa. La interfaz la recorta y ofrece verla completa sin otra petición (RF-24). Con 20 por página y 2.000 caracteres como máximo, son unos 40 KB por página.
  - `esFechaFutura` lo calcula la API con el día actual de Buenos Aires (RF-24).
- `MovimientoDetalle`: `MovimientoResumen` más `{ causaId, causaActiva, textoCliente, textoVisible, origenTextoVisible: 'textoCliente' | 'descripcion', modificadoPor: AutorResumen | null, modificadoEn, cambios: CambioMovimiento[] }`. `causaActiva` permite a la interfaz ocultar las acciones (RF-28).
- `CambioMovimiento`: `{ id, accion, usuario: AutorResumen, fechaHora, cambios: { campo, anterior, nuevo }[] }`, del más reciente al más antiguo (RF-22).
- `MovimientoCliente` (solo para la spec 004, sin endpoint en esta): `{ id, fecha, tipo, texto, anulado }` (RF-31).

**Mensajes de 400** (por campo, como en las specs anteriores) [RF-6]:
- Fecha: "Indicá la fecha del movimiento", "La fecha no es válida" (formato distinto de `AAAA-MM-DD` o día inexistente) y "La fecha debe estar entre el 01/01/1900 y el 31/12/2099".
- Tipo: "El tipo debe ser escrito presentado, providencia, resolución, sentencia, notificación, audiencia, pericia, oficio u otro".
- Descripción: "Indicá la descripción del movimiento" y "La descripción no puede tener más de 2000 caracteres".
- Texto para el cliente: "El texto para el cliente no puede tener más de 2000 caracteres".
- Caracteres: "<Campo> solo puede tener letras, números, espacios, saltos de línea y los símbolos . , ; : / - _ ( ) \" ' $ & # ° º ª ¿ ? ¡ ! %" (RF-4).
- Visibilidad: "La visibilidad debe ser sí o no".
- Filtros: "La fecha desde no puede ser posterior a la fecha hasta" (RF-26), y los de formato de cada parámetro.
- Campos desconocidos, con el mensaje de la spec 001.

**Mensajes de 409:**
- "La causa está desactivada" (RF-28). Es el texto de la spec 003, distinto del de la spec 002 para editar la causa.
- "El movimiento está anulado. Restauralo para modificarlo" (RF-15).
- "El movimiento ya está anulado" y "El movimiento no está anulado" (RF-19).

**Mensajes de 404** [RF-34]:
- "No existe esa causa".
- "No existe ese movimiento": tanto un movimiento inexistente como uno de otra causa, sin distinguirlos.

## Reglas de negocio

Las reglas que no necesitan la base viven en `movimientos/reglas-movimientos.ts` como funciones puras, igual que `reglas-causas.ts` en la spec 002:
- `visibleText(movimiento)`: el texto para el cliente si no es `NULL`, si no la descripción, junto con su origen [RF-7].
- `diffMovement(antes, despues)`: la lista `{ campo, anterior, nuevo }` de los datos que cambiaron [RF-20].
- `isDateInRange(fecha)` y `isExistingDate(fecha)` [RF-5, RF-6].
- `todayInBuenosAires(ahora)` e `isFutureDate(fecha, ahora)` [RF-24]. Usan `Intl.DateTimeFormat` con `America/Argentina/Buenos_Aires`, igual que `presentacion.ts` en la web. Reciben `ahora` como parámetro para testear el cambio de día a las 00:00 de Buenos Aires (03:00 UTC).

### Textos [RF-3, RF-4]
`validadores/texto-movimiento.ts` aplica, en este orden, al recibir la descripción o el texto para el cliente:
1. Normaliza a NFC, como `texto-causa.ts`, para que una letra con tilde combinable cuente como una sola.
2. Convierte `\r\n` y `\r` en `\n`, para que cada salto de línea cuente como un carácter, venga de donde venga.
3. Quita los espacios y saltos de línea del principio y del final, y solo esos (RF-3). Una tabulación en un extremo no se quita: se rechaza en el paso 4.
4. Valida con `^[\p{L}\p{N} \n.,;:/\-_()"'$&#°ºª¿?¡!%]*$` (bandera `u`). Excluye emojis, tabulaciones y los signos que permiten inyectar código (`< > { } [ ] \ | = *` y el acento grave, entre otros).
5. Cuenta el largo en puntos de código (`[...texto].length`), igual que MySQL cuenta caracteres en `utf8mb4`.

El texto para el cliente vacío después del paso 3 pasa a `NULL`. `web/src/servicios/formulario-movimiento.ts` repite la misma regla.

### Bloqueos [RF-15, RF-28, casos de concurrencia]
Toda escritura (carga, modificación, anulación y restauración) corre en una transacción:
```
conCausaYMovimiento(causaId, movimientoId?, trabajo):
  causa = SELECT … FROM causas WHERE id = causaId FOR SHARE; si no existe: 404 "No existe esa causa"
  si no causa.activa: 409 "La causa está desactivada"                                   // RF-28
  si movimientoId:
    mov = SELECT … FROM movimientos WHERE id = movimientoId AND causaId = causaId FOR UPDATE
    si no existe: 404 "No existe ese movimiento"                                         // RF-34
  trabajo(mov)
```
- **Bloqueo compartido sobre la causa** (`pessimistic_read`): la desactivación de la spec 002 toma un bloqueo exclusivo sobre la misma fila. Por eso una desactivación y una escritura de movimientos simultáneas se ejecutan de a una. Si la desactivación queda primero, la escritura ve `activa = false` y se rechaza. Varias escrituras de movimientos en la misma causa no se bloquean entre sí.
- **Bloqueo exclusivo sobre el movimiento**: una anulación y una modificación simultáneas se ejecutan de a una. Si la anulación queda primero, la modificación ve `anulado = true` y se rechaza (RF-15).
- El service de movimientos nunca escribe en `causas`: ni `modificadoPor/En` ni ningún otro campo [RF-10].

### Carga [RF-8, RF-20]
```
cargar(actor, causaId, datos):
  conCausaYMovimiento(causaId):
    ahora = fecha y hora actual
    mov = insertar { causaId, ...datos, visible: datos.visible ?? false, anulado: false,
                     creadoPorId: actor.id, creadoEn: ahora }                          // RF-8
    insertar cambio { accion: 'carga', usuario: actor, fechaHora: ahora,
                      cambios: cada dato con anterior = null }                         // RF-20
```

### Modificación [RF-11 a RF-15, RF-20]
```
modificar(actor, causaId, movimientoId, cambios):
  conCausaYMovimiento(causaId, movimientoId):
    si mov.anulado: 409 "El movimiento está anulado. Restauralo para modificarlo"      // RF-15
    despues = mov con los cambios aplicados (textoCliente vacío → NULL)
    diferencias = diffMovement(mov, despues)
    si no hay diferencias: devolver el detalle sin registrar nada
    ahora = fecha y hora actual
    guardar despues con modificadoPorId = actor.id, modificadoEn = ahora              // RF-2
    insertar cambio { accion: 'modificacion', usuario: actor, fechaHora: ahora, cambios: diferencias }
```
Un `PATCH` que no cambia nada no deja rastro: no es una modificación.

### Anulación y restauración [RF-16 a RF-19]
```
anular(actor, causaId, movimientoId):
  conCausaYMovimiento(causaId, movimientoId):
    si mov.anulado: 409 "El movimiento ya está anulado"                                 // RF-19
    mov.anulado = true; modificadoPor/En                                                // RF-2, RF-16
    insertar cambio { accion: 'anulacion', cambios: [{ campo: 'anulado', anterior: false, nuevo: true }] }

restaurar: igual, con "El movimiento no está anulado" si no lo está, y anulado = false   // RF-18
```
La visibilidad no se toca: un movimiento visible anulado sigue visible (RF-17), y al restaurarlo conserva la que tenía (RF-18).

### Historial de cambios [RF-20 a RF-22]
- Cada escritura inserta su cambio en la misma transacción que el movimiento: no puede quedar un movimiento cambiado sin su registro, ni al revés.
- RF-21 se garantiza en el código: el service solo inserta en `movimiento_cambios`. No hay ninguna operación ni endpoint que modifique o borre cambios, y un test lo verifica.
- `GET /:movimientoId` devuelve los cambios ordenados por `id DESC`, con su autor.

### Historial de la causa [RF-23 a RF-27]
```
WHERE m.causaId = :causaId
  [AND m.tipo = :tipo]
  [AND m.visible = 1]                      visibilidad = visibles
  [AND m.visible = 0]                      visibilidad = ocultos
  [AND m.fecha >= :desde] [AND m.fecha <= :hasta]
  [AND m.anulado = 0]                      ocultarAnulados = true
  [AND (m.descripcion LIKE :t OR m.textoCliente LIKE :t)]
ORDER BY m.fecha DESC, m.creadoEn DESC, m.id DESC
LIMIT 20 OFFSET (pagina - 1) * 20
```
- Antes de consultar, el service verifica que la causa exista (404), esté activa o no.
- Sin `ocultarAnulados`, "visibles" incluye los anulados visibles. Con `ocultarAnulados`, no aparece ningún anulado [RF-25].
- Si `desde > hasta`: 400 [RF-26].
- El orden termina en `id`, que es único. Así dos movimientos con la misma fecha y el mismo `creadoEn` siempre quedan en el mismo orden, y ninguno se repite ni se omite entre páginas [RF-23].
- `buscar` se normaliza a NFC y usa `LIKE '%texto%'` con los comodines escapados, como en las specs 001 y 002. La intercalación `utf8mb4_unicode_ci` hace que no distinga mayúsculas, minúsculas ni tildes [RF-27].
- **Rendimiento:** el índice `IDX_movimientos_historial` resuelve el filtro por causa y el orden. La búsqueda por fragmento recorre como máximo los movimientos de una causa: con 5.000 de hasta 2.000 caracteres son unos 20 MB en el peor caso, dentro de los 2 segundos del RNF. Un e2e lo mide.

### Visibilidad para el cliente [RF-30 a RF-33]
`visibilidad-cliente.service.ts` (`ClientVisibilityService`) expone la única regla de qué movimientos ve un cliente. Lo usa la spec 004, igual que `ClientLinkService` en la spec 002:
```
listVisible(clienteId, causaId, pagina):
  si no ClientLinkService.isLinked(clienteId, causaId): devolver null       // la 004 decide la respuesta
  movimientos de la causa con visible = 1 (anulados incluidos), en el orden del historial
  devolver página de toMovimientoCliente(m)                                  // RF-31, RF-32

findVisible(clienteId, movimientoId):
  m = movimiento con id = movimientoId y visible = 1
  si no existe o no ClientLinkService.isLinked(clienteId, m.causaId):
    404 "No existe ese movimiento"                                           // RF-33: misma respuesta en todos los casos
  devolver toMovimientoCliente(m)
```
- El vínculo se decide siempre con `ClientLinkService` (RF-26 de la spec 002), así que desvincular al cliente, desactivar la causa o desactivar su cuenta corta el acceso desde su siguiente petición [RF-32].
- `toMovimientoCliente` arma `{ id, fecha, tipo, texto: visibleText(m).texto, anulado }` campo por campo. Nunca incluye la descripción cuando hay texto para el cliente, ni autores, fechas de registro o cambios [RF-31].
- No hay controller para clientes en esta spec. Los tests prueban el service sobre la base de tests, como el vínculo en la spec 002.

### Respuestas
`movimiento-detalle.ts` arma `MovimientoResumen`, `MovimientoDetalle`, `CambioMovimiento` y `MovimientoCliente` campo por campo, nunca a partir de la entidad completa. Así no salen emails ni hashes al unir con `usuarios`.

## Errores y registros del servidor [RNF de registros]

Los textos de los movimientos no deben quedar en los registros del servidor. Hoy hay dos riesgos:
- Ante un error que no es `HttpException`, el filtro de excepciones por defecto de NestJS registra el mensaje y la pila. Un error de MySQL puede incluir parte del valor recibido, por ejemplo "Incorrect string value: …".
- El registro de consultas de TypeORM, si se activara, escribiría los parámetros.

Por eso:
- `configuracion/errores-sin-datos.filter.ts` es un filtro global (`@Catch()`) que se registra en `configurar-aplicacion.ts`:
  - Las `HttpException` se responden igual que hoy, con su estado y su cuerpo.
  - Cualquier otro error responde 500 `{ statusCode: 500, message: "Ocurrió un error inesperado" }`. Solo se registran el método, el patrón de la ruta (`/api/panel/causas/:causaId/movimientos/:movimientoId`, sin la URL real ni el query string, que puede llevar `buscar`), el nombre de la clase del error y su código de MySQL, si tiene. Nunca se registran el mensaje, la pila, el cuerpo ni los parámetros.
- `opciones-base-de-datos.ts` no activa `logging`, y su test lo verifica.
- Los mensajes de 400 se arman sin interpolar el valor recibido. Un e2e envía textos inválidos con una marca y verifica que la marca no aparece en la respuesta.

El filtro es global, y no solo del controller de movimientos, para que proteja también a la spec 004 sin depender de acordarse de aplicarlo. Para las specs 001 y 002 solo cambia lo que se registra ante un error inesperado.

## Textos seguros [RNF de textos seguros, RF-4]

RF-4 ya rechaza los signos que permiten inyectar código. Además, como segunda barrera:
- Los textos se muestran con el componente `TextoLiteral`, que los pone como hijo de un elemento de React (React los escapa) con `whitespace-pre-wrap break-words`. Así se ven los saltos de línea y las líneas en blanco tal como se cargaron (RF-3).
- `web/eslint.config.js` suma la regla `no-restricted-syntax` contra el atributo `dangerouslySetInnerHTML` en todo `web/src`. Es una regla del propio ESLint y no agrega dependencias. Hoy no se usa en ningún lugar.

## Frontend

### Rutas
| Ruta | Página | Acceso |
|---|---|---|
| `/panel/causas/:id` | `PanelCausaDetalle` suma la sección `HistorialMovimientos`, debajo de las partes. | admin, abogado |
| `/panel/causas/:id/movimientos/:movimientoId` | `PanelMovimientoDetalle`: datos, texto visible para el cliente con su origen, editar, anular o restaurar, e historial de cambios. | admin, abogado |

Las rutas quedan dentro de `DisenoPanel`, así que `RutaProtegida` aplica las reglas de la spec 001. Los filtros, el buscador y la página viven en el estado del componente, como en `PanelCausas`, y no en `localStorage` (principio 5). Cambiar un filtro o el buscador vuelve a la página 1.

### Comportamiento de la interfaz
- **Historial** (RF-23 a RF-27):
  - Cada fila (`FilaMovimiento`) muestra la fecha, el tipo, la descripción recortada a 200 caracteres con "Ver completa", "Visible" u "Oculto", "Con texto para el cliente", y el autor, con "(desactivado)" si corresponde. También las etiquetas "Anulado" y "Fecha futura".
  - Filtros: tipo, visibilidad, desde, hasta, "Ocultar anulados" y buscador. `validateMovementFilters` detecta desde > hasta antes de pedir, con el mismo mensaje que la API.
- **Alta y edición** (`FormularioMovimiento`, RF-8, RF-11):
  - Campos: fecha (`input type="date"` con `min` 1900-01-01 y `max` 2099-12-31), tipo, descripción y texto para el cliente (áreas de texto con contador de caracteres sobre 2.000), y la casilla "Visible para el cliente", desmarcada al cargar.
  - `validateMovementForm` usa los mismos mensajes que la API. La edición envía solo los datos que cambiaron.
- **Avisos** (RF-9, RF-13). Los dos son informativos: no bloquean ni piden confirmación.
  - Con la casilla marcada, `visibleTextPreview(form)` arma el aviso "El cliente verá:" con el texto visible y su origen: "texto para el cliente" o "descripción (no hay texto para el cliente)". Se actualiza mientras se escribe.
  - En la edición, si el movimiento ya era visible, sigue siéndolo y cambió la fecha, el tipo, la descripción o el texto para el cliente, `needsVisibleChangeWarning(original, form)` muestra "Este movimiento es visible para el cliente; el cambio se verá en el portal".
- **Anulado** (RF-15): el detalle oculta "Editar" y muestra "Restaurar". El control real lo hace la API.
- **Causa desactivada** (RF-28): la sección del historial no muestra "Nuevo movimiento", y el detalle de un movimiento no muestra acciones (según `causaActiva`). El control real lo hace la API.
- **Historial de cambios** (`HistorialCambios`, RF-22): cada cambio muestra fecha y hora, acción, autor y, por cada dato, su valor anterior y su valor nuevo. Los textos se muestran completos con `TextoLiteral`, y la visibilidad como "Sí" o "No".
- **Fechas:** la fecha del movimiento se muestra con `formatMovementDate('2024-03-01')` → `01/03/2024`, sin `Date`. Las fechas y horas de registro usan `formatDateTime` de la spec 001.

## Dependencias nuevas

Ninguna. Todo se resuelve con lo instalado en las specs 001 y 002.

## Otras decisiones técnicas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Historial de cambios en una tabla aparte, con los datos que cambiaron en JSON | Una fila por dato cambiado | RF-20 pide valor anterior y nuevo de cada dato. El JSON lo guarda en una sola fila por acción, que es como se lee y se muestra, y no se consulta por campo. |
| Guardar solo los datos que cambiaron | Copia completa del movimiento en cada cambio | Es lo que muestra RF-22. Ocupa menos, y la versión completa en cualquier momento se reconstruye aplicando los cambios desde la carga. |
| Inmutabilidad del historial garantizada en el código | Triggers de MySQL que rechacen `UPDATE` y `DELETE` | Crear triggers con el registro binario activo pide privilegios que el usuario de Easypanel puede no tener, y complica las migraciones. No existe ningún camino de escritura sobre el historial, y un test lo cubre. |
| Columna `DATE` con `dateStrings: ['DATE']` | `DATETIME` o `DATE` leída como `Date` | La fecha es un día sin hora. Leerla como texto evita los corrimientos de zona horaria del RNF, y no afecta las columnas `DATETIME` existentes. |
| Bloqueo compartido sobre la causa y exclusivo sobre el movimiento | `withLockedCausa` de la spec 002 (exclusivo sobre la causa) | `withLockedCausa` actualiza `modificadoPor/En` de la causa, contra RF-10, y pondría en fila todas las escrituras de movimientos de la causa. El bloqueo compartido alcanza para ordenar contra la desactivación. |
| Bloqueo exclusivo sobre el movimiento | Bloqueo optimista con versión | La spec acepta "gana el último cambio" en las ediciones simultáneas. Solo hace falta ordenar la anulación contra la modificación, y el bloqueo lo hace sin pedir reintentos a la interfaz. |
| Avisos de RF-9 y RF-13 solo en la interfaz | Una marca de confirmación que exija el servidor, como las preguntas de la spec 002 | La spec los define como informativos, sin confirmación. |
| `esFechaFutura` calculado por la API | Calcularlo en el navegador | El día actual sale del reloj del servidor, en hora de Buenos Aires, y no del equipo del usuario. Además queda testeado en un solo lugar. |
| `ClientVisibilityService` en esta spec | Escribir la regla en la spec 004 | La regla de RF-30 a RF-33 es de esta spec, y sus criterios de finalización piden testearla. Igual que `ClientLinkService` en la 002, la 004 solo la usa y no inventa la suya. |
| Mismo 404 para un movimiento oculto, ajeno o inexistente | Respuestas distintas | RF-33: un cliente no puede deducir que existen movimientos ocultos ni causas ajenas. |
| Un solo `PATCH` también para la visibilidad | Endpoint aparte para mostrar u ocultar | La visibilidad es un dato más del movimiento (RF-11, RF-14), con las mismas reglas para los anulados y el mismo registro en el historial de cambios. |
| Descripción completa en el listado | Recortarla en la API y pedir el detalle para verla | Unos 40 KB por página como máximo, y "Ver completa" no necesita otra petición. |
| `varchar(2000)` para los textos | `TEXT` | El largo máximo queda también en el esquema, como última barrera si fallara la validación. |
| Filtro global de errores sin datos | Filtro solo en el controller de movimientos | Protege también a la spec 004, que expone estos textos a clientes, sin depender de aplicarlo en cada controller. |
| Regla `no-restricted-syntax` de ESLint | `eslint-plugin-react` con `react/no-danger` | Mismo control sin agregar una dependencia (principio 1). |
| Rutas anidadas bajo la causa | `/api/panel/movimientos/:id` | Cada operación indica la causa, lo que permite controlar RF-28 y RF-34 sin otra consulta, igual que las partes en la spec 002. |

## Estrategia de tests

### api — unitarios (Vitest)
- `reglas-movimientos.ts`:
  - `visibleText`: con y sin texto para el cliente [RF-7].
  - `diffMovement`: cada campo, varios a la vez, sin cambios, y texto para el cliente de valor a `NULL` [RF-20].
  - `isExistingDate`: 31/02 y 29/02 en año bisiesto y no bisiesto. `isDateInRange`: 1899-12-31, 1900-01-01, 2099-12-31 y 2100-01-01 [RF-5, RF-6].
  - `isFutureDate`: el día siguiente, el mismo día, y el cambio de día a las 02:59 y 03:00 UTC [RF-24].
- `texto-movimiento.ts` [RF-3, RF-4]:
  - Acepta letras con tilde, ñ, ü, saltos de línea, líneas en blanco intermedias y cada símbolo permitido, incluidos `¿ ? ¡ ! %`.
  - Rechaza emojis, tabulaciones, `<`, `>`, `{`, `}`, `[`, `]`, `\`, `|`, `=` y el acento grave.
  - Recorta solo espacios y saltos de línea de los extremos. `\r\n` cuenta como un carácter. 2.000 caracteres pasan y 2.001 no, también con letras de dos puntos de código en UTF-16.
- DTO [RF-1, RF-5, RF-6, RF-11, RF-12]:
  - Fecha ausente, con formato inválido, inexistente y fuera de rango. Tipo fuera de la lista. Descripción vacía o solo con espacios.
  - Texto para el cliente vacío a `NULL`.
  - En `PATCH`, `causaId` y `anulado` rechazados como campos desconocidos.
  - Parámetros del historial: visibilidad inválida, fechas inválidas y desde > hasta.
- `movimiento-detalle.ts` [RF-31, RF-36]:
  - `toMovimientoCliente` no incluye la descripción cuando hay texto para el cliente, ni autores, fechas de registro o cambios.
  - Las respuestas del panel no incluyen email ni hashes de los autores, y marcan a los autores desactivados.
- `errores-sin-datos.filter.ts` [RNF de registros]:
  - Una `HttpException` se responde igual que hoy.
  - Un `QueryFailedError` cuyo mensaje contiene un texto de prueba responde 500 genérico, y lo registrado no contiene el texto, la URL real ni el query string.

### api — e2e (Vitest + Supertest, base de tests)
Mismo esquema que en las specs anteriores: migraciones sobre la base de tests, tablas vaciadas al empezar cada suite, ejecución en serie.
- **Carga** [RF-1, RF-2, RF-8, RF-20]: completa, no visible por defecto, visible marcada, autoría, y cambio `carga` con los valores iniciales. La fecha 2024-03-01 se lee igual que se guardó [RNF de fechas].
- **Validación** [RF-3 a RF-6]: los rechazos de formato, con un texto que lleva una marca que no aparece en la respuesta [RNF de registros].
- **Modificación** [RF-11 a RF-15]: cada dato, la visibilidad en los dos sentidos, un `PATCH` sin cambios que no deja registro, el rechazo de `causaId`, y un movimiento anulado (409).
- **Anulación y restauración** [RF-16 a RF-19]: conservan los datos y la visibilidad, y quedan en el historial de cambios. Anular dos veces y restaurar uno no anulado responden 409.
- **Historial de cambios** [RF-20 a RF-22]: una secuencia de carga, modificación, cambio de visibilidad, anulación y restauración por dos integrantes. Verifica el orden, los autores y los valores anterior y nuevo, y que los cambios anteriores siguen idénticos después de cada operación.
- **Historial de la causa** [RF-23 a RF-27]:
  - Orden por fecha, por carga y por id con la misma fecha y el mismo `creadoEn`. Con 45 movimientos, las tres páginas no repiten ni omiten ninguno.
  - Cada filtro y su combinación, incluidos "solo visibles" con anulados visibles, con y sin "ocultar anulados".
  - Desde > hasta (400). Búsqueda por fragmento en la descripción y en el texto para el cliente, en mayúsculas y sin tildes.
  - `esFechaFutura`.
- **Rendimiento** [RNF]: con 5.000 movimientos insertados en bloque en una causa, el historial con buscador y filtros responde en menos de 2 segundos.
- **Causa** [RF-10, RF-28, RF-29]:
  - Cargar, modificar, anular y restaurar no cambian `modificadoPor/En` de la causa.
  - En una causa desactivada, las escrituras responden 409 "La causa está desactivada", y la consulta y el historial responden 200.
  - En una causa Archivada o Finalizada, las escrituras funcionan.
- **Concurrencia** [RF-15, RF-28]:
  - Una anulación y una modificación simultáneas: si la anulación queda primero, la modificación responde 409.
  - Una desactivación de la causa y una carga simultáneas: si la desactivación queda primero, la carga responde 409.
- **Integridad** [RF-34]: causa inexistente, movimiento inexistente, movimiento de otra causa e ids no numéricos, con sus 404.
- **Visibilidad para el cliente** [RF-30 a RF-33]: `ClientVisibilityService` sobre la base de tests.
  - Visible y vinculado: lo ve, con el texto para el cliente o, si no hay, con la descripción.
  - Oculto, de una causa no vinculada o inexistente: `findVisible` responde el mismo 404 en los tres casos.
  - Visible anulado: lo ve con `anulado: true`.
  - Cargado antes del vínculo: lo ve.
  - Cliente desvinculado, causa desactivada y cuenta del cliente desactivada: deja de verlo.
  - Causa Archivada: lo sigue viendo.
- **Integrantes** [RF-36]: un autor desactivado sigue figurando, marcado como desactivado.
- **Acceso** [RF-35]: un cliente recibe 403 y un visitante 401 en cada endpoint de movimientos.
- **Migración:** `up` sobre la base con las tablas de las specs 001 y 002, y `down` sin errores.

### web — Vitest
- `servicios/movimientos.ts` con `fetch` simulado: rutas, métodos y armado del query string.
- `servicios/formulario-movimiento.ts` [RF-1, RF-3 a RF-7, RF-9, RF-13, RF-26]:
  - Validaciones con los mensajes de la API, incluidos los caracteres y el largo en puntos de código.
  - Cuerpo de alta y cuerpo de edición con solo lo que cambió, y texto para el cliente vacío como `null`.
  - `visibleTextPreview` con y sin texto para el cliente. `needsVisibleChangeWarning` en cada combinación de visible antes y después y de qué cambió.
  - `validateMovementFilters`.
- `servicios/presentacion-movimientos.ts`: etiquetas, `formatMovementDate` sin corrimiento (con la zona horaria del test en UTC y en Buenos Aires), y recorte de la descripción.
- `TextoLiteral`: un texto con comillas, `&` y saltos de línea se muestra literal, con las líneas en blanco [RNF de textos seguros, RF-3].
- `HistorialMovimientos` con servicios simulados [RF-23 a RF-27, RF-28]: filtros, buscador, paginado y vuelta a la página 1, etiquetas, "Ver completa", y sin "Nuevo movimiento" en una causa desactivada.
- `FormularioMovimiento` [RF-8, RF-9, RF-11, RF-13]: casilla desmarcada al cargar, los dos avisos y que ninguno bloquea el guardado.
- `PanelMovimientoDetalle` [RF-15 a RF-19, RF-22, RF-28]: texto visible con su origen, historial de cambios, anular y restaurar, sin "Editar" si está anulado, y sin acciones en una causa desactivada.
- `PanelCausaDetalle` muestra la sección de movimientos, y la ruta nueva no es accesible para un cliente [RF-35].
- Ninguna escritura en `localStorage` ni `sessionStorage` en el flujo de movimientos [RNF de persistencia].

## Cobertura de RF

| RF | Dónde se implementa | Test |
|---|---|---|
| RF-1, RF-5, RF-6 | Entidad `Movimiento`, DTO, `reglas-movimientos.ts`, `formulario-movimiento.ts` | Unitarios de reglas y DTO, Vitest |
| RF-2 | `modificadoPor/En` en cada escritura | e2e de modificación, anulación y restauración |
| RF-3, RF-4 | `texto-movimiento.ts`, `formulario-movimiento.ts`, `TextoLiteral` | Unitarios de api y web |
| RF-7 | `visibleText` (api), `visibleTextPreview` (web) | Unitarios de api y web |
| RF-8 | `movimientos.service` (cargar), `FormularioMovimiento` | e2e de carga, Vitest |
| RF-9, RF-13 | `formulario-movimiento.ts`, `FormularioMovimiento` | Vitest |
| RF-10 | El service nunca escribe en `causas` | e2e de causa |
| RF-11, RF-12, RF-14, RF-15 | `movimientos.service` (modificar), DTO sin `causaId` ni `anulado`, bloqueo del movimiento | Unitarios de DTO, e2e de modificación y concurrencia |
| RF-16 a RF-19 | `movimientos.service` (anular y restaurar) | e2e de anulación |
| RF-20, RF-21 | `movimiento_cambios`, `diffMovement`, inserción en la misma transacción | Unitarios, e2e de historial de cambios |
| RF-22 | `GET /:movimientoId`, `HistorialCambios`, `PanelMovimientoDetalle` | e2e, Vitest |
| RF-23 a RF-27 | `movimientos.service` (listar), `HistorialMovimientos`, `FiltrosMovimientos` | e2e de historial y rendimiento, Vitest |
| RF-28 | `conCausaYMovimiento` con bloqueo compartido, `causaActiva` en la interfaz | e2e de causa y concurrencia, Vitest |
| RF-29 | Sin código: no se controla el estado de la causa | e2e de causa |
| RF-30 a RF-33 | `ClientVisibilityService`, `toMovimientoCliente` | e2e de visibilidad, unitario de `movimiento-detalle.ts` |
| RF-34 | `conCausaYMovimiento`, pipes de ids | e2e de integridad |
| RF-35 | `@Roles('admin', 'abogado')` y guards de la spec 001 | e2e de acceso |
| RF-36 | `AutorResumen.activo` | e2e de integrantes, unitario |
| RNF de registros | `errores-sin-datos.filter.ts`, mensajes sin valores, `logging` desactivado | Unitarios del filtro y de opciones, e2e de validación |
| RNF de textos seguros | RF-4, `TextoLiteral`, regla de ESLint | Unitarios, Vitest, `pnpm lint` |
| RNF de fechas | `dateStrings`, `todayInBuenosAires`, `formatMovementDate` | Unitarios, e2e de carga, Vitest |
| RNF de rendimiento | `IDX_movimientos_historial` | e2e de rendimiento |
