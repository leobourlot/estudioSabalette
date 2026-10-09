# Plan 005 — Jurisprudencia

Implementa `spec.md` de esta carpeta. Respeta `docs/constitution.md` y se apoya en lo construido en las specs 001 a 004: guards globales y roles, sesión extendida en cada consulta, filtro global de errores sin datos, `Cache-Control: no-store`, preguntas como 409 con `codigo`, validadores de textos de causas y movimientos, `AutorResumen`, `TextoLiteral`, cliente HTTP y patrones de listado. Cada sección indica entre corchetes los RF que cubre.

No se agregan dependencias ni variables de entorno.

## Arquitectura

### Módulos de NestJS (`api/src/`)

| Carpeta | Contenido | RF |
|---|---|---|
| `migraciones/` | Migración `crear-fallos-y-palabras-clave`. | RF-1, RF-2, RF-10, RF-11 |
| `jurisprudencia/` (nuevo) | Ver detalle debajo. | RF-1 a RF-36 |
| `causas/preguntas.ts` | `QUESTION_CODES` suma `repeatedRuling: 'FALLO_REPETIDO'`. | RF-18, RF-31 |
| `base-de-datos/esquema.ts` | Suma las tres entidades nuevas y la migración al final de las listas. | — |
| `app.module.ts` | Importa `JurisprudenciaModule`. | — |

Contenido de `jurisprudencia/`:
- Entidades: `fallo.entity.ts`, `palabra-clave.entity.ts` y `fallo-palabra-clave.entity.ts`.
- `jurisprudencia.controller.ts` y `jurisprudencia.service.ts`: carga, consulta, listado, modificación, desactivación y reactivación de fallos.
- `palabras-clave.service.ts`: resolución de las palabras clave de un fallo contra el catálogo y sugerencias.
- `reglas-jurisprudencia.ts`: reglas puras, sin acceso a la base (clave de comparación flexible, palabras repetidas en un fallo, rango de la fecha del fallo, qué aviso de repetido corresponde).
- `fallo-detalle.ts`: armado explícito de las respuestas.
- `validadores/texto-fallo.ts`: conversiones de RF-3 y reglas de caracteres y largo.
- `validadores/enlace.ts`: reglas del enlace a la fuente.
- `validadores/longitudes.ts`: largos máximos.
- `dto/`.

`jurisprudencia.controller.ts` lleva `@Roles('admin', 'abogado')`: los guards globales de la spec 001 rechazan a clientes (403), a visitantes (401) y a cuentas con cambio de contraseña pendiente (403) antes de llegar al controller [RF-34]. El controller solo valida con DTO y pipes y delega (principio 3).

`JurisprudenciaModule` no exporta nada: ningún otro módulo puede usar sus services. Así el portal (spec 004) y las specs siguientes no tienen cómo llegar a la jurisprudencia sin cambiar este módulo a la vista [RF-36].

### Carpetas de `web/src/`

| Carpeta | Contenido | RF |
|---|---|---|
| `servicios/jurisprudencia.ts` (nuevo) | Tipos y una función por endpoint de `/api/panel/jurisprudencia`. | RF-13, RF-16 a RF-19, RF-21 a RF-32 |
| `servicios/texto-fallo.ts` (nuevo) | Las mismas conversiones y reglas de texto que la API (RF-3 a RF-5), la clave de comparación flexible (RF-9) y las reglas del enlace (RF-6). | RF-3 a RF-6, RF-9, RF-11 |
| `servicios/formulario-fallo.ts` (nuevo) | Validación del formulario con los mismos mensajes que la API, armado de los cuerpos (en la edición, solo lo que cambió), palabras clave del formulario sin repetidas, validación de los filtros y armado del query string. | RF-1, RF-7, RF-8, RF-14, RF-17, RF-24 a RF-26 |
| `servicios/presentacion-jurisprudencia.ts` (nuevo) | Dominio de un enlace, mensajes de listado vacío y la decisión entre ellos. | RF-19, RF-27, RF-28 |
| `servicios/mantener-sesion.ts` (nuevo) | Regla de cada cuánto la escritura en un formulario consulta al servidor para mantener la sesión, sin temporizadores. | RF-20 |
| `servicios/preguntas.ts` | `pendingQuestion` reconoce `FALLO_REPETIDO`. | RF-18, RF-31 |
| `componentes/` | Nuevos: `FormularioFallo.tsx`, `SelectorPalabrasClave.tsx` (modos carga y filtro), `FiltrosJurisprudencia.tsx`, `FilaFallo.tsx` y `EnlaceFuente.tsx`. `ProveedorServicios.tsx` suma el servicio de jurisprudencia. `DisenoPanel.tsx` suma el enlace "Jurisprudencia". | RF-12 a RF-14, RF-19 a RF-28 |
| `paginas/` | Nuevas: `PanelJurisprudencia` (listado), `PanelFalloNuevo` y `PanelFalloDetalle` (datos, edición, desactivar y reactivar). | RF-16 a RF-32 |
| `RutasAplicacion.tsx` | Rutas nuevas del panel. | — |

Nada en `src/servicios/` importa React (principio 3). Ningún archivo del portal importa `servicios/jurisprudencia.ts` [RF-36].

### Archivos existentes que se modifican
- `api/src/base-de-datos/esquema.ts` y `api/src/app.module.ts`.
- `api/src/causas/preguntas.ts`.
- `web/src/servicios/preguntas.ts`, con su test.
- `web/src/componentes/ProveedorServicios.tsx`.
- `web/src/componentes/DisenoPanel.tsx`, con `Disenos.test.tsx`.
- `web/src/RutasAplicacion.tsx`.

Las utilidades nuevas de los tests van en archivos nuevos (`api/test/utilidades/fallos-de-prueba.ts` y `web/src/pruebas/jurisprudencia-de-prueba.tsx`). Ninguna tabla de las specs 001 a 004 cambia, y las reglas de textos de causas y movimientos no se tocan [RNF de reglas propias].

## Entidades de TypeORM y migración [RF-1, RF-2, RF-10, RF-11]

Mismas convenciones que en las specs anteriores: `DATETIME` en hora de Buenos Aires, tablas `utf8mb4_unicode_ci`, ids autoincrementales y claves foráneas `NO ACTION` (nada se borra).

### `fallos`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int autoincremental | PK. También es el orden de registro en el sistema (RF-21). |
| `caratula` | varchar(255) | RF-1, RF-3, RF-4 |
| `tribunal` | varchar(150) | RF-1, RF-3, RF-4 |
| `fuero` | enum `civil`, `penal`, `familia`, `laboral`, `federal`, `otro` | Los mismos valores que `causas.fuero` (`JURISDICTIONS`). RF-1 |
| `fecha` | date | Día del fallo, sin hora. Llega como texto `AAAA-MM-DD` por `dateStrings: ['DATE']` (plan 003). RF-1, RF-7 |
| `numero` | varchar(50), nullable | `NULL` si no se informa. RF-1, RF-4 |
| `numeroBusqueda` | varchar(50), nullable | El número sin separadores, con `toSearchableCaseNumber` de la spec 002. Lo calcula el service al guardar. RF-23 |
| `sumario` | varchar(5000) | RF-1, RF-5 |
| `enlace` | varchar(500), nullable | RF-1, RF-6 |
| `activo` | boolean, default true | RF-29 a RF-31 |
| `creadoPorId`, `creadoEn` | FK `usuarios`, datetime(6) | RF-2. Con microsegundos, para el desempate de RF-21. |
| `modificadoPorId`, `modificadoEn` | FK `usuarios` nullable, datetime(6) nullable | RF-2: datos, palabras clave, desactivación y reactivación. |

