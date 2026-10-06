# Validación 002 — Causas y partes

Recorrido de `spec.md` requisito por requisito (tarea T40). Corrida del 2026-10-05, después de T39: `pnpm test` y `pnpm lint` sin errores.

| Paquete | Suite | Archivos | Tests |
|---|---|---|---|
| api | Unitarios (Vitest) | 20 | 492 |
| api | e2e contra la base de tests (Vitest + Supertest) | 30 | 335 |
| web | Vitest + Testing Library | 32 | 436 |
| | **Total** | **82** | **1263** |

Las cifras incluyen los tests de la spec 001, que siguen en verde.

Rutas abreviadas:
- **U**: tests unitarios de `api/src/causas/...`.
- **E**: tests e2e de `api/test/...`.
- **W**: tests de `web/src/...`.

## Requisitos funcionales

| RF | Qué se verifica | Tests | Resultado |
|---|---|---|---|
| RF-1 | Datos de la causa, listas cerradas, incidente y expediente principal | U `entidades.spec.ts`, `dto/dto.spec.ts`; E `alta-causas`; W `formulario-causa.test.ts`, `presentacion-causas.test.ts`, `FormularioCausa.test.tsx` | ✅ |
| RF-2 | Quién creó y modificó; qué cuenta como modificación (no los cambios en la cuenta del cliente) | E `alta-causas`, `edicion-causas`, `partes-causas` (cuenta del cliente sin tocar `modificadoEn`), `abogados-causas`, `desvinculacion-partes`; W `presentacion-causas.test.ts` (`auditLines`), `PanelCausaDetalle.test.tsx` | ✅ |
| RF-3 | Recorte y vacío como no informado | U `dto/dto.spec.ts`; E `alta-causas`, `edicion-causas`; W `formulario-causa.test.ts` | ✅ |
| RF-4 | Caracteres permitidos, sin emojis ni saltos de línea | U `validadores/texto-causa.spec.ts`, `dto/dto.spec.ts`; W `formulario-causa.test.ts` | ✅ |
| RF-5 | Mensaje por campo y regla | U `dto/dto.spec.ts`, `dto/parte.dto.spec.ts`; E `alta-causas`; W `FormularioCausa.test.tsx` | ✅ |
| RF-6 | Alta con datos obligatorios, en trámite por defecto | E `alta-causas`; W `PanelCausaNueva.test.tsx` | ✅ |
| RF-7 | Alta parcial: lo rechazado no se guarda y se informa | E `alta-parcial-causas`, `partes-cliente-alta`; W `PanelCausaNueva.test.tsx`, `presentacion-causas.test.ts` (`rejectionMessages`) | ✅ |
| RF-8 | Duplicado en el mismo juzgado y fuero (mayúsculas, tildes, espacios; altas simultáneas) | U `reglas-causas.spec.ts`; E `migracion-causas` (índice), `expediente-causas`, `edicion-causas`, `desactivacion-causas` | ✅ |
| RF-9 | Pregunta por el número en otro juzgado o fuero, o sin juzgado | E `expediente-causas`, `edicion-causas`; W `preguntas.test.ts`, `PanelCausaNueva.test.tsx`, `PanelCausaDetalle.test.tsx` | ✅ |
| RF-10 | Incidente: sin control de expediente y con expediente principal obligatorio | U `reglas-causas.spec.ts`, `dto/dto.spec.ts`; E `expediente-causas`, `edicion-causas`, `desactivacion-causas`; W `FormularioCausa.test.tsx` | ✅ |
| RF-11 | Edición de datos, sin activar ni desactivar | E `edicion-causas`; W `PanelCausaDetalle.test.tsx`, `formulario-causa.test.ts` | ✅ |
| RF-12 | Consulta con partes vigentes y desvinculadas, abogados y registro | U `causa-detalle.spec.ts`; E `alta-causas`, `desvinculacion-partes`; W `PanelCausaDetalle.test.tsx`, `TablaPartes.test.tsx` | ✅ |
| RF-13 | Rol procesal de la lista cerrada | U `entidades.spec.ts`, `dto/parte.dto.spec.ts`; W `FormularioParte.test.tsx` | ✅ |
| RF-14 | Parte cliente con los datos de su cuenta | U `causa-detalle.spec.ts`, `reglas-causas.spec.ts`; E `partes-cliente-alta`, `partes-causas` | ✅ |
| RF-15 | Parte no cliente: tipo de persona, nombre o razón social, DNI/CUIT opcional | U `dto/parte.dto.spec.ts`; E `alta-causas`, `partes-causas`; W `FormularioParte.test.tsx`, `formulario-causa.test.ts` | ✅ |
| RF-16 | Pregunta por DNI/CUIT de un cliente (activo o desactivado), al agregar y al modificar | E `preguntas-partes-alta`, `partes-causas`; W `preguntas.test.ts`, `PanelCausaNueva.test.tsx`, `TablaPartes.test.tsx` | ✅ |
| RF-17 | No vincular a un cliente desactivado | E `partes-cliente-alta`, `alta-parcial-causas`, `partes-causas`, `desvinculacion-partes` | ✅ |
| RF-18 | Persona repetida en la causa (cliente o DNI/CUIT) | U `reglas-causas.spec.ts`; E `partes-cliente-alta`, `partes-causas`, `desvinculacion-partes` | ✅ |
| RF-19 | Preguntas de misma persona: en la causa y contra los clientes del estudio | U `reglas-causas.spec.ts`; E `preguntas-partes-alta`, `partes-causas`; W `preguntas.test.ts`, `PreguntaConfirmacion.test.tsx`, `PanelCausaNueva.test.tsx`, `TablaPartes.test.tsx` | ✅ |
| RF-20 | Aviso de causas donde el cliente figura como no cliente | E `aviso-no-cliente-alta`, `partes-causas`, `desvinculacion-partes`; W `PanelCausaNueva.test.tsx`, `PanelCausaDetalle.test.tsx` | ✅ |
| RF-21 | Modificar rol y datos; los de una parte cliente, solo desde su cuenta | E `partes-causas`; W `TablaPartes.test.tsx`, `FormularioParte.test.tsx` | ✅ |
| RF-22 | Desvincular sin borrar | E `desvinculacion-partes`; W `TablaPartes.test.tsx` | ✅ |
| RF-23 | No desvincular la última parte (también con dos pedidos simultáneos) | U `reglas-causas.spec.ts`; E `desvinculacion-partes`; W `TablaPartes.test.tsx` | ✅ |
| RF-24 | Volver a vincular con sus controles | E `desvinculacion-partes`; W `TablaPartes.test.tsx`, `PanelCausaDetalle.test.tsx` | ✅ |
| RF-25 | Una parte de otra causa no existe | E `partes-causas`, `desvinculacion-partes` | ✅ |
| RF-26 | Vínculo: parte vigente de causa activa, en cualquier estado | E `vinculo-cliente` | ✅ |
| RF-27 | El vínculo se corta al desvincular o desactivar | E `vinculo-cliente` | ✅ |
| RF-28 | Cliente desactivado conservado como parte; vuelve al reactivar la cuenta | E `vinculo-cliente` | ✅ |
| RF-29 | Exactamente un responsable; colaboradores integrantes | U `entidades.spec.ts`, `reglas-causas.spec.ts`; E `alta-causas`, `abogados-causas`, `integrantes-causas`; W `SelectorIntegrantes.test.tsx`, `EditorAbogados.test.tsx` | ✅ |
| RF-30 | Rechazo de un integrante desactivado nuevo | U `reglas-causas.spec.ts`; E `abogados-causas`, `alta-parcial-causas`; W `SelectorIntegrantes.test.tsx` | ✅ |
| RF-31 | Integrante repetido o responsable como colaborador | U `entidades.spec.ts`, `reglas-causas.spec.ts`; E `abogados-causas`, `alta-parcial-causas`; W `SelectorIntegrantes.test.tsx` | ✅ |
| RF-32 | Desactivados ya asignados: se conservan y se marcan | U `reglas-causas.spec.ts`; E `abogados-causas`; W `SelectorIntegrantes.test.tsx`, `EditorAbogados.test.tsx` | ✅ |
| RF-33 | Aviso de responsable desactivado | W `presentacion-causas.test.ts`, `PanelCausaDetalle.test.tsx` | ✅ |
| RF-34 | Reemplazar o quitar abogados | E `abogados-causas`; W `EditorAbogados.test.tsx`, `PanelCausaDetalle.test.tsx` | ✅ |
| RF-35 | Sin permisos por causa | E `acceso-causas` (un integrante que no interviene la edita) | ✅ |
| RF-36 | Listado de a 20, orden por modificación o alta, columnas | E `listado-causas`; W `PanelCausas.test.tsx` | ✅ |
| RF-37 | Búsqueda por fragmentos, sin mayúsculas ni tildes, con separadores y documentos normalizados | U `validadores/texto-causa.spec.ts`; E `busqueda-causas`; W `PanelCausas.test.tsx` | ✅ |
| RF-38 | Filtros combinables; responsables activos como opción | E `listado-causas`, `busqueda-causas`; W `PanelCausas.test.tsx`, `causas.test.ts` | ✅ |
| RF-39 | Mostrar desactivadas | E `listado-causas`; W `PanelCausas.test.tsx` | ✅ |
| RF-40 | Desactivar con registro; confirmación en la interfaz | E `desactivacion-causas`; W `AccionesCausa.test.tsx`, `PanelCausaDetalle.test.tsx` | ✅ |
| RF-41 | Causa desactivada: solo consultar y reactivar | E `edicion-causas`, `partes-causas`, `abogados-causas`, `desvinculacion-partes`; W `PanelCausaDetalle.test.tsx`, `TablaPartes.test.tsx`, `EditorAbogados.test.tsx` | ✅ |
| RF-42 | Reactivar con registro | E `desactivacion-causas`, `vinculo-cliente`; W `AccionesCausa.test.tsx` | ✅ |
| RF-43 | Al reactivar, primero la pregunta; duplicado exacto rechazado | E `desactivacion-causas`; W `AccionesCausa.test.tsx` | ✅ |
| RF-44 | Solo administradores y abogados, controlado en el servidor | E `acceso-causas` (los 12 endpoints: 401 sin sesión, 403 a un cliente aunque sea parte), `integrantes-causas`; W `RutasCausas.test.tsx` | ✅ |

