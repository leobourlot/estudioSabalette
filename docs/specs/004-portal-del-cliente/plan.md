# Plan 004 — Portal del cliente

Implementa `spec.md` de esta carpeta. Respeta `docs/constitution.md` y se apoya en lo construido en las specs 001 a 003: guards globales y roles, `ClientLinkService` (vínculo cliente-causa), `ClientVisibilityService` (regla de visibilidad), `toMovimientoCliente`, filtro global de errores sin datos, cliente HTTP, `TextoLiteral` y las funciones de presentación de causas y movimientos. Cada sección indica entre corchetes los RF que cubre.

Incluye además la corrección de la duración de la sesión que la spec 004 (RF-4) llevó a la spec 001 (RF-12): 20 minutos sin uso para los clientes y 1 hora para los integrantes, extendida en cada consulta al servidor. A esa corrección se suma la redirección del sitio a su dirección definitiva, sin www y con HTTPS. Ver "Sesión por rol".

No se agregan dependencias ni variables de entorno.

## Arquitectura

### Módulos de NestJS (`api/src/`)

| Carpeta | Contenido | RF |
|---|---|---|
| `portal/` (nuevo) | Ver detalle debajo. | RF-1 a RF-3, RF-7 a RF-17, RF-20 a RF-30 |
| `movimientos/visibilidad-cliente.service.ts` | `canSeeCausa` pasa a ser público. `listVisible` devuelve `haySiguiente` en lugar de `total`. `findVisible` recibe también la causa. Nuevo `lastVisibleDates`. Ver "Visibilidad para el cliente". | RF-8, RF-20, RF-24, RF-26, RF-29 |
| `movimientos/movimiento-detalle.ts` | `MovimientoCliente` suma `esFechaFutura`. | RF-21 |
| `autenticacion/` | Duración de la sesión por rol y extensión en cada consulta. Ver "Sesión por rol". | RF-4; spec 001, RF-12 |
| `configurar-aplicacion.ts` | Encabezado `Cache-Control: no-store` en todas las respuestas de la API. | RF-6 |
| `app.module.ts` | Importa `PortalModule`. | — |

Contenido de `portal/`:
- `portal.module.ts`: importa `CausasModule` (por `ClientLinkService`) y `MovimientosModule` (por `ClientVisibilityService`), que ya los exportan, y `TypeOrmModule.forFeature([Causa])`.
- `portal.controller.ts` y `portal.service.ts`: lista de causas, detalle de una causa, movimientos de una causa y un movimiento.
- `reglas-portal.ts`: reglas puras, sin acceso a la base (grupo de una causa, orden de la lista, orden y nombre de las partes, página).
- `portal-detalle.ts`: armado explícito de las respuestas.
- `dto/pagina-portal.dto.ts`.

`portal.controller.ts` lleva `@Roles('cliente')`. Los guards globales de la spec 001 rechazan a los visitantes (401), a los integrantes (403) y a los clientes con cambio de contraseña pendiente (403) antes de llegar al controller [RF-1]. El controller solo tiene rutas `GET`: cualquier otro método no existe y responde 404 [RF-2]. Solo valida con DTO y pipes y delega (principio 3).

### Carpetas de `web/src/`

| Carpeta | Contenido | RF |
|---|---|---|
| `servicios/portal.ts` (nuevo) | Tipos y una función por endpoint de `/api/portal/causas`. | RF-7, RF-13, RF-20, RF-22 |
| `servicios/presentacion-portal.ts` (nuevo) | Títulos de los grupos y agrupación de una página de causas, "Sin asignar", leyenda de un movimiento, recorte del texto a 300 caracteres y lectura del número de página de la dirección. | RF-9, RF-10, RF-13, RF-21, RF-25 |
| `servicios/datos-estudio.ts` (nuevo) | Nombre, dirección y WhatsApp del estudio, y el enlace de WhatsApp. Datos genéricos hasta tener los reales. | RF-18, RF-19 |
| `servicios/inactividad.ts` (nuevo) | Límite de inactividad del cliente y la regla de vencimiento, sin temporizadores. | RF-4, RF-5 |
| `servicios/cliente-http.ts` | Suma `onActivity`: avisa cada vez que se envía una petición a la API. | RF-5 |
| `componentes/` | Nuevos: `ListaCausasPortal.tsx`, `DatosCausaPortal.tsx`, `PartesPortal.tsx`, `MovimientosPortal.tsx`, `TarjetaMovimientoPortal.tsx`, `Paginacion.tsx`, `BloqueContactoEstudio.tsx` y `BotonWhatsapp.tsx`. `DisenoPortal.tsx` suma el bloque de contacto, el botón de WhatsApp, el enlace "Cambiar contraseña" y el espacio inferior para el botón. `ProveedorServicios.tsx` suma el servicio del portal. `ProveedorSesion.tsx` suma el control de inactividad del cliente y la recarga al volver desde la caché del navegador. | RF-2, RF-5, RF-6, RF-18, RF-19 |
| `paginas/` | `PortalInicio` se reescribe (lista de causas). Nuevas: `PortalCausaDetalle` y `PortalMovimientoDetalle`. `PaginaCambiarContrasena` suma el botón de WhatsApp para los clientes. | RF-7 a RF-29 |
| `RutasAplicacion.tsx` | Rutas nuevas del portal. | — |

Nada en `src/servicios/` importa React (principio 3).

