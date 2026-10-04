# Validación 001 — Autenticación y roles

Recorrido de `spec.md` requisito por requisito (tarea T44). Corrida del 2026-10-03: `pnpm test` y `pnpm lint` sin errores.

| Paquete | Suite | Archivos | Tests |
|---|---|---|---|
| api | Unitarios (Vitest) | 14 | 306 |
| api | e2e contra la base de tests (Vitest + Supertest) | 13 | 155 |
| web | Vitest + Testing Library | 16 | 256 |
| | **Total** | **43** | **717** |

Rutas abreviadas: `api/src/...` → **U** (unitario), `api/test/...` → **E** (e2e), `web/src/...` → **W**.

## Requisitos funcionales

| RF | Qué se verifica | Tests | Resultado |
|---|---|---|---|
| RF-1 | Un rol por cuenta; email único | U `usuarios/entidades.spec.ts`; E `migraciones` (índice único), `alta-usuarios` (409 por email) | ✅ |
| RF-2 | Datos de integrantes | E `alta-usuarios` (alta de abogado) | ✅ |
| RF-3 | Datos de cliente físico y jurídico | U `usuarios/dto/dto.spec.ts`; E `alta-usuarios`; W `PanelUsuarioNuevo.test.tsx`, `formulario-cuenta.test.ts` | ✅ |
| RF-4 | Creado/modificado por, activo, último ingreso | E `alta-usuarios`, `modificacion-usuarios`, `ingreso`; W `PanelUsuarioDetalle.test.tsx` | ✅ |
| RF-5 | Normalización de email y DNI/CUIT | U `validadores.spec.ts`, `dto.spec.ts`; E `ingreso`, `alta-usuarios`, `listado-usuarios`; W `validaciones.test.ts` | ✅ |
| RF-6 | Formatos y largos con mensaje por campo | U `validadores.spec.ts`, `dto.spec.ts`; W `validaciones.test.ts`, `formulario-cuenta.test.ts` | ✅ |
| RF-7 | DNI, CUIT y tipo de persona inmutables | U `dto.spec.ts`; E `modificacion-usuarios`; W `PanelUsuarioDetalle.test.tsx` (solo lectura) | ✅ |
| RF-8 | Ingreso y destino según rol | U `autenticacion.service.spec.ts`; E `ingreso`; W `sesion.test.ts`, `PaginaIngreso.test.tsx` | ✅ |
| RF-9 | 401 genérico en los tres casos | U `autenticacion.service.spec.ts`; E `ingreso` | ✅ |
| RF-10 | 5 por email + IP, 30 por IP, ventana fija | U `limitador-intentos.service.spec.ts`; E `ingreso` (con `X-Forwarded-For`) | ✅ |
| RF-11 | Cambio pendiente restringe el acceso | U `permisos.guards.spec.ts`; E `cambio-contrasena`, `sesion`; W `sesion.test.ts`, `RutaProtegida.test.tsx` | ✅ |
| RF-12 | Sesión de 7 días sin uso, renovable | U `autenticacion.service.spec.ts`; E `renovacion` | ✅ |
| RF-13 | Sesión única | U `autenticacion.service.spec.ts`; E `sesion` | ✅ |
| RF-14 | Cuenta activa y rol vigente en cada acción | U `autenticacion.guard.spec.ts`; E `modificacion-usuarios` (rol), `desactivacion-usuarios`, `renovacion` | ✅ |
| RF-15 | Reúso de credencial cierra la sesión | U `tokens.spec.ts`; E `renovacion`; W `cliente-http.test.ts` (una sola renovación) | ✅ |
| RF-16 | Cierre de sesión | E `sesion`; W `Disenos.test.tsx`, `PaginaCambiarContrasena.test.tsx` | ✅ |
| RF-17 | Sesión vencida → ingreso → destino de RF-8 | W `cliente-http.test.ts`, `RutaProtegida.test.tsx` | ✅ |
| RF-18 | Todo protegido salvo lo público | U `autenticacion.guard.spec.ts`; E `validacion-acceso` (los 9 endpoints del panel sin sesión), `sesion`, `listado-usuarios` | ✅ |
| RF-19 | 403 con el mensaje de la spec, en el servidor | U `permisos.guards.spec.ts`; E `validacion-acceso` (los 9 endpoints del panel para un cliente) | ✅ |
| RF-20 | Cada rol en su sección | W `sesion.test.ts`, `RutaProtegida.test.tsx` | ✅ |
| RF-21 | Admin gestiona todo; abogado solo clientes | U `permisos-gestion.spec.ts` (matriz completa); E `alta-usuarios`, `modificacion-usuarios`, `desactivacion-usuarios`, `restablecimiento-y-email`; W `acciones-cuenta.test.ts` | ✅ |
| RF-22 | Alta con temporal y cambio pendiente | E `alta-usuarios`; W `PanelUsuarioNuevo.test.tsx` | ✅ |
| RF-23 | 409 por email de cuenta activa | E `alta-usuarios`, `modificacion-usuarios` | ✅ |
| RF-24 | Email de cuenta desactivada y su liberación | U `permisos-gestion.spec.ts`; E `alta-usuarios`, `modificacion-usuarios`, `restablecimiento-y-email`, `desactivacion-usuarios`; W `PanelUsuarioDetalle.acciones.test.tsx` | ✅ |
| RF-25 | 409 por DNI/CUIT, con sugerencia de reactivar | E `alta-usuarios` | ✅ |
| RF-26 | Listado de a 20, orden, búsqueda, filtros | E `listado-usuarios`; W `PanelUsuarios.test.tsx` | ✅ |
| RF-27 | Modificación con auditoría; email de otro cierra su sesión | E `modificacion-usuarios`; W `PanelUsuarioDetalle.test.tsx` | ✅ |
| RF-28 | Rol solo entre administrador y abogado | U `permisos-gestion.spec.ts`; E `modificacion-usuarios`; W `PanelUsuarioDetalle.test.tsx` | ✅ |
| RF-29 | Desactivación sin borrar, cierra la sesión | E `desactivacion-usuarios`; W `PanelUsuarioDetalle.acciones.test.tsx` | ✅ |
| RF-30 | Reactivación con temporal nueva | E `desactivacion-usuarios`; W `PanelUsuarioDetalle.acciones.test.tsx` | ✅ |
| RF-31 | Protección del administrador principal | U `permisos-gestion.spec.ts`; E `administrador-principal`, `modificacion-usuarios`; W `acciones-cuenta.test.ts` | ✅ |
| RF-32 | Transferencia del principal | E `administrador-principal` (incluida la concurrencia); W `PanelUsuarioDetalle.acciones.test.tsx` | ✅ |
| RF-33 | Restablecimiento; prevalece sobre un cambio simultáneo | E `restablecimiento-y-email` (carrera reproducida); W `PanelUsuarioDetalle.acciones.test.tsx` | ✅ |
| RF-34 | Consulta con auditoría | E `listado-usuarios`; W `PanelUsuarioDetalle.test.tsx` | ✅ |
| RF-35 | Datos propios, solo lectura | E `sesion`, `validacion-acceso`; W `MiCuenta.test.tsx` | ✅ |
| RF-36 | Cambio de contraseña propia | E `cambio-contrasena`; W `PaginaCambiarContrasena.test.tsx` | ✅ |
| RF-37 | Contraseña actual incorrecta | E `cambio-contrasena`; W `PaginaCambiarContrasena.test.tsx` | ✅ |
| RF-38 | Cierre de sesión al quinto error | E `cambio-contrasena`; W `PaginaCambiarContrasena.test.tsx` | ✅ |
| RF-39 | Reglas de contraseña con sus mensajes | U `contrasenas.service.spec.ts`; E `cambio-contrasena`, `alta-usuarios`; W `validaciones.test.ts` | ✅ |
| RF-40 | Contraseñas nunca legibles ni en respuestas | U `contrasenas.service.spec.ts`, `entidades.spec.ts`; E `ingreso`, `sesion`, `alta-usuarios`, `listado-usuarios` | ✅ |
| RF-41 | Consola crea el principal si no existe | U `consola/administrador-principal.service.spec.ts`; prueba real del comando contra la base de tests (T31) | ✅ |
| RF-42 | Consola solo restablece la contraseña del principal | U `consola/administrador-principal.service.spec.ts`; prueba real del comando (T31) | ✅ |

