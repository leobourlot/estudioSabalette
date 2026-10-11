# Plan 006 — Modelos de escritos

Implementa `spec.md` de esta carpeta. Respeta `docs/constitution.md` y se apoya en lo construido en las specs 001 a 005: guards globales y roles, sesión extendida en cada consulta, filtro global de errores sin datos, `Cache-Control: no-store`, preguntas como 409 con `codigo`, validadores de textos de causas y movimientos, conversiones de textos de la jurisprudencia, `partyIdentity`, `AutorResumen`, `TextoLiteral`, `createSessionKeepAlive`, cliente HTTP y patrones de listado. Cada sección indica entre corchetes los RF que cubre.

No se agregan dependencias ni variables de entorno.

## Arquitectura

### Módulos de NestJS (`api/src/`)

| Carpeta | Contenido | RF |
|---|---|---|
| `migraciones/` | Migración `crear-modelos-escritos`. | RF-1, RF-2 |
| `modelos-escritos/` (nuevo) | Ver detalle debajo. | RF-1 a RF-53 |
| `causas/preguntas.ts` | `QUESTION_CODES` suma `repeatedTemplate: 'MODELO_REPETIDO'`. | RF-15, RF-27 |
| `base-de-datos/esquema.ts` | Suma la entidad nueva y la migración al final de las listas. | — |
| `configurar-aplicacion.ts` | Sube el límite del cuerpo JSON. Ver "Tamaño del cuerpo". | RF-1 |
| `app.module.ts` | Importa `ModelosEscritosModule`. | — |

Contenido de `modelos-escritos/`:
- Entidad: `modelo-escrito.entity.ts`.
- `modelos-escritos.controller.ts` y `modelos-escritos.service.ts`: carga, consulta, listado, modificación, desactivación y reactivación de modelos.
- `escritos.controller.ts` y `escritos.service.ts`: completar un modelo desde una causa.
- `variables.ts`: catálogo de variables y reglas puras de las marcas (reconocerlas, llevarlas a la forma del catálogo, detectar las que no existen y las que están pegadas).
- `completar-escrito.ts`: reglas puras que arman el escrito a partir de la causa ya cargada (valor de cada variable, datos faltantes, avisos y reemplazo en una pasada).
- `formato-escrito.ts`: reglas puras de formato (nombre, documento, enumeración, orden de las personas y fecha en letras).
- `modelo-detalle.ts`: armado explícito de las respuestas.
- `validadores/texto-modelo.ts`: conversiones y reglas de caracteres y largo de los textos de un modelo.
- `validadores/longitudes.ts`: largos máximos.
- `dto/`.

Los dos controllers llevan `@Roles('admin', 'abogado')`: los guards globales de la spec 001 rechazan a clientes (403), a visitantes (401) y a cuentas con cambio de contraseña pendiente (403) antes de llegar a ellos [RF-50]. Los controllers solo validan con DTO y pipes y delegan (principio 3).

`ModelosEscritosModule` registra `TypeOrmModule.forFeature([ModeloEscrito, Causa])` y no exporta nada: ningún otro módulo, en particular el portal, puede usar sus services [RF-52]. Lee las causas con su propio repositorio de `Causa`, como `PortalService`, así que `CausasModule` no cambia.

De la jurisprudencia solo importa dos funciones puras: `convertText` (`jurisprudencia/validadores/texto-fallo.ts`) y `flexibleKey` (`jurisprudencia/reglas-jurisprudencia.ts`). No importa su módulo, sus services ni sus entidades [RF-53].

### Carpetas de `web/src/`

| Carpeta | Contenido | RF |
|---|---|---|
| `servicios/modelos-escritos.ts` (nuevo) | Tipos y una función por endpoint de `/api/panel/modelos-escritos` y del escrito completado. Suma `keepSessionAlive()`. | RF-13 a RF-32, RF-48 |
| `servicios/texto-modelo.ts` (nuevo) | Las mismas conversiones y reglas de texto que la API (RF-3, RF-4), el catálogo de variables y las reglas de las marcas (RF-7 a RF-10), e `insertVariable`. | RF-3, RF-4, RF-7 a RF-12 |
| `servicios/formulario-modelo.ts` (nuevo) | Validación del formulario con los mismos mensajes que la API, armado de los cuerpos (en la edición, solo lo que cambió), filtros del listado y armado del query string. | RF-1, RF-6, RF-14, RF-21, RF-22 |
| `servicios/presentacion-modelos.ts` (nuevo) | Etiquetas de tipo de escrito, mensajes de listado vacío, textos de los avisos del escrito y de la leyenda del portapapeles. | RF-19, RF-23, RF-24, RF-39, RF-40, RF-44, RF-45 |
| `servicios/portapapeles.ts` (nuevo) | `copyText` y `clearClipboard`, que reciben el portapapeles como parámetro. | RF-44, RF-45 |
| `servicios/sesion-escrito.ts` (nuevo) | Límite de inactividad de un integrante y forma del estado con el que se vuelve a la lista de modelos. | RF-32, RF-48 |
| `servicios/preguntas.ts` | `pendingQuestion` reconoce `MODELO_REPETIDO`. | RF-15, RF-27 |
| `componentes/` | Nuevos: `FormularioModelo.tsx`, `CatalogoVariables.tsx`, `FiltrosModelos.tsx`, `FilaModelo.tsx`, `ListaModelos.tsx`, `PreguntaModeloRepetido.tsx`, `AvisosEscrito.tsx`, `useUsoDeSesion.ts` y `useCierrePorInactividad.ts`. `ProveedorServicios.tsx` suma el servicio de modelos. `DisenoPanel.tsx` suma el enlace "Modelos". `DisenoSeccion.tsx` vacía el portapapeles al cerrar sesión. | RF-11, RF-15, RF-18 a RF-24, RF-29, RF-39, RF-40, RF-44, RF-48 |
| `paginas/` | Nuevas: `PanelModelos`, `PanelModeloNuevo`, `PanelModeloDetalle`, `PanelCausaModelos` y `PanelEscrito`. `PanelCausaDetalle` suma el acceso "Completar un modelo". | RF-13 a RF-48 |
| `RutasAplicacion.tsx` | Rutas nuevas del panel. | — |

Nada en `src/servicios/` importa React (principio 3). Ningún archivo del portal importa nada de modelos [RF-52], y ningún archivo de modelos importa `servicios/jurisprudencia.ts` [RF-53].

### Archivos existentes que se modifican
- `api/src/base-de-datos/esquema.ts` y `api/src/app.module.ts`.
- `api/src/causas/preguntas.ts`.
- `api/src/configurar-aplicacion.ts`.
- `web/src/servicios/preguntas.ts`, con su test.
- `web/src/componentes/ProveedorServicios.tsx`.
- `web/src/componentes/DisenoPanel.tsx` y `web/src/componentes/DisenoSeccion.tsx`, con `Disenos.test.tsx`.
- `web/src/paginas/PanelCausaDetalle.tsx`, con su test.
- `web/src/RutasAplicacion.tsx`.

Las utilidades nuevas de los tests van en archivos nuevos (`api/test/utilidades/modelos-de-prueba.ts` y `web/src/pruebas/modelos-de-prueba.tsx`). Ninguna tabla de las specs 001 a 005 cambia, y las reglas de textos de causas, movimientos y jurisprudencia no se tocan [RNF de reglas de textos].

## Entidades de TypeORM y migración [RF-1, RF-2]

Mismas convenciones que en las specs anteriores: `DATETIME` en hora de Buenos Aires, tablas `utf8mb4_unicode_ci`, ids autoincrementales y claves foráneas `NO ACTION` (nada se borra).