### Archivos existentes que se modifican
- `api/src/movimientos/visibilidad-cliente.service.ts` y `api/src/movimientos/movimiento-detalle.ts`, con sus tests (`visibilidad-cliente.e2e-spec.ts` y el unitario de `movimiento-detalle.ts`).
- `api/src/autenticacion/constantes.ts`, `autenticacion.service.ts`, `autenticacion.guard.ts` y `cookies-de-sesion.ts`, con sus tests (`autenticacion.service.spec.ts`, `autenticacion.guard.spec.ts` y `renovacion.e2e-spec.ts`). El comentario de `venceEn` en `usuarios/sesion.entity.ts`.
- `api/src/configurar-aplicacion.ts` y `api/src/app.module.ts`.
- Las utilidades de los e2e (`api/test/utilidades/datos-de-prueba.ts`), que suman una función para vincular un cliente a una causa como parte.
- `web/src/servicios/cliente-http.ts`, `web/src/componentes/ProveedorSesion.tsx`, `DisenoPortal.tsx`, `DisenoSeccion.tsx` (toma el nombre del estudio de `datos-estudio.ts`) y `ProveedorServicios.tsx`, con sus tests.
- `web/src/paginas/PortalInicio.tsx` y `PaginaCambiarContrasena.tsx`, con sus tests.
- `web/src/RutasAplicacion.tsx`.
- `web/public/.htaccess`. Ver "Caché del navegador" y "Dirección única del sitio".
- `docs/specs/001-autenticacion-y-roles/plan.md`. Ver "Sesión por rol".

## Entidades de TypeORM y migración

No hay entidades ni migración nuevas, y ninguna tabla cambia:
- Qué causas ve un cliente sale del vínculo calculado de la spec 002 (`partes.vigente`, `partes.clienteId` y `causas.activa`), sin tabla propia.
- Los datos de contacto del estudio están en el código del frontend (RF-18, principio 5).
- La sesión por rol solo cambia cómo se calcula `sesiones.venceEn`, que ya existe.

La fecha del último movimiento (RF-8) usa el índice `IDX_movimientos_historial (causaId, fecha, creadoEn, id)` de la spec 003. El e2e de rendimiento lo verifica. Si no alcanzara los 2 segundos, se agregaría con una migración un índice `(causaId, visible, anulado, fecha)`.

## Contrato de la API

Errores con el formato de las specs anteriores (`statusCode`, `message`, en español). Todas las respuestas de la API llevan `Cache-Control: no-store` [RF-6].

### Portal — `/api/portal/causas` (rol `cliente`) [RF-1, RF-2]

| Método y ruta | Respuesta | Errores | RF |
|---|---|---|---|
| `GET /?pagina` | 200 `{ items: CausaPortalResumen[], pagina, haySiguiente }` | 400 | RF-7 a RF-12, RF-24, RF-25 |
| `GET /:causaId` | 200 `CausaPortalDetalle` | 404 | RF-13 a RF-17, RF-28 |
| `GET /:causaId/movimientos?pagina` | 200 `{ items: MovimientoCliente[], pagina, haySiguiente }` | 400, 404 | RF-20, RF-21, RF-23 a RF-26, RF-28 |
| `GET /:causaId/movimientos/:movimientoId` | 200 `MovimientoClienteDetalle` | 404 | RF-22, RF-27 a RF-29 |

- Los movimientos se piden siempre dentro de su causa [RF-27].
- `pagina`: entero desde 1, por defecto 1, con la misma validación y el mismo mensaje de 400 que los listados existentes. Una página posterior a la última responde 200 con `items: []` y `haySiguiente: false` [RF-25]. La interfaz nunca envía un número inválido (ver "Rutas").
- Ninguna respuesta lleva totales: la paginación se resuelve con `haySiguiente` [RF-24].

**Tipos** [RF-30]:
- `CausaPortalResumen`: `{ id, caratula, numeroExpediente, estado, grupo: 'en_curso' | 'archivadas_y_finalizadas', fechaUltimoMovimiento: 'AAAA-MM-DD' | null }`.
- `CausaPortalDetalle`: `{ id, caratula, numeroExpediente, juzgado, fuero, estado, esIncidente, expedientePrincipal, partes: PartePortal[], responsable: { nombre, apellido } | null }`.
- `PartePortal`: `{ nombre, rol, esVos }`. `nombre` es un solo texto: "Nombre Apellido" o la razón social. No lleva `id`, `tipoPersona`, DNI, CUIT, `clienteId` ni si es cliente [RF-14, RF-15]. Las partes van ya ordenadas.
- `MovimientoCliente` (spec 003, ampliado): `{ id, fecha, tipo, texto, anulado, esFechaFutura }`.
- `MovimientoClienteDetalle`: `MovimientoCliente` más `{ causa: { id, caratula } }` [RF-22].

**Mensajes de 404** [RF-28, RF-29]. Son los de la spec 003 (`MOVIMIENTOS_MESSAGES`):
- "No existe esa causa": causa no vinculada, desactivada, inexistente o con un id que no es un número, en las cuatro rutas.
- "No existe ese movimiento": movimiento oculto, inexistente, de otra causa o con un id que no es un número, dentro de una causa que el cliente puede ver.

Los ids se leen con `ParseIntPipe` y un `exceptionFactory` que responde esos mismos 404, como en `movimientos.controller.ts`. Así un id mal formado recibe exactamente la misma respuesta que uno inexistente.

### Sesión — `/api/sesion` (sin cambios de contrato)
Las rutas son las de la spec 001. Cambian el vencimiento de la sesión, que ahora depende del rol y se extiende en cada consulta, y la vida de la cookie de renovación. Ver "Sesión por rol".

## Reglas de negocio

