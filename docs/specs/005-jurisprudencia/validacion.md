# Validación 005 — Jurisprudencia

Recorrido de `spec.md` requisito por requisito (tarea T32). Corrida del 2026-10-10, después de T31: `pnpm test` y `pnpm lint` sin errores.

| Paquete | Suite | Archivos | Tests |
|---|---|---|---|
| api | Unitarios (Vitest) | 40 | 953 |
| api | e2e contra la base de tests (Vitest + Supertest) | 61 | 636 |
| web | Vitest + Testing Library | 65 | 980 |
| | **Total** | **166** | **2569** |

Las cifras incluyen los tests de las specs 001 a 004, que siguen en verde. De esta spec son 256 unitarios, 152 e2e y 339 de la web.

Rutas abreviadas:
- **U**: tests unitarios de `api/src/jurisprudencia/...`, salvo que se indique otra carpeta.
- **E**: tests e2e de `api/test/...`.
- **W**: tests de `web/src/...`.

## Requisitos funcionales

| RF | Qué se verifica | Tests | Resultado |
|---|---|---|---|
| RF-1 | Datos del fallo, con sus largos y cuáles son obligatorios | U `entidades.spec.ts`, `dto/dto.spec.ts`; E `carga-fallos`, `migracion-jurisprudencia`; W `formulario-fallo.test.ts`, `PanelFalloNuevo.test.tsx` | ✅ |
| RF-2 | Quién cargó y quién modificó por última vez; datos, palabras clave, desactivación y reactivación cuentan como modificación | E `carga-fallos`, `modificacion-fallos` (incluido un `PATCH` sin cambios, que no cuenta), `desactivacion-fallos`; W `PanelFalloDetalle.test.tsx` | ✅ |
| RF-3 | Conversión de cada carácter tipográfico, invisibles, saltos de línea y espacios; largo contado después de convertir; nunca se guardan signos de inyección | U `validadores/texto-fallo.spec.ts` (cada conversión, una por una), `dto/dto.spec.ts`; E `carga-fallos`, `modificacion-fallos`, `acceso-jurisprudencia`; W `texto-fallo.test.ts` (los mismos casos que la API), `PanelFalloNuevo.test.tsx` | ✅ |
| RF-4 | Carátula, tribunal y número con los caracteres de la spec 002; número vacío sin informar | U `validadores/texto-fallo.spec.ts`, `dto/dto.spec.ts`; E `carga-fallos`; W `formulario-fallo.test.ts` | ✅ |
| RF-5 | Sumario con los caracteres de la spec 003, saltos de línea y líneas en blanco conservados | U `validadores/texto-fallo.spec.ts`, `dto/dto.spec.ts`; E `carga-fallos` (rechaza `<script>`), `consulta-fallos`; W `formulario-fallo.test.ts` | ✅ |
| RF-6 | Enlace: `https://` en minúsculas, dominio válido, sin IP, punycode, `@` ni puerto, sin signos de inyección, con `=` y `&` | U `validadores/enlace.spec.ts`, `dto/dto.spec.ts`; E `carga-fallos`, `modificacion-fallos`; W `texto-fallo.test.ts`, `formulario-fallo.test.ts`, `FilaFallo.test.tsx` (`EnlaceFuente`), `PanelFalloNuevo.test.tsx` | ✅ |
| RF-7 | Fecha desde el 01/01/1800 hasta el día actual en Buenos Aires | U `reglas-jurisprudencia.spec.ts` (límites y cambio de día a las 03:00 UTC), `dto/dto.spec.ts`; E `carga-fallos` (1887), `migracion-jurisprudencia`; W `formulario-fallo.test.ts` | ✅ |
| RF-8 | Mensajes por campo y regla, sin repetir el texto recibido | U `dto/dto.spec.ts` (cada mensaje, y una marca que no aparece en ninguno); E `carga-fallos`, `modificacion-fallos`, `listado-fallos`; W `formulario-fallo.test.ts` | ✅ |
| RF-9 | Comparación flexible: mayúsculas, tildes, diéresis y ñ | U `reglas-jurisprudencia.spec.ts`; E `carga-fallos` ("año" y "ano"), `repetidos-fallos`, `busqueda-fallos`, `sugerencias-palabras-clave`; W `texto-fallo.test.ts` | ✅ |
| RF-10 | Catálogo compartido; cada palabra hasta 50 caracteres permitidos | U `entidades.spec.ts`, `dto/dto.spec.ts`; E `carga-fallos`, `migracion-jurisprudencia` | ✅ |
| RF-11 | Dos palabras iguales por comparación flexible son la misma | U `reglas-jurisprudencia.spec.ts`; E `migracion-jurisprudencia` (índice único), `carga-fallos` | ✅ |
| RF-12 | Escribirla con otra forma cambia la forma en todos los fallos sin modificarlos; elegir una sugerencia no la cambia; no se agrega si el fallo no se guarda | E `carga-fallos` (incluidas dos cargas simultáneas), `repetidos-fallos`, `modificacion-fallos`; W `SelectorPalabrasClave.test.tsx`, `formulario-fallo.test.ts` | ✅ |
| RF-13 | Sugerencias desde 2 caracteres, hasta 10, solo de fallos activos, con su cantidad y en orden | U `dto/sugerencias.dto.spec.ts`; E `sugerencias-palabras-clave`; W `SelectorPalabrasClave.test.tsx`, `formulario-fallo.test.ts`, `presentacion-jurisprudencia.test.ts` | ✅ |
| RF-14 | Entre 1 y 10 palabras, sin vacías ni inválidas; una repetida se guarda una vez | U `reglas-jurisprudencia.spec.ts`, `dto/dto.spec.ts`; E `carga-fallos`, `modificacion-fallos`; W `formulario-fallo.test.ts`, `SelectorPalabrasClave.test.tsx` | ✅ |
| RF-15 | No se renombran, unen ni borran; la que ningún fallo activo usa deja de sugerirse y vuelve si se la usa de nuevo | E `sugerencias-palabras-clave` (desactivar y reactivar su único fallo; quitarla del fallo); no existe ningún endpoint que renombre, una o borre palabras | ✅ |
| RF-16 | Carga de un fallo activo con su autor | E `carga-fallos`; W `PanelFalloNuevo.test.tsx` | ✅ |
| RF-17 | Modificación de los datos y las palabras clave de un fallo activo; `activo` no se modifica | U `dto/dto.spec.ts`; E `modificacion-fallos`; W `formulario-fallo.test.ts`, `PanelFalloDetalle.test.tsx` | ✅ |
| RF-18 | Aviso de repetido al cargar, modificar y reactivar, con el fallo con el que coincide; no se compara consigo mismo | U `reglas-jurisprudencia.spec.ts`; E `repetidos-fallos`, `modificacion-fallos`, `desactivacion-fallos`; W `preguntas.test.ts`, `PanelFalloNuevo.test.tsx`, `PanelFalloDetalle.test.tsx` | ✅ |
| RF-19 | Ficha con datos, palabras clave, sumario completo, enlace con su dominio y autoría; el enlace abre en otra pestaña sin referrer | U `fallo-detalle.spec.ts`; E `consulta-fallos`; W `PanelFalloDetalle.test.tsx`, `FilaFallo.test.tsx` (`EnlaceFuente`) | ✅ |
| RF-20 | La escritura en el formulario cuenta como uso de la sesión | W `mantener-sesion.test.ts`, `PanelFalloNuevo.test.tsx`, `PanelFalloDetalle.test.tsx`, `SelectorPalabrasClave.test.tsx`, `jurisprudencia.test.ts`; E `sesion-por-rol` de la spec 004 (el mismo pedido corre el vencimiento de un abogado) | ✅ (ver Observaciones) |
| RF-21 | Listado de activos de a 20, por fecha, carga e id, sin repetir ni omitir entre páginas | E `listado-fallos` (45 fallos, 3 páginas); W `PanelJurisprudencia.test.tsx` | ✅ |
| RF-22 | Datos de cada fila y sumario recortado a 300 con "Ver más" y "Ver menos" | U `fallo-detalle.spec.ts`; E `listado-fallos`; W `FilaFallo.test.tsx`, `PanelJurisprudencia.test.tsx` | ✅ |
| RF-23 | Buscador por fragmento en carátula, tribunal, número (sin separadores), sumario y palabras clave | E `busqueda-fallos`, `carga-fallos` | ✅ |
| RF-24 | Texto del buscador convertido, con caracteres permitidos, hasta 100, vacío como si no existiera, `%` y `_` literales | U `dto/listar-fallos.dto.spec.ts`; E `busqueda-fallos`; W `formulario-fallo.test.ts`, `FiltrosJurisprudencia.test.tsx`, `PanelJurisprudencia.test.tsx` | ✅ |
| RF-25 | Filtros por palabras clave (todas), fuero, fechas y "Mostrar desactivados", combinados y sin cambiar el orden | U `dto/listar-fallos.dto.spec.ts`; E `listado-fallos`, `busqueda-fallos`, `sugerencias-palabras-clave`; W `FiltrosJurisprudencia.test.tsx`, `SelectorPalabrasClave.test.tsx`, `PanelJurisprudencia.test.tsx` | ✅ |
| RF-26 | Fechas del filtro: existentes, en el rango del fallo y desde no posterior a hasta | U `dto/listar-fallos.dto.spec.ts`; E `listado-fallos`; W `formulario-fallo.test.ts`, `FiltrosJurisprudencia.test.tsx` | ✅ |
| RF-27 | "Todavía no hay fallos cargados" con prioridad; "No hay fallos que coincidan con la búsqueda" | E `listado-fallos` (`hayFallos`), `busqueda-fallos`; W `presentacion-jurisprudencia.test.ts`, `PanelJurisprudencia.test.tsx` | ✅ |
| RF-28 | Página inexistente: sin fallos ni mensajes, y volver a la primera | E `listado-fallos`; W `presentacion-jurisprudencia.test.ts`, `PanelJurisprudencia.test.tsx` | ✅ |
| RF-29 | Desactivar marca, registra y saca del listado; nunca se borra | E `desactivacion-fallos`, `listado-fallos`; W `PanelFalloDetalle.test.tsx` | ✅ |
| RF-30 | Un fallo desactivado solo se consulta y reactiva; sus palabras no cuentan para las sugerencias | E `desactivacion-fallos` (también con una modificación simultánea), `modificacion-fallos`, `consulta-fallos`, `sugerencias-palabras-clave`; W `PanelFalloDetalle.test.tsx` | ✅ |
| RF-31 | Reactivar, con el aviso de repetido | U `dto/sugerencias.dto.spec.ts`; E `desactivacion-fallos`; W `PanelFalloDetalle.test.tsx` | ✅ |
| RF-32 | "El fallo ya está desactivado" y "El fallo ya está activo" | E `desactivacion-fallos`; W `PanelFalloDetalle.test.tsx` | ✅ |
| RF-33 | "No existe ese fallo" con un id inexistente o mal formado | E `consulta-fallos`, `modificacion-fallos`, `desactivacion-fallos`; W `PanelFalloDetalle.test.tsx` | ✅ |
| RF-34 | Solo administradores y abogados, en el servidor; tampoco con cambio de contraseña pendiente | U `aislamiento.spec.ts`; E `acceso-jurisprudencia` (los 7 endpoints: 401 al visitante, 403 al cliente y a la cuenta con cambio pendiente); W `RutasJurisprudencia.test.tsx` | ✅ |
| RF-35 | La autoría de un integrante desactivado se conserva, marcada | U `fallo-detalle.spec.ts`; E `acceso-jurisprudencia`; W `PanelFalloDetalle.test.tsx` | ✅ |
| RF-36 | Ningún dato de jurisprudencia para quien no sea administrador o abogado | U `aislamiento.spec.ts` (el portal no importa jurisprudencia; el módulo no exporta nada); E `acceso-jurisprudencia` (las respuestas del portal y los 403 no llevan datos de fallos); W `aislamiento-jurisprudencia.test.ts`, `RutasJurisprudencia.test.tsx` | ✅ |

