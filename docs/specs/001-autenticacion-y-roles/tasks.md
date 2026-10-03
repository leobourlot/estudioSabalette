# Tareas 001 — Autenticación y roles

Derivadas de `spec.md` y `plan.md` de esta carpeta. Cada tarea dura entre 20 y 30 minutos y se hace en orden.

Reglas para todas las tareas:
- Primero se escriben los tests, después el código.
- Una tarea está terminada solo si, además de su "Hecho cuando", `pnpm test` y `pnpm lint` pasan sin errores (a partir de T9, cuando esos scripts existen).
- Ninguna tarea crea ni modifica archivos `.env`, `.env.test` ni ningún otro con credenciales, y ninguna se conecta a la base de producción.
- No se hacen commits sin pedido explícito.

## Requisitos previos (a cargo del usuario)
- [x] P1: Aprobar la creación del repositorio git propio en `estudio-cli/` (T1).
- [x] P2: Crear en el MySQL de desarrollo de Easypanel dos bases: una de desarrollo y otra de tests. Ninguna es la de producción.
- [x] P3: Después de T7, crear `api/.env` y `api/.env.test` a partir de `api/.env.example`, con los datos de P2.

## Fase 0 — Estructura base

- [x] **T1 — Repositorio git propio**
  `git init` en `estudio-cli/` y `.gitignore` con `node_modules/`, `dist/`, `coverage/` y `.env*` salvo `.env.example`. Requiere P1.
  Hecho cuando: `git status` dentro de `estudio-cli/` lista solo archivos del proyecto y ningún `.env`.

- [x] **T2 — Raíz del monorepo**
  `pnpm-workspace.yaml` (`web`, `api`); `package.json` con `engines` (Node 24), `packageManager` (pnpm 9) y los scripts `dev`, `test`, `lint` y `format`; `.nvmrc`; configuración de Prettier.
  Hecho cuando: `pnpm install` termina sin errores en la raíz y `pnpm format` corre (aunque todavía no haya paquetes).

- [x] **T3 — Paquete web**
  Plantilla `react-ts` de Vite en `web/`, TypeScript estricto, ESLint con typescript-eslint y react-hooks, scripts `dev`, `build` y `lint`.
  Hecho cuando: `pnpm --filter web dev` sirve la página inicial, y `pnpm --filter web lint` y `pnpm --filter web build` pasan.

- [x] **T4 — Tailwind, carpetas y despliegue estático de web**
  Tailwind 3 con PostCSS; carpetas `src/paginas/`, `src/componentes/` y `src/servicios/`; `public/.htaccess` que redirige a `index.html` las rutas que no son archivos; `.env.example` con `VITE_API_URL`; proxy de Vite de `/api` a `localhost:3000`.
  Hecho cuando: una clase de Tailwind se aplica en la página inicial, `dist/` incluye `.htaccess` después de `build`, y `.env.example` documenta `VITE_API_URL`.

- [x] **T5 — Tests en web**
  Vitest con jsdom, Testing Library y `user-event`; script `test`; test de ejemplo que renderiza la página inicial.
  Hecho cuando: `pnpm --filter web test` pasa con el test de ejemplo.

- [x] **T6 — Paquete api**
  Proyecto NestJS en `api/` con TypeScript estricto, prefijo global `/api`, ESLint y Vitest configurado para unitarios y e2e (el script `test` corre ambos, los e2e en serie).
  Hecho cuando: `pnpm --filter api test` pasa con un test unitario y uno e2e de ejemplo, y `pnpm --filter api lint` pasa.

- [x] **T7 — Configuración de la api**
  `configuracion/` con `@nestjs/config` y una función de validación de las variables del plan; `api/.env.example` sin valores reales.
  Hecho cuando: un test unitario verifica que la validación falla nombrando la variable faltante y que `JWT_SECRET` exige al menos 32 caracteres.

