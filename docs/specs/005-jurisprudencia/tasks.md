# Tareas 005 — Jurisprudencia

Derivadas de `spec.md` y `plan.md` de esta carpeta. Cada tarea dura entre 20 y 30 minutos y se hace en orden.

Reglas para todas las tareas:
- Primero se escriben los tests, después el código.
- Una tarea está terminada solo si, además de su "Hecho cuando", `pnpm test` y `pnpm lint` pasan sin errores.
- Ninguna tarea crea ni modifica archivos `.env`, `.env.test` ni ningún otro con credenciales, y ninguna se conecta a la base de producción. Los e2e usan la base de tests de la spec 001.
- No se agregan dependencias: el plan no prevé ninguna.
- Antes de modificar un archivo existente se pide aprobación (AGENTS.md). Las tareas que lo hacen lo indican con **(modifica existente)**.
- No se hacen commits sin pedido explícito.

## api

- [x] **T1 — Conversiones de texto** [RF-3 a RF-5]
  `jurisprudencia/validadores/texto-fallo.ts`: `convertText(valor, { multilinea })` con la tabla `TYPOGRAPHIC_REPLACEMENTS` y los ocho pasos del plan, en su orden. `jurisprudencia/validadores/longitudes.ts` con los largos máximos (reutiliza los de carátula, tribunal y número de la spec 002).
  Hecho cuando: los tests unitarios verifican:
  - Cada conversión de la tabla, una por una: comillas dobles y simples, guiones, viñetas, `…`, `№`, corchetes, espacios especiales y tabulación.
  - `§§` antes que `§`, "§3" → "párr. 3" y "§ 3" sin doble espacio.
  - Invisibles eliminados, U+2028 y U+2029 a `\n`, y `\r\n` a `\n`.
  - En una línea, cada `\n` pasa a espacio. En multilínea se conservan los saltos y las líneas en blanco, y los espacios se reducen solo dentro de cada línea.
  - Espacios repetidos reducidos y extremos recortados (en multilínea, también los saltos de línea de los extremos).
  - Que el resultado validado con `hasOnlyAllowedCharacters` de las specs 002 y 003 rechaza `< > { } \ | =`, el acento grave y los emojis, y que ningún texto aceptado contiene corchetes.
  - Que un sumario de 4.999 caracteres con un "…" queda en 5.001 caracteres contados con `textLength`.

- [x] **T2 — Validador del enlace** [RF-6]
  `jurisprudencia/validadores/enlace.ts`: `linkViolation(enlace)` con las reglas del plan, sin `new URL()`.
  Hecho cuando: los tests unitarios verifican:
  - Que se aceptan el enlace de la Corte Suprema con `?idDocumento=7867721`, uno con `&` y `#`, y uno con `%C3%B1`.
  - Que devuelve `'esquema'` para `http://`, `HTTPS://` y `javascript:`.
  - Que devuelve `'formato'` para `https://` solo, un dominio sin punto, mayúsculas en el dominio, `@` en el dominio y en la ruta, una IP, un puerto, `xn--`, una parte del dominio con guion en un extremo, espacios, comillas simples y dobles, `< > { } [ ] | \ ^`, el acento grave, emojis y letras con tilde.
  - Que recorta los espacios de los extremos antes de validar.

- [x] **T3 — Reglas puras** [RF-7, RF-9, RF-14, RF-18]
  `jurisprudencia/reglas-jurisprudencia.ts`: `flexibleKey`, `uniqueKeywords`, `isFalloDateInRange` (con `todayInBuenosAires` de la spec 003) y `repeatedRulingMessage`.
  Hecho cuando: los tests unitarios verifican:
  - Que "Daño Moral", "dano moral" y "DANO MORAL" tienen la misma clave, y también "año" y "ano", y "pingüino" y "pinguino". Que "daño-moral" y "daño moral" tienen claves distintas.
  - Que `uniqueKeywords` descarta las repetidas y conserva la primera aparición.
  - Los límites 1799-12-31 y 1800-01-01, el día actual y el siguiente, y el cambio de día a las 02:59 y a las 03:00 UTC.
  - Los dos mensajes de `repeatedRulingMessage`.

