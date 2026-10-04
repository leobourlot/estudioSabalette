# Plan 002 — Causas y partes

Implementa `spec.md` de esta carpeta. Respeta `docs/constitution.md` y se apoya en lo construido en la spec 001: autenticación, guards globales, roles, auditoría, validadores de DNI y CUIT, cliente HTTP y patrones de listado. Cada sección indica entre corchetes los RF que cubre.

No se agregan dependencias ni variables de entorno.

## Arquitectura

### Módulos de NestJS (`api/src/`)

| Carpeta | Contenido | RF |
|---|---|---|
| `migraciones/` | Migración `crear-causas-partes-y-colaboradores`. | RF-1, RF-2, RF-8, RF-13 a RF-15, RF-29 |
| `causas/` (nuevo) | Ver detalle debajo. | RF-1 a RF-44 |
| `usuarios/` | Sin cambios de comportamiento. Se reutilizan `validadores/` y `dto/reglas.ts` desde `causas/`. | RF-15 |
| `base-de-datos/esquema.ts` | Se agregan las tres entidades nuevas y la migración al final de las listas. | — |
| `app.module.ts` | Importa `CausasModule`. | — |

Contenido de `causas/`:
- Entidades: `causa.entity.ts`, `parte.entity.ts` y `colaborador.entity.ts`.
- `causas.controller.ts` y `causas.service.ts`: alta, edición, consulta, listado, desactivación y reactivación.
- `partes.service.ts`: agregar, modificar, desvincular y volver a vincular partes, con las preguntas y avisos.
- `abogados.service.ts`: responsable y colaboradores.
- `reglas-causas.ts`: reglas puras, sin acceso a la base.
- `vinculo-cliente.service.ts`: consulta del vínculo cliente-causa, para la spec 004.
- `causa-detalle.ts`: armado explícito de las respuestas.
- `validadores/texto-causa.ts`: caracteres permitidos y número de expediente para búsqueda.
- `dto/`.

`causas.controller.ts` lleva `@Roles('admin', 'abogado')`, así que los guards globales de la spec 001 rechazan a clientes (403) y visitantes (401) antes de llegar al controller [RF-44]. Los controllers solo validan con DTO y delegan (principio 3).

### Carpetas de `web/src/`

| Carpeta | Contenido | RF |
|---|---|---|
| `servicios/causas.ts` (nuevo) | Tipos y una función por endpoint de `/api/panel/causas`. | RF-6 a RF-44 |
| `servicios/formulario-causa.ts` (nuevo) | Validación de los formularios de causa y de parte con los mismos mensajes que la API (incluidos los caracteres de RF-4), armado de los cuerpos y reconocimiento de las preguntas que devuelve la API (RF-9, RF-16, RF-19, RF-43). | RF-1, RF-4, RF-5, RF-9, RF-15, RF-16, RF-19, RF-43 |
| `servicios/presentacion-causas.ts` (nuevo) | Etiquetas de fuero, estado y rol procesal. Texto "Vinculado al expte. principal Nº …" de un incidente. Nombre visible de una parte. `needsResponsableWarning(causa)`. | RF-1, RF-12, RF-33, RF-36 |
| `servicios/cliente-http.ts` | `ApiError` suma `details`: los campos extra del cuerpo de error (`codigo`, `clienteId`, `clienteActivo`, `clientes`, `parteId`, `indiceParte`). | RF-9, RF-16, RF-19 |
| `componentes/` | Nuevos: `FormularioCausa.tsx`, `FormularioParte.tsx` (modo cliente o no cliente), `SelectorCliente.tsx`, `SelectorIntegrantes.tsx`, `TablaPartes.tsx` (vigentes y desvinculadas), `PreguntaConfirmacion.tsx`, `AccionesCausa.tsx`. `ProveedorServicios.tsx` suma el servicio de causas. `DisenoPanel.tsx` suma el enlace "Causas". | RF-6 a RF-34, RF-40 a RF-43 |
| `paginas/` | `PanelCausas` (listado), `PanelCausaNueva`, `PanelCausaDetalle`. | RF-6, RF-7, RF-11, RF-12, RF-36 a RF-43 |
| `RutasAplicacion.tsx` | Rutas nuevas del panel. | — |

Nada en `src/servicios/` importa React (principio 3).

### Archivos existentes que se modifican
- `api/src/base-de-datos/esquema.ts` y `api/src/app.module.ts`.
- `web/src/servicios/cliente-http.ts`, con su test.
- `web/src/componentes/ProveedorServicios.tsx`.
- `web/src/componentes/DisenoPanel.tsx`, con `Disenos.test.tsx`.
- `web/src/RutasAplicacion.tsx`.
- Las utilidades de los e2e (`api/test/utilidades/`), que suman funciones para crear causas.

Ninguna tabla de la spec 001 cambia.

## Entidades de TypeORM y migración [RF-1, RF-2, RF-13 a RF-15, RF-29]

Mismas convenciones que en la spec 001: `DATETIME` en hora de Buenos Aires, tablas `utf8mb4_unicode_ci` e ids autoincrementales.

