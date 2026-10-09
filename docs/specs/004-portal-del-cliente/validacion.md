# Validación 004 — Portal del cliente

Recorrido de `spec.md` requisito por requisito (tarea T28). Corrida del 2026-10-08, después de T27: `pnpm test` y `pnpm lint` sin errores.

| Paquete | Suite | Archivos | Tests |
|---|---|---|---|
| api | Unitarios (Vitest) | 31 | 697 |
| api | e2e contra la base de tests (Vitest + Supertest) | 50 | 484 |
| web | Vitest + Testing Library | 52 | 640 |
| | **Total** | **133** | **1821** |

Las cifras incluyen los tests de las specs 001 a 003, que siguen en verde.

Rutas abreviadas:
- **U**: tests unitarios de `api/src/...`.
- **E**: tests e2e de `api/test/...`.
- **W**: tests de `web/src/...`.

## Requisitos funcionales

| RF | Qué se verifica | Tests | Resultado |
|---|---|---|---|
| RF-1 | Solo clientes activos sin cambio pendiente; visitantes e integrantes según la spec 001, en el servidor | E `portal-acceso` (401 al visitante, 403 a administrador, abogado y cliente con cambio pendiente, en las 4 rutas); W `PortalAcceso.test.tsx` | ✅ |
| RF-2 | Portal solo de consulta, con "Cambiar contraseña" | E `portal-acceso` (`POST` y `PATCH` responden 404); W `Disenos.test.tsx` | ✅ |
| RF-3 | Vínculo y visibilidad evaluados en cada pedido; los cambios rigen desde el siguiente | E `portal-acceso` (ocultar un movimiento, desactivar al responsable, desactivar y reactivar la causa, desvincular al cliente, con la misma sesión), `visibilidad-cliente` | ✅ |
| RF-4 | Sesión de 20 minutos sin uso para clientes (1 hora para integrantes) | U `autenticacion/constantes.spec.ts`, `autenticacion/autenticacion.service.spec.ts`, `autenticacion/autenticacion.guard.spec.ts`; E `sesion-por-rol`, `renovacion`; W `inactividad.test.ts`, `ProveedorSesion.test.tsx` | ✅ |
| RF-5 | Al cerrarse la sesión, la pantalla descarta los datos | W `ProveedorSesion.test.tsx` (inactividad, sin llamar a la API; al volver a la pestaña), `cliente-http.test.ts` (`onActivity`); el aviso de sesión cerrada y `RutaProtegida` de la spec 001 | ✅ (ver Observaciones) |
| RF-6 | El navegador no guarda copias del portal | E `respuestas-sin-cache` (`Cache-Control: no-store` en 200, 401, 404 y en el ingreso); W `ProveedorSesion.test.tsx` (`pageshow`); `.htaccess` con `no-store` para `index.html`; demo manual (volver atrás después de cerrar sesión) | ✅ (falta verificar `.htaccess` en producción) |
| RF-7 | Inicio con las causas vinculadas de cualquier estado, de a 20 | E `portal-causas`; W `PortalInicio.test.tsx` | ✅ |
| RF-8 | Fecha del último movimiento: visibles, no anulados, hasta hoy en Buenos Aires | E `visibilidad-cliente` (`lastVisibleDates`, con el día inclusive), `portal-causas-orden` (cambio de día a las 03:00 UTC) | ✅ |
| RF-9 | Carátula en dos líneas, número o "Sin asignar", estado y fecha del último movimiento | U `portal/portal-detalle.spec.ts`; E `portal-causas`; W `PortalInicio.test.tsx` | ✅ |
| RF-10 | Grupos "En curso" y "Archivadas y finalizadas", con título repetido en cada página | U `portal/reglas-portal.spec.ts`; E `portal-causas-orden`; W `presentacion-portal.test.ts`, `PortalInicio.test.tsx` | ✅ |
| RF-11 | Orden por fecha, carátula (con la ñ como en español) y registro, sin repetir ni omitir entre páginas | U `portal/reglas-portal.spec.ts`; E `portal-causas-orden` (45 causas, 3 páginas) | ✅ |
| RF-12 | "No tenés causas para consultar" | E `portal-causas`; W `PortalInicio.test.tsx` | ✅ |
| RF-13 | Datos de la causa, "Sin asignar" y leyenda de incidente | U `portal/portal-detalle.spec.ts`; E `portal-causa-detalle`; W `PortalCausaDetalle.test.tsx` | ✅ |
| RF-14 | Partes vigentes con nombre y rol, ordenadas, "Vos" en la propia, razón social de la persona jurídica | U `portal/reglas-portal.spec.ts`, `portal/portal-detalle.spec.ts`; E `portal-causa-detalle`; W `PortalCausaDetalle.test.tsx` | ✅ |
| RF-15 | Nunca documento, tipo de persona, si es cliente, datos de la cuenta ni partes desvinculadas | U `portal/reglas-portal.spec.ts`, `portal/portal-detalle.spec.ts`; E `portal-causa-detalle` (recorrido recursivo de claves) | ✅ |
| RF-16 | Responsable solo si está activo; nunca colaboradores ni datos de integrantes | U `portal/portal-detalle.spec.ts`; E `portal-causa-detalle`, `portal-acceso`; W `PortalCausaDetalle.test.tsx` | ✅ |
| RF-17 | Nunca auditoría, `activa` ni el aviso de responsable desactivado | U `portal/portal-detalle.spec.ts`; E `portal-causa-detalle` | ✅ |
| RF-18 | Nombre, dirección y WhatsApp del estudio en el portal, salvo en el cambio de contraseña | W `datos-estudio.test.ts`, `Disenos.test.tsx`, `PaginaCambiarContrasena.test.tsx` | ✅ |
| RF-19 | Botón de WhatsApp fijo abajo a la derecha, también en el cambio de contraseña, sin tapar contenido | W `Disenos.test.tsx`, `PaginaCambiarContrasena.test.tsx`; que no tape contenido, en la demo manual | ✅ |
| RF-20 | Movimientos visibles, anulados incluidos, en el orden del panel, de a 20 | E `portal-movimientos`, `visibilidad-cliente`; W `PortalCausaDetalle.test.tsx` | ✅ |
| RF-21 | Fecha, tipo, texto visible sin indicar su origen, recorte a 300 con "Ver más" y "Ver menos", "Anulado" y "Fecha futura" | U `movimientos/movimiento-detalle.spec.ts`; E `portal-movimientos`, `visibilidad-cliente`; W `presentacion-portal.test.ts`, `PortalCausaDetalle.test.tsx` | ✅ |
| RF-22 | Movimiento abierto con su carátula y "Volver a la causa" a la misma página | E `portal-movimientos`; W `PortalCausaDetalle.test.tsx` ("Abrir"), `PortalMovimientoDetalle.test.tsx` | ✅ |
| RF-23 | "Todavía no hay movimientos para mostrar" | E `portal-movimientos`; W `PortalCausaDetalle.test.tsx` | ✅ |
| RF-24 | Solo "Anterior" y "Siguiente", sin totales | U `portal/reglas-portal.spec.ts`; E `portal-causas-orden`, `portal-movimientos`, `visibilidad-cliente`; W `PortalInicio.test.tsx`, `PortalCausaDetalle.test.tsx` | ✅ |
| RF-25 | Página inexistente o inválida: nada, ni mensajes de vacío | U `portal/reglas-portal.spec.ts`; E `portal-causas`, `portal-causas-orden`, `portal-movimientos`; W `presentacion-portal.test.ts`, `PortalInicio.test.tsx`, `PortalCausaDetalle.test.tsx` | ✅ |
| RF-26 | Ningún indicio de los movimientos ocultos | E `portal-movimientos` (45 visibles y 10 ocultos), `visibilidad-cliente` | ✅ |
| RF-27 | Un movimiento se pide dentro de su causa; primero la causa | E `portal-acceso`; W `portal.test.ts` | ✅ |
| RF-28 | Causa ajena, desactivada, inexistente o mal formada: el mismo 404 | E `portal-acceso` (byte a byte, en las 3 rutas que llevan causa); W `PortalCausaDetalle.test.tsx`, `portal.test.ts` | ✅ |
| RF-29 | Movimiento oculto, inexistente, de otra causa o mal formado: el mismo 404 | E `portal-acceso` (byte a byte), `visibilidad-cliente`; W `PortalMovimientoDetalle.test.tsx` | ✅ |
| RF-30 | Solo los datos de la spec; nada que la interfaz oculte | U `portal/portal-detalle.spec.ts`, `movimientos/movimiento-detalle.spec.ts` (claves exactas); E `portal-causas`, `portal-causa-detalle`, `portal-movimientos` | ✅ |
| Spec 001, RF-12 | 20 minutos para clientes y 1 hora para integrantes, extendida en cada consulta | U `autenticacion/autenticacion.guard.spec.ts`, `autenticacion/autenticacion.service.spec.ts`, `autenticacion/cookies-de-sesion.spec.ts`; E `sesion-por-rol`, `renovacion`, `ingreso` | ✅ |