## Requisitos no funcionales

| RNF | Tests | Resultado |
|---|---|---|
| Validación en el servidor y campos desconocidos rechazados | U `dto/dto.spec.ts`, `dto/parte.dto.spec.ts`; E `edicion-causas`, `abogados-causas`, `alta-parcial-causas` | ✅ |
| Aislamiento: el vínculo de RF-26 es la única fuente | `ClientLinkService` exportado para la spec 004; E `vinculo-cliente` | ✅ |
| Persistencia: nada de causas en el almacenamiento del navegador | W `PanelCausas.test.tsx` (sin `localStorage`); los filtros viven en el estado del componente | ✅ |
| Fechas en hora de Buenos Aires | W `presentacion-causas.test.ts` (`auditLines`), `PanelCausaDetalle.test.tsx` | ✅ |
| Idioma: mensajes en español | Todos los tests verifican los mensajes exactos | ✅ |

## Verificaciones adicionales

- **Ningún endpoint de causas responde a un cliente:** los 12 endpoints de `/api/panel/causas` responden 403 a un cliente, aunque sea parte de la causa, y 401 sin sesión (E `acceso-causas`).
- **Ninguna respuesta incluye datos de las cuentas:** las respuestas se arman campo por campo y nunca traen emails, hashes, teléfono, domicilio ni el contacto de una persona jurídica (U `causa-detalle.spec.ts`; E `alta-causas`).
- **Migración:** `up` sobre la base con las tablas de la spec 001 crea las tres tablas con la intercalación `utf8mb4_unicode_ci`, las 11 claves foráneas y la columna generada. El esquema queda igual a las entidades, y `down` elimina las tablas y su metadato sin tocar las de la 001 (E `migracion-causas`). Además, `down` de todas las migraciones deja la base vacía (E `migraciones`).

