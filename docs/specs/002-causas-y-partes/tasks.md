# Tareas 002 — Causas y partes

Derivadas de `spec.md` y `plan.md` de esta carpeta. Cada tarea dura entre 20 y 30 minutos y se hace en orden.

Reglas para todas las tareas:
- Primero se escriben los tests, después el código.
- Una tarea está terminada solo si, además de su "Hecho cuando", `pnpm test` y `pnpm lint` pasan sin errores.
- Ninguna tarea crea ni modifica archivos `.env`, `.env.test` ni ningún otro con credenciales, y ninguna se conecta a la base de producción. Los e2e usan la base de tests de la spec 001.
- No se agregan dependencias: el plan no prevé ninguna.
- Antes de modificar un archivo existente se pide aprobación (AGENTS.md). Las tareas que lo hacen lo indican con **(modifica existente)**.
- No se hacen commits sin pedido explícito.

## api

- [x] **T1 — Validadores de texto de la causa** [RF-3, RF-4, RF-37]
  `causas/validadores/texto-causa.ts`: normalización a NFC, regla de caracteres permitidos y número de expediente para búsqueda (solo letras y dígitos).
  Hecho cuando: los tests unitarios verifican que se aceptan letras con tilde, ñ, ü y cada símbolo permitido; que se rechazan emojis, saltos de línea y tabulaciones; que una tilde combinable cuenta como una letra; y que "1234/2024" y "1234-2024" dan el mismo número para búsqueda.

- [x] **T2 — Entidades** [RF-1, RF-13 a RF-15, RF-29]
  `causa.entity.ts` (con `claveExpediente` como columna generada `STORED` y `expedientePrincipal`), `parte.entity.ts` y `colaborador.entity.ts`, con los campos, tipos, índices y relaciones del plan.
  Hecho cuando: la api compila y un test unitario verifica que los enums de fuero, estado y rol procesal tienen exactamente los valores del plan.
-
- [x] **T3 — Migración** [RF-1, RF-8, RF-13 a RF-15, RF-29] **(modifica existente: `esquema.ts`)**
  Migración `crear-causas-partes-y-colaboradores` con las tres tablas, el índice único `UQ_causas_expediente_activo` y las claves foráneas. Se agregan las entidades y la migración a `esquema.ts`.
  Hecho cuando: un e2e corre `up` sobre la base de tests con las tablas de la spec 001, verifica que la clave es `NULL` en una causa desactivada, en un incidente, sin número y sin juzgado, que el índice rechaza dos causas activas con la misma clave, y corre `down` sin errores.

- [x] **T4 — Reglas de expediente, documentos y nombres** [RF-8 a RF-10, RF-18, RF-19]
  `reglas-causas.ts`: clave de expediente (la misma fórmula que la columna generada), comparación de documentos entre parte cliente y no cliente, y comparación de nombres y razón social.
  Hecho cuando: los tests unitarios cubren la clave para activa, desactivada, incidente, sin número y sin juzgado; la igualdad de documentos entre una parte cliente y una no cliente; y la comparación de nombres de persona física y jurídica.

- [x] **T5 — Reglas de abogados y de última parte** [RF-23, RF-29 a RF-32]
  En `reglas-causas.ts`: validación del conjunto responsable/colaboradores contra los asignados actuales y decisión de desvinculación.
  Hecho cuando: los tests unitarios verifican el rechazo de ids repetidos y del responsable como colaborador, el rechazo de un desactivado nuevo, la conservación de un desactivado ya asignado en el mismo lugar, y el rechazo de desvincular la única parte vigente.

- [x] **T6 — DTO de la causa** [RF-1, RF-3, RF-5, RF-10]
  DTO de alta (con `partes` como lista sin validar su interior), de modificación parcial y de los parámetros del listado, reutilizando `usuarios/dto/reglas.ts`.
  Hecho cuando: los tests unitarios cubren carátula vacía y larga, largos de número, expediente principal y juzgado, caracteres no permitidos, recorte y vacío a `NULL`, fuero y estado fuera de lista, incidente sin expediente principal, expediente principal sin incidente y campos desconocidos.

