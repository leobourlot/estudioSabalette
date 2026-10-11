# Validación 006 — Modelos de escritos

Recorrido de `spec.md` requisito por requisito (tarea T39). Corrida del 2026-10-11, después de T38: `pnpm test` y `pnpm lint` sin errores.

| Paquete | Suite | Archivos | Tests |
|---|---|---|---|
| api | Unitarios (Vitest) | 49 | 1240 |
| api | e2e contra la base de tests (Vitest + Supertest) | 74 | 815 |
| web | Vitest + Testing Library | 83 | 1358 |
| | **Total** | **206** | **3413** |

Las cifras incluyen los tests de las specs 001 a 005, que siguen en verde. De esta spec son 183 unitarios, 138 e2e y 301 de la web en sus archivos propios, más los que se sumaron a `Disenos.test.tsx`, `preguntas.test.ts` y `PanelCausaDetalle.test.tsx`.

Rutas abreviadas:
- **U**: tests unitarios de `api/src/modelos-escritos/...`.
- **E**: tests e2e de `api/test/...`.
- **W**: tests de `web/src/...`.

## Requisitos funcionales

| RF | Qué se verifica | Tests | Resultado |
|---|---|---|---|
| RF-1 | Datos del modelo, con sus largos, sus listas cerradas y el fuero Otro por defecto | U `entidades.spec.ts`, `dto/dto.spec.ts`, `validadores/texto-modelo.spec.ts`; E `carga-modelos`, `migracion-modelos-escritos`; W `formulario-modelo.test.ts`, `FormularioModelo.test.tsx`, `presentacion-modelos.test.ts` | ✅ |
| RF-2 | Quién cargó y quién modificó por última vez; datos, desactivación y reactivación cuentan como modificación; completar no | U `entidades.spec.ts`; E `carga-modelos`, `modificacion-modelos`, `desactivacion-modelos`, `escrito-rechazos`; W `PanelModeloDetalle.test.tsx` | ✅ |
| RF-3 | Conversiones de la spec 005 en título, descripción y texto; espacios quitados al inicio y al final de cada línea; líneas en blanco conservadas; largo contado después de convertir | U `validadores/texto-modelo.spec.ts`, `dto/dto.spec.ts`; E `carga-modelos`; W `texto-modelo.test.ts` (los mismos casos que la API), `formulario-modelo.test.ts` | ✅ |
| RF-4 | Caracteres permitidos por campo; `@` solo en el texto y en el buscador; sin emojis ni signos de inyección | U `validadores/texto-modelo.spec.ts`, `dto/dto.spec.ts`; E `carga-modelos`, `acceso-modelos`, `tamano-cuerpo`; W `texto-modelo.test.ts` | ✅ |
| RF-5 | El texto es texto plano: solo quedan el texto y sus saltos de línea | U `validadores/texto-modelo.spec.ts`; E `carga-modelos`; W `texto-modelo.test.ts` | ✅ |
| RF-6 | Mensajes por campo y regla, sin repetir el texto recibido | U `dto/dto.spec.ts`; E `carga-modelos`; W `formulario-modelo.test.ts`, `FormularioModelo.test.tsx` | ✅ |
| RF-7 | Qué es una marca de variable; `#` suelto, `#123#` y `#____#` como texto común; marcas pegadas o con un numeral compartido rechazadas | U `variables.spec.ts` (incluido el tiempo con miles de letras), `dto/dto.spec.ts`; E `carga-modelos`; W `texto-modelo.variables.test.ts`, `formulario-modelo.test.ts`, `FormularioModelo.test.tsx` | ✅ |
| RF-8 | La marca se reconoce con la comparación flexible y se guarda con la forma del catálogo | U `variables.spec.ts`, `dto/dto.spec.ts`; E `carga-modelos`; W `texto-modelo.variables.test.ts`, `formulario-modelo.test.ts` | ✅ |
| RF-9 | Las 17 variables del catálogo, cada una con su dato y con su marca de dato faltante | U `variables.spec.ts`, `formato-escrito.spec.ts`, `completar-escrito.spec.ts`; E `escrito-completado`; W `texto-modelo.variables.test.ts` (el mismo catálogo que la API) | ✅ |
| RF-10 | Variable que no existe: "El texto tiene variables que no existen", sin nombrarla; el formulario señala cuál es | U `variables.spec.ts`, `dto/dto.spec.ts`; E `carga-modelos`; W `formulario-modelo.test.ts`, `FormularioModelo.test.tsx` | ✅ |
| RF-11 | Catálogo a la vista al cargar y al modificar, y variable insertada en la posición del cursor | W `FormularioModelo.test.tsx`, `texto-modelo.variables.test.ts` (`insertVariable`), `presentacion-modelos.test.ts` | ✅ |
| RF-12 | Modelo sin variables y modelo con la misma variable varias veces | U `variables.spec.ts`, `dto/dto.spec.ts`; E `carga-modelos`, `escrito-completado`; W `texto-modelo.variables.test.ts`, `formulario-modelo.test.ts` | ✅ |
| RF-13 | Carga de un modelo activo con su autor | U `entidades.spec.ts`; E `carga-modelos`; W `formulario-modelo.test.ts`, `PanelModeloNuevo.test.tsx` | ✅ |
| RF-14 | Modificación de un modelo activo; `activo` no se modifica; guardar sin cambios no cuenta | U `dto/dto.spec.ts`; E `modificacion-modelos`; W `formulario-modelo.test.ts`, `PanelModeloDetalle.test.tsx` | ✅ |
| RF-15 | Aviso de título repetido al cargar, modificar y reactivar, con todos los modelos con los que coincide; no se compara consigo mismo | U `entidades.spec.ts`, `modelo-detalle.spec.ts`; E `titulo-repetido-modelos`, `modificacion-modelos`, `desactivacion-modelos`; W `preguntas.test.ts`, `modelos-escritos.test.ts`, `PanelModeloNuevo.test.tsx`, `PanelModeloDetalle.test.tsx` | ✅ |
| RF-16 | Ficha con los datos, el texto completo con sus marcas, las variables que usa o la leyenda, y la autoría | U `modelo-detalle.spec.ts`, `variables.spec.ts`; E `consulta-modelos`; W `PanelModeloDetalle.test.tsx`, `presentacion-modelos.test.ts` | ✅ |
| RF-17 | La escritura en el formulario cuenta como uso de la sesión | W `sesionEnPantalla.test.tsx`, `FormularioModelo.test.tsx`, `PanelModeloNuevo.test.tsx`, `PanelModeloDetalle.test.tsx`, `modelos-escritos.test.ts`; E `sesion-por-rol` de la spec 004 (el mismo pedido corre el vencimiento de un abogado) | ✅ (ver Observaciones) |
| RF-18 | Listado de activos de a 20, por título con la comparación flexible y después el último registrado, sin repetir ni omitir entre páginas | U `entidades.spec.ts`, `dto/listar-modelos.dto.spec.ts`; E `listado-modelos`; W `ListaModelos.test.tsx`, `PanelModelos.test.tsx`, `modelos-escritos.test.ts` | ✅ |
| RF-19 | Cada fila con título, tipo, fuero y descripción; nunca el texto | U `modelo-detalle.spec.ts`; E `listado-modelos`; W `ListaModelos.test.tsx` | ✅ |
| RF-20 | Buscador por fragmento en título, descripción y texto, con la comparación flexible | E `busqueda-modelos`; W `ListaModelos.test.tsx` | ✅ |
| RF-21 | Texto del buscador convertido, con sus caracteres (incluido `@`), hasta 100, vacío como si no existiera, `%` y `_` literales | U `dto/listar-modelos.dto.spec.ts`, `validadores/texto-modelo.spec.ts`; E `busqueda-modelos`; W `texto-modelo.test.ts`, `formulario-modelo.test.ts` | ✅ |
| RF-22 | Filtros por tipo, por fuero (el elegido más Otro; con Otro, solo Otro) y "Mostrar desactivados", combinados y sin cambiar el orden | U `dto/listar-modelos.dto.spec.ts`; E `listado-modelos`, `busqueda-modelos`; W `formulario-modelo.test.ts`, `ListaModelos.test.tsx`, `PanelModelos.test.tsx` | ✅ |
| RF-23 | "Todavía no hay modelos cargados" con prioridad; "No hay modelos que coincidan con la búsqueda" | E `listado-modelos`, `busqueda-modelos`; W `presentacion-modelos.test.ts`, `ListaModelos.test.tsx` | ✅ |
| RF-24 | Página inexistente: sin modelos ni mensajes, y volver a la primera | E `listado-modelos`; W `presentacion-modelos.test.ts`, `ListaModelos.test.tsx`, `modelos-escritos.test.ts` | ✅ |
| RF-25 | Desactivar marca, registra, saca del listado y de las causas; nunca se borra | E `desactivacion-modelos`, `listado-modelos`; W `PanelModeloDetalle.test.tsx` | ✅ |
| RF-26 | Un modelo desactivado solo se consulta y reactiva; no se modifica ni se completa, con su mensaje | E `consulta-modelos`, `modificacion-modelos`, `desactivacion-modelos` (también con una modificación simultánea), `escrito-rechazos`; W `PanelModeloDetalle.test.tsx`, `PanelEscrito.test.tsx` | ✅ |
| RF-27 | Reactivar, con el aviso de título repetido | U `dto/listar-modelos.dto.spec.ts` (`ReactivateModeloDto`); E `desactivacion-modelos`; W `PanelModeloDetalle.test.tsx` | ✅ |
| RF-28 | "El modelo ya está desactivado" y "El modelo ya está activo" | E `desactivacion-modelos`; W `PanelModeloDetalle.test.tsx` | ✅ |
| RF-29 | "Completar un modelo" en una causa activa: todos los modelos activos, de cualquier fuero, sin filtros elegidos y sin desactivados | E `listado-modelos` (es el mismo listado); W `PanelCausaDetalle.test.tsx`, `PanelCausaModelos.test.tsx`, `ListaModelos.test.tsx` | ✅ |
| RF-30 | Un modelo solo se completa desde una causa | E `escrito-rechazos` (no hay otra ruta), `escrito-completado`; W `PanelCausaModelos.test.tsx`, `PanelModeloDetalle.test.tsx` (la ficha no ofrece completar), `modelos-escritos.test.ts` | ✅ |
| RF-31 | El escrito completado: cada marca reemplazada y el resto del texto igual | U `completar-escrito.spec.ts`; E `escrito-completado` | ✅ |
| RF-32 | Pantalla del escrito con la carátula, el título, los avisos y los dos accesos; la lista vuelve en la misma página, con la misma búsqueda y los mismos filtros | U `modelo-detalle.spec.ts`; W `PanelEscrito.test.tsx`, `PanelCausaModelos.test.tsx`, `ListaModelos.test.tsx`, `sesion-escrito.test.ts` | ✅ |
| RF-33 | Datos del momento, una sola pasada, dirección propia que completa de nuevo, y respuesta que solo trae el escrito, los avisos, la carátula y el título | U `completar-escrito.spec.ts`, `modelo-detalle.spec.ts` (claves exactas); E `escrito-completado`; W `PanelEscrito.test.tsx` | ✅ |
| RF-34 | Nombre y apellido, razón social, datos actuales de la cuenta y nunca la persona de contacto | U `formato-escrito.spec.ts`, `completar-escrito.spec.ts`; E `escrito-completado` | ✅ |
| RF-35 | DNI con puntos, CUIT con guiones, cero inicial conservado y nombre con su documento | U `formato-escrito.spec.ts`; E `escrito-completado` | ✅ |
| RF-36 | Orden y separadores con una, dos y tres personas, razones sociales, homónimos y solo partes vigentes | U `formato-escrito.spec.ts`, `completar-escrito.spec.ts`; E `escrito-completado` | ✅ |
| RF-37 | `#CLIENTES_DOMICILIO#` con uno, dos y tres clientes | U `completar-escrito.spec.ts` | ✅ |
| RF-38 | Ninguna variable usa movimientos, colaboradores, quien completa, el estado, ni email, teléfono o contacto | U `variables.spec.ts`; E `escrito-completado` (el escrito es el mismo para cualquier integrante); W `texto-modelo.variables.test.ts` | ✅ |
| RF-39 | Marca del dato faltante y aviso con cada dato una sola vez y de quién es | U `completar-escrito.spec.ts`; E `escrito-completado`; W `presentacion-modelos.test.ts`, `PanelEscrito.test.tsx` | ✅ |
| RF-40 | Avisos de clientes y de responsable desactivados, solo si el modelo usa esas variables | U `completar-escrito.spec.ts`; E `escrito-completado`; W `presentacion-modelos.test.ts`, `PanelEscrito.test.tsx` | ✅ |
| RF-41 | Causa desactivada: no ofrece la opción y rechaza con "La causa está desactivada" | E `escrito-rechazos` (y vuelve a completarse al reactivarla); W `PanelCausaDetalle.test.tsx`, `PanelCausaModelos.test.tsx`, `PanelEscrito.test.tsx` | ✅ |
| RF-42 | Causa Archivada o Finalizada: se completa como en cualquier otra | E `escrito-rechazos` (los cuatro estados) | ✅ |
| RF-43 | Completar no modifica la causa | U `aislamiento.spec.ts` (el service de escritos no escribe en la base); E `escrito-rechazos` | ✅ |
| RF-44 | "Copiar" copia solo el texto, con sus saltos de línea; "Escrito copiado"; leyenda siempre a la vista; "Cerrar sesión" vacía el portapapeles | W `portapapeles.test.ts`, `PanelEscrito.copiar.test.tsx`, `presentacion-modelos.test.ts`, `componentes/Disenos.test.tsx` | ✅ (ver Observaciones) |
| RF-45 | "No se pudo copiar. Seleccioná el texto y copialo a mano", con el texto a la vista | W `portapapeles.test.ts`, `PanelEscrito.copiar.test.tsx`, `PanelEscrito.test.tsx` | ✅ |
| RF-46 | Nada guardado: ni en la base, ni en el almacenamiento del navegador, ni en su caché; sin historial de escritos | U `aislamiento.spec.ts` (el controller de escritos solo tiene un `GET`); E `escrito-rechazos` (ninguna tabla gana filas; no hay tabla de escritos), `escrito-completado` (`Cache-Control: no-store`); W `PanelEscrito.copiar.test.tsx` | ✅ |
| RF-47 | La pantalla no ofrece descargar, imprimir, exportar, enviar ni modificar | W `PanelEscrito.test.tsx` | ✅ |
| RF-48 | El uso de la pantalla mantiene la sesión; sin uso, el escrito deja de mostrarse a la hora; tras otro cierre, en la siguiente consulta | W `sesionEnPantalla.test.tsx`, `PanelEscrito.copiar.test.tsx`, `sesion-escrito.test.ts`, `modelos-escritos.test.ts` | ✅ (ver Observaciones) |
| RF-49 | "No existe ese modelo" y "No existe esa causa", con un id inexistente o mal formado | E `consulta-modelos`, `modificacion-modelos`, `desactivacion-modelos`, `escrito-rechazos`; W `PanelModeloDetalle.test.tsx`, `PanelCausaModelos.test.tsx`, `PanelEscrito.test.tsx` | ✅ |
| RF-50 | Solo administradores y abogados, en el servidor; tampoco con cambio de contraseña pendiente | U `aislamiento.spec.ts`; E `acceso-modelos` (los 7 endpoints: 401 al visitante, 403 al cliente y a la cuenta con cambio pendiente); W `RutasModelos.test.tsx` | ✅ |
| RF-51 | La autoría de un integrante desactivado se conserva, marcada | U `modelo-detalle.spec.ts`; E `acceso-modelos`; W `PanelModeloDetalle.test.tsx` | ✅ |
| RF-52 | Ningún dato de modelos ni de escritos para quien no sea administrador o abogado | U `aislamiento.spec.ts` (el portal no importa modelos; el módulo no exporta nada); E `acceso-modelos` (las respuestas del portal y los 403 no llevan datos de modelos); W `aislamiento-modelos.test.ts`, `RutasModelos.test.tsx` | ✅ |
| RF-53 | Ningún dato de jurisprudencia en los modelos ni en los escritos | U `aislamiento.spec.ts` (de jurisprudencia solo se importan las conversiones de texto; ninguna variable de fallos); E `acceso-modelos`; W `aislamiento-modelos.test.ts` | ✅ |