Índices:
- `IDX_fallos_listado` sobre `(activo, fecha, creadoEn, id)`: el filtro por activos y el orden del listado (RF-21).
- `IDX_fallos_repetido` sobre `(tribunal, numero)`: la búsqueda de repetidos por número (RF-18).

No hay columnas para quién desactivó o reactivó: la spec solo pide la última modificación, y esas acciones la actualizan (RF-2).

### `palabras_clave`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int autoincremental | PK |
| `texto` | varchar(50) | La forma que se muestra, ya convertida (RF-3, RF-12). |
| `clave` | varchar(50) `COLLATE utf8mb4_bin`, índice único `UQ_palabras_clave_clave` | `flexibleKey(texto)`: la forma de comparación flexible (RF-9, RF-11). |
| `creadoEn` | datetime(6) | |

El índice único sobre `clave` garantiza una sola palabra por forma de comparación, también con dos guardados simultáneos. `clave` usa intercalación binaria, para que la igualdad sea exactamente la de `flexibleKey` en TypeScript y no la de la intercalación de la base. Ver "Otras decisiones técnicas".

### `fallo_palabras_clave`
| Campo | Tipo | Notas |
|---|---|---|
| `falloId` | FK `fallos` | PK compuesta |
| `palabraClaveId` | FK `palabras_clave` | PK compuesta: una palabra no se repite en un fallo (RF-14). Índice `IDX_fallo_palabras_clave_palabra` sobre `(palabraClaveId, falloId)`, para el filtro y las sugerencias. |

Quitar una palabra clave de un fallo borra su fila: la spec no pide historial. Las palabras del catálogo nunca se borran (RF-15).

La migración crea las tres tablas con sus índices y claves foráneas, y es reversible (`down` las elimina en orden inverso). `synchronize` siempre en `false`.

`varchar(5000)` en `utf8mb4` ocupa hasta 20.000 bytes. Con los demás campos, la fila queda por debajo del límite de 65.535 bytes de MySQL.

## Contrato de la API

Errores con el formato de las specs anteriores (`statusCode`, `message`, en español). Ningún mensaje repite el texto recibido [RNF de registros]. Los ids de ruta que no son números responden 404 "No existe ese fallo", con un `ParseIntPipe` y un `exceptionFactory`, como en `movimientos.controller.ts` [RF-33].

### Jurisprudencia — `/api/panel/jurisprudencia` (roles `admin` y `abogado`) [RF-34]

| Método y ruta | Cuerpo | Respuesta | Errores | RF |
|---|---|---|---|---|
| `GET /?pagina&buscar&palabrasClave&fuero&desde&hasta&incluirDesactivados` | — | 200 `{ items: FalloResumen[], pagina, haySiguiente, hayFallos }` | 400 | RF-21 a RF-28 |
| `GET /palabras-clave?buscar&para` | — | 200 `PalabraClaveSugerencia[]` | 400 | RF-13, RF-25 |
| `GET /:id` | — | 200 `FalloDetalle` | 404 | RF-19, RF-33 |
| `POST /` | `{ caratula, tribunal, fuero, fecha, numero?, sumario, palabrasClave: string[], enlace?, confirmarRepetido? }` | 201 `FalloDetalle` | 400, 409 | RF-1 a RF-16, RF-18 |
| `PATCH /:id` | Parcial: los mismos campos y `confirmarRepetido?`. `null` o vacío borra el número o el enlace. `palabrasClave` reemplaza la lista completa. | 200 `FalloDetalle` | 400, 404, 409 | RF-12, RF-14, RF-17, RF-18, RF-30 |
| `POST /:id/desactivar` | — | 200 `FalloDetalle` | 404, 409 | RF-29, RF-32 |
| `POST /:id/reactivar` | `{ confirmarRepetido? }` | 200 `FalloDetalle` | 404, 409 | RF-18, RF-31, RF-32 |

- `GET /palabras-clave` se declara antes de `GET /:id`.
- `activo` no se declara en el DTO de `PATCH`, y enviarlo responde "El campo … no está permitido" [RF-17].
- La consulta funciona también sobre un fallo desactivado [RF-30].

**Parámetros del listado** [RF-21, RF-23 a RF-26]:
- `pagina`: entero desde 1, por defecto 1, con el mensaje de los listados existentes.
- `buscar`: texto de RF-24. Vacío o solo espacios, después de convertir, equivale a no enviarlo.
- `palabrasClave`: ids separados por coma, hasta 10 (el máximo de un fallo: con más, ningún fallo podría tenerlas todas).
- `fuero`: uno de la lista.
- `desde` y `hasta`: `AAAA-MM-DD`, opcionales e inclusive.
- `incluirDesactivados`: `true` o `false` (por defecto `false`).

**Parámetros de las sugerencias** [RF-13, RF-25]:
- `buscar`: obligatorio. Pasa por las conversiones de RF-3 y debe quedar con entre 2 y 50 caracteres permitidos en una palabra clave.
- `para`: `carga` (por defecto) o `filtro`.

**Tipos:**
- `AutorResumen`: el de la spec 003 (`{ id, nombre, apellido, activo }`), con `toAutorResumen` de `movimiento-detalle.ts` [RF-35].
- `PalabraClave`: `{ id, texto }`.
- `PalabraClaveSugerencia`: `{ id, texto, cantidad }`. `cantidad` es la de fallos activos que la usan [RF-13].
- `FalloResumen`: `{ id, caratula, tribunal, fuero, fecha, numero, sumario, palabrasClave: PalabraClave[], activo }`.
  - El sumario va completo. La interfaz lo recorta en 300 caracteres y "Ver más" no necesita otra petición (RF-22). Con 20 por página y 5.000 caracteres como máximo, son unos 100 KB por página.
  - Las palabras clave van en orden alfabético.
- `FalloDetalle`: `FalloResumen` más `{ enlace, creadoPor: AutorResumen, creadoEn, modificadoPor: AutorResumen | null, modificadoEn }` [RF-19].
- `hayFallos`: si existe algún fallo que pueda aparecer sin buscador ni filtros (activo o, con `incluirDesactivados`, cualquiera). Solo se calcula cuando la página llega vacía; si no, es `true` [RF-27].