Las reglas que no necesitan la base viven en `portal/reglas-portal.ts` como funciones puras, igual que `reglas-causas.ts` y `reglas-movimientos.ts`:
- `caseGroup(estado)`: `en_curso` para En trámite y Paralizada; `archivadas_y_finalizadas` para Archivada y Finalizada [RF-10].
- `comparePortalCausas(a, b)`: orden de RF-11 (ver debajo).
- `portalParty(parte, clienteId)`: el `PartePortal` de una parte, con su clave de orden [RF-14].
- `comparePortalParties(a, b)`: por rol procesal (Actor, Demandado, Tercero, Otro) y después por apellido (o razón social) y nombre [RF-14].
- `pageOf(items, pagina, porPagina)`: `{ items, pagina, haySiguiente }` de una lista ya ordenada.

Las comparaciones de textos usan `Intl.Collator('es', { sensitivity: 'base' })`: no distinguen mayúsculas, minúsculas ni tildes, y ordenan la ñ como en español.

### Acceso y vínculo [RF-1, RF-3, RF-28]
- El vínculo se decide siempre con `ClientLinkService` y la visibilidad con `ClientVisibilityService`, en cada petición. El portal no tiene reglas propias de acceso. Por eso un cambio en el vínculo, en la causa, en los movimientos o en la cuenta rige desde la siguiente petición del cliente [RF-3].
- `ClientVisibilityService.canSeeCausa(clienteId, causaId)` (cuenta de cliente activa y vínculo vigente) es la verificación de la causa en las rutas de detalle y de movimientos. Si falla: 404 "No existe esa causa".

### Lista de causas [RF-7 a RF-12, RF-24, RF-25]
```
listCausas(cliente, pagina, ahora):
  ids = ClientLinkService.linkedCausaIds(cliente.id)                  // RF-7: cualquier estado
  si ids está vacío: devolver { items: [], pagina, haySiguiente: false } // RF-12
  causas = SELECT id, caratula, numeroExpediente, estado FROM causas WHERE id IN (ids)
  fechas = ClientVisibilityService.lastVisibleDates(ids, todayInBuenosAires(ahora))  // RF-8
  filas = cada causa con grupo = caseGroup(estado) y fechaUltimoMovimiento = fechas[id] ?? null
  ordenar filas con comparePortalCausas                                // RF-10, RF-11
  devolver pageOf(filas, pagina, 20)                                   // RF-24, RF-25
```
`comparePortalCausas`:
1. Grupo: `en_curso` primero.
2. `fechaUltimoMovimiento` descendente; las que no tienen, al final de su grupo.
3. Carátula, con el collator.
4. `id` descendente: a igual carátula, primero la última registrada.

El orden termina en `id`, que es único, así que con los mismos datos siempre es el mismo [RF-11]. Se ordena y pagina en memoria: la spec acota a 100 causas por cliente, y así el orden queda en una función pura testeable, con la ñ ordenada como en español (ver "Otras decisiones técnicas").

### Detalle de la causa [RF-13 a RF-17]
```
getCausa(cliente, causaId):
  si no canSeeCausa(cliente.id, causaId): 404 "No existe esa causa"
  causa = causa con responsable y partes vigentes (con cliente.usuario si son clientes)
  devolver toCausaPortalDetalle(causa, cliente.id)
```
- Partes: solo las vigentes [RF-15]. Para cada una se usa `partyIdentity` de la spec 002, que ya toma los datos de la cuenta en las partes cliente [RF-14]. `portalParty` arma el nombre ("Nombre Apellido" o la razón social), el rol y `esVos = (parte.clienteId === cliente.id)`, y descarta el resto.
- Responsable: `{ nombre, apellido }` si `responsable.activo`; si no, `null` [RF-16]. No se cargan los colaboradores.
- No se envían la auditoría, `activa` ni el aviso de responsable desactivado [RF-17].

### Movimientos [RF-20 a RF-23, RF-26, RF-29]
```
listMovimientos(cliente, causaId, pagina, ahora):
  página = ClientVisibilityService.listVisible(cliente.id, causaId, pagina, ahora)
  si página es null: 404 "No existe esa causa"
  devolver página

getMovimiento(cliente, causaId, movimientoId, ahora):
  si no canSeeCausa(cliente.id, causaId): 404 "No existe esa causa"            // RF-27, RF-28
  mov = ClientVisibilityService.findVisible(cliente.id, causaId, movimientoId, ahora)  // 404 de RF-29
  causa = SELECT id, caratula FROM causas WHERE id = causaId
  devolver { ...mov, causa }
```

### Visibilidad para el cliente (cambios en la spec 003) [RF-8, RF-20, RF-21, RF-24, RF-26, RF-29]
`ClientVisibilityService` sigue siendo la única regla de qué movimientos ve un cliente (spec 003, RF-30). Los cambios:
- `canSeeCausa(clienteId, causaId)` pasa de privado a público.
- `listVisible(clienteId, causaId, pagina, ahora)` pide 21 filas y devuelve `{ items, pagina, haySiguiente }`, sin `total` [RF-24]. La condición (`visible = 1`, anulados incluidos) y el orden (`fecha DESC, creadoEn DESC, id DESC`) no cambian [RF-20]. Como cuenta y pagina solo sobre los visibles, los ocultos no dejan rastro [RF-26].
- `findVisible(clienteId, causaId, movimientoId, ahora)` busca con `id`, `causaId` y `visible = 1`. Si no hay fila o el cliente no puede ver la causa: 404 "No existe ese movimiento" [RF-29].
- `lastVisibleDates(causaIds, hoy)` devuelve un mapa de causa a fecha:
  ```
  SELECT causaId, MAX(fecha) FROM movimientos
  WHERE causaId IN (:causaIds) AND visible = 1 AND anulado = 0 AND fecha <= :hoy
  GROUP BY causaId
  ```
  Es la fecha del último movimiento de RF-8. La condición `visible = 1` es la misma regla de visibilidad. No verifica el vínculo: lo recibe ya resuelto de `listCausas`.