## Requisitos no funcionales

| RNF | Tests | Resultado |
|---|---|---|
| Validación en el servidor, con campos desconocidos rechazados; la interfaz aplica las mismas reglas | U `dto/*.spec.ts`; E `modificacion-modelos`; W `texto-modelo.test.ts` y `texto-modelo.variables.test.ts` (los mismos casos que la API) | ✅ |
| Reglas de textos: las causas, los movimientos y la jurisprudencia no cambian | E `acceso-modelos` (una causa, un movimiento y un fallo con `@` siguen respondiendo 400, y el mismo texto se acepta en un modelo) | ✅ |
| Caracteres: `@` solo en el texto y en su buscador; ningún signo de inyección | U `validadores/texto-modelo.spec.ts`, `dto/dto.spec.ts`; E `carga-modelos`, `busqueda-modelos` | ✅ |
| Textos seguros | W `PanelModeloDetalle.test.tsx`, `PanelEscrito.test.tsx` (un texto con `<b>` se muestra literal); regla de ESLint contra `dangerouslySetInnerHTML` (`pnpm lint`) | ✅ |
| Registros del servidor sin datos de los modelos, de los escritos ni del buscador | U `dto/dto.spec.ts` y E `carga-modelos`, `tamano-cuerpo` (lo recibido no aparece en los errores), U `aislamiento.spec.ts` (sin `Logger` ni `console`); filtro global de errores de la spec 003, que no registra el cuerpo ni el query string | ✅ (falta verificar el proxy en producción) |
| Aislamiento | Ver RF-50 y RF-52 | ✅ |
| Persistencia: nada en el almacenamiento del navegador ni en su caché | W `PanelModelos.test.tsx`, `PanelModeloNuevo.test.tsx`, `PanelEscrito.copiar.test.tsx`; E `escrito-completado` (`no-store`) | ✅ |
| Rendimiento: menos de 2 segundos con 500 modelos de 50.000 caracteres, y al completar con 50 partes | E `rendimiento-modelos` (ver los tiempos debajo) | ✅ |
| Fechas en dd/mm/aaaa y hora de Buenos Aires | U `formato-escrito.spec.ts`, `completar-escrito.spec.ts` (cambio de día a las 03:00 UTC); E `escrito-completado` | ✅ |
| Idioma: mensajes en español | Todos los tests verifican los textos exactos | ✅ (ver Observaciones, cuerpo demasiado grande) |