## Requisitos no funcionales

| RNF | Tests | Resultado |
|---|---|---|
| Aislamiento: todo filtrado en el servidor por el vínculo y la visibilidad | E `portal-causas`, `portal-causa-detalle`, `portal-movimientos`, `portal-acceso` | ✅ |
| Respuestas indistinguibles (resultado y mensaje) | E `portal-acceso` (el mismo cuerpo, byte a byte) | ✅ |
| Textos seguros | `TextoLiteral` de la spec 003 en las dos pantallas de movimientos; regla de ESLint contra `dangerouslySetInnerHTML` (`pnpm lint`) | ✅ |
| Registros del servidor sin textos de movimientos | Filtro global de errores de la spec 003, que cubre también las rutas del portal | ✅ |
| Persistencia: nada en el almacenamiento ni en la caché del navegador | W `PortalAcceso.test.tsx`; E `respuestas-sin-cache` | ✅ |
| Rendimiento: menos de 2 segundos con 100 causas y 5.000 movimientos | E `portal-rendimiento` (sin agregar índices) | ✅ |
| Plataformas: celular de 360 px | Tarjetas en una columna, `break-words`, margen para el botón de WhatsApp; demo manual | ✅ |
| Fechas en dd/mm/aaaa y hora de Buenos Aires | U `movimientos/movimiento-detalle.spec.ts`; E `portal-causas-orden`; W `presentacion-movimientos.test.ts` (de la spec 003), `PortalInicio.test.tsx` | ✅ |
| Idioma: mensajes en español | Todos los tests verifican los textos exactos | ✅ |