### `modelos_escritos`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int autoincremental | PK. También es el orden de registro en el sistema (RF-18). |
| `titulo` | varchar(150) | RF-1, RF-3, RF-4 |
| `tipo` | enum `demanda`, `contestacion_demanda`, `escrito_tramite`, `recurso`, `oficio`, `cedula`, `otro` | RF-1 |
| `fuero` | enum `civil`, `penal`, `familia`, `laboral`, `federal`, `otro`, default `otro` | Los mismos valores que `causas.fuero` (`JURISDICTIONS`). Sin fuero indicado queda `otro`. RF-1 |
| `descripcion` | varchar(500), nullable | `NULL` si no se informa. RF-1, RF-3 |
| `texto` | mediumtext | Hasta 50.000 caracteres, con las marcas en la forma del catálogo. RF-1, RF-5, RF-8 |
| `activo` | boolean, default true | RF-25 a RF-27 |
| `creadoPorId`, `creadoEn` | FK `usuarios`, datetime(6) | RF-2 |
| `modificadoPorId`, `modificadoEn` | FK `usuarios` nullable, datetime(6) nullable | RF-2: datos, desactivación y reactivación. |

Índice `IDX_modelos_escritos_listado` sobre `(activo, titulo)`: el filtro por activos, el orden del listado (RF-18) y la búsqueda de títulos repetidos (RF-15).

`texto` es `mediumtext` y no `varchar`: 50.000 caracteres en `utf8mb4` pueden ocupar hasta 200.000 bytes, más que el límite de 65.535 bytes de una fila y que el de una columna `TEXT`. El largo máximo lo garantiza el DTO.

No hay columnas para quién desactivó o reactivó: la spec solo pide la última modificación, y esas acciones la actualizan (RF-2). No hay tabla de escritos completados ni de usos [RF-46].

La migración crea la tabla con su índice y sus claves foráneas, y es reversible (`down` la elimina). `synchronize` siempre en `false`.

## Contrato de la API

Errores con el formato de las specs anteriores (`statusCode`, `message`, en español). Ningún mensaje repite el texto recibido [RF-6, RNF de registros]. Los ids de ruta que no son números responden 404 con el mensaje del modelo o de la causa, con un `ParseIntPipe` y un `exceptionFactory`, como en `jurisprudencia.controller.ts` [RF-49].

### Modelos — `/api/panel/modelos-escritos` (roles `admin` y `abogado`) [RF-50]

| Método y ruta | Cuerpo | Respuesta | Errores | RF |
|---|---|---|---|---|
| `GET /?pagina&buscar&tipo&fuero&incluirDesactivados` | — | 200 `{ items: ModeloResumen[], pagina, haySiguiente, hayModelos }` | 400 | RF-18 a RF-24, RF-29 |
| `GET /:id` | — | 200 `ModeloDetalle` | 404 | RF-16, RF-49 |
| `POST /` | `{ titulo, tipo, fuero?, descripcion?, texto, confirmarRepetido? }` | 201 `ModeloDetalle` | 400, 409 | RF-1 a RF-13, RF-15 |
| `PATCH /:id` | Parcial: los mismos campos y `confirmarRepetido?`. `null` o vacío borra la descripción. | 200 `ModeloDetalle` | 400, 404, 409 | RF-14, RF-15, RF-26 |
| `POST /:id/desactivar` | — | 200 `ModeloDetalle` | 404, 409 | RF-25, RF-28 |
| `POST /:id/reactivar` | `{ confirmarRepetido? }` | 200 `ModeloDetalle` | 404, 409 | RF-15, RF-27, RF-28 |

- `activo` no se declara en el DTO de `PATCH`, y enviarlo responde "El campo … no está permitido" [RF-14].
- La consulta funciona también sobre un modelo desactivado [RF-26].
- La lista de modelos de una causa usa el mismo `GET /`, sin `incluirDesactivados` [RF-29].

### Escrito completado — `/api/panel/causas/:causaId/escritos` (roles `admin` y `abogado`) [RF-50]

| Método y ruta | Cuerpo | Respuesta | Errores | RF |
|---|---|---|---|---|
| `GET /:modeloId` | — | 200 `EscritoCompletado` | 404, 409 | RF-30 a RF-43, RF-49 |

Es un `GET` porque no cambia nada: ni la causa, ni el modelo, ni ninguna otra tabla [RF-2, RF-43, RF-46]. Cada pedido arma el escrito de nuevo [RF-33]. La ruta va bajo la causa, como los movimientos, porque un modelo solo se completa desde una causa [RF-30].

**Parámetros del listado** [RF-18, RF-20 a RF-22]:
- `pagina`: entero desde 1, por defecto 1.
- `buscar`: texto de RF-21. Vacío o solo espacios, después de convertir, equivale a no enviarlo.
- `tipo`: uno de la lista.
- `fuero`: uno de la lista.
- `incluirDesactivados`: `true` o `false` (por defecto `false`).

**Tipos:**
- `AutorResumen`: el de la spec 003, con `toAutorResumen` de `movimiento-detalle.ts` [RF-51].
- `ModeloResumen`: `{ id, titulo, tipo, fuero, descripcion, activo }`. No lleva el texto [RF-19].
- `ModeloDetalle`: `ModeloResumen` más `{ texto, variables: string[], creadoPor: AutorResumen, creadoEn, modificadoPor: AutorResumen | null, modificadoEn }`. `variables` son los nombres del catálogo que usa el texto, sin repetir y en el orden en que aparecen [RF-16].
- `ModeloReferencia`: `{ id, titulo, tipo, fuero }`.
- `EscritoCompletado`: `{ causa: { id, caratula }, modelo: { id, titulo }, texto, faltantes: string[], clientesDesactivados: string[], responsableDesactivado: boolean }` [RF-32, RF-33, RF-39, RF-40].
  - `faltantes`: lo que falta, ya redactado y sin repetir ("número de expediente", "DNI de Luis Gómez").
  - `clientesDesactivados`: los nombres de los clientes desactivados, solo si el modelo usa una variable de clientes.
  - `responsableDesactivado`: `true` solo si el modelo usa `#ABOGADO_RESPONSABLE#` y el responsable está desactivado.
  - No lleva ningún otro dato de la causa, de sus partes ni de las cuentas [RF-33].
- `hayModelos`: si existe algún modelo que pueda aparecer sin buscador ni filtros (activo o, con `incluirDesactivados`, cualquiera). Solo se calcula cuando la página llega vacía; si no, es `true` [RF-23].

**Mensajes de 400** (por campo, como en las specs anteriores) [RF-6, RF-7, RF-10, RF-21]:
- Título: "Indicá el título del modelo", "El título no puede tener más de 150 caracteres" y el de caracteres de la spec 002 (`allowedCharactersMessage('El título')`).
- Tipo: "Indicá el tipo de escrito" y "El tipo de escrito debe ser demanda, contestación de demanda, escrito de trámite, recurso, oficio, cédula u otro".
- Fuero: el de la spec 002.
- Descripción: "La descripción no puede tener más de 500 caracteres" y "La descripción solo puede tener letras, números, espacios y los símbolos . , ; : / - _ ( ) \" ' $ & # ° º ª ¿ ? ¡ ! %".
- Texto: "Indicá el texto del modelo", "El texto no puede tener más de 50.000 caracteres", "El texto solo puede tener letras, números, espacios, saltos de línea y los símbolos . , ; : / - _ ( ) \" ' $ & # ° º ª ¿ ? ¡ ! % @", "Las variables tienen que estar separadas" y "El texto tiene variables que no existen".
- Listado: "La página debe ser un número entero mayor o igual a 1", "La búsqueda tiene caracteres no permitidos", "La búsqueda puede tener hasta 100 caracteres", los de tipo y fuero, y "El filtro incluirDesactivados debe ser true o false".
- Confirmación: "La confirmación debe ser true o false" (el de la spec 002).
- Campos desconocidos, con el mensaje de la spec 001.