- [x] **T4 — Entidades** [RF-1, RF-2, RF-10, RF-11]
  `fallo.entity.ts` (con `IDX_fallos_listado`, `IDX_fallos_repetido` y las fechas de registro con microsegundos), `palabra-clave.entity.ts` (con `clave` en `utf8mb4_bin` y `UQ_palabras_clave_clave`) y `fallo-palabra-clave.entity.ts` (PK compuesta e `IDX_fallo_palabras_clave_palabra`), con los campos, tipos y relaciones del plan.
  Hecho cuando: la api compila y un test unitario verifica que el enum de fuero de `Fallo` tiene exactamente los valores de `JURISDICTIONS`.

- [x] **T5 — Migración** [RF-1, RF-2, RF-10, RF-11] **(modifica existente: `esquema.ts`)**
  Migración `crear-fallos-y-palabras-clave` con las tres tablas, sus índices y sus claves foráneas. Se agregan las entidades y la migración al final de las listas de `esquema.ts`.
  Hecho cuando: un e2e corre `up` sobre la base de tests con las tablas de las specs 001 a 003, guarda un fallo con fecha 1887-05-03 y la lee como el texto `1887-05-03`, verifica que una segunda palabra clave con la misma `clave` es rechazada por el índice único, y corre `down` sin errores.

- [x] **T6 — DTO de alta y modificación** [RF-1, RF-3 a RF-8, RF-14, RF-17]
  `dto/reglas-fallo.ts` (transformaciones con `convertText` y reglas con los mensajes del plan, reutilizando `usuarios/dto/reglas.ts` y los mensajes de caracteres de las specs 002 y 003), y los DTO de `POST` y de `PATCH` parcial.
  Hecho cuando: los tests unitarios cubren:
  - Obligatorios ausentes o vacíos, largos y caracteres de carátula, tribunal, número y sumario. Fuero fuera de la lista.
  - Los cuatro mensajes de fecha de RF-8.
  - Número y enlace vacíos a `NULL`, y los dos mensajes de enlace más el de largo.
  - Palabras clave: lista vacía, 11 palabras, una vacía después de convertir, una de 51 caracteres, caracteres no permitidos, y repetidas que cuentan una sola vez para el máximo.
  - Que el sumario llega convertido al service.
  - En `PATCH`, el rechazo de `activo` y otros campos desconocidos.
  - Que ningún mensaje repite el valor recibido (un texto con una marca no aparece en el mensaje).

- [x] **T7 — DTO del listado** [RF-21, RF-24 a RF-26]
  DTO de `GET /` con `pagina`, `buscar`, `palabrasClave`, `fuero`, `desde`, `hasta` e `incluirDesactivados`.
  Hecho cuando: los tests unitarios cubren:
  - Los valores por defecto y una página inválida.
  - `buscar` convertido, con `<` (400 "La búsqueda tiene caracteres no permitidos"), de 101 caracteres y con solo espacios (equivale a no enviarlo).
  - `palabrasClave` con ids separados por coma, con un valor que no es un id y con más de 10 ids.
  - Fechas inexistentes, de 1790 y futuras, con sus mensajes, y desde > hasta.
  - `incluirDesactivados` que no es booleano.

- [x] **T8 — DTO de las sugerencias y de la reactivación** [RF-13, RF-25, RF-31]
  DTO de `GET /palabras-clave` (`buscar`, `para`) y de `POST /:id/reactivar` (`confirmarRepetido`).
  Hecho cuando: los tests unitarios cubren un `buscar` de menos de 2 caracteres después de convertir ("Escribí al menos 2 caracteres"), uno con caracteres no permitidos, `para` con su valor por defecto y uno inválido, y una confirmación que no es booleana.