## Verificaciones adicionales

- **Ningún endpoint del portal responde a un integrante ni a un visitante:** las 4 rutas de `/api/portal/causas` responden 403 a administradores, abogados y clientes con cambio pendiente, y 401 sin sesión (E `portal-acceso`).
- **Ninguna respuesta incluye datos de otro usuario:** las respuestas del portal se arman campo por campo. Los tests comparan las claves exactas y recorren las anidadas, sin documentos, emails, ids de partes o integrantes ni auditoría (U `portal/portal-detalle.spec.ts`; E `portal-causa-detalle`).
- **Sin cambios en la base:** la spec no agrega tablas ni migraciones. El rendimiento se cumple con el índice de la spec 003.

## Observaciones

- **Interpretación de RF-5:** el vencimiento por inactividad se detecta en la pantalla sin consultar al servidor. Los demás cierres (otro dispositivo, desactivación, restablecimiento) se detectan en el siguiente pedido, como acepta la spec para la pantalla abierta. El control de inactividad es por pestaña.
- **Desvíos del plan y de las tareas:**
  - T1 también modificó `ingreso.e2e-spec.ts`, que verificaba la cookie de 7 días.
  - T10 agregó solo la ruta de la lista. Las otras tres llegaron con T12 y T13, cada una con sus tests.
  - T22 sumó a `DisenoSeccion` la propiedad `footer` para el bloque de contacto.
  - T23 sumó a las utilidades de prueba de la web un servicio del portal simulado.
  - Los commits de T1 a T4 se hicieron por separado, a pedido, y no en uno solo como decía `tasks.md`.
- **Fallos intermitentes:**
  - Una corrida falló en `PanelCausaDetalle.test.tsx` (spec 003), con la máquina cargada. Pasó solo y en las corridas siguientes.
  - El test de inactividad de T18 fallaba a veces porque avanzaba el reloj simulado antes de que corrieran los efectos. Se corrigió en T19.
- **Formato:** `api/src/causas/causas.controller.ts` (spec 002) no pasa `prettier --check` por los finales de línea CRLF de su copia de trabajo. Ya estaba así y esta spec no lo toca.
- **Pendientes del despliegue** (la aplicación todavía no está desplegada):
  - Probar en producción la redirección a HTTPS sin www (`http://www…`, `http://…`, `https://www…`, también con `?pagina=`), revisar que Hostinger no la duplique y pasarla de `R=302` a `R=301`.
  - Verificar que Hostinger (LiteSpeed) aplica `Cache-Control: no-store` a `index.html`.
  - Dejar `FRONTEND_ORIGINS` solo con `https://estudio.com`.
  - Reemplazar la dirección y el WhatsApp genéricos de `web/src/servicios/datos-estudio.ts` por los reales.