**Tiempos de `rendimiento-modelos`** con 500 modelos de unos 49.900 caracteres, contra la base de tests remota. Son los tiempos de cada test, que incluyen el pedido completo:

| Consulta | Tiempo |
|---|---|
| Primera página sin filtros | 158 ms |
| Última página | 154 ms |
| Búsqueda sin coincidencias (recorre todos los textos) | 355 ms |
| Búsqueda que coincide con todos los textos | 158 ms |
| Búsqueda que coincide solo al final de un texto | 327 ms |
| Buscador con todos los filtros | 153 ms |
| Completar un modelo de 50.000 caracteres en una causa con 50 partes | 299 ms |

## Verificaciones adicionales

- **Ningún endpoint de modelos ni de escritos responde a un cliente ni a un visitante:** los 6 endpoints de `/api/panel/modelos-escritos` y el de `/api/panel/causas/:causaId/escritos/:modeloId` responden 401 sin sesión y 403 a un cliente y a un integrante con cambio de contraseña pendiente. Ningún intento rechazado modificó ni cargó nada (E `acceso-modelos`).
- **Ninguna respuesta incluye datos que no corresponden:** las respuestas se arman campo por campo, y los tests comparan sus claves exactas. La de un escrito completado solo trae el texto, los faltantes, los avisos, la carátula y el título del modelo (U `modelo-detalle.spec.ts`; E `escrito-completado`).
- **Completar no escribe nada:** después de completar, ninguna tabla de la base tiene más filas, la causa y el modelo conservan su última modificación, y no existe ninguna tabla para escritos (E `escrito-rechazos`).
- **Migración:** `up` sobre la base de tests con las tablas de las specs 001 a 005, esquema igual a las entidades y `down` sin tocar las tablas anteriores (E `migracion-modelos-escritos`). No se corrió sobre desarrollo ni sobre producción.