## Criterios de finalización

- [x] Todos los RF con al menos un test en verde.
- [x] Tests de que un cliente queda vinculado solo mientras es parte vigente de una causa activa, cualquiera sea su estado (E `vinculo-cliente`), y de que un cliente o un visitante no consulta ni gestiona causas (E `acceso-causas`).
- [x] `pnpm test` y `pnpm lint` sin errores.
- [x] Demo manual (ver la guía siguiente): completada sin errores el 2026-10-05.

## Guía de la demo manual

Contra la base de **desarrollo**. Cada paso dice qué hacer y qué tenés que ver; si algo no coincide, anotá el número de paso.

### Preparación

1. Aplicar la migración de la spec 002 en la base de desarrollo: `pnpm --filter api migration:run`. Tiene que terminar sin errores.
2. Levantar todo con `pnpm dev` y abrir `http://localhost:5173/ingresar`.
3. Con un **administrador**, en **Cuentas → Nueva cuenta**, crear lo que haga falta (las contraseñas temporales se cambian en el primer ingreso):
   - Dos abogados: **A** (el que va a cargar las causas) y **B** (para colaborador y responsable).
   - Un cliente persona física, **Ana Gómez**, DNI 30.123.456.
   - Un cliente persona física, **Juan Pérez**, con cualquier DNI válido.
   - Un cliente persona jurídica, **Empresa S.A.**, con un CUIT válido (por ejemplo, 30-71234567-1).