## Requisitos no funcionales

| RNF | Tests | Resultado |
|---|---|---|
| Seguridad: sesión fuera del alcance del código de la página, nada en el almacenamiento local | E `ingreso` (cookies `HttpOnly`, `Secure`, `SameSite=Lax`); W `RutaProtegida.test.tsx` (sin `localStorage` ni `sessionStorage`) | ✅ |
| Validación en el servidor y campos desconocidos rechazados | U `dto.spec.ts`, `errores-de-validacion.spec.ts`; E `ingreso`, `cambio-contrasena`, `modificacion-usuarios` | ✅ |
| Visibilidad: los abogados ven todos los clientes | E `listado-usuarios` | ✅ |
| Fechas en hora de Buenos Aires | U `opciones-base-de-datos.spec.ts` (`-03:00`); W `presentacion.test.ts` | ✅ |
| Idioma: mensajes en español | Todos los tests verifican los mensajes exactos | ✅ |
| CORS solo para el frontend del estudio | E `configuracion-aplicacion` | ✅ |

## Verificaciones adicionales

- **Ningún endpoint del panel responde a un cliente:** los 9 endpoints de `/api/panel/usuarios` responden 403 con el mensaje de RF-19 a un cliente, y 401 sin sesión (E `validacion-acceso`).
- **Ninguna respuesta incluye datos de otro usuario:** cada cliente ve solo sus datos en `/api/sesion/usuario` (E `validacion-acceso`). Las respuestas se arman campo por campo y nunca incluyen el hash (RF-40).
- **Migración:** `up` sobre la base de tests vacía crea las tablas, los índices y las claves foráneas; el esquema queda igual a las entidades; `down` las elimina sin errores (E `migraciones`).