**Mensajes de 400** (por campo, como en las specs anteriores) [RF-8, RF-14, RF-24, RF-26]:
- Carátula: "La carátula es obligatoria", "La carátula no puede tener más de 255 caracteres" y el de caracteres de la spec 002 (`allowedCharactersMessage('La carátula')`).
- Tribunal: "Indicá el tribunal", "El tribunal no puede tener más de 150 caracteres" y el de caracteres.
- Fuero: el de la spec 002.
- Fecha: los cuatro de RF-8.
- Número: "El número no puede tener más de 50 caracteres" y el de caracteres.
- Sumario: "Indicá el sumario del fallo", "El sumario no puede tener más de 5000 caracteres" y el de caracteres de la spec 003 (`allowedCharactersMessage('El sumario')`).
- Palabras clave: los de RF-14, "Las palabras clave deben ser una lista de textos" y "La palabra clave solo puede tener letras, números, espacios y los símbolos …".
- Enlace: "El enlace debe empezar con https://", "El enlace tiene un formato o caracteres no permitidos" y "El enlace no puede tener más de 500 caracteres".
- Listado: "La búsqueda tiene caracteres no permitidos", "La búsqueda puede tener hasta 100 caracteres", "Las palabras clave del filtro deben ser hasta 10 ids", el de fuero, "La fecha no es válida", "La fecha no puede ser anterior al 01/01/1800", "La fecha del fallo no puede ser posterior a hoy", "La fecha desde no puede ser posterior a la fecha hasta" y "El filtro incluirDesactivados debe ser true o false".
- Sugerencias: "Escribí al menos 2 caracteres", "La búsqueda tiene caracteres no permitidos" y "El destino de las sugerencias debe ser carga o filtro".
- Confirmación: "La confirmación debe ser true o false" (el de la spec 002).
- Campos desconocidos, con el mensaje de la spec 001.

**Pregunta (409 con `codigo`)** [RF-18, RF-31]:
| `codigo` | Mensaje | Datos extra | Se responde con |
|---|---|---|---|
| `FALLO_REPETIDO` | "Ya existe un fallo con ese número en ese tribunal" o "Ya existe un fallo con esa carátula, tribunal y fecha" | `fallo: { id, caratula, tribunal, fecha, numero }` | `confirmarRepetido: true` |

**Otros 409:**
- "El fallo está desactivado. Reactivalo para modificarlo" (RF-30).
- "El fallo ya está desactivado" y "El fallo ya está activo" (RF-32).

**Mensaje de 404:** "No existe ese fallo" (RF-33).

## Reglas de negocio

Las reglas que no necesitan la base viven en `jurisprudencia/reglas-jurisprudencia.ts` como funciones puras, igual que `reglas-causas.ts` y `reglas-movimientos.ts`:
- `flexibleKey(texto)`: la forma de comparación flexible de RF-9 (ver debajo).
- `uniqueKeywords(textos)`: las palabras del fallo sin repetidas por `flexibleKey`, conservando la primera aparición [RF-14].
- `isFalloDateInRange(fecha, ahora)`: entre `1800-01-01` y `todayInBuenosAires(ahora)` de la spec 003 [RF-7].
- `repeatedRulingMessage(porNumero)`: el mensaje de RF-18 que corresponde.

Reciben `ahora` como parámetro, igual que en la spec 003, para testear el cambio de día.

### Conversiones y textos [RF-3 a RF-5]
`validadores/texto-fallo.ts` expone `convertText(valor, { multilinea })`, que aplica en este orden:
1. Normaliza a NFC, como `texto-causa.ts` y `texto-movimiento.ts`, para que una letra con tilde combinable cuente como una sola.
2. Convierte `\r\n` y `\r` en `\n`, y los separadores de línea y de párrafo Unicode (U+2028, U+2029) en `\n`.
3. Elimina los invisibles: U+200B, U+200C, U+200D, U+2060, U+00AD y U+FEFF.
4. Reemplaza con una tabla fija (`TYPOGRAPHIC_REPLACEMENTS`):
   - `“ ” „ ‟ « » ″` → `"`.
   - `‘ ’ ‚ ‛ ‹ › ′ ´` → `'`.
   - `‐ ‑ ‒ – — ― −` → `-`.
   - `• ◦ ‣ ▪` → `-`.
   - `…` → `...`.
   - `№` → `Nº`.
   - `[` → `(` y `]` → `)`.
   - U+00A0, U+1680, U+2000 a U+200A, U+202F, U+205F, U+3000 y la tabulación → espacio.
5. Signo de párrafo: primero `§§` → `párrs.`, después `§` → `párr.`, y si lo sigue un carácter que no es espacio ni salto de línea, agrega un espacio (`/§§?(?=[^ \n])/` se reemplaza con el texto más un espacio).
6. Si no es multilínea (carátula, tribunal, número, palabras clave, búsqueda), cada `\n` pasa a espacio.
7. Reduce a uno los espacios repetidos. En el sumario lo hace dentro de cada línea, sin tocar los `\n` ni las líneas en blanco.
8. Quita los espacios del principio y del final; en el sumario, también los saltos de línea.

Después se valida con las expresiones existentes, sin copiarlas:
- Carátula, tribunal, número y palabras clave: `hasOnlyAllowedCharacters` de `causas/validadores/texto-causa.ts` [RF-4, RF-10].
- Sumario: `hasOnlyAllowedCharacters` de `movimientos/validadores/texto-movimiento.ts` [RF-5].
- Búsqueda: la del sumario, que tras el paso 6 ya no tiene saltos de línea [RF-24].

Ninguna de las dos expresiones acepta `< > { } [ ] \ | =` ni el acento grave, así que lo que la tabla no convierte se rechaza. Los corchetes nunca llegan a validarse: el paso 4 ya los convirtió [RF-3].

El largo se cuenta después de convertir, en puntos de código (`textLength` de la spec 003), como cuenta MySQL [RF-3]. Un número vacío después de convertir pasa a `NULL`.

`convertText` se aplica en los `@Transform` de los DTO, antes de las reglas. `web/src/servicios/texto-fallo.ts` repite la misma tabla y el mismo orden. Un test en cada paquete recorre los mismos casos, así que si una tabla cambia sin la otra, falla [RNF de validación].

### Comparación flexible [RF-9, RF-11]
```
flexibleKey(texto) = convertText(texto, una línea)
                     → NFD → quitar marcas diacríticas (\p{M}) → minúsculas ('es') → NFC
```
Al quitar las marcas, la ñ pasa a n, la ü a u y las vocales con tilde a su vocal. Se usa:
- Para la igualdad de palabras clave, con la columna `palabras_clave.clave` [RF-11].
- Para descartar repetidas en el mismo fallo, en la API y en el formulario [RF-14].

La comparación de carátula, tribunal y número en el aviso de repetido (RF-18) y la búsqueda por fragmento (RF-13, RF-23) usan la intercalación `utf8mb4_unicode_ci` de la base. Esa intercalación no distingue mayúsculas, minúsculas, tildes ni diéresis e iguala la ñ con la n, que es la comparación flexible de RF-9 (ya lo aprovechan las búsquedas de las specs 002 y 003). Como los textos se guardan convertidos y con los espacios reducidos (RF-3), tampoco influyen los espacios repetidos.