- `toMovimientoCliente(m, ahora)` suma `esFechaFutura = !m.anulado && isFutureDate(m.fecha, ahora)`. Un anulado nunca lleva "Fecha futura" [RF-21]. Sigue sin incluir la descripción cuando hay texto para el cliente, ni autores, fechas de registro o cambios (spec 003, RF-31).

`ahora` es un parámetro, igual que en `reglas-movimientos.ts`, para testear el cambio de día.

### Respuestas [RF-30]
`portal-detalle.ts` arma `CausaPortalResumen`, `CausaPortalDetalle` y `PartePortal` campo por campo, nunca a partir de la entidad completa, como `causa-detalle.ts` y `movimiento-detalle.ts`. Los tests comparan las claves exactas de cada respuesta, así que agregar un dato por error rompe un test.

## Sesión por rol [RF-4 a RF-6; spec 001, RF-12]

Hoy `venceEn` se corre a ahora + 7 días solo al renovar el token de acceso, que dura 15 minutos. Con 20 minutos eso no sirve: un cliente cuya última petición fue justo antes de una renovación quedaría afuera unos 6 minutos después de esa petición. Por eso la sesión pasa a extenderse en cada consulta al servidor.

### Duración
`autenticacion/constantes.ts` reemplaza `SESSION_TTL_MS` por:
```
SESSION_IDLE_TTL_MS = { cliente: 20 min, admin: 60 min, abogado: 60 min }
sessionTtlMs(rol) = SESSION_IDLE_TTL_MS[rol]
REFRESH_COOKIE_MAX_AGE_MS = 60 min + ACCESS_TOKEN_TTL (15 min)
```

### Extensión en cada consulta
```
ingresar(...):                         // como en la spec 001, salvo:
  credenciales = buscar por email (id, contrasenaHash, activo, rol)
  crear sesión(..., venceEn = ahora + sessionTtlMs(credenciales.rol))

guard de autenticación (cada petición que no es @Public):
  validar token, sesión y usuario como en la spec 001                  // 401 si la sesión venció
  UPDATE sesiones SET venceEn = ahora + sessionTtlMs(usuario.rol)
    WHERE id = sesión.id AND revocadaEn IS NULL                         // no revive una sesión cerrada

renovar(...):                          // como en la spec 001, salvo:
  ... venceEn = ahora + sessionTtlMs(sesión.usuario.rol)
```
- Cuenta como uso cada petición autenticada, también `GET /sesion/usuario`, y cada renovación (spec 001, RF-12). `POST /sesion/cerrar` no extiende nada.
- El rol se lee de la base en cada petición (spec 001, RF-14), así que la duración siempre corresponde al rol vigente.
- El token de acceso sigue durando 15 minutos, menos que la sesión más corta, así que siempre se pasa por el guard o por la renovación antes de que la sesión venza.

### Cookies
La cookie de renovación pasa a vivir `REFRESH_COOKIE_MAX_AGE_MS` (75 minutos) desde cada ingreso o renovación. El límite real lo pone `venceEn` en la base. La cookie solo tiene que durar lo suficiente: la última petición ocurre a lo sumo 15 minutos después de la última renovación (lo que dura el token de acceso), y la sesión vence a lo sumo una hora después de esa petición.

### Caché del navegador [RF-6]
- La API responde `Cache-Control: no-store` en todas sus respuestas, con un middleware de Express en `configurar-aplicacion.ts`. Se aplica a toda la API y no solo al portal: ninguna respuesta de la API debe quedar guardada en el navegador.
- `web/public/.htaccess` agrega `Cache-Control: no-store` solo para `index.html`, dentro de `<IfModule mod_headers.c>`. Así el navegador no guarda la página en su caché de ida y vuelta (la del botón "atrás"). Los archivos de JavaScript y CSS, que tienen hash en el nombre y no llevan datos, se siguen guardando.
- Como segunda barrera, `ProveedorSesion` escucha `pageshow`: si la página vuelve desde esa caché (`event.persisted`), recarga la aplicación, que vuelve a preguntar a la API quién es el usuario.

### Inactividad en la pantalla [RF-4, RF-5]
El servidor cierra la sesión a los 20 minutos, pero no puede avisarle a una pantalla que no hace peticiones. Para que esa pantalla no siga mostrando datos:
```
servicios/inactividad.ts:
  CLIENT_IDLE_LIMIT_MS = 20 * 60_000
  isIdleExpired(ultimaActividad, ahora, limite) = ahora - ultimaActividad >= limite

cliente-http.ts: onActivity(listener) — se llama al enviar cada petición, también la renovación

ProveedorSesion, mientras usuario.rol == 'cliente':
  ultimaActividad = ahora al cargar; se actualiza con onActivity
  cada 30 segundos, y al volver a la pestaña (visibilitychange y focus):
    si isIdleExpired(...): endSession("Tu sesión se cerró por inactividad. Volvé a ingresar")
```
- `endSession` vacía el usuario. `RutaProtegida` lleva a `/ingresar`, y las páginas del portal se desmontan con sus datos [RF-5].
- No llama a la API: la sesión ya venció en el servidor, y una llamada la extendería si otra pestaña la mantuvo viva. Cada pestaña mide su propia actividad: una pestaña quieta se vacía aunque otra siga en uso, y volver a abrirla recupera la sesión si sigue viva.
- Se compara con la hora y no se cuenta con el temporizador, porque los temporizadores se frenan con la computadora suspendida.
- Las demás formas de cierre (otro dispositivo, desactivación, restablecimiento) se detectan en la siguiente petición. El cliente HTTP avisa la sesión cerrada (spec 001), `ProveedorSesion` vacía el usuario y la pantalla descarta los datos.
- Los datos de cada página viven solo en el estado de sus componentes. Al cerrar sesión o ingresar con otra cuenta se desmontan, así que no queda nada de la sesión anterior [RF-5].