### `causas`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int autoincremental | PK |
| `caratula` | varchar(255) | RF-1, RF-4 |
| `numeroExpediente` | varchar(50), nullable | `NULL` si no se informa. RF-1, RF-3 |
| `numeroExpedienteBusqueda` | varchar(50), nullable | El número sin separadores (solo letras y dígitos). Lo calcula el service al guardar. RF-37 |
| `juzgado` | varchar(150), nullable | Texto libre. RF-1 |
| `fuero` | enum `civil`, `penal`, `familia`, `laboral`, `federal`, `otro` | RF-1 |
| `estado` | enum `en_tramite`, `paralizada`, `archivada`, `finalizada`, default `en_tramite` | RF-1, RF-6 |
| `esIncidente` | boolean, default false | RF-1, RF-10 |
| `expedientePrincipal` | varchar(50), nullable | Número del expediente principal, como texto. Obligatorio si `esIncidente`, `NULL` si no. RF-1, RF-10 |
| `activa` | boolean, default true | RF-40 a RF-42 |
| `claveExpediente` | varchar(210), columna generada `STORED`, nullable, índice único `UQ_causas_expediente_activo` | Ver "Expediente duplicado". RF-8 |
| `responsableId` | FK `usuarios` | Exactamente un responsable por diseño. RF-29 |
| `creadoPorId`, `creadoEn` | FK `usuarios`, datetime | RF-2 |
| `modificadoPorId`, `modificadoEn` | FK `usuarios` nullable, datetime nullable | RF-2 |
| `desactivadaPorId`, `desactivadaEn` | FK `usuarios` nullable, datetime nullable | RF-40 |
| `reactivadaPorId`, `reactivadaEn` | FK `usuarios` nullable, datetime nullable | RF-42 |

### `partes`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int autoincremental | PK |
| `causaId` | FK `causas` | Una parte pertenece a una sola causa. RF-13 |
| `rol` | enum `actor`, `demandado`, `tercero`, `otro` | RF-13 |
| `clienteId` | FK `clientes.usuarioId`, nullable | Con valor: la parte es un cliente y sus datos se leen de la cuenta, sin copiarlos. RF-14 |
| `tipoPersona` | enum `fisica`, `juridica`, nullable | Solo partes no cliente. RF-15 |
| `nombre`, `apellido` | varchar(55), nullable | Solo partes no cliente, persona física. |
| `razonSocial` | varchar(55), nullable | Solo partes no cliente, persona jurídica. |
| `dni` | varchar(8), nullable | Opcional; solo persona física no cliente. Sin índice único: la misma persona puede ser parte de varias causas. |
| `cuit` | char(11), nullable | Opcional; solo persona jurídica no cliente. |
| `vigente` | boolean, default true | RF-22, RF-24 |
| `creadoPorId`, `creadoEn`, `modificadoPorId`, `modificadoEn` | | Auditoría propia de la parte, como en las demás tablas. |

No se registra quién desvinculó una parte ni cuándo (fuera de alcance). La coherencia entre `clienteId` y los datos propios (o uno o lo otro, y los campos según el tipo de persona) la garantizan los DTO y `partes.service.ts`. MySQL no tiene restricciones `CHECK` cómodas para reglas condicionales, y estas reglas ya se testean en el service.

### `causa_colaboradores`
| Campo | Tipo | Notas |
|---|---|---|
| `causaId` | FK `causas` | PK compuesta |
| `usuarioId` | FK `usuarios` | PK compuesta: el mismo integrante no se repite como colaborador. RF-31 |

Quitar un colaborador borra su fila (RF-34): la spec no pide historial de quién intervino.

La migración crea las tres tablas con sus índices y claves foráneas y es reversible (`down` las elimina en orden inverso). `synchronize` siempre en `false`.

### Expediente duplicado [RF-8 a RF-10, RF-43]
```
claveExpediente = CASE WHEN activa = 1 AND esIncidente = 0
                            AND numeroExpediente IS NOT NULL AND juzgado IS NOT NULL
                       THEN CONCAT(fuero, '|', juzgado, '|', numeroExpediente)
                  END
```
La clave es `NULL` en las causas desactivadas, en los incidentes y en las causas sin número o sin juzgado. Así el índice único solo controla las causas activas no incidentes con número y juzgado (MySQL admite varios `NULL`).

Con la intercalación `utf8mb4_unicode_ci`, la comparación no distingue mayúsculas, minúsculas ni tildes. Como los textos se guardan recortados (RF-3), tampoco influyen los espacios de los extremos. Para el duplicado se compara el número tal como se escribió, no la versión sin separadores. Quitar separadores puede igualar números distintos ("12/2024" y "1/22024"), y RF-8 rechaza sin preguntar.

## Contrato de la API

Errores con el formato de la spec 001 (`statusCode`, `message`, en español). Las preguntas que la interfaz le hace al integrante llegan como 409 con un `codigo` en el cuerpo, para distinguirlas de un rechazo definitivo. La interfaz repite la petición con la respuesta del integrante. Los ids de ruta que no son números responden 404, como en `/panel/usuarios`.

### Causas — `/api/panel/causas` (roles `admin` y `abogado`) [RF-44]