- [x] **T8 — Conexión a la base y migraciones**
  `base-de-datos/` con TypeORM y mysql2 (`synchronize: false`, `timezone: '-03:00'`), `data-source.ts` para el CLI y scripts `migration:create`, `migration:generate`, `migration:run` y `migration:revert`. Requiere P2 y P3.
  Hecho cuando: `pnpm --filter api migration:run` corre sin errores contra la base de desarrollo.

- [x] **T9 — Scripts de la raíz de punta a punta**
  Ajustar los scripts para que funcionen desde la raíz, en Windows y en rutas con espacios y paréntesis.
  Hecho cuando: desde la raíz, `pnpm dev` levanta web y api, y `pnpm test` y `pnpm lint` pasan en los dos paquetes.

## api

- [x] **T10 — Entidades** [RF-1 a RF-4, RF-7]
  `usuario.entity.ts`, `cliente.entity.ts` y `sesion.entity.ts` con los campos, tipos e índices del plan.
  Hecho cuando: la api compila y un test unitario verifica que el enum de roles y el de tipo de persona tienen exactamente los valores del plan.

- [x] **T11 — Migración inicial** [RF-1 a RF-4]
  Migración `crear-usuarios-clientes-y-sesiones` con las tres tablas, índices únicos (`email`, `dni`, `cuit`) y claves foráneas.
  Hecho cuando: un test e2e corre `up` sobre la base de tests vacía, verifica que existen las tablas y corre `down` sin errores.

