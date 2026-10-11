# Tareas 006 — Modelos de escritos

Derivadas de `spec.md` y `plan.md` de esta carpeta. Cada tarea dura entre 20 y 30 minutos y se hace en orden.

Reglas para todas las tareas:
- Primero se escriben los tests, después el código.
- Una tarea está terminada solo si, además de su "Hecho cuando", `pnpm test` y `pnpm lint` pasan sin errores.
- Ninguna tarea crea ni modifica archivos `.env`, `.env.test` ni ningún otro con credenciales, y ninguna se conecta a la base de producción. Los e2e usan la base de tests de la spec 001.
- No se agregan dependencias: el plan no prevé ninguna.
- Antes de modificar un archivo existente se pide aprobación (AGENTS.md). Las tareas que lo hacen lo indican con **(modifica existente)**.
- No se hacen commits sin pedido explícito.

## api

- [x] **T1 — Textos de un modelo** [RF-3 a RF-5]
  `modelos-escritos/validadores/texto-modelo.ts`: `convertModelText` (el `convertText` de la spec 005 en multilínea, más la quita de espacios al inicio y al final de cada línea) y `hasOnlyModelTextCharacters` (los caracteres de los movimientos más `@`). `modelos-escritos/validadores/longitudes.ts` con los largos máximos: título 150, descripción 500, texto 50.000 y búsqueda 100.
  Hecho cuando: los tests unitarios verifican:
  - Que las conversiones de la spec 005 se siguen aplicando: comillas tipográficas, guiones largos, "…", corchetes a paréntesis, tabulaciones e invisibles.
  - Que se quitan los espacios al inicio y al final de cada línea, se conservan las líneas en blanco intermedias y se quitan los saltos de línea de los extremos.
  - Que el texto acepta `@` y cada símbolo de los movimientos, y rechaza `< > { } \ | = * +`, el acento grave y los emojis. Que ningún texto aceptado contiene corchetes.
  - Que el título (caracteres de la spec 002) y la descripción (caracteres de la spec 003) rechazan `@`.
  - Que un texto de 50.000 caracteres contados con `textLength` pasa y uno de 50.001 no, también cuando el largo cambia al convertir ("…").

- [x] **T2 — Variables** [RF-7 a RF-12]
  `modelos-escritos/variables.ts`: el catálogo fijo (nombre, grupo y descripción de cada variable de RF-9), `variableKey`, `findMarks`, `canonicalMarks`, `hasJoinedMarks`, `unknownVariables` y `usedVariables`.
  Hecho cuando: los tests unitarios verifican:
  - Que el catálogo tiene exactamente las variables de RF-9, sin `ABOGADO_QUE_COMPLETA`.
  - Que `#caratula#`, `#Carátula#` y `#CARATULA#` quedan como `#CARATULA#`, sin cambiar el largo del texto.
  - Que "local # 3", "#123#", "#____#", `# CARATULA #` y una marca partida por un salto de línea no son marcas.
  - Que `hasJoinedMarks` detecta `#ACTORES##DEMANDADOS#` y `#ACTORES#DEMANDADOS#`, y no `#ACTORES# #DEMANDADOS#` ni `#ACTORES#, #DEMANDADOS#`.
  - Que `unknownVariables` devuelve `CARATUAL`, `DEMANDADO` y `A` para `#CARATUAL#`, `#DEMANDADO#` y `#A#`.
  - Que `usedVariables` devuelve los nombres sin repetir y en orden, y una lista vacía en un texto sin marcas.

- [x] **T3 — Formato del escrito** [RF-9, RF-34 a RF-36]
  `modelos-escritos/formato-escrito.ts`: nombre de una persona, `formatDni`, `formatCuit`, `joinPeople`, orden de las personas con `Intl.Collator` y fecha en números y en letras a partir de `AAAA-MM-DD`.
  Hecho cuando: los tests unitarios verifican:
  - "Luis Gómez" para una persona física y la razón social para una jurídica.
  - "DNI 20.111.222", "DNI 5.123.456", "DNI 05.123.456" y "CUIT 30-71234567-8".
  - `joinPeople` con una persona, con dos ("a y b", con y sin detalle) y con tres ("a, b y c" sin detalle y "a; b; y c" con detalle).
  - El orden por apellido y nombre, con las razones sociales junto con los apellidos, sin distinguir mayúsculas ni tildes, y los homónimos por id.
  - "10/10/2026", "10 de octubre de 2026", "1 de marzo de 2026" y un día de diciembre.