| Método y ruta | Cuerpo | Respuesta | Errores | RF |
|---|---|---|---|---|
| `GET /?pagina&buscar&fuero&estado&responsableId&mias&responsableDesactivado&incluirDesactivadas` | — | 200 `{ items: CausaResumen[], total, pagina, porPagina: 20 }` | 400 | RF-36 a RF-39 |
| `GET /integrantes` | — | 200 `IntegranteResumen[]` (administradores y abogados, activos y desactivados, por apellido) | — | RF-29, RF-38 |
| `GET /:id` | — | 200 `CausaDetalle` | 404 | RF-12 |
| `POST /` | `{ caratula, numeroExpediente?, juzgado?, fuero, estado?, esIncidente?, expedientePrincipal?, responsableId, colaboradorIds?, partes: ParteNueva[], confirmarExpedienteRepetido? }` | 201 `ResultadoAlta` | 400, 409 | RF-6 a RF-10, RF-13 a RF-20, RF-29 a RF-31 |
| `PATCH /:id` | Parcial: `{ caratula?, numeroExpediente?, juzgado?, fuero?, estado?, esIncidente?, expedientePrincipal?, confirmarExpedienteRepetido? }`. `null` borra un opcional. Con `esIncidente: false`, el service borra `expedientePrincipal`. | 200 `CausaDetalle` | 400, 404, 409 | RF-8 a RF-11, RF-41 |
| `PUT /:id/abogados` | `{ responsableId, colaboradorIds }` | 200 `CausaDetalle` | 400, 404, 409 | RF-29 a RF-34, RF-41 |
| `POST /:id/partes` | `ParteNueva` | 201 `ResultadoParte` | 400, 404, 409 | RF-13 a RF-20, RF-41 |
| `PUT /:id/partes/:parteId` | Parte cliente: `{ rol }`. Parte no cliente: todos sus datos (`ParteNueva` sin `clienteId`), o `{ rol, clienteId }` para convertirla en parte cliente (RF-16). | 200 `ResultadoParte` | 400, 404, 409 | RF-16 a RF-18, RF-20, RF-21, RF-25, RF-41 |
| `POST /:id/partes/:parteId/desvincular` | — | 200 `CausaDetalle` | 404, 409 | RF-22, RF-23, RF-25, RF-27, RF-41 |
| `POST /:id/partes/:parteId/revincular` | — | 200 `ResultadoParte` | 404, 409 | RF-17, RF-18, RF-20, RF-24, RF-25, RF-41 |
| `POST /:id/desactivar` | — | 204 | 404 | RF-40 |
| `POST /:id/reactivar` | `{ confirmarExpedienteRepetido? }` | 204 | 404, 409 | RF-42, RF-43 |

`GET /integrantes` se declara antes de `GET /:id`. Hace falta porque el abogado no puede listar integrantes en `/api/panel/usuarios` (spec 001, RF-26), y el formulario necesita elegir responsable y colaboradores. La interfaz ofrece solo los activos para asignar y para el filtro (RF-38), y usa los desactivados para mostrar los ya asignados. Para elegir el cliente de una parte se reutiliza `GET /api/panel/usuarios?rol=cliente&activo=true&buscar=`, que el abogado ya puede usar.

La parte se modifica con `PUT` (reemplazo completo) y no con `PATCH`: si cambia el tipo de persona cambian los campos obligatorios, y validar el conjunto completo es más simple que combinar cambios parciales.

**Tipos:**
- `ParteNueva`: hay dos formas.
  - Parte cliente: `{ rol, clienteId }`.
  - Parte no cliente: `{ rol, tipoPersona, nombre?, apellido?, razonSocial?, dni?, cuit?, confirmarDocumentoDeCliente?, confirmarNombreRepetido?, confirmarNombreDeCliente? }`.
    - Persona física: se exigen `nombre` y `apellido`, y se rechazan `razonSocial` y `cuit`.
    - Persona jurídica: se exige `razonSocial`, y se rechazan `nombre`, `apellido` y `dni`.
    - DNI y CUIT se normalizan y validan con los validadores de la spec 001.
  - `confirmarNombreRepetido` también vale para una parte cliente (RF-19).
- `ResultadoAlta`: `{ causa: CausaDetalle, rechazos: Rechazo[], causasComoNoCliente: CausaReferencia[] }`. `Rechazo`: `{ indiceParte?, colaboradorId?, mensajes: string[] }` [RF-7, RF-20].
- `ResultadoParte`: `{ causa: CausaDetalle, causasComoNoCliente: CausaReferencia[] }` [RF-20].
- `CausaReferencia`: `{ id, caratula, numeroExpediente }`.
- `CausaResumen`: `{ id, caratula, numeroExpediente, juzgado, fuero, estado, esIncidente, expedientePrincipal, activa, responsable: IntegranteResumen, creadoEn, modificadoEn }`.
- `IntegranteResumen`: `{ id, nombre, apellido, rol, activo }`.
- `CausaDetalle`: `CausaResumen` más:
  - `colaboradores: IntegranteResumen[]`.
  - `partes` y `partesDesvinculadas`, las dos `ParteDetalle[]` (RF-12).
  - `creadoPor`, `modificadoPor`, `desactivadaPor`, `desactivadaEn`, `reactivadaPor` y `reactivadaEn`. Los autores van como `{ id, nombre, apellido }` o `null`.
- `ParteDetalle`: `{ id, rol, esCliente, clienteId, clienteActivo, tipoPersona, nombre, apellido, razonSocial, dni, cuit }`. En una parte cliente, los datos de identificación salen de su cuenta (RF-14): nombre y apellido si es persona física, razón social si es jurídica. El contacto de una persona jurídica no se muestra como parte.

**Mensajes de 400** (por campo, como en la spec 001) [RF-5, RF-15]:
- Carátula: "La carátula es obligatoria" y "La carátula no puede tener más de 255 caracteres".
- Largos: "El número de expediente no puede tener más de 50 caracteres", "El número del expediente principal no puede tener más de 50 caracteres" y "El juzgado no puede tener más de 150 caracteres".
- Incidente: "Indicá el número del expediente principal" (RF-10) y "Solo un incidente lleva número de expediente principal".
- Caracteres: "<Campo> solo puede tener letras, números, espacios y los símbolos . , ; : / - _ ( ) \" ' $ & # ° º ª" (RF-4).
- Listas cerradas: "El fuero debe ser civil, penal, familia, laboral, federal u otro", "El estado debe ser en trámite, paralizada, archivada o finalizada" y "El rol procesal debe ser actor, demandado, tercero u otro".
- Partes y abogados: "La causa debe tener al menos una parte" y "El responsable debe ser un integrante del estudio".
- Los de nombre, apellido, razón social, DNI y CUIT de la spec 001, y los de campos desconocidos.