## Criterios de finalización

- [x] Todos los RF con al menos un test en verde, incluidos los de punta a punta de ingreso, sesión única, cierre de sesión, acceso sin sesión, acceso sin permiso y bloqueo por intentos.
- [x] Tests de que un abogado no gestiona cuentas de integrantes, nadie le quita el rol al principal y un cliente no accede a nada del panel.
- [x] `pnpm test` y `pnpm lint` sin errores.
- [x] Demo manual (ver la guía siguiente): completada sin errores el 2026-10-04.

## Guía de la demo manual

Contra la base de **desarrollo**, que ya tiene la migración aplicada.

1. Crear el administrador principal: `pnpm --filter api admin:principal`.
2. Levantar todo: `pnpm dev` y abrir `http://localhost:5173/ingresar`.
3. Ingresar como principal: lleva a **Panel**.
4. En **Cuentas → Nueva cuenta**, crear un **administrador** y un **abogado**, cada uno con su contraseña temporal.
5. Cerrar sesión e ingresar como el abogado: lleva primero a **Cambiar contraseña** (obligatorio).
6. Con el abogado, crear un cliente **persona física** y uno **persona jurídica**. Verificar que el selector de rol no aparece.
7. En el detalle de cada cliente, verificar "Creada … por" con el nombre del abogado.
8. Ingresar como cada cliente: cambio de contraseña obligatorio y después **Mis causas**. Escribir `/panel` en la barra de direcciones: lleva de vuelta al portal.
9. **Sesión única:** con un cliente abierto en una ventana, ingresar con el mismo cliente en una ventana privada; al navegar en la primera, vuelve al ingreso.
10. **Desactivación con sesión abierta:** con un cliente abierto en una ventana, desactivarlo desde el panel; en la ventana del cliente, la siguiente acción lleva al ingreso y ya no puede entrar.
11. **Protección del principal:** con el otro administrador, abrir el detalle del principal: no ofrece acciones, y cambiarle el email desde el formulario responde "No se puede modificar al administrador principal".

## Veredicto

La spec 001 está **cumplida**: los 42 RF y los RNF tienen tests en verde, `pnpm test` y `pnpm lint` pasan, y la demo manual se completó sin errores el 2026-10-04.