**Pregunta (409 con `codigo`)** [RF-15, RF-27]:
| `codigo` | Mensaje | Datos extra | Se responde con |
|---|---|---|---|
| `MODELO_REPETIDO` | "Ya existe un modelo con ese título" | `modelos: ModeloReferencia[]`, todos los activos con los que coincide | `confirmarRepetido: true` |

**Otros 409:**
- "El modelo está desactivado. Reactivalo para modificarlo" (RF-26, al modificar).
- "El modelo está desactivado" (RF-26, al completar).
- "El modelo ya está desactivado" y "El modelo ya está activo" (RF-28).
- "La causa está desactivada" (RF-41).

**Mensajes de 404** [RF-49]: "No existe ese modelo" y "No existe esa causa".

### Tamaño del cuerpo [RF-1]
Express acepta por defecto cuerpos JSON de hasta 100 KB. Un texto de 50.000 caracteres ocupa unos 55 KB si es español común, pero hasta 200 KB con letras de varios bytes, más los escapes de JSON. Por eso `configurar-aplicacion.ts` suma `app.useBodyParser('json', { limit: '512kb' })`. Es el mismo para toda la API: los demás endpoints ya limitan cada campo en su DTO. Un cuerpo mayor responde 413, y un e2e verifica que esa respuesta no repite lo recibido. La interfaz valida el largo antes de enviar, así que un integrante no llega a ese límite.

## Reglas de negocio

Las reglas que no necesitan la base viven en `variables.ts`, `completar-escrito.ts` y `formato-escrito.ts` como funciones puras, igual que `reglas-causas.ts`, `reglas-movimientos.ts` y `reglas-jurisprudencia.ts`. Las que dependen del día reciben `ahora` como parámetro, para testear el cambio de día.

### Textos [RF-3 a RF-6]
`validadores/texto-modelo.ts` no copia las conversiones: llama a `convertText` de la spec 005.
- Título, descripción y búsqueda: `convertText(valor, { multilinea: false })`.
- Texto: `convertModelText(valor)`, que aplica `convertText(valor, { multilinea: true })` y después quita los espacios al inicio y al final de cada línea (reemplaza los espacios que rodean cada salto de línea). `convertText` ya redujo los espacios repetidos y quitó los saltos de línea de los extremos.

Después se valida:
- Título: `hasOnlyAllowedCharacters` de `causas/validadores/texto-causa.ts` [RF-4].
- Descripción: `hasOnlyAllowedCharacters` de `movimientos/validadores/texto-movimiento.ts`. Ya no tiene saltos de línea, porque es de una sola línea [RF-4].
- Texto: una expresión propia, la de los movimientos más `@`: `^[\p{L}\p{N} \n.,;:/\-_()"'$&#°ºª¿?¡!%@]*$` (bandera `u`) [RF-4].
- Búsqueda: la del texto, sin saltos de línea [RF-21].

Ninguna acepta `< > { } [ ] \ | =` ni el acento grave. El `@` solo entra en la expresión del texto, así que el título y la descripción lo rechazan, y las reglas de las specs 002, 003 y 005 no cambian.

El largo se cuenta después de convertir, en puntos de código (`textLength` de la spec 003) [RF-3]. Una descripción vacía después de convertir pasa a `NULL`.

Las conversiones y la forma del catálogo de las marcas (ver "Variables") se aplican en los `@Transform` de los DTO, antes de las reglas. `web/src/servicios/texto-modelo.ts` repite las mismas reglas, usando el `convertText` de `servicios/texto-fallo.ts`. Un test en cada paquete recorre los mismos casos [RNF de validación].

### Variables [RF-7 a RF-12]
```
NOMBRE = [\p{L}_]*\p{L}[\p{L}_]*            // letras y guiones bajos, con al menos una letra
MARCA  = #(NOMBRE)#

variableKey(nombre)   = flexibleKey(nombre) en mayúsculas          // "carátula" → "CARATULA" (RF-8)
findMarks(texto)      = cada MARCA, de izquierda a derecha, sin superponerse, con su variableKey
canonicalMarks(texto) = el texto con cada marca escrita como #variableKey#
hasJoinedMarks(texto) = existe MARCA seguida de inmediato por otra MARCA ("#A##B#")
                        o por NOMBRE# ("#A#B#")                    // RF-7
unknownVariables(texto) = variableKey de las marcas que no están en el catálogo (RF-10)
usedVariables(texto)    = variableKey de las marcas del catálogo, sin repetir, en orden (RF-16)
```
- Un `#` que no forma una marca queda como texto común: "local # 3", "#123#", "#____#" (sin ninguna letra) y `# CARATULA #` [RF-7].
- El DTO guarda `canonicalMarks(texto)`. El largo no cambia: quitar una tilde no agrega ni quita caracteres [RF-8].
- Reglas del DTO sobre el texto, en este orden: obligatorio, largo, caracteres, marcas pegadas ("Las variables tienen que estar separadas") y variables que no existen ("El texto tiene variables que no existen"). El mensaje no nombra las variables [RF-10].
- El catálogo es una lista fija en `variables.ts`, con el nombre, el grupo y la descripción de cada variable. `web/src/servicios/texto-modelo.ts` tiene la misma lista: la usa `CatalogoVariables` para mostrarla e insertarla [RF-9, RF-11], y el formulario para señalar cuáles no existen [RF-10].
- Un modelo sin marcas es válido [RF-12].

### Título repetido [RF-15, RF-27]
```
findRepeated(titulo, exceptoId):
  modelos activos con titulo = :titulo y id ≠ exceptoId, en el orden del listado
```
- La igualdad usa la intercalación `utf8mb4_unicode_ci`, que es la comparación flexible de la spec 005 (RF-9), como en el aviso de repetido de los fallos. Como el título se guarda convertido y con los espacios reducidos (RF-3), tampoco influyen los espacios repetidos.
- Si hay alguno y no vino `confirmarRepetido: true`, responde `QuestionException` con `MODELO_REPETIDO` y todos los que coinciden.
- En `PATCH` se controla solo si cambia el título. En la reactivación se controla siempre. El modelo nunca se compara consigo mismo.
- No hay índice único: es un aviso, y la spec acepta que dos cargas simultáneas dejen un repetido.

### Carga, modificación, desactivación y reactivación [RF-2, RF-13, RF-14, RF-25 a RF-28]
```
crear(actor, datos):                                   // datos ya convertidos y validados por el DTO
  si no datos.confirmarRepetido: preguntar si hay título repetido
  insertar { ...datos, fuero: datos.fuero ?? 'otro', activo: true, creadoPorId: actor.id, creadoEn: ahora }

modificar(actor, id, cambios):
  transacción:
    modelo = bloquear(id); si no existe: 404
    si no modelo.activo: 409 "El modelo está desactivado. Reactivalo para modificarlo"   // RF-26
    despues = modelo con los cambios aplicados (descripción vacía → NULL)
    si cambió el título y no cambios.confirmarRepetido: preguntar si hay título repetido
    si no cambió ningún dato: devolver el detalle sin registrar nada                     // RF-14
    guardar despues con modificadoPorId = actor.id, modificadoEn = ahora                 // RF-2

desactivar(actor, id):
  modelo = bloquear(id); si no modelo.activo: 409 "El modelo ya está desactivado"
  activo = false; modificadoPor/En

reactivar(actor, id, confirmado):
  modelo = bloquear(id); si modelo.activo: 409 "El modelo ya está activo"
  si no confirmado: preguntar si hay título repetido                                    // RF-27
  activo = true; modificadoPor/En
```
`bloquear` es `SELECT … FOR UPDATE` sobre la fila del modelo, como `withLockedFallo`. Así una desactivación y una modificación simultáneas se ejecutan de a una: si la desactivación queda primero, la modificación responde 409 [RF-26]. Dos modificaciones simultáneas se ordenan y gana la última, como en las specs anteriores.