**Preguntas (409 con `codigo`):**
| `codigo` | Mensaje | Datos extra | Se responde con | RF |
|---|---|---|---|---|
| `EXPEDIENTE_REPETIDO` | "Ya existe otra causa con ese número de expediente" | — | `confirmarExpedienteRepetido: true` | RF-9, RF-43 |
| `DOCUMENTO_DE_CLIENTE` | "Ese DNI o CUIT pertenece a un cliente del estudio" (o "… a un cliente desactivado") | `clienteId`, `clienteActivo`, `indiceParte` en el alta | Sí: la parte con `clienteId`. No: `confirmarDocumentoDeCliente: true` | RF-16 |
| `NOMBRE_REPETIDO` | "Ya hay una parte con ese nombre en la causa. ¿Es la misma persona?" | `parteId` de la existente, `indiceParte` en el alta | Sí: no se envía la parte. No: `confirmarNombreRepetido: true` | RF-19 |
| `NOMBRE_DE_CLIENTE` | "Hay clientes del estudio con ese nombre. ¿Es alguno de ellos?" | `clientes: { id, tipoPersona, nombre, apellido, razonSocial, dni, cuit }[]`, `indiceParte` en el alta | Uno elegido: la parte con su `clienteId`. Ninguno: `confirmarNombreDeCliente: true` | RF-19 |

**Otros 409:**
- "Ya existe una causa con ese número de expediente en ese juzgado y fuero" (RF-8, RF-43).
- "El cliente está desactivado" (RF-17).
- "Esa persona ya es parte de la causa" (RF-18).
- "La causa debe tener al menos una parte" (RF-23).
- "El integrante está desactivado" (RF-30).
- "Ese integrante ya interviene en la causa" (RF-31).
- "La causa está desactivada. Reactivala para modificarla" (RF-41).
- "La causa ya está activa".

**Mensajes de 404:**
- "No existe esa causa".
- "No existe esa parte", incluida una parte de otra causa (RF-25).
- "No existe ese cliente": un `clienteId` inexistente o que no es un cliente.

## Reglas de negocio

Las reglas que no necesitan la base viven en `causas/reglas-causas.ts` como funciones puras, igual que `permisos-gestion.ts` en la spec 001:
- El armado de la clave de expediente.
- El número para búsqueda.
- La comparación de documentos y de nombres entre partes.
- La validación del conjunto responsable/colaboradores.
- La decisión sobre una desvinculación.

Los services las consultan.

### Caracteres permitidos [RF-4]
`validadores/texto-causa.ts`. El texto se normaliza a NFC antes de validar, para que una letra con tilde escrita como dos caracteres (letra más tilde combinable) cuente como una sola. Después se valida con `^[\p{L}\p{N} .,;:/\-_()"'$&#°ºª]*$` (con la bandera `u`). Ese patrón excluye emojis, saltos de línea y tabulaciones. Se aplica a la carátula, el número de expediente, el número del expediente principal y el juzgado. `web/src/servicios/formulario-causa.ts` repite la misma regla.

### Bloqueo por causa [RF-18, RF-23, RF-31, RF-41]
Toda escritura sobre una causa existente (datos, partes, abogados, desactivación, reactivación) corre en una transacción que empieza con `SELECT … FOR UPDATE` sobre la fila de la causa. Así, dos operaciones simultáneas sobre la misma causa se ejecutan de a una, y la segunda ve el resultado de la primera (caso límite de concurrencia). Dentro de la misma transacción:
```
causa = bloquear(causaId); si no existe: 404
si no causa.activa y la operación no es reactivar: 409 "La causa está desactivada…"   // RF-41
aplicar la operación
causa.modificadoPorId = actor.id; causa.modificadoEn = ahora                           // RF-2
```
Los cambios en la cuenta de un cliente (spec 001) no tocan `causas`, así que no cuentan como modificación (RF-2).

### Alta [RF-6, RF-7]
```
crear(actor, cuerpo):
  validar los datos de la causa con su DTO: 400 si falla                  // RF-5
  validar el responsable: 400 o 409 si falla (es obligatorio)              // RF-29, RF-30
  controlarExpediente(cuerpo, exceptoId = ninguna)                        // RF-8, RF-9
  para cada parte, en orden:
    validar su formato con ParteNuevaDto (validate() de class-validator)
    si falla: rechazos += { indiceParte, mensajes }; seguir
    controlar cliente desactivado y repetida (RF-17, RF-18), también contra las partes anteriores del mismo cuerpo
    si falla: rechazos += …; seguir
    si hay una pregunta sin responder (RF-16, RF-19): 409 con codigo e indiceParte   // corta el alta
  para cada colaborador: controlar RF-30 y RF-31; si falla: rechazos += { colaboradorId, mensajes }
  si no quedó ninguna parte válida: 400 con los mensajes de cada parte            // RF-7
  transacción: insertar la causa, las partes válidas y los colaboradores válidos
  si el índice único rechaza: 409 de RF-8
  devolver { causa, rechazos, causasComoNoCliente }                               // RF-20
```
El DTO del alta declara `partes` como una lista de objetos sin validar su interior. Cada parte se valida aparte en el service con el mismo `ParteNuevaDto` que usa `POST /:id/partes`. Así, una parte mal cargada no tumba el alta (RF-7) y las reglas de una parte están en un solo lugar.