- [x] **T9 — Armado de respuestas** [RF-19, RF-35]
  `fallo-detalle.ts`: `PalabraClave`, `PalabraClaveSugerencia`, `FalloResumen` y `FalloDetalle`, campo por campo, con `toAutorResumen` de la spec 003.
  Hecho cuando: los tests unitarios verifican que cada respuesta tiene exactamente las claves de su tipo (sin `clave`, emails ni hashes), que las palabras clave van en orden alfabético y que los autores desactivados quedan marcados.

- [ ] **T10 — Módulo, controller y consulta de un fallo** [RF-19, RF-33, RF-34] **(modifica existente: `app.module.ts`)**
  `JurisprudenciaModule` sin `exports`, importado en `app.module.ts`. `jurisprudencia.controller.ts` con `@Roles('admin', 'abogado')` y el `ParseIntPipe` con 404, y `GET /:id`. `api/test/utilidades/fallos-de-prueba.ts` (nuevo) con una función para crear fallos.
  Hecho cuando: los e2e verifican la consulta de un fallo activo y de uno desactivado, con su autoría, y el 404 "No existe ese fallo" con un id inexistente y con uno no numérico.

- [ ] **T11 — Carga y catálogo de palabras clave** [RF-2, RF-10 a RF-12, RF-14, RF-16]
  `palabras-clave.service.ts` con `resolverPalabras` (`INSERT … ON DUPLICATE KEY UPDATE` dentro de la transacción del fallo) y `POST /`, todavía sin el aviso de repetido.
  Hecho cuando: los e2e verifican:
  - La carga completa y una sin número ni enlace, con quién la cargó y cuándo.
  - Que un sumario pegado con caracteres tipográficos se guarda convertido.
  - Que una palabra nueva se agrega al catálogo.
  - Que "Daño moral" sobre "dano moral" cambia la forma del catálogo, y que otro fallo que la usa la muestra nueva sin cambiar su `modificadoEn`.
  - Que enviar el texto exacto del catálogo no cambia su forma, y que las repetidas en un fallo se guardan una vez.
  - Que una carga rechazada por validación no agrega palabras al catálogo.
  - Que dos cargas simultáneas con la misma palabra en formas distintas dejan una sola fila.

- [ ] **T12 — Aviso de repetido en la carga** [RF-18] **(modifica existente: `causas/preguntas.ts`)**
  `QUESTION_CODES.repeatedRuling = 'FALLO_REPETIDO'` y `buscarRepetido` en el service, aplicado en `POST /` antes de la transacción.
  Hecho cuando: los e2e verifican:
  - Mismo tribunal y número con otras mayúsculas, tildes o espacios: 409 `FALLO_REPETIDO` con el primer mensaje y los datos del fallo. Con `confirmarRepetido: true`, 201.
  - Números distintos con la misma carátula, tribunal y fecha: 409 con el segundo mensaje.
  - Mismo número en otro tribunal, o con otro separador: sin pregunta.
  - Un repetido de un fallo desactivado: sin pregunta.
  - Con varias coincidencias, se devuelve la primera según el orden del listado.
  - Que un 409 de repetido no agrega palabras al catálogo.

- [ ] **T13 — Modificación** [RF-2, RF-12, RF-17, RF-18, RF-30]
  `PATCH /:id` con el bloqueo del fallo (`SELECT … FOR UPDATE`), el aviso de repetido solo si cambian carátula, tribunal, número o fecha, y el reemplazo de las palabras clave.
  Hecho cuando: los e2e verifican:
  - La modificación de cada dato con quién la hizo y cuándo, y el reemplazo de las palabras clave.
  - Que un `PATCH` sin cambios no actualiza `modificadoEn`.
  - Que no hay pregunta si no cambian esos cuatro datos, que el fallo no se compara consigo mismo, y la pregunta cuando el cambio lo hace coincidir con otro.
  - El 409 "El fallo está desactivado. Reactivalo para modificarlo".