### Enlace a la fuente [RF-6, RF-19]
`validadores/enlace.ts` expone `linkViolation(enlace): null | 'esquema' | 'formato'`. Recorta los extremos y, sin usar `new URL()` (que normaliza y acepta formas que la spec rechaza), aplica:
```
si no empieza con "https://": 'esquema'
resto = después de "https://"
host = resto hasta el primer "/", "?" o "#"
si host no cumple ^[a-z0-9-]+(\.[a-z0-9-]+)+$: 'formato'          // minúsculas, con punto; sin ":" (puerto) ni "@"
si alguna parte del host empieza o termina con "-", o empieza con "xn--": 'formato'
si todas las partes del host son números: 'formato'               // dirección IP
si lo que sigue al host no cumple ^[A-Za-z0-9\-._~/?#&=%+!$()*,;:]*$: 'formato'
si tiene más de 500 caracteres: mensaje de largo
```
La expresión del resto excluye espacios, comillas, `< > { } [ ] | \ ^`, el acento grave, `@`, emojis y letras con tilde o ñ. `=` y `&` solo se aceptan acá [RF-6].

`web/src/servicios/texto-fallo.ts` repite la regla y suma `linkDomain(enlace)`, que devuelve el host [RF-19].

### Palabras clave [RF-10 a RF-15]
```
resolverPalabras(manager, textos):                       // dentro de la transacción del fallo
  palabras = uniqueKeywords(textos ya convertidos)        // RF-14
  para cada texto de palabras:
    INSERT INTO palabras_clave (texto, clave, creadoEn) VALUES (texto, flexibleKey(texto), ahora)
      ON DUPLICATE KEY UPDATE texto = VALUES(texto)       // RF-12: la forma escrita reemplaza a la anterior
    id = SELECT id FROM palabras_clave WHERE clave = flexibleKey(texto)
  devolver ids
```
- Si el integrante eligió una sugerencia, la interfaz envía el texto exacto del catálogo y el `UPDATE` no cambia nada. Así "elegir una sugerencia no cambia su forma" se cumple sin un dato extra [RF-12].
- El cambio de forma solo toca `palabras_clave`. Los demás fallos que la usan muestran la nueva forma, pero su `modificadoPor/En` no cambia [RF-12].
- Las palabras se resuelven en la misma transacción que guarda el fallo, después de todas las validaciones y de la pregunta de repetido. Si algo se rechaza, o el integrante no confirma, no se agrega nada al catálogo [RF-12].
- Con dos guardados simultáneos de la misma palabra en formas distintas, el índice único deja una sola fila, y queda la forma del último que guardó [caso límite de concurrencia].

**Sugerencias** [RF-13, RF-25]:
```
para = 'carga':
  SELECT pc.id, pc.texto, COUNT(f.id) AS cantidad
  FROM palabras_clave pc
    JOIN fallo_palabras_clave fpc ON fpc.palabraClaveId = pc.id
    JOIN fallos f ON f.id = fpc.falloId AND f.activo = 1
  WHERE pc.texto LIKE :t
  GROUP BY pc.id
  ORDER BY cantidad DESC, pc.texto ASC, pc.id ASC
  LIMIT 10

para = 'filtro': lo mismo con LEFT JOIN, sin exigir fallos activos (cantidad puede ser 0)
```
- `:t` es `%texto%` con los comodines escapados (`escapeLike`, como en las specs 001 a 003).
- Al buscar por `texto` con la intercalación de la base, "dano" encuentra "daño moral" [RF-13].
- Un fallo desactivado no cuenta en `cantidad` ni hace aparecer la palabra al cargar [RF-30].

### Carga [RF-2, RF-12, RF-16, RF-18]
```
crear(actor, datos):                                       // datos ya convertidos y validados por el DTO
  si no datos.confirmarRepetido:
    repetido = buscarRepetido(datos, exceptoId = ninguno)
    si repetido: 409 FALLO_REPETIDO con el mensaje y el fallo          // RF-18
  transacción:
    ids = resolverPalabras(manager, datos.palabrasClave)
    fallo = insertar { ...datos, numeroBusqueda, activo: true, creadoPorId: actor.id, creadoEn: ahora }
    insertar las filas de fallo_palabras_clave
  devolver toFalloDetalle(fallo)
```

### Aviso de repetido [RF-18, RF-31]
```
buscarRepetido(datos, exceptoId):
  base = fallos activos con id ≠ exceptoId, ordenados como el listado (RF-21), LIMIT 1
  si datos.numero no es NULL:
    f = base AND tribunal = :tribunal AND numero = :numero
    si f: devolver { fallo: f, porNumero: true }
  f = base AND caratula = :caratula AND tribunal = :tribunal AND fecha = :fecha     // tengan o no número
  si f: devolver { fallo: f, porNumero: false }
  devolver null
```
- La igualdad usa la intercalación de la base (ver "Comparación flexible"). El número se compara tal como se escribió, sin quitar separadores, como en la spec 002.
- Muestra uno solo, el primero según el orden del listado [RF-18].
- En `PATCH`, se controla solo si cambia la carátula, el tribunal, el número o la fecha respecto de lo guardado. En la reactivación se controla siempre. El fallo nunca se compara consigo mismo (`exceptoId`).
- No hay índice único: es un aviso, y la spec acepta que dos cargas simultáneas dejen un repetido.

### Bloqueo del fallo [RF-17, RF-30 a RF-32, casos de concurrencia]
`PATCH`, desactivar y reactivar corren en una transacción que empieza con `SELECT … FROM fallos WHERE id = :id FOR UPDATE` (404 si no existe). Así una desactivación y una modificación simultáneas se ejecutan de a una: si la desactivación queda primero, la modificación ve `activo = false` y responde 409 [RF-30]. Dos modificaciones simultáneas se ordenan y gana la última, como en las specs anteriores.

### Modificación [RF-12, RF-17, RF-18, RF-30]
```
modificar(actor, id, cambios):
  transacción:
    fallo = bloquear(id)
    si no fallo.activo: 409 "El fallo está desactivado. Reactivalo para modificarlo"   // RF-30
    despues = fallo con los cambios aplicados (número y enlace vacíos → NULL)
    si cambió carátula, tribunal, número o fecha y no cambios.confirmarRepetido:
      repetido = buscarRepetido(despues, exceptoId = id); si hay: 409 FALLO_REPETIDO
    cambioPalabras = cambios.palabrasClave enviado y distinto (por clave o por texto) de las actuales
    si no cambió ningún dato ni cambioPalabras: devolver el detalle sin registrar nada
    si cambioPalabras: ids = resolverPalabras(...); reemplazar las filas de fallo_palabras_clave
    guardar despues con numeroBusqueda, modificadoPorId = actor.id, modificadoEn = ahora            // RF-2
```
La pregunta de repetido se responde dentro de la transacción, antes de escribir nada, así que un 409 no deja cambios ni palabras nuevas en el catálogo.

### Desactivación y reactivación [RF-29 a RF-32]
```
desactivar(actor, id):
  fallo = bloquear(id); si no fallo.activo: 409 "El fallo ya está desactivado"
  activo = false; modificadoPor/En

reactivar(actor, id, confirmado):
  fallo = bloquear(id); si fallo.activo: 409 "El fallo ya está activo"
  si no confirmado: repetido = buscarRepetido(fallo, exceptoId = id); si hay: 409 FALLO_REPETIDO   // RF-31
  activo = true; modificadoPor/En
```
Las palabras clave del fallo no se tocan: dejan de contar para las sugerencias de la carga porque la consulta solo cuenta fallos activos [RF-30].