### Expediente [RF-8 a RF-10, RF-43]
```
controlarExpediente(datos, exceptoId, confirmado):
  si datos.numeroExpediente es null o datos.esIncidente: ok                       // RF-10
  si datos.juzgado no es null y existe una causa activa ≠ exceptoId con la misma claveExpediente: 409 RF-8
  si existe una causa activa no incidente ≠ exceptoId con el mismo numeroExpediente y no confirmado:
    409 EXPEDIENTE_REPETIDO                                                         // RF-9
```
Si dos guardados simultáneos pasan el control, el índice rechaza el segundo y `translateDuplicate` responde el 409 de RF-8, como en la spec 001. En `PATCH`, el control se hace solo si cambia el número, el juzgado, el fuero o la marca de incidente.

### Agregar o modificar una parte [RF-13 a RF-21]
```
validarParte(causaId, parte, exceptoParteId):
  si parte.clienteId:
    cliente = buscar el cliente con su usuario; si no existe: 404
    si no está activo: 409 "El cliente está desactivado"                           // RF-17
    documento = cliente.dni ?? cliente.cuit
  si no:
    documento = parte.dni ?? parte.cuit
    si documento y existe un cliente con ese documento y no parte.confirmarDocumentoDeCliente:
      409 DOCUMENTO_DE_CLIENTE con clienteId y clienteActivo                       // RF-16
  vigentes = partes vigentes de la causa, salvo exceptoParteId
  si en vigentes está el mismo clienteId, o el mismo documento
     (el propio de una parte no cliente o el de la cuenta de una parte cliente):
    409 "Esa persona ya es parte de la causa"                                       // RF-18
  si no hubo coincidencia por documento y en vigentes hay una con el mismo nombre y apellido
     o la misma razón social, y no parte.confirmarNombreRepetido:
    409 NOMBRE_REPETIDO con parteId                                                 // RF-19, en la causa
  si es parte no cliente sin documento y hay clientes activos con el mismo nombre y apellido
     (persona física) o la misma razón social (persona jurídica), y no parte.confirmarNombreDeCliente:
    409 NOMBRE_DE_CLIENTE con la lista de esos clientes                             // RF-19, en el estudio
```
- Con `clienteActivo: false`, la interfaz no ofrece "agregar como cliente": solo pregunta si se guarda como no cliente (RF-16, RF-17).
- La comparación de nombres usa la intercalación de la base: no distingue mayúsculas, minúsculas ni tildes. Contra los clientes del estudio se compara por igualdad, no por fragmento. Si el cliente elegido ya es parte de la causa, al reenviar se aplica RF-18.
- Una parte no cliente con DNI o CUIT que no es de ningún cliente no se compara por nombre contra los clientes: el documento ya indica que es otra persona (caso límite de la spec).
- Al modificar una parte no cliente, `PUT` con `{ rol, clienteId }` la convierte en parte cliente: borra sus datos propios y guarda el `clienteId`, con los mismos controles.

### Aviso de causas como no cliente [RF-20]
Cada vez que una parte queda vinculada a un cliente (alta, agregar, convertir o volver a vincular), el service busca las causas activas, distintas de la actual, con partes no cliente vigentes que tengan el DNI o CUIT de ese cliente. Las devuelve en `causasComoNoCliente`, y la interfaz las muestra como aviso. No se modifica nada en esas causas.

### Desvincular y volver a vincular [RF-22 a RF-25, RF-27]
```
desvincular(actor, causaId, parteId):
  causa = bloquear(causaId); parte = buscar(parteId, causaId, vigente); si no: 404   // RF-25
  si la causa tiene una sola parte vigente: 409 RF-23
  parte.vigente = false

revincular(actor, causaId, parteId):
  causa = bloquear(causaId); parte = buscar(parteId, causaId, desvinculada); si no: 404
  controlar RF-17 (si es cliente) y RF-18 contra las vigentes
  parte.vigente = true
```
Como el vínculo de RF-26 se calcula siempre a partir de `vigente` y `activa`, desvincular o desactivar alcanza para cortar el acceso del cliente (RF-27). No hay una tabla de permisos que mantener sincronizada.

### Abogados [RF-29 a RF-34]
```
validarAbogados(responsableId, colaboradorIds, actuales):
  si hay ids repetidos, o responsableId está en colaboradorIds: 409 "Ese integrante ya interviene en la causa"
  integrantes = buscar usuarios por ids
  si alguno no existe o es cliente: 400 "El responsable debe ser un integrante del estudio" (o el mensaje equivalente para colaboradores)
  para cada integrante desactivado:
    si no ocupaba ya ese lugar en la causa: 409 "El integrante está desactivado"
```
Un desactivado que ya estaba asignado se conserva al editar (RF-32). Solo se rechaza asignar a uno nuevo (RF-30). `PUT /abogados` reemplaza al responsable y al conjunto de colaboradores: los que no vienen dejan de figurar (RF-34).

Desactivar una cuenta (spec 001) no toca causas ni partes (RF-28, RF-32). El aviso de RF-33 se arma con `responsable.activo` en la respuesta.

### Listado y búsqueda [RF-36 a RF-39]
- 20 por página, ordenadas por `COALESCE(modificadoEn, creadoEn) DESC` y luego `id DESC`. Por defecto solo las activas; con `incluirDesactivadas=true`, todas.
- **Filtros:**
  - `fuero`, `estado` y `responsableId`: igualdad.
  - `mias=true`: `responsableId = actor.id OR EXISTS (colaborador = actor.id)`.
  - `responsableDesactivado=true`: une con el responsable y filtra `activo = false`.