## Observaciones

- **Alcance de RF-17 y RF-48:** los tests de la web verifican que escribir en el formulario o usar la pantalla del escrito dispara la consulta como mucho una vez cada 5 minutos, y que pasada 1 hora sin pedidos el escrito deja de mostrarse (con el reloj simulado). Un e2e de la spec 004 verifica que esa misma consulta corre el vencimiento de la sesión de un abogado. No hay un test que deje pasar una hora real: eso queda para la demo manual.
- **Alcance de RF-44:** que "Cerrar sesión" vacía el portapapeles se verifica con el portapapeles simulado del navegador de pruebas. En un navegador real depende de su permiso para escribir el portapapeles; si no lo da, la sesión se cierra igual. Queda para la demo manual (paso 12).
- **Cuerpo demasiado grande:** un pedido de más de 512 KB responde 413 con el mensaje `request entity too large`, en inglés, que es el del intérprete del cuerpo. No repite nada de lo recibido. La interfaz nunca llega a ese caso con un modelo, porque avisa antes que el texto supera los 50.000 caracteres. Traducirlo exige modificar el filtro global de errores (`errores-sin-datos.filter.ts`), que no estaba entre los archivos aprobados para esta spec.
- **Desvíos del plan y de las tareas:**
  - El límite del cuerpo JSON de la API subió a 512 KB: con el límite por defecto, un texto de 50.000 caracteres de tres bytes daba 413 (E `tamano-cuerpo`).
  - La ficha de un modelo pide confirmación antes de desactivarlo, como en la jurisprudencia. La spec no lo exige.
  - Los commits no quedaron en el orden de las tareas: T23 a T26 (la web sin páginas) están antes de T7, y T7 después de T10. Cada commit corresponde a una sola tarea.
  - Desde T10, los commits se subieron por tandas, después de cada corrida completa, porque la suite tarda unos 23 minutos contra la base de tests remota.