### Listado y búsqueda [RF-21 a RF-28]
```
WHERE [f.activo = 1]                                         sin incluirDesactivados
  [AND f.fuero = :fuero]
  [AND f.fecha >= :desde] [AND f.fecha <= :hasta]
  [AND f.id IN (SELECT falloId FROM fallo_palabras_clave
                WHERE palabraClaveId IN (:ids)
                GROUP BY falloId HAVING COUNT(*) = :cantidadIds)]          // todas (RF-25)
  [AND (f.caratula LIKE :t OR f.tribunal LIKE :t OR f.numero LIKE :t OR f.sumario LIKE :t
        OR (:n <> '' AND f.numeroBusqueda LIKE :n)
        OR EXISTS (SELECT 1 FROM fallo_palabras_clave fpc
                   JOIN palabras_clave pc ON pc.id = fpc.palabraClaveId
                   WHERE fpc.falloId = f.id AND pc.texto LIKE :t))]
ORDER BY f.fecha DESC, f.creadoEn DESC, f.id DESC
LIMIT 21 OFFSET (pagina - 1) * 20
```
- `:t` es `%texto%` con los comodines escapados: `%` y `_` se buscan como texto [RF-24]. `:n` es el número para búsqueda del texto, con `toSearchableCaseNumber` de la spec 002 [RF-23].
- Se piden 21 filas: si llega la fila 21, `haySiguiente` es `true` y se descarta. No se calcula el total: la spec no lo pide, y un `COUNT` con la búsqueda por fragmento recorrería todo de nuevo (RNF de rendimiento).
- El orden termina en `id`, que es único, así que con los mismos datos siempre es el mismo [RF-21].
- Se usan `IN` y `EXISTS` y no `JOIN`, para no repetir fallos y que `LIMIT`/`OFFSET` paginen bien.
- Si la página llega vacía, `hayFallos = EXISTS (SELECT 1 FROM fallos [WHERE activo = 1])`. La interfaz decide el mensaje con eso y con la página pedida [RF-27, RF-28].
- Las palabras clave de la página se cargan en una segunda consulta por los 20 ids, ordenadas por texto.
- **Fechas del filtro** [RF-26]: el DTO valida cada una con `isExistingDate` de la spec 003 ("La fecha no es válida") y con `isFalloDateInRange` (mensajes de RF-8), y después desde ≤ hasta, como `ListMovimientosQueryDto`.
- **Rendimiento:** con `activo` y el orden resueltos por `IDX_fallos_listado`, el peor caso es la búsqueda por fragmento sobre todos los fallos: 10.000 sumarios de hasta 5.000 caracteres son unos 50 MB. Un e2e lo mide contra los 2 segundos del RNF. Si no alcanzara, se evaluaría un índice `FULLTEXT` con el analizador `ngram`, que no requiere dependencias, en una spec o un cambio aparte (ver "Otras decisiones técnicas").

### Respuestas
`fallo-detalle.ts` arma `FalloResumen`, `FalloDetalle`, `PalabraClave` y `PalabraClaveSugerencia` campo por campo, nunca a partir de la entidad completa. Así no salen emails ni hashes al unir con `usuarios`, ni la columna `clave` del catálogo.

## Registros del servidor [RNF de registros]
- El filtro global `NoDataExceptionFilter` de la spec 003 ya cubre estos endpoints: ante un error inesperado registra solo el método, el patrón de la ruta, la clase y el código del error, nunca el cuerpo, la URL real ni el query string (donde viajan `buscar` y los filtros).
- `opciones-base-de-datos.ts` sigue sin `logging`.
- Los mensajes de 400 se arman sin interpolar el valor recibido.
- El código nuevo no escribe en los registros: ningún `Logger` ni `console` en `jurisprudencia/`.
- **Aviso para el despliegue:** el proxy de Easypanel (Traefik) no debe tener activado el registro de accesos con la URL completa, porque llevaría `buscar` en el query string. Este plan no toca la configuración del VPS; queda como verificación del despliegue.

## Textos seguros [RNF de textos seguros]
- Los textos se muestran con `TextoLiteral` (spec 003): el sumario con sus saltos de línea, y la carátula, el tribunal, el número, las palabras clave y la dirección del enlace como texto literal. La regla de ESLint contra `dangerouslySetInnerHTML` ya cubre todo `web/src`.
- `EnlaceFuente` solo arma un `<a>` si `linkViolation(enlace)` es `null`. Si no, muestra la dirección como texto. Es una segunda barrera: la API ya rechaza esos enlaces.
- El `<a>` lleva `target="_blank"`, `rel="noopener noreferrer"` y `referrerPolicy="no-referrer"`: el sitio de destino no recibe la dirección del panel ni puede controlar su pestaña [RF-19].

## Sesión mientras se escribe [RF-20]
La sesión de un integrante vence tras 1 hora sin consultas al servidor, y el guard la extiende en cada consulta autenticada (plan 004, "Sesión por rol"). Escribir en un formulario no consulta al servidor. Por eso:
```
servicios/mantener-sesion.ts:
  KEEP_ALIVE_INTERVAL_MS = 5 * 60_000
  createSessionKeepAlive(ping, ahora = Date.now):
    ultimo = ahora() al crear
    notifyTyping(): si ahora() - ultimo >= KEEP_ALIVE_INTERVAL_MS: ultimo = ahora(); ping()
```
- `FormularioFallo` llama a `notifyTyping()` en cada cambio de un campo. `ping` es `sessionService.fetchOwnUser()` (`GET /api/sesion/usuario`), que el guard cuenta como uso.
- Si el integrante deja de escribir, no hay más consultas y la sesión vence a la hora, como siempre. Lo no guardado se pierde, porque no se guarda en el navegador [RF-20, RNF de persistencia].
- Si la consulta encuentra la sesión vencida, `ProveedorSesion` vacía el usuario como ante cualquier 401 (spec 001).
- Se compara con la hora y no se usa un temporizador, como en `servicios/inactividad.ts`.

## Frontend

### Rutas
| Ruta | Página | Acceso |
|---|---|---|
| `/panel/jurisprudencia` | `PanelJurisprudencia`: buscador, filtros, "Mostrar desactivados", lista y paginado. | admin, abogado |
| `/panel/jurisprudencia/nuevo` | `PanelFalloNuevo`: formulario de carga. | admin, abogado |
| `/panel/jurisprudencia/:id` | `PanelFalloDetalle`: datos, enlace con su dominio, autoría, editar, desactivar y reactivar. | admin, abogado |

Las rutas quedan dentro de `DisenoPanel`, así que `RutaProtegida` aplica las reglas de la spec 001: un cliente va al portal, un visitante a `/ingresar` y una cuenta con cambio pendiente a `/cambiar-contrasena` [RF-34]. El buscador, los filtros y la página viven en el estado de `PanelJurisprudencia`, como en `PanelCausas`, y no en `localStorage` (principio 5). Cambiar un filtro o el buscador vuelve a la página 1.