- [x] **T4 — Valores de las variables** [RF-9, RF-34 a RF-38]
  `modelos-escritos/completar-escrito.ts`: `caseValues(causa, ahora)`, que arma las personas con `partyIdentity` de la spec 002 y devuelve, por variable, su texto y sus faltantes.
  Hecho cuando: los tests unitarios, con causas armadas en memoria, verifican:
  - Cada variable con su dato y con su marca de faltante: número, juzgado, expediente principal (también en una causa que no es incidente), actores, demandados, terceros y clientes.
  - Una parte no cliente sin documento: `(FALTA DNI)` o `(FALTA CUIT)` según el tipo de persona, con "DNI de …" o "CUIT de …" en los faltantes.
  - `CLIENTES_DOMICILIO` con uno, dos y tres clientes, y con uno sin domicilio ("domicilio de …").
  - Que las partes desvinculadas no figuran, que el rol Otro no figura en las variables de rol, que un cliente figura en su rol y en las de clientes, y que la persona de contacto de una persona jurídica no figura.
  - Que `ABOGADO_RESPONSABLE` pone al responsable aunque sea administrador o esté desactivado.
  - `FECHA` y `FECHA_EN_LETRAS` con el cambio de día a las 02:59 y a las 03:00 UTC.

- [x] **T5 — Reemplazo, faltantes y avisos** [RF-31, RF-33, RF-39, RF-40]
  En `completar-escrito.ts`: `completeText(texto, valores)`, que reemplaza las marcas en una sola pasada y devuelve el texto, los faltantes, los clientes desactivados y si el responsable está desactivado.
  Hecho cuando: los tests unitarios verifican:
  - Que la misma variable se reemplaza en todos sus lugares y el resto del texto queda igual, con sus saltos de línea.
  - Que una carátula con "#FECHA#" y un dato con `$&` se insertan tal cual.
  - Que los faltantes van sin repetir, en orden y solo de las variables que el texto usa.
  - Que `clientesDesactivados` solo se informa si el texto usa una variable de clientes, y `responsableDesactivado` solo si usa `ABOGADO_RESPONSABLE`.
  - Que un texto sin marcas vuelve igual, sin faltantes ni avisos.

- [x] **T6 — Entidad** [RF-1, RF-2]
  `modelos-escritos/modelo-escrito.entity.ts` con los campos, tipos y relaciones del plan: `texto` en `mediumtext`, `fuero` con default `otro`, fechas de registro con microsegundos e `IDX_modelos_escritos_listado`.
  Hecho cuando: la api compila y un test unitario verifica que el enum de fuero tiene exactamente los valores de `JURISDICTIONS` y el de tipo, los siete del plan.

- [x] **T7 — Migración** [RF-1, RF-2] **(modifica existente: `esquema.ts`)**
  Migración `crear-modelos-escritos` con la tabla, su índice y sus claves foráneas. Se agregan la entidad y la migración al final de las listas de `esquema.ts`.
  Hecho cuando: un e2e corre `up` sobre la base de tests con las tablas de las specs 001 a 005, guarda un modelo con un texto de 50.000 caracteres con tildes y lo lee igual, verifica que un modelo guardado sin fuero queda con `otro`, y corre `down` sin errores.

- [x] **T8 — DTO de alta y modificación** [RF-1, RF-3 a RF-8, RF-10, RF-14]
  `dto/reglas-modelo.ts` (transformaciones con `convertText`, `convertModelText` y `canonicalMarks`, y reglas con los mensajes del plan, reutilizando `usuarios/dto/reglas.ts` y las reglas de las specs 002 y 003), y los DTO de `POST` y de `PATCH` parcial.
  Hecho cuando: los tests unitarios cubren:
  - Obligatorios ausentes o vacíos, largos y caracteres de título, descripción y texto. Tipo y fuero fuera de la lista, y fuero ausente.
  - Descripción vacía a `NULL`.
  - Que el texto llega convertido y con las marcas en la forma del catálogo.
  - Marcas pegadas ("Las variables tienen que estar separadas") y variables que no existen ("El texto tiene variables que no existen"), con mensajes que no las nombran.
  - En `PATCH`, el rechazo de `activo` y de otros campos desconocidos.
  - Que ningún mensaje repite el valor recibido (un texto con una marca de prueba no aparece en el mensaje).