- [ ] **T14 — Desactivación y reactivación** [RF-2, RF-29 a RF-32]
  `POST /:id/desactivar` y `POST /:id/reactivar` con el bloqueo del fallo y la pregunta de repetido al reactivar.
  Hecho cuando: los e2e verifican:
  - La desactivación y la reactivación con quién las hizo y cuándo, y el 409 al repetir cada acción.
  - La pregunta al reactivar un fallo que coincide con otro activo, y la reactivación con `confirmarRepetido: true`.
  - Que una desactivación y una modificación simultáneas se ordenan: si la desactivación queda primero, la modificación responde 409.

- [ ] **T15 — Sugerencias de palabras clave** [RF-13, RF-15, RF-25, RF-30]
  `GET /palabras-clave` en `palabras-clave.service.ts`, declarado antes de `GET /:id`.
  Hecho cuando: los e2e verifican:
  - Que "dano" encuentra "daño moral" con la cantidad de fallos activos que la usan.
  - El orden por cantidad y después alfabético, y el límite de 10.
  - Que en `carga` no aparecen las palabras que solo usan fallos desactivados, y en `filtro` sí, con cantidad 0.
  - Que `%` y `_` se buscan como texto.

- [ ] **T16 — Listado: orden, paginado y filtros simples** [RF-21, RF-22, RF-25 a RF-28]
  `GET /` con el orden del plan, 21 filas para `haySiguiente`, `hayFallos` con la página vacía, y los filtros de fuero, fechas e `incluirDesactivados`. Las palabras clave de la página en una segunda consulta.
  Hecho cuando: los e2e verifican:
  - El orden por fecha, por carga y por id con la misma fecha y el mismo `creadoEn`. Con 45 fallos, las tres páginas no repiten ni omiten ninguno, y `haySiguiente` es correcto en cada una.
  - Que la respuesta no tiene `total`.
  - Cada filtro y su combinación.
  - `hayFallos` en `false` sin fallos y con todos desactivados (aunque haya filtros), y en `true` con fallos que no coinciden.
  - Que una página inexistente devuelve `items` vacío.

- [ ] **T17 — Listado: buscador y filtro por palabras clave** [RF-23 a RF-25]
  Búsqueda por fragmento en carátula, tribunal, número, sumario y palabras clave, número sin separadores con `toSearchableCaseNumber`, y el filtro de palabras clave con `HAVING COUNT(*)` (todas).
  Hecho cuando: los e2e verifican:
  - La búsqueda por fragmento en cada campo y en las palabras clave, en mayúsculas, sin tildes y con "ano" para "año".
  - El número con otro separador.
  - Que "[...]" encuentra los sumarios con "(...)" y que "50%" se busca literal.
  - El filtro con dos palabras clave (solo los fallos que tienen las dos) y su combinación con el buscador y los demás filtros.

- [ ] **T18 — Rendimiento** [RNF de rendimiento]
  Utilidad de e2e para insertar en bloque 10.000 fallos con sumarios largos y palabras clave.
  Hecho cuando: un e2e verifica que el listado con buscador y filtros, y las sugerencias, responden en menos de 2 segundos.

- [ ] **T19 — Acceso, autoría y aislamiento** [RF-34 a RF-36, RNF de reglas propias]
  Hecho cuando:
  - Los e2e verifican que un cliente recibe 403, un visitante 401 y una cuenta con cambio de contraseña pendiente 403 en cada endpoint de `/api/panel/jurisprudencia`.
  - Un e2e verifica que un autor desactivado sigue figurando en el fallo, marcado como desactivado.
  - Un e2e verifica que las respuestas del portal de un cliente no tienen datos de jurisprudencia.
  - Un e2e verifica que crear una causa y un movimiento con comillas tipográficas sigue respondiendo 400.
  - Un test de Vitest lee los archivos fuente y falla si algún archivo de `src/portal/` importa de `src/jurisprudencia/` o si `jurisprudencia.module.ts` declara `exports`.
  - `jurisprudencia/` no usa `Logger` ni `console` (lo verifica el mismo test).