### Listado y búsqueda [RF-18 a RF-24, RF-29]
```
SELECT id, titulo, tipo, fuero, descripcion, activo          -- nunca el texto (RF-19)
WHERE [m.activo = 1]                                         sin incluirDesactivados
  [AND m.tipo = :tipo]
  [AND m.fuero = 'otro']                                     fuero = otro
  [AND (m.fuero = :fuero OR m.fuero = 'otro')]               cualquier otro fuero (RF-22)
  [AND (m.titulo LIKE :t OR m.descripcion LIKE :t OR m.texto LIKE :t)]
ORDER BY m.titulo ASC, m.id DESC
LIMIT 21 OFFSET (pagina - 1) * 20
```
- `:t` es `%texto%` con los comodines escapados, como en las specs anteriores: `%` y `_` se buscan como texto [RF-21].
- La intercalación `utf8mb4_unicode_ci` resuelve la comparación flexible del buscador y del orden por título [RF-18, RF-20].
- Se piden 21 filas: si llega la fila 21, `haySiguiente` es `true` y se descarta. No se calcula el total.
- El orden termina en `id`, que es único, así que con los mismos datos siempre es el mismo [RF-18].
- Si la página llega vacía, `hayModelos = EXISTS (SELECT 1 FROM modelos_escritos [WHERE activo = 1])` [RF-23, RF-24].
- **Rendimiento:** el peor caso es la búsqueda por fragmento sobre todos los textos: 500 modelos de 50.000 caracteres son unos 25 MB, la mitad de lo que ya recorre la jurisprudencia. Un e2e lo mide contra los 2 segundos del RNF.

### Completar un modelo [RF-30 a RF-43]
```
completar(causaId, modeloId, ahora):
  causa = causas.findOne(causaId, con responsable y partes → cliente → usuario)
  si no existe: 404 "No existe esa causa"                                   // RF-49
  si no causa.activa: 409 "La causa está desactivada"                       // RF-41
  modelo = modelos.findOne(modeloId); si no existe: 404 "No existe ese modelo"
  si no modelo.activo: 409 "El modelo está desactivado"                     // RF-26
  valores = caseValues(causa, ahora)                                        // puro
  resultado = completeText(modelo.texto, valores)                           // puro
  devolver toEscritoCompletado(causa, modelo, resultado)
```
- Primero se verifica la causa y después el modelo.
- El estado de la causa no se controla: una Archivada o Finalizada se completa igual [RF-42].
- El service solo lee: no escribe en `causas`, `modelos_escritos` ni en ninguna otra tabla, y no tiene `Logger` [RF-2, RF-43, RF-46].
- El integrante que completa no interviene en el resultado: el escrito es el mismo para cualquier integrante [RF-38].

**Personas de la causa** (`completar-escrito.ts`):
```
personas = partes de la causa con vigente = true                            // RF-36
para cada una: identidad = partyIdentity(parte)                             // spec 002, RF-14
  nombre    = "Nombre Apellido" o la razón social                           // RF-34
  documento = formatDni(dni) o formatCuit(cuit), o null
  si es cliente: domicilio = cliente.domicilio; activo = cliente.usuario.activo
orden: apellido o razón social, después nombre, con Intl.Collator('es', { sensitivity: 'base' });
       a igual nombre, parte.id ascendente                                  // RF-36
```
- `formatDni`: los dígitos tal como están guardados, con puntos de miles ("05.123.456"). `formatCuit`: `XX-XXXXXXXX-X` [RF-35].
- `joinPeople(textos, detallado)` [RF-36]:
  - Uno: el texto solo.
  - Dos: `a y b`.
  - Tres o más, sin detalle: `a, b y c`.
  - Tres o más, con detalle (documento o domicilio): `a; b; y c`.

**Valor de cada variable** (`caseValues` devuelve, por nombre, `{ texto, faltantes[] }`):

| Variable | Texto | Faltantes |
|---|---|---|
| `CARATULA`, `FUERO` | `causa.caratula`; la etiqueta del fuero ("Civil", …, "Otro"). | — |
| `NUMERO_EXPEDIENTE`, `JUZGADO` | El dato, o `(FALTA NÚMERO DE EXPEDIENTE)` / `(FALTA JUZGADO)`. | "número de expediente", "juzgado" |
| `EXPEDIENTE_PRINCIPAL` | `causa.expedientePrincipal`, o `(FALTA EXPEDIENTE PRINCIPAL)` si es `NULL`, sea o no incidente. | "expediente principal" |
| `ACTORES`, `DEMANDADOS`, `TERCEROS` | `joinPeople` de los nombres de ese rol, o `(FALTAN ACTORES)`, etc. | "actores", "demandados", "terceros" |
| `…_CON_DOCUMENTO` | `joinPeople` de `nombre, documento`; sin documento, `nombre, (FALTA DNI)` o `(FALTA CUIT)` según el tipo de persona. | Sin personas, como arriba. Si no, "DNI de <nombre>" o "CUIT de <nombre>" |
| `CLIENTES`, `CLIENTES_CON_DOCUMENTO` | Lo mismo, con las partes que son clientes, de cualquier rol. Sin clientes, `(FALTAN CLIENTES)`. | "clientes" |
| `CLIENTES_DOMICILIO` | Un cliente: su domicilio. Varios: `joinPeople` de `nombre: domicilio`. Sin domicilio, `(FALTA DOMICILIO)` en su lugar. | "clientes", o "domicilio de <nombre>" |
| `ABOGADO_RESPONSABLE` | Nombre y apellido de `causa.responsable`. | — |
| `FECHA` | `todayInBuenosAires(ahora)` como dd/mm/aaaa. | — |
| `FECHA_EN_LETRAS` | El mismo día: número sin cero inicial, mes de una tabla fija de doce nombres y año ("1 de marzo de 2026"). | — |

**Reemplazo en una pasada** [RF-33]:
```
completeText(texto, valores):
  usadas = usedVariables(texto)
  escrito = texto.replace(MARCA, marca → valores[variableKey].texto)        // una sola pasada
  faltantes = los de las variables usadas, sin repetir y en orden           // RF-39
  clientesDesactivados = si usa alguna variable de clientes: nombres de los clientes inactivos   // RF-40
  responsableDesactivado = usa ABOGADO_RESPONSABLE y el responsable está inactivo                // RF-40
```
El texto guardado solo tiene marcas del catálogo (RF-10), así que todas se reemplazan. `replace` recorre el texto original una sola vez y nunca vuelve a examinar lo que insertó: una carátula con "#FECHA#" queda tal cual. El valor se inserta con una función de reemplazo, no como patrón, para que un `$` en un dato no se interprete.

El escrito completado no tiene un largo máximo (caso límite aceptado en la spec).

### Respuestas
`modelo-detalle.ts` arma `ModeloResumen`, `ModeloDetalle`, `ModeloReferencia` y `EscritoCompletado` campo por campo, nunca a partir de la entidad completa. Así no salen emails ni hashes al unir con `usuarios`, ni datos de la causa o de las cuentas fuera del escrito [RF-33].

## Registros del servidor [RNF de registros]
- El filtro global `NoDataExceptionFilter` de la spec 003 ya cubre estos endpoints: ante un error inesperado registra solo el método, el patrón de la ruta, la clase y el código del error.
- `opciones-base-de-datos.ts` sigue sin `logging`.
- Los mensajes de 400 se arman sin interpolar el valor recibido, tampoco los nombres de las variables que no existen.
- El código nuevo no escribe en los registros: ningún `Logger` ni `console` en `modelos-escritos/`. Un test lo verifica.
- **Verificación del despliegue** (la misma del plan 005): el proxy de Easypanel no debe registrar las direcciones completas, porque llevan `buscar` en el query string. Este plan no toca la configuración del VPS.