- [x] **T9 — DTO del listado y de la reactivación** [RF-18, RF-21, RF-22, RF-27]
  DTO de `GET /` con `pagina`, `buscar`, `tipo`, `fuero` e `incluirDesactivados`, y de `POST /:id/reactivar` con `confirmarRepetido`.
  Hecho cuando: los tests unitarios cubren:
  - Los valores por defecto y una página inválida.
  - `buscar` convertido, con `@` (se acepta), con `<` ("La búsqueda tiene caracteres no permitidos"), de 101 caracteres y con solo espacios (equivale a no enviarlo).
  - Tipo y fuero fuera de la lista, `incluirDesactivados` que no es booleano y una confirmación que no es booleana.

- [x] **T10 — Armado de respuestas** [RF-16, RF-19, RF-33, RF-51]
  `modelo-detalle.ts`: `ModeloResumen`, `ModeloDetalle`, `ModeloReferencia` y `EscritoCompletado`, campo por campo, con `toAutorResumen` de la spec 003.
  Hecho cuando: los tests unitarios verifican:
  - Que cada respuesta tiene exactamente las claves de su tipo, sin emails ni hashes.
  - Que el resumen no lleva `texto` y que el detalle lleva `variables` con `usedVariables`.
  - Que `EscritoCompletado` solo lleva el id y la carátula de la causa, el id y el título del modelo, el texto, los faltantes y los dos avisos.
  - Que los autores desactivados quedan marcados.

- [x] **T11 — Módulo, controller y consulta de un modelo** [RF-16, RF-49, RF-50] **(modifica existente: `app.module.ts`)**
  `ModelosEscritosModule` sin `exports`, con `ModeloEscrito` y `Causa`, importado en `app.module.ts`. `modelos-escritos.controller.ts` con `@Roles('admin', 'abogado')`, el `ParseIntPipe` con 404 y `GET /:id`. `api/test/utilidades/modelos-de-prueba.ts` (nuevo) con funciones para vaciar la tabla y crear modelos.
  Hecho cuando: los e2e verifican la consulta de un modelo activo y de uno desactivado, con su texto, sus variables y su autoría, y el 404 "No existe ese modelo" con un id inexistente y con uno no numérico.

- [x] **T12 — Carga** [RF-1 a RF-13]
  `POST /` en `modelos-escritos.service.ts`, todavía sin el aviso de título repetido.
  Hecho cuando: los e2e verifican:
  - La carga completa y una sin fuero (queda `otro`) ni descripción, con quién la cargó y cuándo.
  - Que un texto pegado con caracteres tipográficos y sangría se guarda convertido, y sus marcas en la forma del catálogo.
  - Que se acepta un modelo sin ninguna variable y uno con un email en el texto.
  - Los rechazos de validación, con un texto con una marca de prueba que no aparece en la respuesta.

- [x] **T13 — Tamaño del cuerpo** [RF-1] **(modifica existente: `configurar-aplicacion.ts`)**
  `configureApp` suma el límite de 512 KB para los cuerpos JSON.
  Hecho cuando: los e2e verifican que se acepta un modelo con un texto de 50.000 caracteres de varios bytes, y que un cuerpo de más de 512 KB responde 413 sin repetir lo recibido. Los e2e de las specs 001 a 005 siguen pasando.

- [x] **T14 — Título repetido en la carga** [RF-15] **(modifica existente: `causas/preguntas.ts`)**
  `QUESTION_CODES.repeatedTemplate = 'MODELO_REPETIDO'` y `findRepeated` en el service, aplicado en `POST /`.
  Hecho cuando: los e2e verifican:
  - Mismo título con otras mayúsculas, tildes o espacios: 409 `MODELO_REPETIDO` con el mensaje y todos los modelos activos con los que coincide. Con `confirmarRepetido: true`, 201.
  - Con dos coincidencias, la respuesta trae las dos.
  - Un título igual al de un modelo desactivado: sin pregunta.