4. Ingresar como **A**. En la barra de navegación aparece **Causas** y lleva a un listado vacío.

### 1. Alta con rechazo parcial (RF-6, RF-7, RF-29, RF-30)

1. **Causas → Nueva causa.** Verificá que **Estado** arranca en *En trámite* y que no aparece el campo del expediente principal.
2. Tocá **Crear causa** sin cargar nada. Tienen que aparecer, juntos: "La carátula es obligatoria", el mensaje del fuero, "Elegí el responsable" y "Agregá al menos una parte".
3. Cargá la carátula *Pérez, Juan c/ Gómez s/ daños*, fuero **Civil**, juzgado *Juzgado Civil N° 3* y sin número de expediente. Responsable: **A**. Colaborador: marcá a **B**.
4. En **Partes**:
   - **Cliente del estudio** → buscá *gómez* → elegí **Gómez, Ana · DNI 30.123.456** → rol *Actor* → **Agregar parte**.
   - **No es cliente** → *Pedro López*, sin DNI, rol *Demandado* → **Agregar parte**.
   - En la lista **Partes cargadas** tienen que figurar las dos, y **Quitar** saca una.
5. **Simular el colaborador rechazado:** sin enviar todavía, en otra ventana ingresá como administrador y desactivá la cuenta de **B**. Volvé a la ventana de **A** y tocá **Crear causa**.
6. **Resultado esperado:**
   - Lleva al detalle de la causa nueva.
   - Aviso "La causa se creó, pero esto no se guardó:" con *Colaborador …, B: El integrante está desactivado*.
   - Colaboradores vacío y las dos partes vigentes, con Ana marcada como *Cliente*.
   - Registro: "Creada por A el …", con la hora de Buenos Aires, y "Sin modificaciones desde el alta".
7. Reactivá la cuenta de **B** desde Cuentas, para los pasos siguientes.

### 2. Número de expediente (RF-8 a RF-11)

1. Creá una segunda causa, *Otra causa s/ cobro*, fuero **Civil**, juzgado *Juzgado Civil N° 3*, número **1234/2024**, con una parte cualquiera.
2. En el detalle de la primera causa, **Editar datos** → número *1234/2024* → **Guardar cambios**. Tiene que rechazarse con "Ya existe una causa con ese número de expediente en ese juzgado y fuero".
3. Cambiá el juzgado a *Juzgado Laboral N° 1* y guardá con el mismo número. Tiene que aparecer la pregunta "Ya existe otra causa con ese número de expediente" con **Guardar igual** / **Cancelar**. **Guardar igual** guarda.
4. Probá con una causa **sin juzgado** y el mismo número: también pregunta, no rechaza.
5. **Incidente:** creá una causa nueva con el número *1234/2024* y el mismo juzgado y fuero que la segunda, marcando **Es incidente** (aparece el campo **Número del expediente principal**: cargá *1234/2024*). Se crea sin rechazo ni pregunta, y el detalle y el listado muestran "Vinculado al expte. principal Nº 1234/2024".
6. Editá la causa y desmarcá **Es incidente**. Se guarda y desaparece el texto del expediente principal.
7. Escribí una carátula con un emoji: se rechaza indicando los caracteres permitidos.

### 3. Preguntas al agregar partes (RF-14 a RF-20)

En el detalle de cualquier causa activa, **Agregar parte**:

1. **No es cliente**, *Ana G.* con DNI **30.123.456** → **Guardar parte**. Pregunta "Ese DNI o CUIT pertenece a un cliente del estudio":
   - **Agregar como cliente** la vincula como Ana Gómez (si Ana ya era parte, se rechaza por persona repetida).
   - **Agregar como no cliente** la guarda como no cliente.
2. **No es cliente**, con el mismo nombre que una parte ya cargada (por ejemplo *pedro LOPEZ*, sin DNI). Pregunta "Ya hay una parte con ese nombre en la causa. ¿Es la misma persona?":
   - **Es la misma persona** no la agrega.
   - **Es otra persona** la agrega.