### Comportamiento de la interfaz
- **Listado** (`PanelJurisprudencia`, `FilaFallo`) [RF-21, RF-22, RF-27, RF-28]:
  - Cada fila muestra la fecha (`formatMovementDate`), el tribunal, la carátula con enlace al detalle, el fuero (`fueroLabel`), el número si lo tiene, las palabras clave y el sumario con `truncateClientText` de la spec 004 (300 caracteres), "Ver más" y "Ver menos". Los desactivados llevan la etiqueta "Desactivado".
  - Paginado con "Anterior" y "Siguiente" según `pagina` y `haySiguiente`.
  - `emptyListMessage({ hayFallos, pagina })`: con `hayFallos` en `false`, "Todavía no hay fallos cargados"; con resultados vacíos en la página 1, "No hay fallos que coincidan con la búsqueda"; en otra página, ningún mensaje y el botón "Volver a la primera página".
- **Filtros** (`FiltrosJurisprudencia`) [RF-25, RF-26]: buscador, `SelectorPalabrasClave` en modo filtro, fuero, desde, hasta y "Mostrar desactivados". `validateRulingFilters` controla las fechas y el texto del buscador antes de pedir, con los mismos mensajes que la API.
- **Palabras clave** (`SelectorPalabrasClave`) [RF-12 a RF-14]:
  - Muestra las elegidas como etiquetas con "×" para quitarlas.
  - Con 2 o más caracteres escritos, pide sugerencias después de 300 ms sin escribir, y muestra cada una con su cantidad de fallos ("daño moral (12)").
  - Enter o coma agrega lo escrito. Si ya hay una igual por `flexibleKey`, no la repite.
  - En modo filtro solo se pueden elegir sugerencias, porque el filtro envía ids.
- **Formulario** (`FormularioFallo`) [RF-1, RF-3 a RF-8, RF-14, RF-17, RF-20]:
  - Campos: carátula, tribunal, fuero, fecha (`input type="date"` con `min` 1800-01-01 y `max` el día actual de Buenos Aires), número, sumario (área de texto con contador sobre 5.000, contado después de convertir), palabras clave y enlace.
  - `validateRulingForm` aplica `convertText` y valida con los mismos mensajes que la API. La interfaz no muestra el texto convertido hasta guardar: lo guardado vuelve en la respuesta y la ficha lo muestra [RF-3].
  - La edición envía solo lo que cambió. Las palabras clave se envían solo si cambió la lista o la forma de alguna.
- **Pregunta de repetido** (RF-18, RF-31): `pendingQuestion` reconoce `FALLO_REPETIDO`. `PreguntaConfirmacion` muestra el mensaje, la carátula, el tribunal, la fecha y el número del fallo con el que coincide, con enlace a ese fallo, y las opciones "Guardar igual" o "Cancelar". "Guardar igual" repite la petición con `confirmarRepetido: true`.
- **Detalle** (`PanelFalloDetalle`, `EnlaceFuente`) [RF-19, RF-29 a RF-32]:
  - Datos, palabras clave, sumario completo con `TextoLiteral`, y la autoría con `authorName` de la spec 003 ("(desactivado)" si corresponde).
  - El enlace se muestra como "Fuente: <dirección>", con el dominio destacado al lado ("csjn.gov.ar").
  - Un fallo desactivado muestra la etiqueta "Desactivado" y solo la acción "Reactivar". El control real lo hace la API.

## Dependencias nuevas

Ninguna. Todo se resuelve con lo instalado en las specs 001 a 004.

## Otras decisiones técnicas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Catálogo de palabras clave en tabla propia con columna `clave` única | Palabras clave como texto en la fila del fallo | RF-12 cambia la forma en todos los fallos a la vez, y las sugerencias cuentan fallos por palabra. Con una tabla, las dos cosas son una fila y una consulta. |
| `clave` calculada en TypeScript con intercalación binaria | Índice único sobre `texto` con `utf8mb4_unicode_ci` | La regla queda en una función pura, testeable y repetida en la interfaz, como `numeroExpedienteBusqueda` en la spec 002. La intercalación iguala además otros caracteres (por ejemplo, `ß` con `ss`) que la spec no menciona. |
| `INSERT … ON DUPLICATE KEY UPDATE` para el catálogo | Buscar y después insertar | Con dos guardados simultáneos, el segundo `INSERT` fallaría por el índice único. La forma atómica resuelve RF-12 y la concurrencia en una sola sentencia. |
| La forma solo cambia si el texto enviado es distinto | Un dato extra que indique si se eligió una sugerencia | La interfaz envía el texto exacto de la sugerencia, así que elegirla nunca cambia la forma. Un dato extra sería una regla más que mantener. |
| Comparación de carátula, tribunal y número con la intercalación de la base | Columnas normalizadas como `clave` | Es la misma comparación flexible de RF-9 y ya la usan las specs 002 y 003. Esas comparaciones no necesitan índice único. |
| Aviso de repetido sin índice único | Columna generada con índice único, como el expediente de la spec 002 | Es un aviso que se puede confirmar. La spec acepta que dos cargas simultáneas dejen un repetido. |
| Conversiones de RF-3 en el `@Transform` del DTO | Convertir en el service | El DTO ya normaliza en las specs 002 y 003. Así las reglas de largo y caracteres validan siempre el texto convertido. |
| Reutilizar las expresiones de caracteres de las specs 002 y 003 | Expresiones propias de la jurisprudencia | La spec remite a esas reglas. Una sola definición evita que diverjan, y las de causas y movimientos no cambian. |
| Enlace validado con expresiones, sin `new URL()` | `new URL()` y revisar sus partes | `new URL()` normaliza (pasa a minúsculas, codifica, acepta `@` y puertos), y la spec exige rechazar esas formas tal como se escribieron. |
| Paginado con `haySiguiente` pidiendo una fila de más | `total`, como en los listados de causas y movimientos | La spec no pide totales, y un `COUNT` repetiría la búsqueda por fragmento sobre hasta 50 MB de sumarios (RNF de rendimiento). |
| `hayFallos` solo con la página vacía | Calcularlo siempre | Solo hace falta para elegir el mensaje de RF-27. Ahorra una consulta en el caso común. |
| Búsqueda con `LIKE` e intercalación `unicode_ci` | Índice `FULLTEXT` | `FULLTEXT` no busca fragmentos dentro de palabras ("ere" en "Pérez", RF-23). Con 10.000 fallos, `LIKE` debería entrar en los 2 segundos; el e2e de rendimiento lo confirma. |
| Sumario completo en el listado | Recortarlo en la API y pedir el detalle para verlo | "Ver más" no necesita otra petición, como en la spec 004. Unos 100 KB por página como máximo. |
| `varchar(5000)` para el sumario | `TEXT` | El largo máximo queda también en el esquema, como en la spec 003. |
| Consulta periódica mientras se escribe, cada 5 minutos | Alargar la sesión de los integrantes, o un temporizador que consulte siempre | Mantiene la regla de la hora sin uso de la spec 001 y solo extiende la sesión mientras hay escritura real (RF-20). Un temporizador mantendría viva una pestaña abandonada. |
| `JurisprudenciaModule` sin exports | Exportar el service para usos futuros | RF-36: ningún otro módulo, en particular el portal, puede llegar a la jurisprudencia sin un cambio explícito y revisado. |
| Pregunta con el `QuestionException` de la spec 002 | Una excepción propia | Mismo formato de 409 con `codigo`, y la interfaz ya sabe mostrarlo con `PreguntaConfirmacion`. |
| Búsqueda por `GET` con query string | `POST` con la búsqueda en el cuerpo | Sigue el patrón de los listados existentes. El filtro de errores no registra el query string; el registro de accesos del proxy queda como verificación del despliegue (ver "Registros del servidor"). |