- [x] **T7 — DTO de la parte** [RF-13, RF-15]
  `ParteNuevaDto`, DTO de modificación de parte y una función que valida un objeto suelto con `validate()` de class-validator (para el alta parcial).
  Hecho cuando: los tests unitarios cubren parte cliente y no cliente, campos obligatorios y prohibidos según el tipo de persona, DNI y CUIT normalizados y validados, rol fuera de lista, y que la función devuelve los mensajes por parte sin lanzar excepciones.

- [x] **T8 — Armado de respuestas** [RF-12, RF-14]
  `causa-detalle.ts`: `CausaResumen`, `CausaDetalle`, `ParteDetalle` e `IntegranteResumen`, campo por campo.
  Hecho cuando: los tests unitarios verifican que una parte cliente persona física toma nombre, apellido y DNI de la cuenta, que una persona jurídica toma la razón social y no el contacto, y que ninguna respuesta incluye email ni hashes.

- [x] **T9 — Módulo, controller e integrantes** [RF-29, RF-44] **(modifica existente: `app.module.ts`, utilidades de e2e)**
  `CausasModule` importado en `app.module.ts`, `causas.controller.ts` con `@Roles('admin', 'abogado')` y `GET /api/panel/causas/integrantes`. Funciones de e2e para crear integrantes, clientes y causas.
  Hecho cuando: un e2e verifica que `GET /integrantes` devuelve administradores y abogados, activos y desactivados, ordenados por apellido y sin emails, y que no incluye clientes.

- [x] **T10 — Alta básica y consulta** [RF-2, RF-6, RF-12, RF-29]
  `POST /` con datos, responsable, colaboradores y partes no cliente, en una transacción y con auditoría; `GET /:id`.
  Hecho cuando: los e2e verifican el alta con estado por defecto En trámite, el registro de quién la creó, el detalle con partes, responsable y colaboradores, el 400 sin partes y el 404 de una causa inexistente o con id no numérico.

- [x] **T11 — Control de expediente en el alta** [RF-8 a RF-10]
  `controlarExpediente`, pregunta `EXPEDIENTE_REPETIDO` con `confirmarExpedienteRepetido` y traducción del índice único al 409 de RF-8.
  Hecho cuando: los e2e verifican el rechazo en el mismo juzgado y fuero (con otras mayúsculas, tildes o espacios), la pregunta en otro juzgado y con una causa sin juzgado, el guardado al confirmar, el incidente sin rechazo ni pregunta, que "1234/2024" y "1234-2024" no son duplicados, y que de dos altas simultáneas con la misma clave solo una se guarda.

- [x] **T12 — Partes cliente en el alta** [RF-14, RF-17, RF-18]
  Validación de partes cliente: cliente inexistente, desactivado y personas repetidas dentro del mismo cuerpo.
  Hecho cuando: los e2e verifican el alta con una parte cliente, el 404 de un `clienteId` que no es cliente, y que un cliente desactivado o una persona repetida no se guardan.

- [x] **T13 — Alta parcial** [RF-7]
  Rechazos por parte y por colaborador en `ResultadoAlta`; 400 si no queda ninguna parte válida.
  Hecho cuando: los e2e verifican que una parte mal cargada, una parte con cliente desactivado y un colaborador desactivado no se guardan pero la causa sí, que la respuesta informa cada rechazo con su índice o id y sus mensajes, y que sin ninguna parte válida responde 400 con los motivos.

- [x] **T14 — Preguntas de documento y de nombre** [RF-16, RF-19]
  Preguntas `DOCUMENTO_DE_CLIENTE`, `NOMBRE_REPETIDO` y `NOMBRE_DE_CLIENTE` con `indiceParte` en el alta, y sus confirmaciones.
  Hecho cuando: los e2e verifican cada pregunta y cada respuesta posible:
  - Documento de cliente: activo y desactivado (`clienteActivo`).
  - Nombre repetido en la causa, incluido contra otra parte del mismo cuerpo.
  - Nombre de clientes del estudio: con uno y con varios homónimos, sin ofrecer desactivados, y sin pregunta si la parte trae un documento que no es de ningún cliente.