3. **No es cliente**, *Juan Pérez* sin DNI. Pregunta "Hay clientes del estudio con ese nombre. ¿Es alguno de ellos?" y muestra a Juan Pérez con su DNI:
   - Elegirlo lo vincula como cliente.
   - **Ninguno: agregar como no cliente** lo guarda como no cliente.
4. **Aviso de causas como no cliente:** en una causa, agregá a *Juan Pérez* como **no cliente con su DNI** y respondé "Agregar como no cliente". Después, en otra causa, agregá a Juan Pérez como **cliente del estudio**. Tiene que aparecer el aviso "El cliente figura como parte no cliente en estas causas…" con un enlace a la primera.
5. **Modificar** una parte no cliente cambia sus datos. **Modificar** una parte cliente solo deja cambiar el rol y muestra "Cliente: …".

### 4. Abogados (RF-29 a RF-34)

1. En el detalle, **Editar abogados** → agregá a **B** como colaborador → **Guardar abogados**. Colaboradores muestra a B.
2. El responsable elegido no aparece entre los colaboradores.

### 5. Búsqueda y filtros (RF-36 a RF-39)

En **Causas**:

1. Buscá *ERE* (fragmento de "Pérez"), *perez* sin tilde y en mayúsculas: encuentra las causas de Pérez.
2. Buscá *1234-2024* (con guion): encuentra las de *1234/2024*.
3. Buscá *30.123.456*: encuentra las causas donde Ana es parte vigente.
4. Probá cada filtro: **Fuero**, **Estado**, **Responsable** (solo ofrece integrantes activos), **Solo mis causas**, **Con responsable desactivado** y su combinación con el buscador. Cada cambio vuelve a la página 1.
5. El orden: primero las modificadas más recientemente, o las creadas, si nunca se modificaron.

### 6. Desvincular y volver a vincular (RF-22 a RF-27)

1. En una causa con Ana y otra parte, **Desvincular** a Ana. Pasa a **Partes desvinculadas**.
2. En una causa con una sola parte vigente, **Desvincular**: tiene que aparecer "La causa debe tener al menos una parte".
3. En **Partes desvinculadas**, **Volver a vincular** a Ana: vuelve a las vigentes.
4. Ana deja de ver la causa en el portal, pero eso no se puede comprobar todavía: el contenido del portal es de la spec 004. Esta spec lo cubre con el e2e `vinculo-cliente`.

### 7. Responsable desactivado (RF-32, RF-33, RF-38)

1. Con un administrador, desactivá a **B** después de ponerlo como **responsable** de una causa.
2. Con **A**, el detalle de esa causa muestra "El responsable de esta causa está desactivado. Asigná un nuevo responsable" y al responsable como *(desactivado)*.
3. En el listado, **Con responsable desactivado** muestra esa causa.
4. **Editar abogados** mantiene a B como responsable y deja reemplazarlo por uno activo. Al reemplazarlo desaparece el aviso.

### 8. Desactivar y reactivar (RF-40 a RF-43)

1. En el detalle, **Desactivar**. Aparece "¿Desactivar esta causa?", con la explicación de que reemplaza al borrado y no es para causas terminadas. **Cancelar** no hace nada.
2. **Desactivar → Sí, desactivar:**
   - Aparece "Esta causa está desactivada".
   - Desaparecen **Editar datos**, **Agregar parte**, **Editar abogados**, **Modificar** y **Desvincular**.
   - Queda solo **Reactivar**.
   - El registro muestra "Desactivada por A el …".
3. La causa ya no aparece en el listado. Con **Mostrar desactivadas** aparece marcada como *Desactivada*.
4. **Reactivar** la vuelve a activar, con "Reactivada por A el …".
5. **Reactivar con número repetido:**
   1. Desactivá una causa con número y juzgado.
   2. Creá otra con el mismo número, juzgado y fuero.
   3. Reactivá la primera: primero pregunta "Ya existe otra causa con ese número de expediente", y al tocar **Guardar igual** se rechaza con el mensaje de duplicado en ese juzgado y fuero.

### 9. Acceso (RF-44)

1. Ingresá como **Ana** (cliente) y escribí `/panel/causas` en la barra de direcciones. Te lleva al portal.

## Veredicto

La spec 002 está **cumplida**: los 44 RF y los RNF tienen tests en verde, `pnpm test` y `pnpm lint` pasan, y la demo manual se completó sin errores el 2026-10-05.