## Textos seguros [RNF de textos seguros]
- El título, la descripción, el texto de un modelo y el escrito completado se muestran con `TextoLiteral` (spec 003), que conserva los saltos de línea. La regla de ESLint contra `dangerouslySetInnerHTML` ya cubre todo `web/src`.
- Un email dentro de un texto no se convierte en enlace: `TextoLiteral` no arma enlaces.
- El escrito completado puede traer caracteres que los modelos no aceptan (por ejemplo, `<` en un domicilio de la spec 001). Se muestra igual, como texto.

## Sesión, inactividad y portapapeles [RF-17, RF-44 a RF-48]

### Uso de la sesión [RF-17, RF-48]
La sesión de un integrante vence tras 1 hora sin consultas al servidor, y escribir o leer no consulta al servidor. Se reutiliza `createSessionKeepAlive` de `servicios/mantener-sesion.ts`, sin cambiarlo:
```
useUsoDeSesion():
  keepAlive = createSessionKeepAlive(() => modelos.keepSessionAlive())    // GET /api/sesion/usuario
  devolver keepAlive.notifyTyping                                         // como mucho una consulta cada 5 minutos
```
- `FormularioModelo` la llama en cada cambio de un campo [RF-17].
- `PanelEscrito` la llama ante cada uso de la pantalla: `scroll`, `keydown`, `pointerdown`, `selectionchange` y `copy` [RF-48].
- Es un hook nuevo y no `useMantenerSesion`, que depende del servicio de jurisprudencia [RF-53].

### Escrito sin uso [RF-48]
```
useCierrePorInactividad(limite = STAFF_IDLE_LIMIT_MS):                    // 60 minutos, en sesion-escrito.ts
  ultima = ahora; al enviarse cualquier pedido (httpClient.onActivity): ultima = ahora
  cada IDLE_CHECK_INTERVAL_MS, al volver a la pestaña y al recuperar el foco:
    si isIdleExpired(ultima, ahora, limite): endSession(IDLE_NOTICE)
```
- Es la misma regla que `ProveedorSesion` ya aplica a los clientes, con el límite de los integrantes y activa solo mientras `PanelEscrito` está montada. Reutiliza `isIdleExpired`, `IDLE_CHECK_INTERVAL_MS` e `IDLE_NOTICE` de `servicios/inactividad.ts`.
- Se mide desde el último pedido al servidor, no desde el último gesto, porque así cuenta el servidor.
- `endSession` vacía el usuario en memoria, `RutaProtegida` lleva a `/ingresar` y el escrito, que solo vivía en el estado de la página, desaparece.
- Un cierre por otro motivo (otro dispositivo, desactivación, restablecimiento) se detecta en la siguiente consulta, que responde 401: el cliente HTTP avisa y `ProveedorSesion` vacía el usuario, como hoy.
- "Atrás" del navegador y la dirección reabierta ya están cubiertos: `Cache-Control: no-store`, la recarga de `ProveedorSesion` ante `pageshow` y `RutaProtegida`.

### Portapapeles [RF-44, RF-45]
```
servicios/portapapeles.ts:
  copyText(texto, portapapeles = navigator.clipboard):
    si no hay portapapeles: devolver false
    intentar portapapeles.writeText(texto); devolver true; si falla: devolver false
  clearClipboard(portapapeles = navigator.clipboard):
    intentar portapapeles.writeText(''); ignorar cualquier error
```
- `PanelEscrito`: "Copiar" llama a `copyText(escrito.texto)`. Con `true`, muestra "Escrito copiado"; con `false`, "No se pudo copiar. Seleccioná el texto y copialo a mano". El texto no bloquea la selección.
- La leyenda "El escrito copiado queda en este equipo hasta que copies otra cosa o cierres sesión" va fija junto al botón.
- `DisenoSeccion.handleLogout`: si el usuario no es un cliente, llama a `clearClipboard()` antes de esperar el cierre de sesión. Tiene que ser dentro del clic, porque los navegadores solo dejan escribir el portapapeles ante una acción del usuario y con la pestaña en foco. Por eso no se vacía al vencer la sesión.

## Frontend

### Rutas
| Ruta | Página | Acceso |
|---|---|---|
| `/panel/modelos` | `PanelModelos`: buscador, filtros, "Mostrar desactivados", lista y paginado. | admin, abogado |
| `/panel/modelos/nuevo` | `PanelModeloNuevo`: formulario de carga. | admin, abogado |
| `/panel/modelos/:id` | `PanelModeloDetalle`: datos, texto, variables que usa, autoría, editar, desactivar y reactivar. | admin, abogado |
| `/panel/causas/:id/modelos` | `PanelCausaModelos`: la carátula de la causa y la lista de modelos activos para elegir. | admin, abogado |
| `/panel/causas/:id/modelos/:modeloId` | `PanelEscrito`: el escrito completado. | admin, abogado |

Las rutas quedan dentro de `DisenoPanel`, así que `RutaProtegida` aplica las reglas de la spec 001: un cliente va al portal, un visitante a `/ingresar` y una cuenta con cambio pendiente a `/cambiar-contrasena` [RF-50].

### Comportamiento de la interfaz
- **Lista** (`ListaModelos`, `FiltrosModelos`, `FilaModelo`) [RF-18 a RF-24, RF-29]:
  - La comparten `PanelModelos` y `PanelCausaModelos`. Recibe si muestra "Mostrar desactivados", a dónde lleva cada fila y el estado inicial (filtros y página).
  - Cada fila muestra el título, el tipo, el fuero (`fueroLabel`) y la descripción. Los desactivados llevan la etiqueta "Desactivado".
  - Filtros: buscador, tipo de escrito y fuero, todos vacíos al abrir. `validateModelFilters` controla el texto del buscador antes de pedir, con los mismos mensajes que la API.
  - Paginado con "Anterior" y "Siguiente" según `pagina` y `haySiguiente`. Cambiar un filtro o el buscador vuelve a la página 1.
  - `emptyModelListMessage({ hayModelos, pagina })`: "Todavía no hay modelos cargados", "No hay modelos que coincidan con la búsqueda" o, en otra página, ningún mensaje y "Volver a la primera página".
- **Formulario** (`FormularioModelo`, `CatalogoVariables`) [RF-1, RF-3 a RF-12, RF-14, RF-17]:
  - Campos: título, tipo de escrito, fuero (por defecto "Otro"), descripción y texto (área de texto con contador sobre 50.000, contado después de convertir).
  - `CatalogoVariables` muestra el catálogo agrupado, con lo que pone cada variable. Al elegir una, `insertVariable(texto, inicio, fin, nombre)` la escribe en la posición del cursor.
  - `validateModelForm` aplica las conversiones y valida con los mismos mensajes que la API. Debajo del mensaje de variables que no existen, el formulario lista cuáles son (`unknownVariables`), tal como se escribieron [RF-10].
  - La interfaz no muestra el texto convertido hasta guardar: lo guardado vuelve en la respuesta y la ficha lo muestra.
  - La edición envía solo lo que cambió. Si no cambió nada, no envía nada.