- [x] **T15 — Aviso de causas como no cliente** [RF-20]
  Búsqueda de `causasComoNoCliente` al vincular un cliente, incluida en `ResultadoAlta`.
  Hecho cuando: un e2e verifica que, si el DNI del cliente figura como parte no cliente vigente de otras causas activas, el alta las informa, y que esas causas siguen sin vincular al cliente.

- [x] **T16 — Bloqueo por causa y edición de datos** [RF-2, RF-11, RF-41]
  Función de transacción con `SELECT … FOR UPDATE` sobre la causa, rechazo sobre causas desactivadas y registro de modificación. `PATCH /:id` con nuevo control de expediente cuando cambian número, juzgado, fuero o la marca de incidente.
  Hecho cuando: los e2e verifican la edición con su auditoría, que quitar la marca de incidente borra el expediente principal, que el control de expediente se repite al cambiar el número, que el DTO no acepta un campo para activar o desactivar, y el 409 sobre una causa desactivada.

- [x] **T17 — Agregar y modificar partes** [RF-2, RF-13 a RF-21, RF-25]
  `POST /:id/partes` y `PUT /:id/partes/:parteId` (incluida la conversión en parte cliente), con `ResultadoParte`.
  Hecho cuando: los e2e verifican:
  - El alta de partes cliente y no cliente, con sus preguntas y su aviso.
  - El cambio de rol y de datos, y la conversión en parte cliente.
  - El 404 con una parte de otra causa.
  - Que un cambio en la cuenta del cliente se ve en la parte sin cambiar `modificadoEn` de la causa.

- [x] **T18 — Desvincular y volver a vincular** [RF-22 a RF-25, RF-27]
  `POST /:id/partes/:parteId/desvincular` y `/revincular`.
  Hecho cuando: los e2e verifican:
  - Que la parte desvinculada pasa a `partesDesvinculadas`.
  - El rechazo de desvincular la última parte, también con dos desvinculaciones simultáneas de las dos últimas.
  - La revinculación con los controles de cliente desactivado y persona repetida.
  - El aviso de causas como no cliente al revincular un cliente.

- [x] **T19 — Abogados** [RF-29 a RF-34]
  `PUT /:id/abogados`.
  Hecho cuando: los e2e verifican el reemplazo del responsable y de los colaboradores, el rechazo de un desactivado nuevo, la conservación de uno ya asignado, los repetidos, el 400 con un cliente como responsable, y que una cuenta desactivada después de asignada sigue figurando con `activo: false`.

- [x] **T20 — Desactivación y reactivación** [RF-40, RF-42, RF-43]
  `POST /:id/desactivar` y `/reactivar` con `confirmarExpedienteRepetido`.
  Hecho cuando: los e2e verifican la auditoría de las dos acciones, que repetir la desactivación no es un error, el 409 al reactivar una causa activa, y en la reactivación con número repetido primero la pregunta y, al confirmar, el rechazo por duplicado exacto o la reactivación si no lo es.

- [x] **T21 — Vínculo cliente-causa** [RF-26 a RF-28, RF-42]
  `vinculo-cliente.service.ts` con `linkedCausaIds` e `isLinked`.
  Hecho cuando: los e2e sobre la base de tests verifican:
  - El vínculo con la causa en cada estado, incluidas Archivada y Finalizada.
  - Que se corta al desvincular la parte y al desactivar la causa.
  - Que vuelve al reactivar la causa.
  - Que un cliente desactivado sigue como parte y su vínculo vuelve al reactivar la cuenta.