- **Formato:** `api/src/causas/causas.controller.ts` (spec 002) figura como modificado en git solo por los finales de línea de su copia de trabajo. No tiene cambios de contenido.
- **Pendientes del despliegue** (la aplicación todavía no está desplegada):
  - Correr la migración `crear-modelos-escritos` en producción.
  - Verificar que el proxy de Easypanel (Traefik) no registre las direcciones completas de los pedidos, porque llevan el texto buscado en el query string. Es la misma verificación que dejó pendiente la spec 005.
  - Verificar que el proxy acepte cuerpos de hasta 512 KB, para que un modelo largo llegue a la API.

## Criterios de finalización

- [x] Todos los RF con al menos un test en verde.
- [x] Tests de acceso y aislamiento, de cada conversión y del largo, de `@`, de las marcas de variable, de cada variable del catálogo, del formato de nombres y documentos, del orden y los separadores, de la respuesta del escrito, de la vuelta a la lista, de la pasada única, de los avisos, de las fechas, de los rechazos, de que completar no guarda nada, del caché y el almacenamiento, de la sesión en la pantalla del escrito, de "Copiar" y la leyenda, del portapapeles al cerrar sesión, del orden y la paginación, del buscador y los filtros, del título repetido, de la sesión mientras se escribe, de la desactivación, de los mensajes de error sin datos y de las reglas de las otras specs.
- [x] `pnpm test` y `pnpm lint` sin errores.
- [ ] Demo manual (ver la guía siguiente): pendiente.