## web

- [ ] **T20 — Textos y enlace en la web** [RF-3 a RF-6, RF-9]
  `servicios/texto-fallo.ts`: `convertText`, `flexibleKey`, `linkViolation` y `linkDomain`, con la misma tabla y el mismo orden que la API.
  Hecho cuando: los tests de Vitest repiten los casos de T1, T2 y T3 que corresponden a estas funciones, y verifican `linkDomain` con y sin ruta.

- [ ] **T21 — Servicio de jurisprudencia** [RF-13, RF-16 a RF-19, RF-21 a RF-32]
  `servicios/jurisprudencia.ts`: tipos y una función por endpoint de `/api/panel/jurisprudencia`.
  Hecho cuando: los tests con `fetch` simulado verifican las rutas, los métodos, los cuerpos y el armado del query string, con las palabras clave del filtro como ids separados por coma.

- [ ] **T22 — Formulario y filtros** [RF-1, RF-7, RF-8, RF-14, RF-17, RF-24 a RF-26]
  `servicios/formulario-fallo.ts`: `validateRulingForm`, cuerpo de alta, cuerpo de edición con solo lo que cambió (las palabras clave solo si cambió la lista o la forma de alguna), lista de palabras sin repetidas por `flexibleKey`, `validateRulingFilters` y `toListQuery`.
  Hecho cuando: los tests verifican las validaciones con los mensajes de la API, el largo del sumario contado después de convertir, los dos cuerpos, las palabras repetidas y los filtros (búsqueda con `<`, de 101 caracteres, fechas inválidas y desde > hasta).

- [ ] **T23 — Presentación y sesión mientras se escribe** [RF-19, RF-20, RF-27, RF-28]
  `servicios/presentacion-jurisprudencia.ts` con `emptyListMessage`, y `servicios/mantener-sesion.ts` con `KEEP_ALIVE_INTERVAL_MS` y `createSessionKeepAlive`.
  Hecho cuando: los tests verifican:
  - `emptyListMessage` sin fallos, con resultados vacíos en la página 1 y en otra página.
  - Que `notifyTyping` no consulta antes de 5 minutos, consulta una vez al pasar y vuelve a esperar 5 minutos, con la hora simulada.

- [ ] **T24 — Pregunta, servicios, menú y rutas** [RF-18, RF-31, RF-34] **(modifica existente: `servicios/preguntas.ts` y su test, `ProveedorServicios.tsx`, `DisenoPanel.tsx` y `Disenos.test.tsx`, `RutasAplicacion.tsx`)**
  `pendingQuestion` reconoce `FALLO_REPETIDO` con las opciones "Guardar igual" y "Cancelar". `ProveedorServicios` suma el servicio de jurisprudencia. `DisenoPanel` suma el enlace "Jurisprudencia". Las tres rutas del panel apuntan a páginas provisorias que se reemplazan en T28 a T30. `web/src/pruebas/jurisprudencia-de-prueba.tsx` (nuevo) con datos y servicios simulados.
  Hecho cuando: los tests verifican la pregunta con los datos del fallo que coincide, el enlace "Jurisprudencia" en el panel, y que las rutas nuevas llevan a un cliente al portal y a un visitante a `/ingresar`.

- [ ] **T25 — Selector de palabras clave** [RF-12 a RF-14, RF-25]
  `SelectorPalabrasClave`, en modo carga y modo filtro.
  Hecho cuando: los tests con servicios simulados verifican:
  - Que pide sugerencias desde 2 caracteres, después de 300 ms sin escribir, y las muestra con su cantidad.
  - Que Enter o coma agrega lo escrito, que no repite una palabra igual por `flexibleKey` y que "×" la quita.
  - Que elegir una sugerencia agrega su texto exacto.
  - Que en modo filtro solo se pueden elegir sugerencias.