- [x] **T22 — Listado y filtros** [RF-36, RF-38, RF-39]
  `GET /` con paginado de a 20, orden por modificación o alta, y filtros `fuero`, `estado`, `responsableId`, `mias`, `responsableDesactivado` e `incluirDesactivadas`.
  Hecho cuando: los e2e verifican el orden, el paginado, cada filtro por separado y combinado, que por defecto no aparecen las desactivadas y que con `incluirDesactivadas` sí.

- [x] **T23 — Búsqueda** [RF-37]
  Parámetro `buscar` sobre carátula, número, número para búsqueda y partes vigentes.
  Hecho cuando: los e2e verifican la búsqueda por:
  - Fragmento de carátula, en mayúsculas y sin tildes.
  - Número con otro separador.
  - Nombre y apellido en los dos órdenes, y razón social.
  - DNI con puntos y CUIT con guiones.

  También verifican que una parte desvinculada no aparece, que los comodines `%` y `_` se buscan como texto y que una causa con varias partes coincidentes aparece una sola vez.

- [x] **T24 — Acceso** [RF-35, RF-44]
  Recorrido de todos los endpoints de `/api/panel/causas`.
  Hecho cuando: los e2e verifican 401 sin sesión y 403 con un cliente en cada endpoint, y que un integrante que no interviene en una causa puede editarla.

## web

- [x] **T25 — Detalles en los errores de la API** [RF-9, RF-16, RF-19] **(modifica existente: `cliente-http.ts` y su test)**
  `ApiError.details` con los campos extra del cuerpo de error.
  Hecho cuando: los tests verifican que `codigo`, `clienteId`, `clienteActivo`, `clientes`, `parteId` e `indiceParte` llegan en `details`, y que los errores sin datos extra siguen funcionando como antes.

- [x] **T26 — Servicio de causas** [RF-6 a RF-44] **(modifica existente: `ProveedorServicios.tsx`)**
  `servicios/causas.ts` con tipos y una función por endpoint, y `useCausasService` en `ProveedorServicios`.
  Hecho cuando: los tests con `fetch` simulado verifican la ruta, el método, el cuerpo y el query string de cada llamada.

- [x] **T27 — Presentación de causas** [RF-1, RF-12, RF-33, RF-36]
  `servicios/presentacion-causas.ts`.
  Hecho cuando: los tests verifican las etiquetas de fuero, estado y rol procesal, el texto "Vinculado al expte. principal Nº …", el nombre visible de cada tipo de parte y `needsResponsableWarning`.

- [x] **T28 — Validación de formularios** [RF-1, RF-3 a RF-5, RF-10, RF-15]
  `servicios/formulario-causa.ts`: validación de causa y de parte con los mensajes de la API y armado de los cuerpos.
  Hecho cuando: los tests verifican cada mensaje (incluidos los de caracteres y de incidente), el recorte, y los cuerpos de alta, de modificación y de parte cliente y no cliente.

- [x] **T29 — Preguntas** [RF-9, RF-16, RF-19, RF-43]
  `servicios/preguntas.ts`: `pendingQuestion(error)` y `applyPartyAnswer(parte, opción)`.
  Hecho cuando: los tests verifican la pregunta y las opciones de cada `codigo` (incluido `DOCUMENTO_DE_CLIENTE` con cliente desactivado y `NOMBRE_DE_CLIENTE` con varios clientes), y que un error sin `codigo` no es una pregunta.

- [x] **T30 — Rutas y navegación** [RF-44] **(modifica existente: `RutasAplicacion.tsx`, `DisenoPanel.tsx` y `Disenos.test.tsx`)**
  Rutas `/panel/causas`, `/panel/causas/nueva` y `/panel/causas/:id` con páginas provisorias, y enlace "Causas" en el panel.
  Hecho cuando: los tests verifican que el panel muestra el enlace y que un cliente que entra a esas rutas es llevado al portal.