## Requisitos no funcionales

| RNF | Tests | Resultado |
|---|---|---|
| Validación en el servidor, con campos desconocidos rechazados; la interfaz aplica las mismas reglas | U `dto/*.spec.ts`; E `modificacion-fallos`; W `texto-fallo.test.ts` (los mismos casos que la API) | ✅ |
| Reglas propias: las causas y los movimientos no cambian | E `acceso-jurisprudencia` (una causa y un movimiento con comillas tipográficas siguen respondiendo 400) | ✅ |
| Textos seguros | W `FilaFallo.test.tsx`, `PanelFalloDetalle.test.tsx` (el sumario con `<b>` se muestra literal; un enlace inválido, solo como texto); regla de ESLint contra `dangerouslySetInnerHTML` (`pnpm lint`) | ✅ |
| Registros del servidor sin datos de los fallos ni del buscador | U `dto/dto.spec.ts` y E `carga-fallos` (la marca no aparece en los errores), U `aislamiento.spec.ts` (sin `Logger` ni `console`); filtro global de errores de la spec 003, que no registra el cuerpo ni el query string | ✅ (falta verificar el proxy en producción) |
| Aislamiento | Ver RF-34 y RF-36 | ✅ |
| Persistencia: nada en el almacenamiento del navegador | W `PanelJurisprudencia.test.tsx`, `PanelFalloNuevo.test.tsx` | ✅ |
| Rendimiento: menos de 2 segundos con 10.000 fallos | E `rendimiento-fallos` (ver los tiempos debajo) | ✅ |
| Fechas en dd/mm/aaaa y hora de Buenos Aires | U `reglas-jurisprudencia.spec.ts`; E `migracion-jurisprudencia`, `carga-fallos`; W `formulario-fallo.test.ts` (`todayInBuenosAires`), `FilaFallo.test.tsx` | ✅ |
| Idioma: mensajes en español | Todos los tests verifican los textos exactos | ✅ |