- [x] **T12 — Arranque compartido y base de los e2e** [RNF de seguridad y validación]
  Función `configureApp(app)` usada por `main.ts` y por los tests: `cookie-parser`, `trust proxy` con `TRUST_PROXY_HOPS`, `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) y CORS con `FRONTEND_ORIGINS` y credenciales. Utilidad de e2e que migra la base de tests y vacía las tablas.
  Hecho cuando: un e2e verifica que un origen de `FRONTEND_ORIGINS` recibe `Access-Control-Allow-Credentials` y que otro origen no recibe encabezados CORS.

- [x] **T13 — Validadores** [RF-5, RF-6]
  `usuarios/validadores/`: normalización de email y de DNI/CUIT, DNI de 7 u 8 dígitos, CUIT con dígito verificador, email `texto@texto.texto`, largos de 55 y 15 caracteres.
  Hecho cuando: los tests unitarios cubren casos válidos e inválidos de cada validador, incluidos DNI y CUIT con puntos, guiones y espacios.

- [x] **T14 — Servicio de contraseñas** [RF-39, RF-40]
  `contrasenas.service.ts`: reglas de RF-39 en el orden del plan (caracteres, después largo), hash bcrypt con costo 12 y verificación.
  Hecho cuando: los tests unitarios verifican cada mensaje de RF-39 (incluidas tildes, ñ y emojis), que el hash no contiene la contraseña y que la verificación acepta la correcta y rechaza otra.

- [x] **T15 — Limitador de intentos** [RF-10]
  `limitador-intentos.service.ts` en memoria: ventana fija de 15 minutos, 5 intentos por email e IP y 30 por IP, sin extender la ventana con intentos rechazados.
  Hecho cuando: los tests unitarios, con reloj simulado, verifican el bloqueo en el intento 6 (email e IP) y 31 (IP), el desbloqueo a los 15 minutos del primer intento y que los rechazos no corren la ventana.

- [x] **T16 — Guard de autenticación** [RF-14, RF-18]
  Decoradores `@Public` y `@CurrentUser`; guard global que verifica el JWT, carga la sesión y el usuario, y responde 401 si la sesión está revocada o vencida, o el usuario inactivo.
  Hecho cuando: los tests unitarios con repositorios simulados cubren token ausente, alterado, vencido, sesión revocada, usuario inactivo y ruta pública.

- [x] **T17 — Guards de cambio pendiente y de roles** [RF-11, RF-19]
  Decoradores `@AllowPendingPasswordChange` y `@Roles`; guards globales que responden 403 con el mensaje de RF-19.
  Hecho cuando: los tests unitarios verifican que un usuario con cambio pendiente solo pasa en rutas marcadas, y que un rol no listado recibe 403 con el mensaje exacto.

- [x] **T18 — Servicio de ingreso** [RF-8, RF-9, RF-13]
  `autenticacion.service.ts` (ingresar): normalización, comparación contra hash ficticio si el email no existe, revocación de sesiones anteriores, limpieza de sesiones viejas, creación de sesión, `ultimoIngreso`.
  Hecho cuando: los tests unitarios verifican el error genérico para email inexistente, contraseña incorrecta y cuenta desactivada, y que un ingreso exitoso revoca la sesión anterior.

- [x] **T19 — Endpoint de ingreso** [RF-8 a RF-10]
  `POST /api/sesion/ingresar` en `sesion.controller.ts` con el limitador y las cookies `access_token` y `refresh_token` (`httpOnly`, `Secure`, `SameSite=Lax`, rutas del plan).
  Hecho cuando: los e2e verifican 200 con `UsuarioPropio` y cookies con sus atributos, 401 genérico en los tres casos de RF-9, y 429 al superar los límites con distintas IP simuladas por `X-Forwarded-For`.

- [x] **T20 — Renovación** [RF-12, RF-15]
  `POST /api/sesion/renovar`: rotación del secreto, `venceEn` a 7 días y detección de reúso con `tokenAnteriorHash`.
  Hecho cuando: los e2e verifican que renovar entrega cookies nuevas, que presentar el token reemplazado revoca la sesión y responde 401, y que una sesión vencida responde 401.

- [x] **T21 — Cierre, usuario propio y sesión única** [RF-13, RF-16, RF-35]
  `POST /api/sesion/cerrar` (público, con la cookie de renovación) y `GET /api/sesion/usuario`.
  Hecho cuando: los e2e verifican que cerrar funciona aun con el token de acceso vencido y borra las cookies, que `GET /usuario` devuelve `UsuarioPropio` sin hash, y que un segundo ingreso deja al primero con 401.

- [x] **T22 — Cambio de contraseña propia** [RF-11, RF-33, RF-36 a RF-39]
  `PUT /api/sesion/contrasena`: reglas, contador de errores en la sesión, cierre al quinto error y `UPDATE` condicionado al hash leído.
  Hecho cuando: los e2e verifican el cambio exitoso (con cambio pendiente incluido), el 400 por contraseña actual incorrecta y por cada regla, el 401 con el mensaje de RF-38 al quinto error, y que un usuario con cambio pendiente recibe 403 en cualquier otra ruta protegida.

- [x] **T23 — DTO de gestión de cuentas** [RF-3, RF-5 a RF-7]
  DTO de alta (con `cliente` condicionado a `tipoPersona`), modificación (sin DNI, CUIT ni tipo de persona), contraseña temporal y consulta del listado.
  Hecho cuando: los tests unitarios con `class-validator` verifican campos exigidos y rechazados para persona física y jurídica, y que enviar `dni`, `cuit` o `tipoPersona` en la modificación falla.

- [x] **T24 — Reglas de permisos de gestión** [RF-21, RF-28, RF-31]
  Funciones de política en `usuarios/permisos-gestion.ts` (puras, sin base), que usa `usuarios.service.ts`: qué puede hacer cada actor sobre cada cuenta (abogado solo clientes, protección del principal, cambios de rol permitidos).
  Hecho cuando: los tests unitarios cubren la matriz actor (principal, administrador, abogado) × destino (principal, administrador, abogado, cliente) × acción.

- [x] **T25 — Alta de cuentas** [RF-4, RF-22 a RF-25]
  `POST /api/panel/usuarios`: alta con contraseña temporal y cambio pendiente, registro de `creadoPor`, mensajes de 409 por email activo, email de cuenta desactivada y DNI/CUIT (con el agregado si está desactivado).
  Hecho cuando: los e2e verifican un alta de persona física, una de persona jurídica y un abogado creado por un administrador, cada 409, y el 403 de un abogado que intenta crear un integrante.

- [x] **T26 — Listado y consulta** [RF-18, RF-19, RF-26, RF-34]
  `GET /api/panel/usuarios` (20 por página, orden, buscador y filtros; rol forzado a cliente para abogados) y `GET /api/panel/usuarios/:id` con auditoría.
  Hecho cuando: los e2e verifican orden, paginado, búsqueda por apellido y por DNI con puntos, que un abogado no ve integrantes, 401 sin sesión y 403 para un cliente.

- [x] **T27 — Modificación** [RF-14, RF-27, RF-28, RF-31]
  `PATCH /api/panel/usuarios/:id` con registro de `modificadoPor`, revocación de sesión si cambia el email de otra cuenta y cambio de rol solo entre administrador y abogado.
  Hecho cuando: los e2e verifican que cambiar el email de otro le cierra la sesión, que el propio no, que un cambio de rol mantiene la sesión y aplica los permisos nuevos en la siguiente petición, y que cliente ↔ integrante se rechaza.

- [x] **T28 — Desactivación y reactivación** [RF-14, RF-24, RF-29, RF-30]
  `POST …/desactivar` y `POST …/reactivar` (exige email y contraseña temporal).
  Hecho cuando: los e2e verifican que un usuario desactivado con sesión abierta recibe 401 en su próxima petición, que reactivar deja el cambio pendiente y que reactivar una cuenta sin email responde 409.

- [x] **T29 — Restablecimiento y liberación de email** [RF-24, RF-33]
  `POST …/restablecer-contrasena` y `POST …/liberar-email` (solo administradores, solo cuentas desactivadas).
  Hecho cuando: los e2e verifican que restablecer cierra la sesión y deja el cambio pendiente, que un cambio de contraseña con el hash anterior no pisa un restablecimiento, y que después de liberar un email se puede crear otra cuenta con él.

- [x] **T30 — Administrador principal** [RF-31, RF-32]
  Protecciones del principal en los endpoints y `POST …/transferir-principal` en una transacción con bloqueo.
  Hecho cuando: los e2e verifican que otro administrador recibe 409 al intentar quitarle el rol, desactivar, cambiar el email o restablecer la contraseña del principal; que el principal no puede quitarse el rol ni desactivarse; y que la transferencia deja exactamente un principal.

- [x] **T31 — Comando de consola** [RF-41, RF-42]
  Lógica `crearPrincipal` y `restablecerPrincipal` separada de la entrada por `node:readline` (sin mostrar la contraseña); script `admin:principal`.
  Hecho cuando: los tests unitarios verifican que crea el principal solo si no existe, que con principal existente solo restablece su contraseña, y que nunca crea otro administrador.

## web

- [x] **T32 — Validaciones del frontend** [RF-6, RF-39]
  `servicios/validaciones.ts` con las mismas reglas que la API.
  Hecho cuando: los tests de Vitest cubren los mismos casos que T13 y T14.

- [x] **T33 — Cliente HTTP** [RF-15, RF-17]
  `servicios/cliente-http.ts`: `VITE_API_URL`, `credentials: 'include'`, renovación compartida ante 401, un solo reintento y aviso de sesión cerrada.
  Hecho cuando: los tests con `fetch` simulado verifican que tres 401 simultáneos disparan una sola renovación, que se reintenta una vez y que, si la renovación falla, se avisa la sesión cerrada.

- [x] **T34 — Servicio de sesión** [RF-8, RF-11, RF-20]
  `servicios/sesion.ts`: `login`, `logout`, `fetchOwnUser`, `changePassword`, `resolveLandingRoute` y `canAccess`.
  Hecho cuando: los tests verifican `resolveLandingRoute` y `canAccess` para cada rol, con y sin cambio pendiente.

- [x] **T35 — Proveedor de sesión y rutas protegidas** [RF-17, RF-20, RNF de seguridad]
  `ProveedorSesion`, `RutaProtegida` y el router con las rutas del plan (páginas como marcadores de posición).
  Hecho cuando: los tests verifican el orden de decisiones de `RutaProtegida` (cargando, sin sesión, cambio pendiente, otra sección, página) y que no se escribe nada en `localStorage` ni `sessionStorage`.

- [x] **T36 — Página de ingreso** [RF-8 a RF-10]
  `PaginaIngreso` con Tailwind, que delega en `servicios/sesion.ts`.
  Hecho cuando: los tests verifican los mensajes de 401 y 429 y la redirección según `resolveLandingRoute`.

- [x] **T37 — Página de cambio de contraseña** [RF-11, RF-36 a RF-39]
  `PaginaCambiarContrasena`.
  Hecho cuando: los tests verifican los mensajes de cada regla, el de contraseña actual incorrecta, la redirección al inicio de la sección tras el cambio y la redirección a `/ingresar` ante el mensaje de RF-38.

- [x] **T38 — Diseños, inicios y mi cuenta** [RF-16, RF-35]
  `DisenoPanel` y `DisenoPortal` con botón de cerrar sesión; `PanelInicio` y `PortalInicio` como marcadores de posición; `MiCuenta` con los datos propios.
  Hecho cuando: los tests verifican que cerrar sesión llama al servicio y navega a `/ingresar`, y que `MiCuenta` muestra los datos de cliente solo para clientes.

- [x] **T39 — Servicio de usuarios** [RF-21 a RF-34]
  `servicios/usuarios.ts` con una función por endpoint de gestión y mensajes de error de la API.
  Hecho cuando: los tests con `fetch` simulado verifican la ruta, el método y el cuerpo de cada llamada y el traslado de los mensajes de 409.

- [x] **T40 — Listado de cuentas** [RF-26]
  `PanelUsuarios`: buscador, filtros por rol y estado, paginado de a 20.
  Hecho cuando: los tests verifican que buscar y filtrar llaman al servicio con los parámetros correctos y que un abogado no ve el filtro de roles de integrantes.

- [x] **T41 — Alta de cuenta** [RF-3, RF-6, RF-22 a RF-25]
  `PanelUsuarioNuevo` con campos según el rol y el tipo de persona.
  Hecho cuando: los tests verifican los campos de persona física, jurídica e integrante, las validaciones antes de enviar y la muestra de los mensajes de 409.

- [x] **T42 — Detalle y edición de cuenta** [RF-7, RF-27, RF-28, RF-34]
  `PanelUsuarioDetalle`: datos, auditoría (creado y modificado por, fechas en hora de Buenos Aires, último ingreso) y edición sin DNI, CUIT ni tipo de persona.
  Hecho cuando: los tests verifican que DNI y CUIT se muestran como solo lectura, que el selector de rol solo ofrece administrador y abogado, y el formato de las fechas.

- [x] **T43 — Acciones sobre una cuenta** [RF-24, RF-29 a RF-33]
  En `PanelUsuarioDetalle`: desactivar, reactivar (con contraseña temporal), restablecer contraseña, liberar email y transferir principal, visibles según el rol y la condición de principal.
  Hecho cuando: los tests verifican qué acciones ve cada actor (principal, administrador, abogado) sobre cada tipo de cuenta, y que cada acción llama al servicio correspondiente.

## Cierre

- [ ] **T44 — Validación de la spec**
  Recorrer `spec.md` requisito por requisito con su test, correr la migración `up` y `down` sobre la base de tests y hacer la demo manual de los criterios de finalización.
  Hecho cuando: cada RF tiene al menos un test en verde identificado, `pnpm test` y `pnpm lint` pasan, y la demo manual se completó sin errores.