- [x] **T31 — Listado de causas** [RF-36 a RF-39]
  `PanelCausas`.
  Hecho cuando: los tests con servicios simulados verifican:
  - Que buscar y cada filtro llaman al servicio con los parámetros correctos y vuelven a la página 1.
  - Que el filtro de responsable ofrece solo integrantes activos.
  - El paginado, la marca de incidente y la identificación de las desactivadas.

  No se escribe nada en `localStorage` ni `sessionStorage`.

- [x] **T32 — Formulario de causa y selector de integrantes** [RF-1, RF-10, RF-29 a RF-32]
  `FormularioCausa` (con la casilla "Es incidente" y el campo del expediente principal) y `SelectorIntegrantes`.
  Hecho cuando: los tests verifican que el campo del expediente principal aparece solo con la casilla marcada, los errores antes de enviar, que solo se ofrecen integrantes activos para asignar, y que un desactivado ya asignado se muestra marcado y se conserva.

- [x] **T33 — Formulario de parte y selector de cliente** [RF-13 a RF-15]
  `FormularioParte` (modo cliente o no cliente, campos según el tipo de persona) y `SelectorCliente`.
  Hecho cuando: los tests verifican los campos de cada modo y tipo de persona, los errores antes de enviar, y que el selector busca con `listUsers({ rol: 'cliente', activo: true, buscar })` y muestra el DNI o CUIT de cada resultado.

- [x] **T34 — Pregunta de confirmación** [RF-9, RF-16, RF-19, RF-43]
  `PreguntaConfirmacion`.
  Hecho cuando: los tests verifican que muestra el mensaje y un botón por opción, que `NOMBRE_DE_CLIENTE` muestra un botón por cliente con su documento formateado, y que cada botón devuelve la respuesta elegida.

- [x] **T35 — Alta de causa** [RF-6, RF-7, RF-16, RF-19, RF-20]
  `PanelCausaNueva`.
  Hecho cuando: los tests con servicios simulados verifican:
  - El envío.
  - Cada pregunta y el reenvío con la respuesta: confirmación, `clienteId` elegido o parte quitada.
  - La navegación al detalle con los rechazos y el aviso de causas como no cliente.
  - La muestra de los errores de la API.

- [x] **T36 — Detalle y edición de datos** [RF-11, RF-12, RF-33, RF-41]
  `PanelCausaDetalle`: datos, texto de incidente, auditoría con fechas en hora de Buenos Aires, edición con la pregunta de expediente y aviso de responsable desactivado.
  Hecho cuando: los tests verifican la muestra de los datos y la auditoría, la edición, la pregunta de expediente repetido, el aviso de responsable desactivado, y que en una causa desactivada no hay acciones de edición.

- [ ] **T37 — Partes en el detalle** [RF-16 a RF-25]
  `TablaPartes` con partes vigentes y desvinculadas: agregar, modificar, desvincular y volver a vincular.
  Hecho cuando: los tests verifican cada acción con su llamada al servicio, las preguntas al agregar y al modificar, el aviso de causas como no cliente, y el mensaje al intentar desvincular la última parte.

- [ ] **T38 — Abogados en el detalle** [RF-29 a RF-34]
  Edición de responsable y colaboradores en `PanelCausaDetalle`.
  Hecho cuando: los tests verifican el envío de `{ responsableId, colaboradorIds }`, la conservación de un desactivado ya asignado y la muestra de los mensajes de 409.

- [ ] **T39 — Desactivar y reactivar** [RF-40 a RF-43]
  `AccionesCausa`.
  Hecho cuando: los tests verifican que una causa activa ofrece "Desactivar" con confirmación, que una desactivada ofrece solo "Reactivar", y la pregunta de expediente repetido al reactivar.

## Cierre

- [ ] **T40 — Validación de la spec**
  Recorrer `spec.md` requisito por requisito con su test, correr la migración `up` y `down` sobre la base de tests y hacer la demo manual de los criterios de finalización.
  Hecho cuando: cada RF tiene al menos un test en verde identificado, `pnpm test` y `pnpm lint` pasan, y la demo manual se completó sin errores.