## Guía de la demo manual

Contra la base de **desarrollo**. Cada paso dice qué hacer y qué tenés que ver; si algo no coincide, anotá el número de paso.

### Preparación

1. Aplicar la migración en la base de desarrollo: `pnpm --filter api migration:run`.
2. Levantar todo con `pnpm dev` y abrir `http://localhost:5173/ingresar`.
3. Tener a mano un abogado, un administrador y dos clientes: uno con domicilio en su cuenta y otro sin domicilio.
4. Tener una causa civil sin número de expediente ni juzgado, con estas partes:
   - Dos actores, que son los dos clientes.
   - Un demandado persona jurídica, con CUIT.
   - Un demandado persona física, sin DNI.

### 1. Carga y conversiones (RF-1 a RF-6, RF-13)

1. Con el abogado, entrar a "Modelos" desde el menú del panel. Sin modelos, dice "Todavía no hay modelos cargados".
2. Con "Nuevo modelo", cargar una demanda pegando el texto desde un procesador de textos, con comillas tipográficas, guiones largos, sangría, negrita y una tabla.
3. En la ficha queda como texto plano: comillas rectas, guiones cortos, sin sangría ni negrita, y las celdas de la tabla separadas por un espacio. Las líneas en blanco entre párrafos se conservan.
4. Se acepta un email como texto fijo ("estudio@ejemplo.com"), y en la ficha se ve como texto, no como enlace.
5. Se rechazan, con su mensaje: un texto con `<`, uno con llaves y un título con `@`.