### Dirección única del sitio
Junto con la corrección de la sesión, `web/public/.htaccess` suma una redirección a la dirección definitiva del sitio, sin www y con HTTPS:
```
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off [OR]
  RewriteCond %{HTTP_HOST} ^www\. [NC]
  RewriteCond %{HTTP_HOST} ^(?:www\.)?(.+)$ [NC]
  RewriteRule ^ https://%1%{REQUEST_URI} [R=302,L]
  ...reglas existentes que sirven index.html
</IfModule>
```
- Va antes de las reglas que sirven `index.html`, y en un solo salto lleva `http://www…`, `http://…` y `https://www…` a `https://` sin www. `%{REQUEST_URI}` conserva la ruta y los parámetros: `www.estudio.com/portal/causas/5?pagina=2` lleva a `estudio.com/portal/causas/5?pagina=2`.
- El dominio no queda escrito en la regla: se toma del pedido, así que el mismo archivo sirve para cualquier dominio.
- Se publica con `R=302`. Recién después de verificar en producción que funciona se pasa a `R=301`, porque los navegadores guardan las redirecciones permanentes indefinidamente. Antes de publicarla se revisa que el panel de Hostinger no haga ya alguna de estas redirecciones, para no duplicarlas.
- En producción, `FRONTEND_ORIGINS` puede quedar solo con `https://estudio.com`. Esa variable vive en Easypanel: este plan no la toca y queda como aviso para el despliegue.

### Plan de la spec 001
En la misma tarea y el mismo commit que el código (principio 2), `docs/specs/001-autenticacion-y-roles/plan.md` se actualiza en:
- La tabla `sesiones`: la nota de `venceEn`.
- "Credenciales": la vida de la cookie de renovación.
- "Ingreso", "Cada petición protegida" y "Renovación": el pseudocódigo de esta sección.
- "Topología": la dirección definitiva sin www y con HTTPS, y la redirección del `.htaccess`.
- "Cobertura de RF": RF-12 suma el guard.

`tasks.md` y `validacion.md` de la spec 001 no se tocan: registran lo que se hizo y validó en su momento.

## Frontend

### Rutas
| Ruta | Página | Acceso |
|---|---|---|
| `/portal?pagina` | `PortalInicio`: lista de causas en sus dos grupos, con paginación. | cliente |
| `/portal/causas/:id?pagina` | `PortalCausaDetalle`: datos, partes, responsable y movimientos de la página indicada. | cliente |
| `/portal/causas/:id/movimientos/:movimientoId?pagina` | `PortalMovimientoDetalle`: el movimiento completo, la carátula y "Volver a la causa", a la página de movimientos indicada. | cliente |
| `/portal/mi-cuenta` | `MiCuenta` (spec 001), sin cambios. | cliente |
| `/cambiar-contrasena` | `PaginaCambiarContrasena` (spec 001), con el botón de WhatsApp si el usuario es cliente. | Con sesión |

- Las rutas del portal quedan dentro de `DisenoPortal`, así que `RutaProtegida` aplica las reglas de la spec 001: un visitante va a `/ingresar`, un integrante va al panel y un cliente con cambio pendiente va a `/cambiar-contrasena` [RF-1].
- La página está en la dirección (`?pagina=`) y no en el estado, para que "Volver a la causa" y el botón "atrás" lleven a la misma página [RF-22]. No se guarda nada en `localStorage` ni `sessionStorage` (principio 5).
- `parsePageParam(texto)` acepta solo enteros desde 1, y sin parámetro devuelve 1. Si la dirección trae otra cosa, la página no pide nada a la API y no muestra causas, movimientos ni mensajes de vacío, como una página inexistente [RF-25].

### Comportamiento de la interfaz
- **Diseño** (`DisenoPortal`): encabezado de la spec 001 con "Mis causas", "Mi cuenta" y "Cambiar contraseña" [RF-2]. Debajo de la página, `BloqueContactoEstudio` [RF-18]. Siempre visible, `BotonWhatsapp` [RF-19]. El contenido lleva un margen inferior mayor que el botón, así que al llegar al final todo se puede ver y usar.
- **Lista de causas** (`PortalInicio`, `ListaCausasPortal`) [RF-7 a RF-12]:
  - `groupCausas(items)` agrupa la página en orden. Cada grupo lleva su título ("En curso" o "Archivadas y finalizadas"), así que un grupo que sigue en la página siguiente repite su título, y un grupo sin causas no aparece [RF-10].
  - Cada causa es una tarjeta con enlace al detalle. La carátula usa `line-clamp-2` (incluida en Tailwind 3.4) para cortarse en dos líneas con "…". También muestra el número de expediente o "Sin asignar", el estado y, si tiene, "Último movimiento: dd/mm/aaaa" con `formatMovementDate` [RF-9].
  - Página 1 sin causas: "No tenés causas para consultar" [RF-12]. Otra página sin causas: nada [RF-25].