**Tiempos de `rendimiento-fallos`** con 10.000 fallos de sumarios de unos 4.900 caracteres y tres palabras clave cada uno, contra la base de tests remota:

| Consulta | Tiempo |
|---|---|
| Primera página sin filtros | 317 ms |
| Página 400 | 219 ms |
| Búsqueda sin coincidencias (recorre todos los textos) | 684 ms |
| Búsqueda que coincide con todos los sumarios | 233 ms |
| Buscador con todos los filtros | 216 ms |
| Filtro por dos palabras clave | 196 ms |
| Sugerencias para la carga y para el filtro (las dos) | 430 ms |

## Verificaciones adicionales

- **Ningún endpoint de jurisprudencia responde a un cliente ni a un visitante:** los 7 endpoints de `/api/panel/jurisprudencia` responden 401 sin sesión y 403 a un cliente y a un integrante con cambio de contraseña pendiente. Ningún intento rechazado modificó ni cargó nada (E `acceso-jurisprudencia`).
- **Ninguna respuesta incluye datos que no corresponden:** las respuestas se arman campo por campo, y los tests comparan sus claves exactas: sin emails, hashes, la clave del catálogo ni el número para búsqueda (U `fallo-detalle.spec.ts`; E `consulta-fallos`).
- **Migración:** `up` sobre la base de tests con las tablas de las specs 001 a 003, esquema igual a las entidades y `down` sin tocar las tablas anteriores (E `migracion-jurisprudencia`). No se corrió sobre desarrollo ni sobre producción.