## Estrategia de tests

### api — unitarios (Vitest)
- `validadores/texto-fallo.ts` [RF-3 a RF-5]:
  - Cada conversión de la tabla, uno por uno, y su orden: `§§` antes que `§`, "§3" → "párr. 3", "§ 3" sin doble espacio.
  - Invisibles eliminados, U+2028 y U+2029 a `\n`, `\r\n` a `\n`.
  - Una línea: `\n` a espacio. Multilínea: conserva saltos y líneas en blanco, y reduce espacios solo dentro de cada línea.
  - Espacios repetidos y extremos.
  - Largo contado después de convertir: un sumario de 4.999 caracteres con "…" queda en 5.001.
  - Después de convertir, la validación rechaza `< > { } \ | =`, el acento grave y los emojis, y ningún texto aceptado contiene corchetes.
- `validadores/enlace.ts` [RF-6]:
  - Acepta `https://sjconsulta.csjn.gov.ar/sjconsulta/documentos/verDocumentoById.html?idDocumento=7867721`, con `&`, `#` y `%C3%B1`.
  - Rechaza `http://`, `HTTPS://`, `javascript:`, `https://` solo, dominio sin punto, mayúsculas en el dominio, `@` (en el dominio y en la ruta), IP, puerto, `xn--`, partes con guion en un extremo, espacios, comillas simples y dobles, `< > { } [ ] | \ ^`, el acento grave, emojis, letras con tilde y más de 500 caracteres.
- `reglas-jurisprudencia.ts` [RF-7, RF-9, RF-14, RF-18]:
  - `flexibleKey`: mayúsculas, tildes, diéresis y ñ ("Daño Moral" = "dano moral" = "DANO MORAL", "año" = "ano", "pingüino" = "pinguino"), y "daño-moral" ≠ "daño moral".
  - `uniqueKeywords`: conserva la primera aparición.
  - `isFalloDateInRange`: 1799-12-31, 1800-01-01, el día actual y el siguiente, con el cambio de día a las 03:00 UTC.
  - `repeatedRulingMessage`.
- DTO [RF-1, RF-7, RF-8, RF-14, RF-17, RF-24 a RF-26]:
  - Obligatorios, largos y caracteres de cada campo, con un texto que lleva una marca que no aparece en el mensaje [RNF de registros].
  - Número y enlace vacíos a `NULL`.
  - Palabras clave: lista vacía, 11, una vacía después de convertir, de 51 caracteres, repetidas (cuentan una vez para el máximo).
  - `activo` en `PATCH` rechazado como campo desconocido.
  - Listado: búsqueda con `<`, de 101 caracteres y con solo espacios; ids de palabras clave inválidos o más de 10; fechas inexistentes, de 1790, futuras y desde > hasta.
  - Sugerencias: menos de 2 caracteres y `para` inválido.
- `fallo-detalle.ts` [RF-19, RF-35]: las respuestas tienen exactamente las claves de los tipos (sin `clave`, emails ni hashes) y marcan a los autores desactivados.

### api — e2e (Vitest + Supertest, base de tests)
Mismo esquema que en las specs anteriores: migraciones sobre la base de tests, tablas vaciadas al empezar cada suite, ejecución en serie.
- **Carga** [RF-1 a RF-8, RF-16]: completa, sin número ni enlace, con autoría. La fecha 1887-05-03 se lee igual que se guardó. Un sumario pegado con caracteres tipográficos se guarda convertido. Los rechazos de formato no repiten el texto recibido.
- **Palabras clave** [RF-10 a RF-15]:
  - Una palabra nueva se agrega. "Daño moral" sobre "dano moral" cambia la forma del catálogo, y otro fallo que la usa la muestra nueva sin cambiar su `modificadoEn`.
  - Enviar el texto exacto no cambia nada. Repetidas en un fallo se guardan una vez.
  - Una carga rechazada por validación o por la pregunta de repetido no agrega palabras al catálogo.
  - Dos cargas simultáneas con la misma palabra en formas distintas dejan una sola fila.
- **Sugerencias** [RF-13, RF-25]: "dano" encuentra "daño moral" con su cantidad; orden por cantidad y alfabético; hasta 10; las de fallos desactivados no aparecen en `carga` y sí en `filtro`, con cantidad 0.
- **Repetidos** [RF-18, RF-31]:
  - Mismo tribunal y número con otras mayúsculas, tildes o espacios: 409 `FALLO_REPETIDO` con el fallo; con confirmación, 201.
  - Números distintos con la misma carátula, tribunal y fecha: 409 con el segundo mensaje.
  - Mismo número en otro tribunal, o con otro separador: sin pregunta.
  - En `PATCH`: sin pregunta si no cambian esos datos; el fallo no se compara consigo mismo.
  - Contra un desactivado: sin pregunta. Al reactivarlo: pregunta.
  - Con varias coincidencias, devuelve la primera según el orden del listado.
- **Modificación** [RF-2, RF-17, RF-30]: cada dato, reemplazo de palabras clave, `PATCH` sin cambios que no actualiza `modificadoEn`, rechazo de `activo` y 409 sobre un desactivado.
- **Desactivación y reactivación** [RF-29 a RF-32]: auditoría, salida del listado normal, aparición con `incluirDesactivados`, y 409 al repetir cada acción.
- **Listado** [RF-21 a RF-28]:
  - Orden por fecha, por carga y por id con la misma fecha y el mismo `creadoEn`. Con 45 fallos, las tres páginas no repiten ni omiten ninguno, y `haySiguiente` es correcto en cada una.
  - Búsqueda por fragmento en cada campo y en las palabras clave, en mayúsculas, sin tildes y con "ano" para "año"; número con otro separador; "[...]" encuentra "(...)"; "50%" se busca literal.
  - Filtro por dos palabras clave (todas), fuero, rango de fechas y su combinación con el buscador.
  - `hayFallos` en `false` sin fallos o con todos desactivados (aunque haya búsqueda), y en `true` con fallos que no coinciden.
  - Página inexistente: `items` vacío.