- **`buscar`:** hasta 100 caracteres, recortado. Usa `LIKE '%texto%'`, para que encuentre fragmentos, con los comodines escapados como en la spec 001.
  ```
  caratula LIKE t
  OR numeroExpediente LIKE t
  OR (n = número para búsqueda del texto; si no está vacío) numeroExpedienteBusqueda LIKE %n%
  OR EXISTS (
    parte vigente de la causa (con su cliente y su usuario, si es cliente) donde
      nombre, apellido, razonSocial, CONCAT_WS(' ', nombre, apellido) o CONCAT_WS(' ', apellido, nombre) LIKE t
      (de la parte no cliente, o de la cuenta si es cliente persona física; razón social si es jurídica)
      o, si el texto normalizado son solo dígitos, dni o cuit LIKE dígitos
  )
  ```
  - La intercalación `utf8mb4_unicode_ci` hace que la búsqueda no distinga mayúsculas, minúsculas ni tildes, sin código extra. También iguala `ñ` con `n`, lo que se acepta porque favorece encontrar.
  - El número para búsqueda quita todo lo que no sea letra o dígito. Por eso "1234/2024" encuentra "1234-2024" y "1234/2024".
  - Se usa `EXISTS` y no un `JOIN` para no repetir causas, y así `offset`/`limit` paginan bien.

### Vínculo cliente-causa [RF-26 a RF-28, RF-42]
`vinculo-cliente.service.ts` expone la única consulta del vínculo:
```
linkedCausaIds(clienteId)        = causas activas (cualquier estado) con una parte vigente cuyo clienteId = clienteId
isLinked(clienteId, causaId)     = la misma condición para una causa
```
- Esta spec no tiene endpoints para clientes. La spec 004 usará este service en cada petición del portal para filtrar en el servidor todo lo que ve un cliente (principio 5). Por eso una desvinculación rige desde la siguiente acción del cliente (RF-27).
- Que el service esté definido y testeado desde ahora evita que el portal invente su propia regla.
- La reactivación de una cuenta (RF-28) no necesita código: el vínculo nunca se borró.

### Desactivación y reactivación [RF-40 a RF-43]
- **Desactivar:** `activa = false`, `desactivadaPor/En` y `modificadoPor/En`. La clave de expediente pasa a `NULL`. Repetirla no es un error.
- **Reactivar:**
  ```
  reactivar(actor, id, confirmado):
    causa = bloquear(id); si causa.activa: 409 "La causa ya está activa"
    si tiene número, no es incidente y hay otra causa activa no incidente con ese número:
      si no confirmado: 409 EXPEDIENTE_REPETIDO                          // primero pregunta (RF-43)
      si hay duplicado exacto (RF-8): 409 con el mensaje de RF-8
    activa = true; reactivadaPor/En; modificadoPor/En
  ```

### Respuestas
`causa-detalle.ts` arma `CausaResumen`, `CausaDetalle` y `ParteDetalle` campo por campo, nunca a partir de la entidad completa. Así no se filtran datos de las cuentas (email, hashes) al unir con `usuarios`.

## Frontend

### Rutas
| Ruta | Página | Acceso |
|---|---|---|
| `/panel/causas` | `PanelCausas`: buscador, filtros de fuero, estado y responsable (solo activos), casillas "Solo mis causas", "Con responsable desactivado" y "Mostrar desactivadas", y paginado. Marca los incidentes. | admin, abogado |
| `/panel/causas/nueva` | `PanelCausaNueva`: datos (con la casilla "Es incidente", que muestra el campo del número del expediente principal), responsable, colaboradores y partes. | admin, abogado |
| `/panel/causas/:id` | `PanelCausaDetalle`: datos y edición, partes vigentes (agregar, modificar, desvincular), partes desvinculadas (consultar, volver a vincular), abogados, auditoría, desactivar y reactivar. | admin, abogado |

Las rutas quedan dentro de `DisenoPanel`, así que `RutaProtegida` aplica las mismas reglas de la spec 001 (un cliente es llevado al portal). Los filtros del listado viven en el estado del componente, como en `PanelUsuarios`, y no en `localStorage` (principio 5).

### Comportamiento de la interfaz
- **Preguntas** (RF-9, RF-16, RF-19, RF-43):
  - `formulario-causa.ts` expone `pendingQuestion(error)`, que traduce el `codigo` de un `ApiError` en una pregunta con sus opciones.
  - `PreguntaConfirmacion` la muestra, y la página repite la petición con la respuesta elegida:
    - `EXPEDIENTE_REPETIDO`: "Guardar igual" o "Cancelar".
    - `DOCUMENTO_DE_CLIENTE` con cliente activo: "Agregar como cliente" o "Agregar como no cliente".
    - `DOCUMENTO_DE_CLIENTE` con cliente desactivado: "Agregar como no cliente" o "Cancelar".
    - `NOMBRE_REPETIDO`: "Es la misma persona" (en el alta, quita la parte del formulario; fuera del alta, no la agrega) o "Es otra persona".
    - `NOMBRE_DE_CLIENTE`: un botón por cliente, con su DNI o CUIT formateado para distinguir homónimos, y "Ninguno: agregar como no cliente".
- **Resultado del alta** (RF-7, RF-20): después de crear, la página lleva al detalle y muestra qué partes o colaboradores no se guardaron y por qué. Si corresponde, muestra también el aviso de las causas donde el cliente figura como no cliente.
- **Aviso de responsable desactivado** (RF-33): `needsResponsableWarning(causa)` decide si se muestra.
- **Causa desactivada** (RF-41): el detalle oculta las acciones de edición y muestra solo "Reactivar". El control real lo hace la API.
- **Selectores:**
  - De integrantes: lista los activos para asignar. Los desactivados ya asignados se muestran marcados como tales y se conservan al guardar (RF-32).
  - De cliente: busca clientes activos con `usersService.listUsers({ rol: 'cliente', activo: true, buscar })`.