- [x] **T15 — Modificación** [RF-2, RF-14, RF-15, RF-26]
  `PATCH /:id` con el bloqueo del modelo (`SELECT … FOR UPDATE`) y la pregunta de título repetido solo si cambia el título.
  Hecho cuando: los e2e verifican:
  - La modificación de cada dato con quién la hizo y cuándo.
  - Que un `PATCH` sin cambios no actualiza `modificadoPor` ni `modificadoEn`.
  - Que no hay pregunta si no cambia el título, que el modelo no se compara consigo mismo, y la pregunta cuando el cambio lo hace coincidir con otro.
  - El 409 "El modelo está desactivado. Reactivalo para modificarlo".

- [x] **T16 — Desactivación y reactivación** [RF-2, RF-25 a RF-28]
  `POST /:id/desactivar` y `POST /:id/reactivar` con el bloqueo del modelo y la pregunta de título repetido al reactivar.
  Hecho cuando: los e2e verifican:
  - La desactivación y la reactivación con quién las hizo y cuándo, y el 409 al repetir cada acción.
  - La pregunta al reactivar un modelo cuyo título coincide con el de otro activo, y la reactivación con `confirmarRepetido: true`.
  - Que una desactivación y una modificación simultáneas se ordenan: si la desactivación queda primero, la modificación responde 409.

- [x] **T17 — Listado: orden, paginado y filtros** [RF-18, RF-19, RF-22 a RF-24]
  `GET /` con el orden del plan, 21 filas para `haySiguiente`, `hayModelos` con la página vacía, y los filtros de tipo, fuero e `incluirDesactivados`.
  Hecho cuando: los e2e verifican:
  - El orden por título sin distinguir mayúsculas ni tildes y, a igual título, primero el último registrado. Con 45 modelos, las tres páginas no repiten ni omiten ninguno, y `haySiguiente` es correcto en cada una.
  - Que la respuesta no tiene `total` y que ninguna fila trae `texto`.
  - El filtro por tipo; por Laboral (laborales y Otro); por Otro (solo Otro); `incluirDesactivados`; y su combinación.
  - `hayModelos` en `false` sin modelos y con todos desactivados (aunque haya filtros), y en `true` con modelos que no coinciden.
  - Que una página inexistente devuelve `items` vacío.

- [x] **T18 — Listado: buscador** [RF-20, RF-21]
  Búsqueda por fragmento en el título, la descripción y el texto.
  Hecho cuando: los e2e verifican:
  - La búsqueda por fragmento en cada campo, en mayúsculas y sin tildes ("CEDULA" encuentra "Cédula").
  - Que "#JUZGADO#" encuentra los modelos que usan esa variable y "@ejemplo.com" los que tienen ese email.
  - Que "50%" se busca literal.
  - La combinación del buscador con los filtros.

- [x] **T19 — Escrito completado** [RF-30 a RF-40]
  `escritos.controller.ts` y `escritos.service.ts`: `GET /api/panel/causas/:causaId/escritos/:modeloId`, que carga la causa con su responsable y sus partes y usa `caseValues` y `completeText`.
  Hecho cuando: los e2e verifican:
  - Con una causa sin número ni juzgado, dos actores clientes (uno sin domicilio), un demandado persona jurídica con CUIT y otro persona física sin DNI: el texto, los faltantes y los avisos esperados.
  - Que después de cargar el número y el juzgado, el mismo pedido devuelve los datos nuevos.
  - Que con un cliente y el responsable desactivados llegan los dos avisos, y sus nombres figuran en el texto.
  - Que la respuesta lleva `Cache-Control: no-store` y solo las claves de `EscritoCompletado`.

- [x] **T20 — Escrito: rechazos y solo lectura** [RF-2, RF-26, RF-41 a RF-43, RF-46, RF-49]
  Los controles del plan en `escritos.service.ts`: primero la causa, después el modelo.
  Hecho cuando: los e2e verifican:
  - Causa desactivada: 409 "La causa está desactivada". Causa Archivada y Finalizada: 200.
  - Modelo desactivado: 409 "El modelo está desactivado".
  - Causa o modelo inexistente, e ids no numéricos: 404 con su mensaje.
  - Que `modificadoPor` y `modificadoEn` de la causa y del modelo no cambian, y que la cantidad de filas de todas las tablas es la misma antes y después de completar.

- [x] **T21 — Rendimiento** [RNF de rendimiento]
  Utilidad de e2e para insertar en bloque 500 modelos con textos de 50.000 caracteres, y una causa con 50 partes.
  Hecho cuando: un e2e verifica que el listado con buscador y filtros responde en menos de 2 segundos, y que completar un modelo de 50.000 caracteres en esa causa también.