## Criterios de finalización

- [x] Todos los RF con al menos un test en verde.
- [x] Tests de que el cliente solo ve sus causas, de las respuestas indistinguibles, de los datos que recibe, de los ocultos fuera de la paginación, del orden y la paginación, del responsable y "Vos", del acceso, de la sesión de 20 minutos y del caché.
- [x] `pnpm test` y `pnpm lint` sin errores.
- [x] Demo manual (ver la guía siguiente): completada sin errores el 2026-10-08.

## Guía de la demo manual

Contra la base de **desarrollo**. Cada paso dice qué hacer y qué tenés que ver; si algo no coincide, anotá el número de paso.

### Preparación

1. Levantar todo con `pnpm dev` y abrir `http://localhost:5173/ingresar`. Esta spec no tiene migraciones.
2. Con un abogado, crear dos clientes, **A** y **B**, y estas causas:
   - Una En trámite y una Finalizada, con **A** como parte.
   - Una con **A** y **B** como partes, más una parte no cliente.
   - Una con **B** como única parte cliente.
   - Una con **A**, que después se desactiva.
3. En la causa compartida, cargar movimientos visibles con y sin texto para el cliente (uno de más de 300 caracteres), uno oculto, uno visible anulado, uno con fecha futura y uno anulado con fecha futura.

### 1. Lista de causas (RF-7 a RF-12)

1. Ingresar como **A**. El inicio muestra sus causas en "En curso" y "Archivadas y finalizadas", con la fecha del último movimiento correcta, sin la desactivada y sin totales.

### 2. Detalle y movimientos (RF-13 a RF-23)

1. Abrir la causa compartida y verificar:
   - Sus datos: expediente, juzgado, fuero y estado. "Sin asignar" aparece solo en el expediente o el juzgado de una causa que no los tiene cargados. Para verlo, abrir (o editar desde el panel) una causa sin juzgado o sin número de expediente; las partes nunca lo muestran.
   - Las partes, con "Vos" solo en **A** y sin documentos.
   - El responsable, el contacto del estudio y el botón de WhatsApp.
2. En los movimientos:
   - El oculto no aparece.
   - El anulado muestra "Anulado", el futuro "Fecha futura" y el anulado futuro solo "Anulado".
   - El largo se despliega con "Ver más" y se vuelve a recortar con "Ver menos", en el mismo lugar.
   - Cada uno muestra el texto que corresponde.
3. "Abrir" un movimiento y "Volver a la causa": vuelve a la misma página.

### 3. Respuestas indistinguibles (RF-28, RF-29)

1. Cambiando la dirección, pedir la causa de **B**, la desactivada, una inexistente y una con letras en el id: todas muestran "No existe esa causa".
2. Lo mismo con el movimiento oculto, uno inexistente y uno con letras: "No existe ese movimiento".

### 4. Siguiente acción (RF-3)

1. Con el abogado, desactivar al responsable, desvincular a **A** de una causa y ocultar un movimiento visible.
2. Como **A**, sin volver a ingresar, actualizar la página:
   - El responsable ya no se muestra.
   - La causa desvinculada desapareció.
   - El movimiento ya no se ve.

### 5. Otro cliente (RF-14)

1. Ingresar como **B**: ve la causa compartida igual que **A**, con "Vos" en su propia parte.

### 6. Sesión y caché (RF-4 a RF-6)

1. Cerrar sesión y volver atrás con el navegador: no se ve ningún dato y lleva al ingreso.
2. Ingresar de nuevo y dejar pasar 20 minutos sin tocar nada: la pantalla vuelve al ingreso con "Tu sesión se cerró por inactividad. Volvé a ingresar".

### 7. Celular (RNF de plataformas, RF-19)

1. Repetir los pasos 1 y 2 desde un celular, o con el navegador en 360 px de ancho: sin desplazamiento horizontal, y el botón de WhatsApp no tapa la paginación, "Ver más", "Ver menos" ni el final de la página.

## Veredicto

La spec 004 está **cumplida**: los 30 RF y el cambio de RF-12 de la spec 001 tienen tests en verde, `pnpm test` y `pnpm lint` pasan, y la demo manual se completó sin errores el 2026-10-08. Quedan las verificaciones de "Pendientes del despliegue", que se hacen al desplegar la aplicación.