- [ ] **T26 — Fila y enlace** [RF-19, RF-22, RNF de textos seguros]
  `FilaFallo` y `EnlaceFuente`.
  Hecho cuando: los tests verifican:
  - Que la fila muestra fecha, tribunal, carátula con enlace al detalle, fuero, número, palabras clave, sumario recortado a 300 caracteres con "Ver más" y "Ver menos", y la etiqueta "Desactivado".
  - Que `EnlaceFuente` muestra la dirección como texto literal con el dominio destacado, y arma un `<a>` con `target="_blank"`, `rel="noopener noreferrer"` y `referrerPolicy="no-referrer"`.
  - Que un enlace inválido se muestra solo como texto.

- [ ] **T27 — Filtros** [RF-24 a RF-26]
  `FiltrosJurisprudencia`: buscador, selector de palabras clave en modo filtro, fuero, desde, hasta y "Mostrar desactivados".
  Hecho cuando: los tests verifican que los filtros devuelven los valores elegidos y que la búsqueda con `<` y desde > hasta muestran el error sin llamar al servicio.

- [ ] **T28 — Listado de jurisprudencia** [RF-21, RF-22, RF-25, RF-27, RF-28]
  `PanelJurisprudencia` en lugar de la página provisoria.
  Hecho cuando: los tests con servicios simulados verifican:
  - Que buscar y cada filtro llaman al servicio con los parámetros correctos y vuelven a la página 1.
  - "Anterior" y "Siguiente" según `haySiguiente`, sin totales.
  - Cada mensaje de vacío y el botón "Volver a la primera página".
  - Que no se escribe nada en `localStorage` ni `sessionStorage`.

- [ ] **T29 — Formulario y carga** [RF-1, RF-14, RF-16, RF-18, RF-20]
  `FormularioFallo` (con el contador del sumario y `notifyTyping` en cada cambio) y `PanelFalloNuevo` en lugar de la página provisoria.
  Hecho cuando: los tests con servicios simulados verifican:
  - Los campos, el `min` y el `max` de la fecha, el contador sobre 5.000 y los errores de validación sin llamar al servicio.
  - La carga y la ida al detalle.
  - La pregunta de repetido: "Guardar igual" repite la petición con `confirmarRepetido: true` y "Cancelar" no guarda.
  - Que escribir consulta la sesión como mucho una vez cada 5 minutos.
  - Que no se escribe nada en `localStorage` ni `sessionStorage`.

- [ ] **T30 — Detalle del fallo** [RF-17, RF-19, RF-29 a RF-32]
  `PanelFalloDetalle` en lugar de la página provisoria.
  Hecho cuando: los tests con servicios simulados verifican:
  - La muestra de los datos, el sumario con `TextoLiteral`, el enlace con su dominio y la autoría (marcada si el autor está desactivado).
  - La edición, con la pregunta de repetido.
  - Desactivar y reactivar, con los mensajes de 409.
  - Que un fallo desactivado muestra "Desactivado" y solo la acción "Reactivar".

- [ ] **T31 — Aislamiento del portal en la web** [RF-36]
  Hecho cuando: un test de Vitest lee los archivos fuente y falla si algún archivo del portal (`paginas/Portal*`, los componentes del portal y `servicios/portal.ts`) importa `servicios/jurisprudencia.ts`.

## Cierre

- [ ] **T32 — Validación de la spec**
  Recorrer `spec.md` requisito por requisito con su test, correr la migración `up` y `down` sobre la base de tests y hacer la demo manual de los criterios de finalización.
  Hecho cuando:
  - Cada RF tiene al menos un test en verde identificado.
  - `pnpm test` y `pnpm lint` pasan.
  - La demo manual se completó sin errores.
  - `validacion.md` deja anotado el aviso de despliegue del plan: verificar que el proxy de Easypanel no registre las direcciones completas, que llevan la búsqueda.