- **Detalle** (`PortalCausaDetalle`) [RF-13 a RF-17]:
  - `DatosCausaPortal`: carátula completa, número de expediente, juzgado, fuero y estado con las etiquetas de `presentacion-causas.ts`, "Sin asignar" en los opcionales vacíos, e `incidentLabel` si es incidente.
  - `PartesPortal`: nombre, rol procesal y la etiqueta "Vos" en la propia parte, en el orden que llega.
  - "Responsable de la causa: Nombre Apellido", solo si `responsable` no es `null`.
  - Si la API responde 404, la página muestra solo el mensaje ("No existe esa causa") [RF-28].
- **Movimientos** (`MovimientosPortal`, `TarjetaMovimientoPortal`) [RF-20 a RF-23]:
  - Cada movimiento muestra la fecha, el tipo (`tipoMovimientoLabel`), la leyenda "Anulado" o "Fecha futura" según `movementLegend(m)`, y el texto con `TextoLiteral`.
  - `truncateClientText(texto)` corta en 300 caracteres, contados en puntos de código como en la spec 003, y agrega "…". "Ver más" muestra el texto completo en el mismo lugar y "Ver menos" lo vuelve a recortar, sin otra petición, porque la API ya lo envió [RF-21].
  - "Abrir" lleva al movimiento con la página actual en la dirección.
  - Página 1 sin movimientos: "Todavía no hay movimientos para mostrar" [RF-23].
- **Movimiento** (`PortalMovimientoDetalle`) [RF-22, RF-29]: el movimiento completo, la carátula y "Volver a la causa" (`/portal/causas/:id?pagina=N`). Ante un 404 muestra solo el mensaje de la API.
- **Paginación** (`Paginacion`) [RF-24]: solo "Anterior" (si la página es mayor que 1) y "Siguiente" (si `haySiguiente`), como enlaces con `?pagina=`. Nunca muestra totales.
- **Celular** [RNF de plataformas]: tarjetas en una columna en lugar de tablas, `break-words` en carátulas, nombres y textos, y márgenes de 16 px a 360 px de ancho.

### Datos de contacto [RF-18, RF-19]
- `servicios/datos-estudio.ts` exporta `STUDIO_CONTACT = { nombre, direccion, whatsapp }` y `whatsappUrl()`, que arma `https://wa.me/<número>` sin mensaje precargado. El nombre es "Estudio Sabalette", el que ya muestra el encabezado. La dirección y el número son genéricos y están marcados en el código para reemplazarlos cuando el estudio informe los reales. `DisenoSeccion` toma el nombre de ahí, para que haya una sola fuente. La spec 007 usará la misma.
- `BloqueContactoEstudio`: nombre, dirección como texto y WhatsApp como enlace (`target="_blank"`, `rel="noopener noreferrer"`).
- `BotonWhatsapp`: enlace fijo abajo a la derecha (`fixed bottom-4 right-4`), con un ícono SVG propio y `aria-label="Escribinos por WhatsApp"`. Está en `DisenoPortal` y, para los clientes, en `PaginaCambiarContrasena`, que no muestra el bloque de contacto. Lo pide RF-19, que excluye esa pantalla solo de RF-18.

## Dependencias nuevas

Ninguna. Todo se resuelve con lo instalado en las specs 001 a 003. El ícono de WhatsApp es un SVG propio, sin biblioteca de íconos.

## Otras decisiones técnicas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Módulo `portal/` con rutas `/api/portal/...` y `@Roles('cliente')` | Rutas de cliente dentro de `causas/` y `movimientos/` | Separa por completo lo que ve un cliente de lo que ve un integrante. Ningún endpoint del panel cambia, y las respuestas del portal se arman aparte, con solo los datos de RF-30. |
| Reutilizar `ClientLinkService` y `ClientVisibilityService`, ampliándolos | Consultas propias del portal | Las specs 002 y 003 los definieron como la única regla. El portal no inventa la suya. |
| Orden y paginación de la lista de causas en memoria | Una sola consulta SQL con el orden y `LIMIT` | La spec acota a 100 causas por cliente. Así el orden queda en una función pura testeable, ordena la ñ como en español (la intercalación de la base la iguala con la n) y no repite en SQL la regla del vínculo. |
| `haySiguiente` pidiendo una fila de más | `total` en la respuesta | RF-24 prohíbe mostrar totales y RF-30 no enviar datos que no se muestran. |
| Nombre de la parte en un solo texto | Enviar `nombre`, `apellido` y `razonSocial` | Con campos separados, cuáles vienen llenos revela el tipo de persona (RF-15). |
| `esFechaFutura` calculado por la API | Calcularlo en el navegador | Mismo motivo que en la spec 003: el día sale del reloj del servidor en Buenos Aires. |
| Texto completo en la respuesta y recorte en la interfaz | Recortar en la API y pedir el texto completo aparte | "Ver más" no necesita otra petición. Son unos 40 KB por página como máximo, como en el panel. |
| Página en la dirección | Página en el estado del componente | RF-22 pide volver a la misma página, también después de recargar. |
| Extender `venceEn` en el guard en cada petición | Extenderla solo al renovar | Con 20 minutos, la renovación cada 15 minutos deja una ventana de inactividad real de entre 5 y 20 minutos. La spec 001 (RF-12) cuenta como uso cada consulta. |
| Un `UPDATE` por petición | Extender solo si pasó más de un minuto desde la última vez | Es una escritura corta por clave primaria y el volumen del estudio es bajo. Mantiene exacta la regla de los 20 minutos. |
| Cookie de renovación de 75 minutos | Cookie de sesión del navegador, sin vencimiento | El límite real está en la base. Una cookie de sesión del navegador sobrevive a "restaurar pestañas". |
| `Cache-Control: no-store` en toda la API | Solo en `/api/portal` | Ninguna respuesta de la API debe guardarse en el navegador. Un solo middleware evita olvidarlo en las rutas nuevas. |
| Control de inactividad por pestaña, sin llamar a la API | Compartir la actividad entre pestañas con `localStorage` | La constitución prohíbe guardar datos de casos en `localStorage`. Y llamar a la API para cerrar la sesión podría cortar una pestaña que sigue en uso. |
| Datos de contacto en el frontend | Endpoint de la API con los datos del estudio | Son públicos y fijos, y el principio 5 los admite en el código. El sitio público (spec 007) los va a necesitar sin sesión. |
| SVG propio para WhatsApp | Biblioteca de íconos | Un solo ícono no justifica una dependencia (principio 1). |