- **Pregunta de título repetido** (`PreguntaModeloRepetido`) [RF-15, RF-27]: `pendingQuestion` reconoce `MODELO_REPETIDO`. Muestra el mensaje, la lista de modelos con los que coincide (título, tipo y fuero, con enlace a cada uno en otra pestaña) y las opciones "Guardar igual" o "Cancelar". "Guardar igual" repite la petición con `confirmarRepetido: true`.
- **Ficha** (`PanelModeloDetalle`) [RF-16, RF-25 a RF-28]: datos, texto completo con `TextoLiteral`, la lista de variables que usa o "Este modelo no usa variables", y la autoría con `authorName` de la spec 003. Un modelo desactivado muestra la etiqueta "Desactivado" y solo la acción "Reactivar". El control real lo hace la API.
- **Causa** (`PanelCausaDetalle`) [RF-29, RF-41]: suma el enlace "Completar un modelo" a `/panel/causas/:id/modelos`, solo si `causa.activa`.
- **Elegir** (`PanelCausaModelos`) [RF-29, RF-30]: pide la causa para mostrar su carátula. Si está desactivada, muestra "La causa está desactivada" y no lista modelos. La lista no ofrece "Mostrar desactivados". Cada fila lleva al escrito.
- **Escrito** (`PanelEscrito`, `AvisosEscrito`) [RF-32, RF-39, RF-40, RF-44 a RF-48]:
  - Muestra la carátula, el título del modelo, los avisos, el texto con `TextoLiteral`, "Copiar" con su leyenda, y los enlaces "Volver a la lista de modelos" y "Volver a la causa". No tiene otras acciones [RF-47].
  - `AvisosEscrito` arma, si corresponden: "A esta causa le faltan datos que el modelo usa" con la lista de `faltantes`, "Hay clientes con la cuenta desactivada" con sus nombres, y "El responsable de esta causa está desactivado". Son informativos y no bloquean "Copiar".
  - Los errores 404 y 409 de la API se muestran con su mensaje y el enlace para volver a la causa.
- **Volver a la lista** [RF-32]: el enlace de cada fila hacia el escrito lleva en el estado de navegación del router (`location.state`) los filtros y la página de la lista. "Volver a la lista de modelos" los devuelve, y `PanelCausaModelos` los usa como estado inicial. No van en la dirección ni en `localStorage`, y nunca incluyen el escrito.

## Dependencias nuevas

Ninguna. El portapapeles se usa con la API del navegador, y el resto se resuelve con lo instalado en las specs 001 a 005.

## Otras decisiones técnicas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| El escrito se arma en el servidor | Enviar la causa y el modelo al navegador y reemplazar ahí | RF-33: el navegador recibe solo el escrito. La regla queda en un solo lugar, en funciones puras con tests. |
| `GET` para completar | `POST` | No cambia nada en el servidor (RF-43, RF-46), y recargar la dirección vuelve a completar (RF-33). Las respuestas ya llevan `no-store`. |
| Ruta del escrito bajo la causa | `/api/panel/modelos-escritos/:id/completar?causaId=` | RF-30: un modelo se completa desde una causa. Sigue el patrón de los movimientos. |
| Marcas reconocidas con una expresión y guardadas en la forma del catálogo | Guardar el texto como se escribió y normalizar al completar | El reemplazo y `usedVariables` trabajan siempre sobre una sola forma, y la ficha muestra lo mismo que se va a reemplazar (RF-8). |
| Catálogo de variables fijo en el código, repetido en la web | Endpoint que devuelva el catálogo | El formulario necesita reconocer las marcas sin esperar al servidor. Es el patrón de las conversiones de la spec 005, con un test en cada paquete. |
| Reutilizar `convertText` y `flexibleKey` de la jurisprudencia | Copiar la tabla de conversiones | La spec remite a esas reglas. Una sola definición evita que diverjan. Son funciones puras: no abren un camino a los datos de jurisprudencia. |
| Expresión propia para el texto, con `@` | Sumar `@` a la expresión de los movimientos | RF-4: el `@` vale solo en el texto de un modelo. Las reglas de las specs 002, 003 y 005 no cambian. |
| `mediumtext` para el texto | `varchar(50000)` o `TEXT` | 50.000 caracteres en `utf8mb4` no entran en una fila ni en un `TEXT`. El largo lo garantiza el DTO. |
| Límite del cuerpo JSON en 512 KB para toda la API | Un límite distinto solo para modelos | Un límite por ruta exige desactivar el parser por defecto de Nest y registrar uno a mano para cada ruta. Cada DTO ya limita sus campos. |
| Título comparado con la intercalación de la base | Columna normalizada con índice único | Es un aviso que se puede confirmar, como el de los fallos repetidos. |
| Paginado con `haySiguiente` pidiendo una fila de más | `total` | La spec no pide totales, y un `COUNT` repetiría la búsqueda sobre todos los textos. |
| Orden de las personas en TypeScript con `Intl.Collator` | Ordenar en la consulta | Las partes de una causa ya están cargadas, y los nombres de los clientes salen de otra tabla. Queda en una función pura, como `comparePortalParties`. |
| Función propia de orden y de nombre de las personas | Importar las del portal | El módulo de modelos no depende del portal ni al revés. Sí reutiliza `partyIdentity`, que es de la spec 002. |
| Mes de `FECHA_EN_LETRAS` de una tabla fija | `Intl.DateTimeFormat` con `month: 'long'` | El resultado no depende de los datos de idioma instalados en el servidor. |
| `faltantes` ya redactados por la API | Códigos que la interfaz traduce | Los nombres de las personas ya van en el texto. Una sola lista de textos alcanza para el aviso. |
| Hook nuevo `useUsoDeSesion` | Reutilizar `useMantenerSesion` | Ese hook usa el servicio de jurisprudencia. La regla (`createSessionKeepAlive`) sí se reutiliza. |
| Al vencer por inactividad, `endSession` sin consultar al servidor | Consultar primero si la sesión sigue viva | Es lo que ya hace el portal. Consultar podría extender la sesión justo antes de que venza. Si otra pestaña mantuvo viva la sesión, esta igual pide ingresar: se acepta. |
| Estado de la lista en `location.state` | Query string de la dirección | El texto buscado quedaría en la dirección, y al recargar llegaría a los registros del servidor que publica la web. |
| Vaciar el portapapeles en `DisenoSeccion`, dentro del clic | En `ProveedorSesion.logout` | El navegador solo deja escribir el portapapeles ante una acción del usuario. `logout` también se llama sin un clic. |
| Portapapeles vaciado en cada "Cerrar sesión" de un integrante | Solo si antes se copió un escrito | Saberlo exigiría recordar ese dato entre pantallas. Vaciar siempre es más simple y más seguro. |
| `ModelosEscritosModule` sin exports | Exportar el service | RF-52: ningún otro módulo puede llegar a los modelos sin un cambio explícito. |
| Búsqueda por `GET` con query string | `POST` con la búsqueda en el cuerpo | Decisión de la clarificación: se mantiene el patrón de la spec 005 y se verifica el proxy al desplegar. |

## Estrategia de tests

### api — unitarios (Vitest)
- `validadores/texto-modelo.ts` [RF-3 a RF-5]:
  - `convertModelText`: las conversiones de la spec 005 siguen aplicándose, y además se quitan los espacios al inicio y al final de cada línea, se conservan las líneas en blanco y se quitan los saltos de línea de los extremos.
  - Texto: acepta `@` y todos los símbolos de los movimientos; rechaza `< > { } \ | = * +`, el acento grave y los emojis. Ningún texto aceptado contiene corchetes.
  - Título y descripción: rechazan `@`.
  - Largo contado después de convertir: 50.000 pasa y 50.001 no.
- `variables.ts` [RF-7 a RF-12]:
  - `findMarks` y `canonicalMarks`: `#caratula#`, `#Carátula#` y `#CARATULA#` quedan como `#CARATULA#`; "local # 3", "#123#", "#____#" y `# CARATULA #` no son marcas; una marca partida por un salto de línea tampoco.
  - `hasJoinedMarks`: `#ACTORES##DEMANDADOS#` y `#ACTORES#DEMANDADOS#` sí; `#ACTORES# #DEMANDADOS#` y `#ACTORES#, #DEMANDADOS#` no.
  - `unknownVariables`: `#CARATUAL#`, `#DEMANDADO#` y `#A#`.
  - `usedVariables`: sin repetir y en orden; vacío en un texto sin marcas.
  - El catálogo tiene exactamente las variables de RF-9.