- [x] **T22 — Acceso, autoría y aislamiento** [RF-50 a RF-53, RNF de registros, RNF de reglas de textos]
  Hecho cuando:
  - Los e2e verifican que un cliente recibe 403, un visitante 401 y una cuenta con cambio de contraseña pendiente 403 en cada endpoint de `/api/panel/modelos-escritos` y en el del escrito.
  - Un e2e verifica que un autor desactivado sigue figurando en el modelo, marcado como desactivado.
  - Un e2e verifica que las respuestas del portal de un cliente no tienen datos de modelos ni de escritos.
  - Un e2e verifica que crear una causa, un movimiento y un fallo con `@` sigue respondiendo 400.
  - Un test de Vitest lee los archivos fuente y falla si: algún archivo de `src/portal/` importa de `src/modelos-escritos/`; `modelos-escritos.module.ts` declara `exports`; algún controller de modelos no lleva `@Roles('admin', 'abogado')`; algún archivo de `src/modelos-escritos/` importa de `src/jurisprudencia/` algo que no sea `validadores/texto-fallo` o `reglas-jurisprudencia`; o alguno usa `Logger` o `console`.

## web

- [x] **T23 — Textos y variables en la web** [RF-3, RF-4, RF-7 a RF-12]
  `servicios/texto-modelo.ts`: `convertModelText` (con el `convertText` de `servicios/texto-fallo.ts`), las reglas de caracteres y largos, el catálogo de variables, las reglas de las marcas e `insertVariable`.
  Hecho cuando: los tests de Vitest repiten los casos de T1 y T2, y verifican `insertVariable` al principio del texto, en el medio y reemplazando una selección.

- [x] **T24 — Servicio de modelos** [RF-13 a RF-32, RF-48]
  `servicios/modelos-escritos.ts`: tipos y una función por endpoint de `/api/panel/modelos-escritos`, la del escrito completado y `keepSessionAlive`.
  Hecho cuando: los tests con `fetch` simulado verifican las rutas, los métodos, los cuerpos y el armado del query string (sin enviar los filtros vacíos ni `incluirDesactivados` desmarcado).

- [x] **T25 — Formulario y filtros** [RF-1, RF-6, RF-10, RF-14, RF-21, RF-22]
  `servicios/formulario-modelo.ts`: `validateModelForm`, cuerpo de alta, cuerpo de edición con solo lo que cambió, `validateModelFilters` y `toListQuery`.
  Hecho cuando: los tests verifican:
  - Las validaciones con los mensajes de la API, incluidos los de variables pegadas y de variables que no existen.
  - El largo del texto contado después de convertir.
  - El cuerpo de alta y el de edición, que queda vacío si no cambió nada.
  - Los filtros: búsqueda con `<`, con `@` y de 101 caracteres.

- [x] **T26 — Presentación, portapapeles y sesión del escrito** [RF-23, RF-24, RF-32, RF-39, RF-40, RF-44, RF-45, RF-48]
  `servicios/presentacion-modelos.ts` (etiquetas de tipo de escrito, `emptyModelListMessage`, textos de los avisos y de la leyenda), `servicios/portapapeles.ts` (`copyText` y `clearClipboard`) y `servicios/sesion-escrito.ts` (`STAFF_IDLE_LIMIT_MS` y el estado de la lista para volver).
  Hecho cuando: los tests verifican:
  - `emptyModelListMessage` sin modelos, con resultados vacíos en la página 1 y en otra página.
  - El texto de cada aviso con uno y con varios faltantes o clientes.
  - `copyText` con un portapapeles que acepta, con uno que rechaza y sin portapapeles.
  - Que `clearClipboard` escribe un texto vacío y no falla si el navegador lo rechaza.
  - Que `STAFF_IDLE_LIMIT_MS` es de 60 minutos.