## Estrategia de tests

### api — unitarios (Vitest)
- `reglas-portal.ts` [RF-10, RF-11, RF-14, RF-24, RF-25]:
  - `caseGroup` para cada estado.
  - `comparePortalCausas`: grupo; fecha descendente; sin fecha al final del grupo; carátula sin distinguir mayúsculas ni tildes y con la ñ después de la n; `id` descendente a igual carátula.
  - `portalParty` y `comparePortalParties`: persona física, persona jurídica cliente y no cliente, orden por rol y después por apellido o razón social y nombre, y `esVos` solo para la parte del cliente que consulta.
  - `pageOf`: primera página, última página, página posterior a la última y `haySiguiente`.
- `portal-detalle.ts` [RF-13 a RF-17, RF-30]: las claves exactas de cada respuesta. Ninguna incluye `dni`, `cuit`, `tipoPersona`, `clienteId`, ids de partes o integrantes, emails, colaboradores, `activa` ni auditoría. El responsable desactivado es `null`.
- `movimiento-detalle.ts` [RF-21]: `esFechaFutura` falso en un anulado con fecha futura. Lo existente de `toMovimientoCliente` se mantiene.
- Sesión [RF-4; spec 001, RF-12]:
  - `sessionTtlMs` para cada rol.
  - `autenticacion.service.spec.ts`: el ingreso y la renovación fijan `venceEn` según el rol (reemplaza las verificaciones de 7 días).
  - `autenticacion.guard.spec.ts`: cada petición extiende `venceEn` según el rol, y no se extiende una sesión vencida ni revocada.
  - `cookies-de-sesion`: la cookie de renovación dura 75 minutos.

### api — e2e (Vitest + Supertest, base de tests)
Mismo esquema que en las specs anteriores: migraciones sobre la base de tests, tablas vaciadas al empezar cada suite, ejecución en serie.
- **Acceso** [RF-1, RF-2, RF-6]: un visitante recibe 401; un administrador, un abogado y un cliente con cambio pendiente reciben 403 en cada ruta del portal. `POST` y `PATCH` sobre las rutas del portal responden 404. Toda respuesta, de la API del portal y de la del panel, lleva `Cache-Control: no-store`.
- **Lista de causas** [RF-7 a RF-12, RF-24, RF-25]:
  - Solo las causas vinculadas, incluidas una Archivada y una Finalizada. No aparecen una desactivada, una con el cliente desvinculado ni una de otro cliente.
  - Grupos y orden con la fecha del último movimiento. Esa fecha no cuenta los ocultos, los anulados ni los de fecha futura, y cambia con el día de Buenos Aires (con `ahora` controlado en el service).
  - Con 45 causas, las tres páginas no repiten ni omiten ninguna, y ninguna respuesta incluye `total`. Una página posterior a la última devuelve `items` vacío. `pagina=0` y `pagina=abc` responden 400.
  - Cliente sin causas: `items` vacío.
- **Detalle de la causa** [RF-13 a RF-17, RF-30]: claves exactas; "Vos" en la parte propia; dos clientes en la misma causa; cliente persona jurídica con su razón social; parte desvinculada ausente; responsable activo y desactivado. Un recorrido recursivo de la respuesta no encuentra claves prohibidas.
- **Respuestas indistinguibles** [RF-27 a RF-29]:
  - Causa de otro cliente, desactivada, inexistente y `abc`: las cuatro rutas responden el mismo cuerpo 404, comparado byte a byte.
  - Movimiento oculto, inexistente, de otra causa vinculada y `abc`: el mismo cuerpo 404.
- **Movimientos** [RF-20 a RF-23, RF-26]:
  - Solo los visibles, anulados incluidos, en el orden del panel. El texto es el texto para el cliente o, si no hay, la descripción.
  - `esFechaFutura` en uno futuro y no en uno anulado futuro.
  - Con 45 visibles y 10 ocultos, la paginación recorre solo los visibles y no incluye `total`.
  - El detalle incluye la carátula.
- **Siguiente acción** [RF-3]: después de desvincular al cliente, desactivar la causa, ocultar un movimiento o desactivar al responsable, la siguiente petición ya refleja el cambio.
- **Rendimiento** [RNF]: con 100 causas vinculadas y 5.000 movimientos en una, cada ruta del portal responde en menos de 2 segundos.
- **Sesión por rol** [RF-4; spec 001, RF-12]:
  - El ingreso de un cliente fija `venceEn` a 20 minutos, y el de un integrante a 1 hora.
  - Una petición autenticada lo corre de nuevo. Con `venceEn` en el pasado, la petición responde 401 y la renovación también.
  - La renovación lo corre según el rol, y la cookie de renovación dura 75 minutos.
  - `renovacion.e2e-spec.ts` se adapta: reemplaza los 7 días por la duración del rol.
- **Visibilidad para el cliente** (spec 003): `visibilidad-cliente.e2e-spec.ts` se adapta a la nueva firma de `findVisible` (con un caso de movimiento de otra causa), a `haySiguiente` y a `lastVisibleDates`.