## Observaciones

- **Alcance de RF-20:** los tests de la web verifican que escribir dispara la consulta como mucho una vez cada 5 minutos, y un e2e de la spec 004 verifica que esa misma consulta corre el vencimiento de la sesión de un abogado. No hay un test que deje pasar una hora real: eso queda para la demo manual.
- **Desvíos del plan y de las tareas:**
  - La consulta que mantiene la sesión sale de `keepSessionAlive`, en el servicio de jurisprudencia de la web, y no del servicio de sesión, para no modificar `ProveedorSesion`. Pide lo mismo (`GET /api/sesion/usuario`). El plan quedó actualizado en T24.
  - T5 también modificó `migracion-movimientos.e2e-spec.ts`, que revertía solo la última migración. Ahora revierte primero las posteriores, como ya lo hacía el de causas.
  - T15: en las sugerencias, `%` responde 400, porque una palabra clave no puede tenerlo. Como texto literal se prueba en el buscador del listado (T17). El "Hecho cuando" de T15 quedó corregido.
  - T25 sumó a `formulario-fallo.ts` dos funciones para el selector (`keywordSearchText` y `withoutChosen`), para que la lógica quede en `servicios/`.
  - T28 renombró la lista de palabras clave de cada fila a "Palabras clave del fallo", para no confundirla con el campo del filtro.
  - T30 pide confirmación antes de desactivar un fallo, como al anular un movimiento. La spec no lo exige.
  - T32 sumó dos tests a `sugerencias-palabras-clave.e2e-spec.ts`, para cubrir de forma directa el final de RF-15.
  - Desde T10, los commits se subieron por tandas de dos a cuatro tareas, después de cada corrida completa, porque la suite tarda unos 17 minutos contra la base de tests remota.