- [x] **T27 — Pregunta, servicios, menú y rutas** [RF-15, RF-27, RF-50] **(modifica existente: `servicios/preguntas.ts` y su test, `ProveedorServicios.tsx`, `DisenoPanel.tsx` y `Disenos.test.tsx`, `RutasAplicacion.tsx`)**
  `pendingQuestion` reconoce `MODELO_REPETIDO` con las opciones "Guardar igual" y "Cancelar" y la lista de modelos. `ProveedorServicios` suma el servicio de modelos. `DisenoPanel` suma el enlace "Modelos". Las cinco rutas del panel apuntan a páginas provisorias que se reemplazan en T30 y T32 a T35. `web/src/pruebas/modelos-de-prueba.tsx` (nuevo) con datos y servicios simulados.
  Hecho cuando: los tests verifican la pregunta con los modelos que coinciden, el enlace "Modelos" en el panel, y que las rutas nuevas llevan a un cliente al portal y a un visitante a `/ingresar`.

- [x] **T28 — Uso de la sesión e inactividad** [RF-17, RF-48]
  `componentes/useUsoDeSesion.ts` (con `createSessionKeepAlive` y el `keepSessionAlive` del servicio de modelos) y `componentes/useCierrePorInactividad.ts` (con `isIdleExpired`, `IDLE_CHECK_INTERVAL_MS` e `IDLE_NOTICE`).
  Hecho cuando: los tests, con la hora simulada, verifican:
  - Que el uso consulta la sesión como mucho una vez cada 5 minutos.
  - Que pasados 60 minutos sin pedidos al servidor se cierra la sesión con el aviso de inactividad, y que un pedido reinicia la cuenta.
  - Que al desmontar el componente se dejan de escuchar los pedidos y se detiene el control.

- [x] **T29 — Lista de modelos** [RF-18 a RF-24]
  `FiltrosModelos`, `FilaModelo` y `ListaModelos`, con las opciones de mostrar o no "Mostrar desactivados", el destino de cada fila y el estado inicial.
  Hecho cuando: los tests con servicios simulados verifican:
  - Que la fila muestra el título, el tipo, el fuero, la descripción y la etiqueta "Desactivado", y no el texto.
  - Que los filtros abren vacíos, y que buscar y cada filtro llaman al servicio con los parámetros correctos y vuelven a la página 1.
  - "Anterior" y "Siguiente" según `haySiguiente`, sin totales.
  - Cada mensaje de vacío y el botón "Volver a la primera página".
  - Que una búsqueda con `<` muestra el error sin llamar al servicio.
  - Que con un estado inicial la lista abre en esa página, con esa búsqueda y esos filtros.

- [x] **T30 — Sección de modelos** [RF-18, RF-22]
  `PanelModelos` en lugar de la página provisoria: `ListaModelos` con "Mostrar desactivados" y el enlace "Nuevo modelo".
  Hecho cuando: los tests verifican que cada fila lleva a la ficha del modelo, que "Mostrar desactivados" pide `incluirDesactivados`, y que no se escribe nada en `localStorage` ni `sessionStorage`.

- [x] **T31 — Catálogo y formulario** [RF-1, RF-10, RF-11, RF-17]
  `CatalogoVariables` y `FormularioModelo` (con el contador del texto y el uso de la sesión en cada cambio).
  Hecho cuando: los tests verifican:
  - Los campos, el fuero en "Otro" por defecto y el contador sobre 50.000.
  - Que el catálogo muestra cada variable con lo que pone, y que elegir una la inserta en la posición del cursor.
  - Los errores de validación sin llamar al servicio, con la lista de las variables que no existen debajo de su mensaje.
  - Que escribir consulta la sesión como mucho una vez cada 5 minutos.

- [x] **T32 — Carga de un modelo** [RF-13, RF-15]
  `PreguntaModeloRepetido` y `PanelModeloNuevo` en lugar de la página provisoria.
  Hecho cuando: los tests con servicios simulados verifican:
  - La carga y la ida a la ficha.
  - La pregunta de título repetido con todos los modelos que coinciden: "Guardar igual" repite la petición con `confirmarRepetido: true` y "Cancelar" no guarda.
  - Que no se escribe nada en `localStorage` ni `sessionStorage`.

- [x] **T33 — Ficha del modelo** [RF-14, RF-16, RF-25 a RF-28]
  `PanelModeloDetalle` en lugar de la página provisoria.
  Hecho cuando: los tests con servicios simulados verifican:
  - La muestra de los datos, el texto con `TextoLiteral`, las variables que usa o "Este modelo no usa variables", y la autoría (marcada si el autor está desactivado).
  - La edición, con la pregunta de título repetido, y que guardar sin cambios no llama al servicio.
  - Desactivar y reactivar, con los mensajes de 409.
  - Que un modelo desactivado muestra "Desactivado" y solo la acción "Reactivar".