### web — Vitest
- `servicios/portal.ts` con `fetch` simulado: rutas y `pagina` [RF-7, RF-13, RF-20, RF-22].
- `servicios/presentacion-portal.ts` [RF-9, RF-10, RF-21, RF-25]:
  - `groupCausas` con una página que empieza a mitad de un grupo y otra con un solo grupo.
  - `truncateClientText` con 300 y 301 caracteres, también con caracteres de dos unidades en UTF-16.
  - `movementLegend` para cada combinación de anulado y fecha futura.
  - `parsePageParam` con vacío, `1`, `3`, `0`, `-1`, `1.5` y `abc`.
- `servicios/inactividad.ts` [RF-4, RF-5]: justo antes y justo después de los 20 minutos.
- `cliente-http.ts`: `onActivity` se llama una vez por petición, también al renovar [RF-5].
- `ProveedorSesion` con relojes simulados [RF-5, RF-6]:
  - Un cliente sin actividad durante 20 minutos queda sin usuario y con el aviso, sin llamar a la API.
  - Con actividad, no se vacía. Un integrante no se vacía por este control.
  - `pageshow` con `persisted` recarga la aplicación.
- `PortalInicio` con servicios simulados [RF-8 a RF-12, RF-24, RF-25]: títulos de grupo, "Sin asignar", fecha del último movimiento, mensaje de vacío solo en la página 1, nada en una página posterior a la última, y sin petición con `?pagina=abc`. "Anterior" y "Siguiente" sin totales.
- `PortalCausaDetalle` [RF-13 a RF-23, RF-28]: datos, incidente, partes con "Vos", responsable presente y ausente, leyendas, "Ver más" y "Ver menos" sin otra petición, mensaje de vacío, enlace "Abrir" con la página y mensaje de 404.
- `PortalMovimientoDetalle` [RF-22, RF-29]: texto completo, carátula, "Volver a la causa" a la misma página y mensaje de 404.
- `DisenoPortal` [RF-2, RF-18, RF-19]: enlace "Cambiar contraseña", bloque de contacto con el enlace de WhatsApp correcto y botón de WhatsApp. `PaginaCambiarContrasena`: botón sin bloque para un cliente, y nada para un integrante.
- `RutasAplicacion`: las rutas del portal no son accesibles para un integrante ni para un visitante [RF-1].
- Ninguna escritura en `localStorage` ni `sessionStorage` en el flujo del portal [RNF de persistencia].

## Cobertura de RF

| RF | Dónde se implementa | Test |
|---|---|---|
| RF-1 | `@Roles('cliente')`, guards de la spec 001, `RutaProtegida` | e2e de acceso, Vitest de rutas |
| RF-2 | Controller solo con `GET`, enlace "Cambiar contraseña" en `DisenoPortal` | e2e de acceso, Vitest |
| RF-3 | `ClientLinkService` y `ClientVisibilityService` en cada petición | e2e de siguiente acción |
| RF-4 | `sessionTtlMs`, extensión en el guard, `CLIENT_IDLE_LIMIT_MS` | Unitarios y e2e de sesión, Vitest de inactividad |
| RF-5 | Control de inactividad en `ProveedorSesion`, `endSession`, aviso de sesión cerrada del cliente HTTP | Vitest de `ProveedorSesion` y `cliente-http` |
| RF-6 | `Cache-Control: no-store` en la API y en `index.html`, `pageshow` | e2e de acceso, Vitest |
| RF-7, RF-12 | `listCausas`, `PortalInicio` | e2e de lista, Vitest |
| RF-8 | `lastVisibleDates` | e2e de lista |
| RF-9 | `CausaPortalResumen`, `ListaCausasPortal` | e2e de lista, Vitest |
| RF-10, RF-11 | `caseGroup`, `comparePortalCausas`, `groupCausas` | Unitarios, e2e de lista, Vitest |
| RF-13 a RF-17 | `getCausa`, `portal-detalle.ts`, `portalParty`, `DatosCausaPortal`, `PartesPortal` | Unitarios, e2e de detalle, Vitest |
| RF-18, RF-19 | `datos-estudio.ts`, `BloqueContactoEstudio`, `BotonWhatsapp` | Vitest, demo manual en el celular |
| RF-20, RF-23 | `listVisible`, `MovimientosPortal` | e2e de movimientos, Vitest |
| RF-21 | `toMovimientoCliente`, `movementLegend`, `truncateClientText` | Unitarios, Vitest |
| RF-22 | `getMovimiento`, `PortalMovimientoDetalle`, página en la dirección | e2e de movimientos, Vitest |
| RF-24 | `haySiguiente`, `Paginacion` | e2e de lista y movimientos, Vitest |
| RF-25 | `pageOf`, `parsePageParam` | Unitarios, e2e de lista, Vitest |
| RF-26 | `listVisible` cuenta solo los visibles | e2e de movimientos |
| RF-27 a RF-29 | Rutas anidadas, `canSeeCausa`, `findVisible` con causa, pipes de ids | e2e de respuestas indistinguibles |
| RF-30 | `portal-detalle.ts`, `toMovimientoCliente` | Unitarios de claves exactas, e2e con recorrido de claves |
| Spec 001, RF-12 | `constantes.ts`, `autenticacion.service.ts`, `autenticacion.guard.ts`, `cookies-de-sesion.ts` | Unitarios y e2e de sesión y renovación |
| RNF de rendimiento | Índice de la spec 003, orden en memoria | e2e de rendimiento |
| RNF de textos seguros | `TextoLiteral` (spec 003) | Vitest |
| RNF de plataformas | Tarjetas, `break-words`, margen para el botón | Demo manual en el celular |