- **Fallos intermitentes:** una corrida completa de la web falló en `PortalInicio.test.tsx` (spec 004), con la máquina cargada. Pasó solo y en todas las corridas siguientes. Esta spec no lo toca.
- **Formato:** `api/src/causas/causas.controller.ts` (spec 002) figura como modificado en git solo por los finales de línea de su copia de trabajo. No tiene cambios de contenido.
- **Pendientes del despliegue** (la aplicación todavía no está desplegada):
  - Correr la migración `crear-fallos-y-palabras-clave` en producción.
  - Verificar que el proxy de Easypanel (Traefik) no registre las direcciones completas de los pedidos, porque llevan el texto buscado en el query string.

## Criterios de finalización

- [x] Todos los RF con al menos un test en verde.
- [x] Tests de acceso y aislamiento, de cada conversión y del largo, de las reglas del enlace, de los caracteres y las fechas, de la comparación flexible, del catálogo de palabras clave, de las sugerencias, del buscador y los filtros, del orden y la paginación, del recorte del sumario, de los avisos de repetido, de la sesión mientras se escribe, de la desactivación, de los mensajes de error sin datos y de las reglas de las causas y los movimientos.
- [x] `pnpm test` y `pnpm lint` sin errores.
- [ ] Demo manual (ver la guía siguiente): pendiente.

## Guía de la demo manual

Contra la base de **desarrollo**. Cada paso dice qué hacer y qué tenés que ver; si algo no coincide, anotá el número de paso.

### Preparación

1. Aplicar la migración en la base de desarrollo: `pnpm --filter api migration:run`.
2. Levantar todo con `pnpm dev` y abrir `http://localhost:5173/ingresar`.
3. Tener a mano un abogado, un administrador y un cliente con alguna causa.

### 1. Carga y conversiones (RF-1 a RF-8, RF-16)

1. Con el abogado, entrar a "Jurisprudencia" desde el menú del panel. Sin fallos, dice "Todavía no hay fallos cargados".
2. Cargar tres fallos de distintos fueros y fechas con "Nuevo fallo":
   - Uno sin número ni enlace.
   - Uno con fecha de 1887.
   - Uno con un sumario de varios párrafos pegado de una base jurídica, con comillas tipográficas, guiones largos, "§3" y una cita "[...]".
3. En la ficha del tercero, las comillas quedaron rectas, los guiones cortos, "§3" como "párr. 3" y "[...]" como "(...)", con los párrafos separados.
4. Probar que se rechazan, con su mensaje: una fecha de mañana, una de 1790 y un sumario con `<`.

### 2. Enlaces (RF-6, RF-19)

1. Se acepta un enlace de la Corte Suprema con parámetros, por ejemplo `https://sjconsulta.csjn.gov.ar/sjconsulta/documentos/verDocumentoById.html?idDocumento=7867721`.
2. Se rechazan: uno con `http://`, uno con `HTTPS://`, uno con `@` antes del dominio (`https://csjn.gov.ar@otro.com`), uno con una IP y uno con comillas.
3. En la ficha, el enlace muestra la dirección completa y, al lado, el dominio destacado. Al hacer clic se abre en otra pestaña.