### 2. Variables (RF-7 a RF-12)

1. Al cargar o editar, el catálogo de variables está a la vista, con lo que pone cada una.
2. Escribir `#carátula#` a mano e insertar otras desde el catálogo: se insertan donde está el cursor. Al guardar, la ficha muestra `#CARATULA#` y la lista de variables que usa el modelo.
3. Escribir `#CARATUAL#`: se rechaza con "El texto tiene variables que no existen", y el formulario señala cuál es.
4. Escribir `#ACTORES#DEMANDADOS#`: se rechaza con "Las variables tienen que estar separadas".
5. Un modelo sin ninguna variable se acepta, y su ficha dice "Este modelo no usa variables".

### 3. Fuero y título repetido (RF-1, RF-15)

1. Cargar un oficio sin indicar fuero: queda con el fuero Otro.
2. Cargar una cédula con el fuero Laboral.
3. Cargar otro modelo con el título del primero, con otras mayúsculas: pregunta "Ya existe un modelo con ese título" y muestra el otro modelo. "Cancelar" deja el formulario como estaba. "Guardar igual" lo guarda.

### 4. Búsqueda y filtros (RF-18 a RF-24)

1. Con el administrador, buscar:
   - Un fragmento de un título, en mayúsculas y sin tildes.
   - Un fragmento que solo está en el texto de un modelo.
   - "#JUZGADO#": encuentra los modelos que usan esa variable.
2. Buscar `<script>`: muestra "La búsqueda tiene caracteres no permitidos" y no busca.
3. Sin filtros se ven todos los modelos activos, ordenados por título.
4. Con el fuero Laboral aparecen la cédula laboral y los modelos de fuero Otro. Con el fuero Otro, solo los de fuero Otro.
5. Filtrar por tipo de escrito, solo y combinado con el fuero y el buscador.
6. Buscar algo que no existe: "No hay modelos que coincidan con la búsqueda".

### 5. Elegir un modelo desde la causa (RF-29, RF-30)

1. Abrir la causa civil de la preparación y elegir "Completar un modelo".
2. Se ofrecen todos los modelos activos, incluida la cédula laboral, sin ningún filtro elegido.
3. La ficha de un modelo, en la sección "Modelos", no ofrece completarlo.

### 6. Escrito completado (RF-31 a RF-40)

1. Elegir la demanda. Arriba figuran la carátula de la causa y el título del modelo.
2. Verificar en el escrito:
   - Los datos de la causa.
   - Los dos actores unidos por "y", ordenados por apellido, con nombre y apellido.
   - Los documentos con su formato ("DNI 20.111.222", "CUIT 30-71234567-8").
   - Las marcas `(FALTA NÚMERO DE EXPEDIENTE)`, `(FALTA JUZGADO)`, `(FALTA DNI)` y `(FALTA DOMICILIO)`.
   - La fecha del día en números y en letras.
3. Arriba del escrito está el aviso "A esta causa le faltan datos que el modelo usa", con cada dato una sola vez y de quién es ("DNI de …", "domicilio de …").