## Dependencias nuevas

Ninguna. Todo se resuelve con lo instalado en la spec 001.

## Otras decisiones técnicas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Columna generada con índice único para el expediente | Solo un control en el service | Dos altas simultáneas pasarían el control. No hay una fila que bloquear para un número que todavía no existe, así que el índice es la única garantía. |
| Columna generada | Índice único sobre `(fuero, juzgado, numeroExpediente)` | MySQL no tiene índices parciales: ese índice controlaría también las desactivadas, los incidentes y las sin juzgado. La columna resuelve todo eso. |
| `numeroExpedienteBusqueda` calculado por el service | Columna generada con `REGEXP_REPLACE` | La regla queda en TypeScript, testeable y compartida con la interfaz, y no depende de las funciones de la versión de MySQL. |
| Responsable como columna de `causas` | Tabla de intervinientes con un campo "tipo" | "Exactamente un responsable" queda garantizado por el esquema, y el filtro por responsable es directo. |
| Partes con `clienteId` y datos propios en la misma tabla | Tablas separadas para partes cliente y no cliente | Una sola lista de partes por causa, una sola consulta para el vínculo y la búsqueda, y la conversión de RF-16 es un cambio de campos. |
| Datos de la parte cliente leídos de su cuenta | Copiarlos en la parte | RF-14: un cambio en la cuenta se ve en todas sus causas sin sincronizar nada. |
| Partes del alta validadas una por una en el service | Validarlas en el DTO del alta | Con el DTO, una parte mal cargada rechazaría toda el alta, contra lo que pide RF-7. |
| `SELECT … FOR UPDATE` sobre la causa en cada escritura | Bloqueo optimista con versión | Las operaciones son cortas y sobre una sola causa. El bloqueo hace exactos los controles de última parte y de repetidos sin pedir reintentos a la interfaz. La edición de datos sigue con "gana el último cambio", como en la spec 001. |
| Búsqueda con `LIKE` e intercalación `unicode_ci` | Índice `FULLTEXT` | El volumen de un estudio (miles de causas) se recorre con `LIKE` sin problemas. `FULLTEXT` no busca fragmentos dentro de palabras ni de números de expediente (RF-37). |
| Vínculo calculado, sin tabla propia | Tabla `cliente_causa` | Una sola fuente de verdad (RF-26); no hay que mantenerla al desvincular, desactivar o reactivar. |
| Preguntas como 409 con `codigo` | Códigos HTTP distintos o un endpoint previo de verificación | Mantiene el formato de errores de la spec 001 y resuelve cada pregunta en un viaje. |
| Endpoint `GET /api/panel/causas/integrantes` | Abrir `/api/panel/usuarios` a los abogados para otros roles | No cambia los permisos de la spec 001 y devuelve solo lo necesario (sin emails). |

## Estrategia de tests

### api — unitarios (Vitest)
- `reglas-causas.ts` [RF-8 a RF-10, RF-18, RF-19, RF-23, RF-29 a RF-32, RF-37]:
  - Clave de expediente: activa, desactivada, incidente, sin número y sin juzgado.
  - Número para búsqueda.
  - Comparación de documentos entre parte cliente y no cliente.
  - Comparación de nombres.
  - Responsable y colaboradores: repetidos, responsable como colaborador, desactivado nuevo contra desactivado ya asignado.
  - Última parte.
- `texto-causa.ts` [RF-4]: acepta letras con tilde, ñ, ü y cada símbolo permitido. Rechaza emojis, saltos de línea y tabulaciones. Una tilde combinable cuenta como una letra.
- DTO [RF-1, RF-3, RF-5, RF-13, RF-15]:
  - Carátula vacía o larga, largos de número y juzgado, recorte y vacío a `NULL`.
  - Fuero, estado y rol fuera de lista.
  - Campos de parte según el tipo de persona y DNI y CUIT normalizados.
  - Lista de partes vacía y campos desconocidos.
- `causa-detalle.ts` [RF-12, RF-14]: la parte cliente toma los datos de la cuenta, y la respuesta nunca incluye email ni hashes.

### api — e2e (Vitest + Supertest, base de tests)
Mismo esquema que la spec 001: migraciones sobre la base de tests, tablas vaciadas al empezar cada suite, ejecución en serie.
- **Alta** [RF-2, RF-6, RF-7]: completa, sin número, con estado por defecto y auditoría. Con una parte y un colaborador rechazados, la causa se crea con el resto y la respuesta informa los rechazos. Sin ninguna parte válida, 400.
- **Expediente** [RF-8 a RF-10, RF-43]:
  - Duplicado en el mismo juzgado y fuero, incluso con otras mayúsculas, tildes o espacios.
  - Pregunta en otro juzgado y con una causa sin juzgado, con y sin confirmación.
  - Incidente con el número de su principal. Incidente sin número del expediente principal (400). Quitar la marca borra ese número.
  - Número de una causa desactivada.
  - Reactivación: primero la pregunta, después el rechazo por duplicado exacto o la reactivación.
  - Dos altas simultáneas.