### 3. Palabras clave (RF-10 a RF-15)

1. Cargar un fallo con la palabra clave "dano moral" (sin ñ).
2. Al cargar otro, escribir "dano": se sugiere "dano moral (1)". Con un solo carácter no sugiere nada.
3. En ese segundo fallo, escribir "Daño moral" y guardar. En la ficha del primero ahora dice "Daño moral", y no figura como modificado.
4. Escribir "DANO MORAL" cuando ya está elegida "Daño moral": no se agrega otra vez.

### 4. Repetidos (RF-18)

1. Cargar un fallo con el mismo tribunal y número que otro: pregunta "Ya existe un fallo con ese número en ese tribunal" y muestra el otro fallo, con un enlace que abre en otra pestaña.
2. "Cancelar" deja el formulario como estaba. "Guardar igual" lo guarda.
3. Cargar otro con la misma carátula, tribunal y fecha, pero distinto número: pregunta "Ya existe un fallo con esa carátula, tribunal y fecha".
4. Desactivar uno de los repetidos (ver el punto 7).

### 5. Búsqueda y filtros (RF-21 a RF-28)

1. Con el administrador, buscar:
   - Un fragmento de una carátula, en mayúsculas y sin tildes.
   - Un número con otro separador ("1234-2018" para "1234/2018").
   - Una palabra clave.
   - "[...]": encuentra el sumario que tenía esa cita.
2. Buscar `<script>`: muestra "La búsqueda tiene caracteres no permitidos" y no busca.
3. Filtrar por dos palabras clave: solo aparecen los fallos que tienen las dos.
4. Filtrar por fuero y por rango de fechas. Con desde posterior a hasta, muestra el error.
5. Los resultados salen siempre del fallo más reciente al más antiguo, con "Anterior" y "Siguiente" y sin totales.
6. Buscar algo que no existe: "No hay fallos que coincidan con la búsqueda".

### 6. Ficha y modificación (RF-2, RF-17, RF-19, RF-22)

1. En el listado, un sumario de más de 300 caracteres se recorta, con "Ver más" y "Ver menos".
2. Abrir un fallo: datos, palabras clave, sumario con sus párrafos, enlace con su dominio y "Cargado por …".
3. Con el administrador, "Editar", cambiar el tribunal y guardar: la ficha muestra "Modificado por última vez por …" con el administrador.

### 7. Desactivación (RF-29 a RF-32)

1. "Desactivar" un fallo y confirmar: muestra "Desactivado" y solo ofrece "Reactivar".
2. En el listado ya no aparece. Con "Mostrar desactivados" aparece, con la etiqueta.
3. Una palabra clave que solo usaba ese fallo ya no se sugiere al cargar otro, pero sí en el filtro del listado.
4. "Reactivar": vuelve al listado y se puede editar.

### 8. Sesión mientras se escribe (RF-20)

1. Abrir "Nuevo fallo" con las herramientas del navegador en la pestaña de red.
2. Escribir en el sumario, esperar 5 minutos y seguir escribiendo: aparece un pedido a `/api/sesion/usuario`. Mientras no pasen otros 5 minutos, no aparece otro.
3. Prueba larga, opcional: escribir de a ratos durante más de 1 hora y guardar; la sesión sigue abierta. Dejar otro formulario abierto más de 1 hora sin escribir: al guardar, lleva al ingreso.

### 9. Acceso (RF-34, RF-36)

1. Ingresar como cliente y escribir en la dirección `/panel/jurisprudencia`: lleva al portal.
2. El portal no muestra nada de jurisprudencia, ni en el menú ni en las causas.

## Veredicto

Los 36 RF tienen tests en verde, y `pnpm test` y `pnpm lint` pasan. La spec 005 queda **cumplida a falta de la demo manual**. Quedan además las verificaciones de "Pendientes del despliegue", que se hacen al desplegar la aplicación.