- `formato-escrito.ts` [RF-34 a RF-36, RF-9]:
  - Nombre de persona física y jurídica. `formatDni` con 7 y 8 dígitos y con cero inicial. `formatCuit`.
  - `joinPeople` con una, dos y tres personas, con y sin detalle.
  - Orden: por apellido y nombre, razones sociales junto con los apellidos, sin distinguir mayúsculas ni tildes, y homónimos por id.
  - Fecha en letras: "1 de marzo de 2026" y diciembre.
- `completar-escrito.ts` [RF-9, RF-31 a RF-40]:
  - Cada variable con su dato y con su marca de faltante.
  - Parte no cliente sin documento: `(FALTA DNI)` o `(FALTA CUIT)` según el tipo de persona, con "DNI de …" en los faltantes.
  - `CLIENTES_DOMICILIO` con uno, dos y tres clientes, y con uno sin domicilio.
  - Las partes desvinculadas no figuran; el rol Otro no figura en las variables de rol; un cliente figura en su rol y en las de clientes; la persona de contacto de una persona jurídica no figura.
  - Reemplazo en una pasada: una carátula con "#FECHA#" y un dato con `$&` quedan tal cual.
  - Faltantes sin repetir y solo de las variables usadas.
  - `clientesDesactivados` solo si el modelo usa una variable de clientes; `responsableDesactivado` solo si usa `ABOGADO_RESPONSABLE`.
  - `FECHA` y `FECHA_EN_LETRAS` con el cambio de día a las 03:00 UTC.
- DTO [RF-1, RF-6, RF-7, RF-10, RF-14, RF-21, RF-22]:
  - Obligatorios, largos y caracteres de cada campo, con un texto que lleva una marca de prueba que no aparece en el mensaje.
  - Fuero ausente; tipo y fuero fuera de lista; descripción vacía a `NULL`.
  - Marcas pegadas y variables que no existen, con mensajes que no las nombran.
  - `activo` en `PATCH` rechazado como campo desconocido.
  - Listado: búsqueda con `<`, con `@`, de 101 caracteres y con solo espacios; `incluirDesactivados` inválido.
- `modelo-detalle.ts` [RF-16, RF-19, RF-33, RF-51]: las respuestas tienen exactamente las claves de los tipos (el resumen sin `texto`, el escrito sin datos de partes ni de cuentas, sin emails ni hashes) y marcan a los autores desactivados.

### api — e2e (Vitest + Supertest, base de tests)
Mismo esquema que en las specs anteriores: migraciones sobre la base de tests, tablas vaciadas al empezar cada suite, ejecución en serie.
- **Carga** [RF-1 a RF-13]: completa, sin fuero (queda `otro`) y sin descripción, con autoría. Un texto pegado con caracteres tipográficos y sangría se guarda convertido. Las marcas se guardan en la forma del catálogo. Un texto de 50.000 caracteres de varios bytes se acepta, y un cuerpo de más de 512 KB responde 413 sin repetir lo recibido.
- **Título repetido** [RF-15, RF-27]:
  - Mismo título con otras mayúsculas, tildes o espacios: 409 `MODELO_REPETIDO` con todos los que coinciden; con confirmación, 201.
  - En `PATCH`: sin pregunta si no cambia el título; el modelo no se compara consigo mismo.
  - Contra un desactivado: sin pregunta. Al reactivarlo: pregunta.
- **Modificación** [RF-2, RF-14, RF-26]: cada dato, `PATCH` sin cambios que no actualiza `modificadoEn`, rechazo de `activo` y 409 sobre un desactivado.
- **Desactivación y reactivación** [RF-25 a RF-28]: auditoría, salida del listado normal, aparición con `incluirDesactivados`, y 409 al repetir cada acción.
- **Listado** [RF-18 a RF-24]:
  - Orden por título sin distinguir mayúsculas ni tildes y, a igual título, primero el último registrado. Con 45 modelos, las tres páginas no repiten ni omiten ninguno.
  - Búsqueda por fragmento en el título, la descripción y el texto, en mayúsculas y sin tildes; "#JUZGADO#" y "@ejemplo.com"; "50%" se busca literal.
  - Filtro por tipo; por Laboral (laborales y Otro); por Otro (solo Otro); y su combinación con el buscador.
  - `hayModelos` en `false` sin modelos o con todos desactivados, y en `true` con modelos que no coinciden. Página inexistente: `items` vacío.
  - Ninguna fila trae `texto`.
- **Escrito** [RF-30 a RF-43]:
  - Causa con dos actores clientes (uno sin domicilio), un demandado persona jurídica con CUIT y otro persona física sin DNI, sin número ni juzgado: el texto, los faltantes y los avisos esperados.
  - Después de cargar el número y el juzgado, el mismo pedido devuelve los datos nuevos.
  - Cliente y responsable desactivados: los avisos, y sus nombres en el texto.
  - Causa desactivada (409), Archivada y Finalizada (200), modelo desactivado (409), causa o modelo inexistente e ids no numéricos (404).
  - `modificadoPor/En` de la causa y del modelo no cambian, y la cantidad de filas de todas las tablas es la misma antes y después.
  - La respuesta lleva `Cache-Control: no-store` y solo las claves de `EscritoCompletado`.
- **Rendimiento** [RNF]: con 500 modelos de 50.000 caracteres, insertados en bloque, el listado con buscador y filtros responde en menos de 2 segundos. Completar un modelo de 50.000 caracteres en una causa con 50 partes responde en menos de 2 segundos.
- **Concurrencia** [RF-26]: una desactivación y una modificación simultáneas: si la desactivación queda primero, la modificación responde 409.
- **Integrantes** [RF-51]: un autor desactivado sigue figurando, marcado como desactivado.
- **Acceso** [RF-50, RF-52]: un cliente recibe 403, un visitante 401 y una cuenta con cambio pendiente 403 en cada endpoint de modelos y en el del escrito. Las respuestas del portal no tienen datos de modelos.
- **Reglas de las otras specs** [RNF de reglas de textos]: crear una causa, un movimiento y un fallo con `@` sigue respondiendo 400.
- **Migración:** `up` sobre la base con las tablas de las specs 001 a 005, y `down` sin errores.

### Aislamiento en el código [RF-52, RF-53, RNF de registros]
Un test de Vitest en cada paquete lee los archivos fuente y falla si:
- En `api/`:
  - Algún archivo de `src/portal/` importa de `src/modelos-escritos/`.
  - `modelos-escritos.module.ts` declara `exports`.
  - Algún controller de modelos no lleva `@Roles('admin', 'abogado')`, o nombra `'cliente'` o `@Public`.
  - Algún archivo de `src/modelos-escritos/` importa de `src/jurisprudencia/` algo que no sea `validadores/texto-fallo` o `reglas-jurisprudencia`.
  - Algún archivo de `src/modelos-escritos/` usa `Logger` o `console`.
- En `web/`:
  - Algún archivo del portal importa un módulo de modelos o usa `useModelosService`.
  - Algún archivo de modelos importa `servicios/jurisprudencia.ts` o usa `useJurisprudenciaService`.