### 7. Copiar y volver (RF-32, RF-44, RF-45)

1. Junto a "Copiar" está la leyenda "El escrito copiado queda en este equipo hasta que copies otra cosa o cierres sesión".
2. "Copiar" muestra "Escrito copiado". Pegar en un procesador de textos: llega el texto completo, con sus saltos de línea, sin el título, la carátula ni los avisos.
3. La pantalla no ofrece descargar, imprimir, exportar, enviar ni modificar el escrito.
4. Ir a la segunda página de la lista de modelos de la causa, con una búsqueda y un filtro, completar un modelo y elegir "Volver a la lista de modelos": conserva la página, la búsqueda y los filtros.

### 8. Datos del momento (RF-33, RF-43)

1. Cargar el número de expediente y el juzgado en la causa.
2. Completar el modelo de nuevo: salen los datos nuevos y el aviso ya no los nombra.
3. Recargar la pantalla del escrito: se completa otra vez.
4. La causa no cambió su "modificada por" ni su lugar en el listado de causas por haber completado modelos.

### 9. Cuentas desactivadas (RF-40)

1. Desactivar la cuenta de un cliente de la causa y la del responsable.
2. Completar un modelo que use `#CLIENTES#` y `#ABOGADO_RESPONSABLE#`: los dos figuran en el escrito, con los avisos "Hay clientes con la cuenta desactivada" y "El responsable de esta causa está desactivado".
3. Reactivar las dos cuentas.

### 10. Modificación y desactivación (RF-2, RF-14, RF-25 a RF-28)

1. Con el administrador, "Editar" un modelo que cargó el abogado y guardar: la ficha muestra "Modificado por última vez por …" con el administrador.
2. Guardar otra vez sin cambiar nada: la última modificación no cambia.
3. "Desactivar" y confirmar: muestra "Desactivado" y solo ofrece "Reactivar".
4. Ya no aparece en el listado ni en la causa. Con "Mostrar desactivados" aparece, con la etiqueta.
5. "Reactivar": vuelve al listado y se puede editar.

### 11. Causa desactivada o archivada (RF-41, RF-42)

1. Desactivar la causa: no ofrece "Completar un modelo". Abrir la dirección de un escrito de esa causa: "La causa está desactivada".
2. Reactivarla y marcarla como Archivada: ofrece "Completar un modelo" y el escrito se completa.

### 12. Cierre de sesión y portapapeles (RF-44, RF-46, RF-48)

1. Con un escrito completado en pantalla, elegir "Copiar" y después "Cerrar sesión".
2. Volver atrás con el navegador: el escrito no se ve; lleva al ingreso.
3. Pegar en un procesador de textos: el escrito ya no está en el portapapeles.
4. En las herramientas del navegador, el almacenamiento local y el de sesión están vacíos.

### 13. Sesión mientras se usa (RF-17, RF-48)

1. Abrir "Nuevo modelo" con las herramientas del navegador en la pestaña de red.
2. Escribir en el texto, esperar 5 minutos y seguir escribiendo: aparece un pedido a `/api/sesion/usuario`. Mientras no pasen otros 5 minutos, no aparece otro.
3. Lo mismo en la pantalla de un escrito completado, recorriéndolo o seleccionando texto.
4. Prueba larga, opcional:
   - Escribir un modelo de a ratos durante más de 1 hora y guardar: la sesión sigue abierta.
   - Recorrer un escrito completado de a ratos durante más de 1 hora: sigue a la vista.
   - Dejar otro escrito en pantalla más de 1 hora sin usarlo: deja de mostrarse y lleva al ingreso, sin tocar nada.

### 14. Acceso (RF-50, RF-52)

1. Ingresar como cliente y escribir en la dirección `/panel/modelos` y la de un escrito completado (`/panel/causas/…/modelos/…`): lleva al portal.
2. El portal no muestra nada de modelos, ni en el menú ni en las causas.

## Veredicto

Los 53 RF tienen tests en verde, y `pnpm test` y `pnpm lint` pasan. Falta la demo manual para dar la spec 006 por **cumplida**. Quedan además las verificaciones de "Pendientes del despliegue", que se hacen al desplegar la aplicación.