- [ ] **T34 — Elegir un modelo desde una causa** [RF-29, RF-30, RF-41] **(modifica existente: `PanelCausaDetalle.tsx` y su test)**
  `PanelCausaDetalle` suma el enlace "Completar un modelo" en las causas activas. `PanelCausaModelos` en lugar de la página provisoria.
  Hecho cuando: los tests verifican:
  - Que el enlace aparece en una causa activa y no en una desactivada.
  - Que `PanelCausaModelos` muestra la carátula y la lista sin "Mostrar desactivados", sin ningún filtro elegido y sin pedir `incluirDesactivados`.
  - Que en una causa desactivada muestra "La causa está desactivada" y no lista modelos.
  - Que cada fila lleva al escrito y pasa la página, la búsqueda y los filtros en el estado de navegación.

- [ ] **T35 — Escrito: texto, avisos y volver** [RF-32, RF-39 a RF-41, RF-47]
  `AvisosEscrito` y `PanelEscrito` en lugar de la página provisoria.
  Hecho cuando: los tests con servicios simulados verifican:
  - La carátula, el título del modelo y el texto con sus saltos de línea.
  - Cada aviso, y que ninguno deshabilita "Copiar". Sin faltantes ni desactivados, ningún aviso.
  - Que "Volver a la lista de modelos" llega a la lista con la página, la búsqueda y los filtros que tenía, y "Volver a la causa" a la causa.
  - Que los 404 y 409 de la API se muestran con su mensaje y el enlace a la causa.
  - Que no hay botones de descargar, imprimir, exportar, enviar ni editar.

- [ ] **T36 — Escrito: copiar, sesión e inactividad** [RF-44 a RF-46, RF-48]
  En `PanelEscrito`: "Copiar" con su leyenda, el uso de la sesión y el cierre por inactividad.
  Hecho cuando: los tests verifican:
  - Que "Copiar" escribe en el portapapeles simulado el texto exacto del escrito, sin título, carátula ni avisos, y muestra "Escrito copiado".
  - El mensaje "No se pudo copiar. Seleccioná el texto y copialo a mano" cuando el portapapeles falla.
  - Que la leyenda está siempre a la vista.
  - Que recorrer la pantalla, seleccionar o copiar consulta la sesión como mucho una vez cada 5 minutos.
  - Que pasada 1 hora sin pedidos el escrito deja de mostrarse y la página lleva a `/ingresar`, y que un 401 hace lo mismo.
  - Que no se escribe nada en `localStorage` ni `sessionStorage`.

- [ ] **T37 — Cerrar sesión vacía el portapapeles** [RF-44] **(modifica existente: `DisenoSeccion.tsx` y `Disenos.test.tsx`)**
  `DisenoSeccion.handleLogout` llama a `clearClipboard()` antes de esperar el cierre de sesión, solo si el usuario no es un cliente.
  Hecho cuando: los tests verifican que "Cerrar sesión" vacía el portapapeles simulado para un administrador y para un abogado, que no lo toca para un cliente, y que la sesión se cierra igual si el portapapeles falla.

- [ ] **T38 — Aislamiento en la web** [RF-52, RF-53]
  Hecho cuando: un test de Vitest lee los archivos fuente y falla si algún archivo del portal importa un módulo de modelos o usa `useModelosService`, o si algún archivo de modelos importa `servicios/jurisprudencia.ts` o usa `useJurisprudenciaService`. El test incluye un caso que confirma que la regla detecta un archivo que sí usa modelos.

## Cierre

- [ ] **T39 — Validación de la spec** **(modifica existente: `README.md`)**
  Recorrer `spec.md` requisito por requisito con su test, correr la migración `up` y `down` sobre la base de tests y hacer la demo manual de los criterios de finalización.
  Hecho cuando:
  - Cada RF tiene al menos un test en verde identificado.
  - `pnpm test` y `pnpm lint` pasan.
  - La demo manual se completó sin errores.
  - `validacion.md` deja anotada la verificación de despliegue del plan: que el proxy de Easypanel no registre las direcciones completas, que llevan la búsqueda.
  - El README marca la spec 006 como terminada.