- **Edición** [RF-11, RF-41]: edición de datos, incluida la marca de incidente. Sin campo para activar o desactivar. Rechazo sobre una causa desactivada.
- **Detalle** [RF-12]: partes vigentes y desvinculadas, responsable, colaboradores y auditoría.
- **Partes** [RF-13 a RF-25]:
  - Cliente y no cliente.
  - Cambio de datos en la cuenta reflejado en la parte, sin cambiar `modificadoEn` de la causa.
  - Pregunta de documento de cliente al agregar y al modificar, con cliente activo y desactivado. Conversión en parte cliente.
  - Cliente desactivado y repetidos.
  - Pregunta de nombre repetido en la causa. Pregunta de nombre de cliente del estudio: con uno y con varios homónimos, elección de uno, "ninguno", cliente desactivado no ofrecido, y sin pregunta cuando la parte trae un documento que no es de ningún cliente.
  - Aviso de causas como no cliente.
  - Modificación, desvinculación, última parte (incluidas dos desvinculaciones simultáneas de las dos últimas partes), revinculación con sus controles, y una parte de otra causa (404).
- **Vínculo** [RF-26 a RF-28, RF-42]: `vinculo-cliente.service` sobre la base de tests:
  - Vinculado como parte vigente, también con la causa Archivada o Finalizada.
  - Desvinculado.
  - Causa desactivada y reactivada.
  - Cliente desactivado que sigue como parte.
- **Abogados** [RF-29 a RF-35]:
  - Responsable obligatorio.
  - Integrante desactivado nuevo rechazado y desactivado ya asignado conservado.
  - Repetidos.
  - Reemplazo del responsable.
  - Cuenta desactivada después de asignada.
  - Un integrante que no interviene edita la causa.
- **Listado** [RF-36 a RF-39]:
  - Orden por modificación o alta, y paginado.
  - Cada filtro y su combinación.
  - Búsqueda por fragmento de carátula, número con otro separador, nombre, razón social, DNI con puntos y CUIT con guiones, en mayúsculas y sin tildes.
  - Una parte desvinculada no aparece en la búsqueda.
- **Desactivación y reactivación** con su auditoría [RF-40, RF-42].
- **Acceso** [RF-44]: un cliente recibe 403 y un visitante 401 en cada endpoint de `/api/panel/causas`.
- **Migración:** `up` sobre la base con las tablas de la spec 001 y `down` sin errores.

### web — Vitest
- `servicios/causas.ts` con `fetch` simulado: rutas, métodos y armado del query string [RF-36 a RF-39].
- `servicios/formulario-causa.ts`: validaciones con los mensajes de la API (incluidos los caracteres), recorte, cuerpos de parte cliente y no cliente, y `pendingQuestion` para cada `codigo` [RF-1, RF-4, RF-5, RF-9, RF-15, RF-16, RF-19, RF-43].
- `servicios/presentacion-causas.ts`: etiquetas, texto del incidente, nombre visible de cada tipo de parte y `needsResponsableWarning` [RF-1, RF-12, RF-33].
- `cliente-http.ts`: `ApiError.details` con los campos extra del error [RF-9, RF-16, RF-19].
- `PanelCausas` con servicios simulados: filtros (responsables solo activos), buscador, paginado, marca de incidente y "Mostrar desactivadas" [RF-36 a RF-39].
- `PanelCausaNueva` [RF-6, RF-7, RF-16, RF-19, RF-20]: alta con rechazos parciales, cada pregunta y sus respuestas, y el aviso de causas como no cliente.
- `PanelCausaDetalle` [RF-12, RF-22, RF-24, RF-33, RF-41]: desvinculación, partes desvinculadas y revinculación, aviso de responsable desactivado, y causa desactivada solo con "Reactivar".
- `DisenoPanel` muestra el enlace "Causas", y las rutas nuevas no son accesibles para un cliente [RF-44].
- Ninguna escritura en `localStorage` ni `sessionStorage` en el flujo de causas [RNF de persistencia].

## Cobertura de RF

| RF | Dónde se implementa | Test |
|---|---|---|
| RF-1, RF-3, RF-5 | Entidad `Causa`, DTO, `formulario-causa.ts` | Unitarios de DTO, Vitest |
| RF-2 | Auditoría en cada escritura con bloqueo de la causa | e2e de alta, edición y partes |
| RF-4 | `texto-causa.ts`, `formulario-causa.ts` | Unitarios de api y web |
| RF-6, RF-7 | `causas.service` (crear), `PanelCausaNueva` | e2e de alta, Vitest |
| RF-8 a RF-10, RF-43 | `claveExpediente`, `controlarExpediente`, reactivar, `translateDuplicate` | Unitarios y e2e de expediente |
| RF-11 | `PATCH /:id` | e2e de edición |
| RF-12 | `GET /:id`, `causa-detalle.ts`, `PanelCausaDetalle` | e2e, unitario, Vitest |
| RF-13 a RF-21, RF-25 | `partes.service`, `ParteNuevaDto`, `FormularioParte`, `PreguntaConfirmacion` | Unitarios y e2e de partes, Vitest |
| RF-22 a RF-24 | `partes.service` (desvincular y revincular) con bloqueo de la causa | e2e de partes, Vitest |
| RF-26 a RF-28, RF-42 | `vinculo-cliente.service` | e2e de vínculo |
| RF-29 a RF-34 | `abogados.service`, `reglas-causas.ts`, `SelectorIntegrantes`, `needsResponsableWarning` | Unitarios y e2e de abogados, Vitest |
| RF-35 | Sin código: ningún control depende de quién interviene | e2e: un integrante que no interviene edita la causa |
| RF-36 a RF-39 | `causas.service` (listar), `PanelCausas` | e2e de listado, Vitest |
| RF-40, RF-41 | `causas.service` (desactivar), bloqueo de escrituras | e2e de desactivación |
| RF-44 | `@Roles('admin', 'abogado')` y guards de la spec 001 | e2e de acceso |