- **Rendimiento** [RNF]: con 10.000 fallos de sumarios largos y palabras clave, insertados en bloque, el listado con buscador y filtros y las sugerencias responden en menos de 2 segundos.
- **Concurrencia** [RF-30]: una desactivación y una modificación simultáneas: si la desactivación queda primero, la modificación responde 409.
- **Integridad** [RF-33]: fallo inexistente e id no numérico, con 404 "No existe ese fallo".
- **Integrantes** [RF-35]: un autor desactivado sigue figurando, marcado como desactivado.
- **Acceso** [RF-34, RF-36]: un cliente recibe 403, un visitante 401 y una cuenta con cambio pendiente 403 en cada endpoint de `/api/panel/jurisprudencia`. Las respuestas del portal no tienen datos de jurisprudencia.
- **Reglas de las otras specs** [RNF de reglas propias]: crear una causa y un movimiento con comillas tipográficas sigue respondiendo 400.
- **Migración:** `up` sobre la base con las tablas de las specs 001 a 003, y `down` sin errores.

### Aislamiento en el código [RF-36]
Un test de Vitest en cada paquete lee los archivos fuente y falla si:
- En `api/`, algún archivo de `src/portal/` importa de `src/jurisprudencia/`, o `jurisprudencia.module.ts` declara `exports`.
- En `web/`, algún archivo del portal (`paginas/Portal*`, los componentes del portal y `servicios/portal.ts`) importa `servicios/jurisprudencia.ts`.

### web — Vitest
- `servicios/jurisprudencia.ts` con `fetch` simulado: rutas, métodos y armado del query string (ids de palabras clave separados por coma).
- `servicios/texto-fallo.ts` [RF-3 a RF-6, RF-9]: los mismos casos que los unitarios de la API, y `linkDomain`.
- `servicios/formulario-fallo.ts` [RF-1, RF-7, RF-8, RF-14, RF-17, RF-24 a RF-26]: validaciones con los mensajes de la API, contador después de convertir, cuerpo de alta, cuerpo de edición con solo lo que cambió, palabras repetidas y filtros.
- `servicios/presentacion-jurisprudencia.ts` [RF-27, RF-28]: `emptyListMessage` en cada caso.
- `servicios/mantener-sesion.ts` [RF-20]: no consulta antes de 5 minutos, consulta una vez al pasar, y no consulta sin escritura.
- `servicios/preguntas.ts`: `pendingQuestion` con `FALLO_REPETIDO`.
- `SelectorPalabrasClave` [RF-12 a RF-14]: sugerencias desde 2 caracteres con su cantidad, agregar con Enter o coma, sin repetidas, quitar, y en modo filtro solo sugerencias.
- `PanelJurisprudencia` con servicios simulados [RF-21 a RF-28]: filtros, buscador, vuelta a la página 1, paginado, "Ver más" y "Ver menos" a los 300 caracteres, etiqueta "Desactivado" y cada mensaje de vacío.
- `PanelFalloNuevo` y `FormularioFallo` [RF-16, RF-18, RF-20]: carga, la pregunta de repetido con "Guardar igual" y "Cancelar", y la consulta de sesión al escribir.
- `PanelFalloDetalle` y `EnlaceFuente` [RF-19, RF-29 a RF-32]: datos, dominio destacado, `<a>` con `target`, `rel` y `referrerPolicy`, un enlace inválido mostrado como texto, sin acciones de edición si está desactivado, y desactivar y reactivar.
- `DisenoPanel` muestra el enlace "Jurisprudencia", y las rutas nuevas no son accesibles para un cliente ni para un visitante [RF-34].
- Ninguna escritura en `localStorage` ni `sessionStorage` en el flujo de jurisprudencia [RNF de persistencia].

## Cobertura de RF

| RF | Dónde se implementa | Test |
|---|---|---|
| RF-1 | Entidad `Fallo`, DTO, `formulario-fallo.ts` | Unitarios de DTO, e2e de carga, Vitest |
| RF-2 | `modificadoPor/En` en cada escritura | e2e de carga, modificación y desactivación |
| RF-3 a RF-5 | `texto-fallo.ts` (api y web), expresiones de las specs 002 y 003 | Unitarios de api y web, e2e de carga |
| RF-6 | `enlace.ts`, `texto-fallo.ts` (web), `EnlaceFuente` | Unitarios de api y web, Vitest |
| RF-7, RF-8 | `isFalloDateInRange`, `isExistingDate`, DTO | Unitarios, e2e de carga |
| RF-9, RF-11 | `flexibleKey`, `palabras_clave.clave`, intercalación `unicode_ci` | Unitarios, e2e de palabras clave y listado |
| RF-10, RF-12 | `palabras-clave.service` (resolverPalabras) | e2e de palabras clave |
| RF-13 | `palabras-clave.service` (sugerencias), `SelectorPalabrasClave` | e2e de sugerencias, Vitest |
| RF-14 | `uniqueKeywords`, DTO, `formulario-fallo.ts` | Unitarios, Vitest |
| RF-15 | Sin código de borrado ni renombre; sugerencias solo de activos | e2e de sugerencias |
| RF-16 | `jurisprudencia.service` (crear) | e2e de carga, Vitest |
| RF-17 | `jurisprudencia.service` (modificar), DTO sin `activo` | e2e de modificación |
| RF-18 | `buscarRepetido`, `FALLO_REPETIDO`, `PreguntaConfirmacion` | e2e de repetidos, Vitest |
| RF-19 | `GET /:id`, `fallo-detalle.ts`, `PanelFalloDetalle`, `EnlaceFuente` | Unitario, Vitest |
| RF-20 | `mantener-sesion.ts`, `FormularioFallo`, guard de la spec 004 | Vitest |
| RF-21, RF-22 | `jurisprudencia.service` (listar), `FilaFallo`, `truncateClientText` | e2e de listado, Vitest |
| RF-23, RF-24 | Búsqueda con `LIKE`, `numeroBusqueda`, DTO del listado | Unitarios de DTO, e2e de listado |
| RF-25, RF-26 | Filtros del listado, `FiltrosJurisprudencia` | e2e de listado, Vitest |
| RF-27, RF-28 | `hayFallos`, `emptyListMessage` | e2e de listado, Vitest |
| RF-29 a RF-32 | `jurisprudencia.service` (desactivar y reactivar), bloqueo del fallo | e2e de desactivación y concurrencia, Vitest |
| RF-33 | `ParseIntPipe` con 404 | e2e de integridad |
| RF-34 | `@Roles('admin', 'abogado')` y guards de la spec 001 | e2e de acceso, Vitest |
| RF-35 | `AutorResumen.activo` | e2e de integrantes, unitario |
| RF-36 | Módulo sin exports, portal sin imports de jurisprudencia | Tests de aislamiento en el código, e2e de acceso |
| RNF de registros | Filtro global de la spec 003, mensajes sin valores, sin `Logger` | Unitarios de DTO, e2e de carga |
| RNF de textos seguros | RF-3 a RF-6, `TextoLiteral`, `EnlaceFuente`, regla de ESLint | Unitarios, Vitest, `pnpm lint` |
| RNF de reglas propias | Expresiones de las specs 002 y 003 sin cambios | e2e de reglas de las otras specs |
| RNF de rendimiento | `IDX_fallos_listado`, `haySiguiente` sin `COUNT` | e2e de rendimiento |
| RNF de fechas | `dateStrings`, `todayInBuenosAires`, `formatMovementDate` | Unitarios, e2e de carga |