### web — Vitest
- `servicios/modelos-escritos.ts` con `fetch` simulado: rutas, métodos y armado del query string.
- `servicios/texto-modelo.ts` [RF-3, RF-4, RF-7 a RF-12]: los mismos casos que los unitarios de la API, e `insertVariable` al principio, en el medio y reemplazando una selección.
- `servicios/formulario-modelo.ts` [RF-1, RF-6, RF-14, RF-21, RF-22]: validaciones con los mensajes de la API, contador después de convertir, cuerpo de alta, cuerpo de edición con solo lo que cambió (vacío si no cambió nada) y filtros.
- `servicios/presentacion-modelos.ts` [RF-23, RF-24, RF-39, RF-40]: `emptyModelListMessage` en cada caso y los textos de los avisos.
- `servicios/portapapeles.ts` [RF-44, RF-45]: `copyText` con un portapapeles que acepta, uno que rechaza y sin portapapeles; `clearClipboard` escribe un texto vacío y no falla si el navegador lo rechaza.
- `servicios/preguntas.ts`: `pendingQuestion` con `MODELO_REPETIDO`.
- `ListaModelos`, `PanelModelos` y `PanelCausaModelos` con servicios simulados [RF-18 a RF-24, RF-29]: filtros vacíos al abrir, buscador, vuelta a la página 1, paginado, etiqueta "Desactivado", cada mensaje de vacío, y sin "Mostrar desactivados" ni pedido con `incluirDesactivados` desde una causa.
- `FormularioModelo` y `CatalogoVariables` [RF-10, RF-11, RF-17]: insertar una variable desde el catálogo, la lista de variables que no existen, el mensaje de variables pegadas y la consulta de sesión al escribir.
- `PanelModeloNuevo` y `PreguntaModeloRepetido` [RF-13, RF-15]: carga, y la pregunta con todos los modelos coincidentes, "Guardar igual" y "Cancelar".
- `PanelModeloDetalle` [RF-16, RF-25 a RF-28]: datos, variables que usa o "Este modelo no usa variables", sin acciones de edición si está desactivado, y desactivar y reactivar.
- `PanelCausaDetalle` [RF-29, RF-41]: muestra "Completar un modelo" en una causa activa y no en una desactivada.
- `PanelEscrito` y `AvisosEscrito` [RF-32, RF-39, RF-40, RF-44 a RF-48]:
  - El texto con sus saltos de línea, cada aviso y que ninguno deshabilita "Copiar".
  - "Copiar" con el portapapeles simulado: el texto exacto, "Escrito copiado" y el mensaje de error. La leyenda siempre visible.
  - No hay botones de descargar, imprimir, exportar, enviar ni editar.
  - El uso de la pantalla dispara la consulta de sesión, como mucho una cada 5 minutos.
  - Pasada 1 hora sin pedidos, el escrito deja de mostrarse y la página lleva a `/ingresar`. Un 401 hace lo mismo.
  - "Volver a la lista de modelos" llega a la lista con la página, la búsqueda y los filtros que tenía.
  - Los 404 y 409 de la API se muestran con su mensaje.
- `DisenoSeccion` [RF-44]: "Cerrar sesión" vacía el portapapeles para un integrante y no lo toca para un cliente.
- `DisenoPanel` muestra el enlace "Modelos", y las rutas nuevas no son accesibles para un cliente ni para un visitante [RF-50].
- Ninguna escritura en `localStorage` ni `sessionStorage` en el flujo de modelos y de escritos [RF-46, RNF de persistencia].

## Cobertura de RF

| RF | Dónde se implementa | Test |
|---|---|---|
| RF-1 | Entidad `ModeloEscrito`, DTO, `formulario-modelo.ts`, límite del cuerpo | Unitarios de DTO, e2e de carga, Vitest |
| RF-2 | `modificadoPor/En` en cada escritura; el escrito no escribe | e2e de carga, modificación, desactivación y escrito |
| RF-3 a RF-6 | `texto-modelo.ts` (api y web), `convertText` de la spec 005, DTO | Unitarios de api y web, e2e de carga |
| RF-7, RF-8, RF-10, RF-12 | `variables.ts`, `texto-modelo.ts` (web), DTO | Unitarios de api y web |
| RF-9 | Catálogo en `variables.ts`, `caseValues` | Unitarios de `variables.ts` y `completar-escrito.ts` |
| RF-11 | `CatalogoVariables`, `insertVariable` | Vitest |
| RF-13 | `modelos-escritos.service` (crear) | e2e de carga, Vitest |
| RF-14 | `modelos-escritos.service` (modificar), DTO sin `activo` | e2e de modificación, Vitest |
| RF-15 | `findRepeated`, `MODELO_REPETIDO`, `PreguntaModeloRepetido` | e2e de título repetido, Vitest |
| RF-16 | `GET /:id`, `usedVariables`, `PanelModeloDetalle` | Unitario, Vitest |
| RF-17 | `useUsoDeSesion`, `FormularioModelo`, `createSessionKeepAlive` | Vitest |
| RF-18, RF-19 | `modelos-escritos.service` (listar), `FilaModelo` | e2e de listado, Vitest |
| RF-20, RF-21 | Búsqueda con `LIKE`, DTO del listado | Unitarios de DTO, e2e de listado |
| RF-22 | Filtros del listado, `FiltrosModelos` | e2e de listado, Vitest |
| RF-23, RF-24 | `hayModelos`, `emptyModelListMessage` | e2e de listado, Vitest |
| RF-25 a RF-28 | `modelos-escritos.service` (desactivar y reactivar), bloqueo del modelo | e2e de desactivación y concurrencia, Vitest |
| RF-29 | `PanelCausaDetalle`, `PanelCausaModelos`, `ListaModelos` | Vitest |
| RF-30 | Ruta del escrito bajo la causa; no hay otra forma de completar | e2e de escrito |
| RF-31, RF-33 | `escritos.service`, `completeText`, `toEscritoCompletado` | Unitarios, e2e de escrito |
| RF-32 | `PanelEscrito`, `location.state` | Vitest |
| RF-34 a RF-37 | `formato-escrito.ts`, `caseValues` | Unitarios |
| RF-38 | El catálogo no tiene esas variables; `caseValues` no las lee | Unitario del catálogo |
| RF-39, RF-40 | `caseValues`, `completeText`, `AvisosEscrito` | Unitarios, e2e de escrito, Vitest |
| RF-41, RF-42 | `escritos.service`, `PanelCausaDetalle`, `PanelCausaModelos` | e2e de escrito, Vitest |
| RF-43 | El service de escritos solo lee | e2e de escrito |
| RF-44, RF-45 | `portapapeles.ts`, `PanelEscrito`, `DisenoSeccion` | Vitest |
| RF-46 | Sin tabla de escritos, `no-store`, sin almacenamiento del navegador, sin `Logger` | e2e de escrito, Vitest, aislamiento en el código |
| RF-47 | `PanelEscrito` sin esas acciones | Vitest |
| RF-48 | `useUsoDeSesion`, `useCierrePorInactividad`, `ProveedorSesion` | Vitest |
| RF-49 | `ParseIntPipe` con 404, `escritos.service` | e2e de escrito y de modificación |
| RF-50 | `@Roles('admin', 'abogado')` y guards de la spec 001 | e2e de acceso, Vitest |
| RF-51 | `AutorResumen.activo` | e2e de integrantes, unitario |
| RF-52 | Módulo sin exports, portal sin imports de modelos | Aislamiento en el código, e2e de acceso |
| RF-53 | Solo dos funciones puras de la jurisprudencia | Aislamiento en el código |
| RNF de registros | Filtro global de la spec 003, mensajes sin valores, sin `Logger` | Unitarios de DTO, e2e de carga, aislamiento en el código |
| RNF de textos seguros | RF-3 y RF-4, `TextoLiteral`, regla de ESLint | Unitarios, Vitest, `pnpm lint` |
| RNF de reglas de textos | Expresión propia para el texto; las de las specs 002, 003 y 005 sin cambios | e2e de reglas de las otras specs |
| RNF de rendimiento | `IDX_modelos_escritos_listado`, `haySiguiente` sin `COUNT`, listado sin `texto` | e2e de rendimiento |
| RNF de fechas | `todayInBuenosAires`, tabla de meses | Unitarios |
