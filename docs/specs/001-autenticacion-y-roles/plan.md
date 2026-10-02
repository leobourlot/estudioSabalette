# Plan 001 — Autenticación y roles

Implementa `spec.md` de esta carpeta. Respeta `docs/constitution.md`. Cada sección indica entre corchetes los RF que cubre.

## Fase 0 — Estructura base del monorepo

Todavía no existe código. Esta fase deja el proyecto listo para implementar la spec. No hay una spec 000: el armado inicial forma parte de este plan.

- Raíz: `pnpm-workspace.yaml` con `web` y `api`. `package.json` con `dev` (`pnpm -r --parallel dev`), `test` y `lint` (`pnpm -r <script>`), y `format`, que corre Prettier desde la raíz solo sobre archivos de código (`ts`, `tsx`, `js`, `cjs`, `mjs`, `json`, `css`, `html`), sin tocar la documentación en Markdown. Node 24 LTS fijado en `engines` y `.nvmrc`; pnpm 9 en `packageManager`. Prettier único en la raíz. `.gitignore` con `node_modules/`, `dist/`, `coverage/` y `.env*` salvo `.env.example`.
- `web/`: plantilla `react-ts` de Vite, TypeScript estricto, Tailwind 3, ESLint con typescript-eslint y react-hooks, Vitest con jsdom. Carpetas `src/paginas/`, `src/componentes/` y `src/servicios/`. `public/.htaccess` para las rutas en Hostinger y `.env.example` con `VITE_API_URL`.
- `api/`: CLI de NestJS 12 (módulos ESM), TypeScript estricto, prefijo global `/api`, ESLint, Vitest para unitarios (`src/**/*.spec.ts`) y e2e (`test/**/*.e2e-spec.ts`, en serie). Carpeta `src/migraciones/`.
- Scripts sin comandos exclusivos de Unix: la ruta del proyecto tiene espacios y paréntesis, y se desarrolla en Windows.
- El repositorio git propio (`git init` en `estudio-cli/`) se crea solo con la aprobación del usuario. No se hacen commits sin pedido explícito.

## Arquitectura

### Topología
- **Producción**: el frontend se publica como sitio estático en Hostinger, en el dominio del estudio (por ejemplo, `estudio.com`). La API corre en Easypanel en un subdominio del mismo dominio (por ejemplo, `api.estudio.com`), con un registro DNS que apunta al VPS y certificado HTTPS emitido por Easypanel. Como ambos comparten el dominio base, son del mismo sitio: las cookies con `SameSite=Lax` viajan en las peticiones del frontend a la API.
- **CORS**: al ser orígenes distintos, la API habilita CORS solo para los orígenes de `FRONTEND_ORIGINS` (por ejemplo, `https://estudio.com` y `https://www.estudio.com`), con `credentials: true`. Se usa el soporte que trae NestJS, sin dependencias nuevas.
- **Rutas del frontend en Hostinger**: `web/public/.htaccess` redirige toda ruta que no sea un archivo existente a `index.html`, para que `/panel/usuarios` y las demás rutas funcionen al recargar la página.
- **Desarrollo**: Vite en `localhost:5173` reenvía `/api` a NestJS en `localhost:3000` con su proxy de desarrollo. El frontend arma las URLs con `VITE_API_URL`: vacía en desarrollo (rutas relativas `/api/...`) y `https://api.estudio.com` en producción. `web/.env.example` documenta la variable.
- **Bases de datos**: una base de desarrollo y una de tests en el MySQL de desarrollo de Easypanel, separadas de producción. Nunca se usa la base de producción.

### Módulos de NestJS (`api/src/`)

| Carpeta | Contenido | RF |
|---|---|---|
| `configuracion/` | Lectura y validación de variables de entorno. La API no arranca si falta alguna. | — |
| `base-de-datos/` | Configuración de TypeORM, `data-source.ts` para el CLI de migraciones y `esquema.ts` con la lista única de entidades y migraciones. | — |
| `migraciones/` | Migración `crear-usuarios-clientes-y-sesiones`. | RF-1 a RF-4 |
| `autenticacion/` | `sesion.controller.ts`, `autenticacion.service.ts` (ingreso, renovación, cierre), `contrasenas.service.ts` (hash, verificación y reglas), `limitador-intentos.service.ts`, guards y decoradores. | RF-8 a RF-19, RF-36 a RF-40 |
| `usuarios/` | Entidades `usuario.entity.ts`, `cliente.entity.ts` y `sesion.entity.ts`, `usuarios.controller.ts`, `usuarios.service.ts` (reglas de gestión), `dto/` y `validadores/` (DNI, CUIT, email, longitudes). | RF-1 a RF-7, RF-21 a RF-35 |
| `consola/` | `administrador-principal.ts`: comando interactivo para crear el principal o restablecer su contraseña. | RF-41, RF-42 |

Los controllers solo reciben, validan con DTO y delegan en los services (principio 3).

### Carpetas de `web/src/`

| Carpeta | Contenido | RF |
|---|---|---|
| `servicios/cliente-http.ts` | Envoltorio de `fetch`: renovación única ante 401 y aviso de sesión cerrada. | RF-15, RF-17 |
| `servicios/sesion.ts` | Ingresar, cerrar sesión, obtener el usuario, cambiar la contraseña. Funciones puras `resolveLandingRoute(usuario)` y `canAccess(ruta, usuario)`. | RF-8, RF-11, RF-20 |
| `servicios/usuarios.ts` | Llamadas de gestión de cuentas. | RF-21 a RF-34 |
| `servicios/validaciones.ts` | Validadores de DNI, CUIT, email, longitudes y contraseña, para avisar antes de enviar. El servidor sigue siendo la fuente de verdad. | RF-6, RF-39 |
| `componentes/` | `ProveedorSesion.tsx` (contexto que delega en `servicios/sesion.ts`), `RutaProtegida.tsx`, `DisenoPanel.tsx`, `DisenoPortal.tsx`, formularios. | RF-17, RF-20 |
| `paginas/` | `PaginaIngreso`, `PaginaCambiarContrasena`, `PanelInicio`, `PanelUsuarios`, `PanelUsuarioNuevo`, `PanelUsuarioDetalle`, `MiCuenta`, `PortalInicio`. | RF-8, RF-11, RF-26, RF-34, RF-35 |

Nada en `src/servicios/` importa React (principio 3).

## Entidades de TypeORM y migración [RF-1 a RF-4, RF-7]

Las fechas se guardan en `DATETIME` con la conexión configurada en `-03:00` (Buenos Aires, sin horario de verano). La interfaz las formatea con `Intl` en `es-AR`, zona `America/Argentina/Buenos_Aires`.

### `usuarios`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int autoincremental | PK |
| `rol` | enum `admin`, `abogado`, `cliente` | RF-1 |
| `esPrincipal` | boolean, default false | Exactamente uno en `true`; se garantiza en el service dentro de una transacción. RF-31, RF-32 |
| `email` | varchar(254), nullable, único | `NULL` cuando un administrador lo libera. MySQL admite varios `NULL` en un índice único. RF-24 |
| `nombre` | varchar(55) | En personas jurídicas, nombre del contacto. |
| `apellido` | varchar(55) | En personas jurídicas, apellido del contacto. |
| `contrasenaHash` | varchar(255) | RF-40 |
| `debeCambiarContrasena` | boolean | RF-11 |
| `activo` | boolean | RF-29, RF-30 |
| `ultimoIngreso` | datetime, nullable | RF-4 |
| `creadoPorId` | FK `usuarios`, nullable | `NULL` solo para el principal creado por consola. |
| `creadoEn` | datetime | |
| `modificadoPorId` | FK `usuarios`, nullable | |
| `modificadoEn` | datetime, nullable | |

### `clientes` (1 a 1 con `usuarios`)
| Campo | Tipo | Notas |
|---|---|---|
| `usuarioId` | int | PK y FK a `usuarios` |
| `tipoPersona` | enum `fisica`, `juridica` | Inmutable. RF-7 |
| `dni` | varchar(8), nullable, único | Solo personas físicas (7 u 8 dígitos). Inmutable. |
| `cuit` | char(11), nullable, único | Solo personas jurídicas. Inmutable. |
| `razonSocial` | varchar(55), nullable | Solo personas jurídicas. |
| `telefono` | varchar(15), nullable | |
| `domicilio` | varchar(55), nullable | |

### `sesiones`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | int autoincremental | Viaja en el token de acceso y en el de renovación. |
| `usuarioId` | FK `usuarios` | |
| `tokenHash` | char(64) | SHA-256 del secreto de renovación vigente. |
| `tokenAnteriorHash` | char(64), nullable | SHA-256 del secreto reemplazado, para detectar reúso. RF-15 |
| `creadaEn` | datetime | |
| `venceEn` | datetime | Se corre a ahora + 7 días en cada renovación. RF-12 |
| `revocadaEn` | datetime, nullable | |
| `intentosContrasenaFallidos` | int, default 0 | RF-38 |
| `primerIntentoFallidoEn` | datetime, nullable | RF-38 |

La migración crea las tres tablas con sus índices y es reversible (`down` las elimina en orden inverso). `synchronize` siempre en `false`.

`clientes` se separa de `usuarios` porque la spec 002 vinculará las causas con los clientes, y para no llenar las filas de integrantes con columnas que no usan. Alternativa descartada: una sola tabla con todas las columnas nullable.

## Contrato de la API

Todas las respuestas de error usan el formato por defecto de NestJS (`statusCode`, `message`), con `message` en español. Los errores de validación devuelven en `message` un arreglo con un mensaje por campo. Los cuerpos con campos desconocidos responden 400.

### Sesión — `/api/sesion` [RF-8 a RF-17, RF-35 a RF-39]

| Método y ruta | Acceso | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|
| `POST /ingresar` | Público, con límite de intentos | `{ email, contrasena }` | 200 `UsuarioPropio` y cookies de sesión | 400, 401 "Email o contraseña incorrectos", 429 |
| `POST /renovar` | Público, usa la cookie de renovación | — | 204 y cookies nuevas | 401 (borra las cookies) |
| `POST /cerrar` | Público, usa la cookie de renovación si existe | — | 204 y borra las cookies | — |
| `GET /usuario` | Con sesión, también con cambio pendiente | — | 200 `UsuarioPropio` | 401 |
| `PUT /contrasena` | Con sesión, también con cambio pendiente | `{ contrasenaActual, contrasenaNueva }` | 204 | 400 (contraseña actual incorrecta o reglas de RF-39), 401 con el mensaje de RF-38 al quinto error |

`/cerrar` es público para que cerrar sesión funcione aunque el token de acceso haya vencido.

`UsuarioPropio`: `{ id, rol, esPrincipal, email, nombre, apellido, debeCambiarContrasena, cliente?: { tipoPersona, dni, cuit, razonSocial, telefono, domicilio } }`.

### Gestión de cuentas — `/api/panel/usuarios` (roles `admin` y `abogado`) [RF-21 a RF-34]

| Método y ruta | Quién | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|
| `GET /?pagina&buscar&rol&activo` | admin; abogado solo con `rol=cliente` (se fuerza si no lo envía) | — | 200 `{ items, total, pagina, porPagina: 20 }` | 403 si un abogado pide otro rol |
| `GET /:id` | admin; abogado solo clientes | — | 200 `UsuarioDetalle` | 403, 404 |
| `POST /` | admin; abogado solo `rol=cliente` | `{ rol, email, nombre, apellido, contrasenaTemporal, cliente? }` | 201 `UsuarioDetalle` | 400, 403, 409 (email activo, email de cuenta desactivada, DNI/CUIT existente) |
| `PATCH /:id` | admin; abogado solo clientes | Parcial: `{ email?, nombre?, apellido?, rol?, cliente?: { razonSocial?, telefono?, domicilio? } }` | 200 `UsuarioDetalle` | 400 (incluye intentar enviar DNI, CUIT o tipo de persona), 403, 404, 409 |
| `POST /:id/desactivar` | admin; abogado solo clientes | — | 204 | 403, 404, 409 principal |
| `POST /:id/reactivar` | admin; abogado solo clientes | `{ contrasenaTemporal }` | 204 | 400, 403, 404, 409 si no tiene email |
| `POST /:id/restablecer-contrasena` | admin; abogado solo clientes | `{ contrasenaTemporal }` | 204 | 400, 403, 404, 409 principal |
| `POST /:id/liberar-email` | solo admin; solo cuentas desactivadas | — | 204 | 403, 404, 409 si la cuenta está activa |
| `POST /:id/transferir-principal` | solo el principal; destino: administrador activo | — | 204 | 403, 404, 409 si el destino no es un administrador activo |

`cliente` en el alta: `{ tipoPersona, dni?, cuit?, razonSocial?, telefono?, domicilio? }`. Para `fisica` se exige `dni` y se rechazan `cuit` y `razonSocial`; para `juridica` se exigen `cuit` y `razonSocial` y se rechaza `dni`.

`UsuarioDetalle`: `UsuarioPropio` más `activo`, `ultimoIngreso`, `creadoEn`, `modificadoEn`, `creadoPor` y `modificadoPor` (cada uno `{ id, nombre, apellido }` o `null`).

Mensajes de 409:
- "Ya existe una cuenta con ese email" (RF-23).
- "Ese email pertenece a una cuenta desactivada" (RF-24).
- "Ya existe un cliente con ese DNI o CUIT", con el agregado "Está desactivado: reactivalo en lugar de crear uno nuevo" si corresponde (RF-25).
- "No se puede modificar al administrador principal" (RF-31).
- "La cuenta no tiene email. Asignale uno antes de reactivarla" (RF-24, RF-30).

## Flujo de la sesión

### Credenciales
- **Token de acceso**: JWT HS256 firmado con `JWT_SECRET`, vida de 15 minutos, contenido `{ sub: usuarioId, sid: sesionId }`. No incluye el rol: el rol se lee de la base en cada petición (RF-14).
- **Token de renovación**: `<sesionId>.<secreto>`, con un secreto aleatorio de 32 bytes. En la base solo se guarda el SHA-256 del secreto. Alcanza con SHA-256 porque el secreto es aleatorio y largo, no una contraseña.
- **Cookies**: `access_token` (ruta `/api`) y `refresh_token` (ruta `/api/sesion`), ambas `httpOnly`, `Secure` y `SameSite=Lax`. Ningún token queda accesible para el código de la página.

### Ingreso [RF-8, RF-9, RF-10, RF-13]
```
ingresar(email, contrasena, ip):
  email = normalizar(email)
  si limitador.superado(ip) o limitador.superado(ip + email): 429
  limitador.contar(ip); limitador.contar(ip + email)
  usuario = buscar por email
  hashAComparar = usuario?.contrasenaHash ?? HASH_FICTICIO   // tiempo similar exista o no el email
  ok = bcrypt.compare(contrasena, hashAComparar)
  si no usuario o no ok o no usuario.activo: 401 genérico
  transacción:
    revocar sesiones abiertas del usuario                     // sesión única
    borrar sesiones vencidas o revocadas del usuario          // limpieza
    secreto = aleatorio(32); crear sesión(tokenHash = sha256(secreto), venceEn = ahora + 7 días)
    usuario.ultimoIngreso = ahora
  setear cookies (JWT con sid, sesionId.secreto)
  devolver UsuarioPropio
```

### Cada petición protegida [RF-14, RF-18, RF-19, RF-11]
```
guard de autenticación (global, salvo @Publico):
  jwt = cookie access_token; verificar firma y vencimiento, si falla: 401
  sesión = buscar por jwt.sid con su usuario
  si sesión revocada, vencida, o usuario inactivo: 401
  request.usuario = usuario                                   // rol vigente leído de la base

guard de cambio pendiente (global):
  si usuario.debeCambiarContrasena y la ruta no tiene @PermitidoConCambioPendiente: 403

guard de roles (global):
  si la ruta tiene @Roles y el rol del usuario no está: 403 "No tenés permiso para realizar esta acción"
```
Las reglas finas (un abogado solo opera sobre clientes, la protección del principal) viven en `usuarios.service.ts`.

### Renovación [RF-12, RF-15]
```
renovar(cookie refresh_token):
  (sid, secreto) = separar; si el formato no es válido: 401
  sesión = buscar por sid
  si no existe, revocada o vencida: 401
  h = sha256(secreto)
  si h == sesión.tokenAnteriorHash: revocar sesión; 401      // reúso detectado
  si h != sesión.tokenHash: 401
  si usuario inactivo: 401
  nuevo = aleatorio(32)
  sesión.tokenAnteriorHash = h; sesión.tokenHash = sha256(nuevo); sesión.venceEn = ahora + 7 días
  setear cookies nuevas
```

### Cierre [RF-16]
```
cerrar(cookie refresh_token):
  si la sesión existe y el secreto coincide con tokenHash: revocar
  borrar cookies; 204
```

### Cambio de contraseña propia [RF-36 a RF-39, RF-33]
```
cambiarContrasena(usuario, sesión, actual, nueva):
  validar reglas de RF-39 sobre nueva                          // 400
  si no bcrypt.compare(actual, usuario.contrasenaHash):
    registrar intento fallido en la sesión (ventana de 15 minutos desde el primero)
    si llegó a 5: revocar sesión; borrar cookies; 401 "Por seguridad, cerramos tu sesión. Volvé a ingresar"
    400 "La contraseña actual no es correcta"
  si actual == nueva: 400
  UPDATE usuarios SET contrasenaHash = nuevo, debeCambiarContrasena = false
    WHERE id = usuario.id AND contrasenaHash = <hash leído>   // si hubo un restablecimiento en el medio, no actualiza
  si no se actualizó ninguna fila: 401                          // prevalece el restablecimiento (RF-33)
```

### Límite de intentos de ingreso [RF-10]
`limitador-intentos.service.ts` guarda en memoria un mapa `clave → { cantidad, inicio }`.
- La ventana es fija: 15 minutos desde el primer intento contado. Al vencer, la clave se reinicia.
- Mientras la clave está bloqueada, los intentos rechazados no se cuentan ni extienden la ventana.
- Las claves vencidas se limpian en cada consulta.

La IP es `request.ip`. Express tiene configurado `trust proxy` con la cantidad de saltos de `TRUST_PROXY_HOPS` (1 en Easypanel por Traefik), así toma la IP real del usuario desde `X-Forwarded-For`.

Supone una sola instancia de la API. Si en el futuro se escala a varias réplicas, el límite pasa a la base o a un almacenamiento compartido.

## Gestión de cuentas [RF-21 a RF-34]

Reglas en `usuarios.service.ts`:
- **Abogado**: toda operación sobre una cuenta que no sea de cliente responde 403 (RF-21).
- **Principal**: si la cuenta destino es el principal y el actor es otro usuario, se rechazan desactivar, cambiar el rol, cambiar el email y restablecer la contraseña. El principal tampoco puede quitarse el rol ni desactivarse (RF-31). Como el principal siempre es un administrador activo, el sistema nunca se queda sin administradores.
- **Transferencia** (RF-32): en una transacción con bloqueo de filas (`SELECT … FOR UPDATE`), pone `esPrincipal = false` en el actual y `true` en el destino.
- **Rol** (RF-28): solo cambia entre `admin` y `abogado`. No se cierra la sesión (RF-14).
- **Email** (RF-27): si cambia el de otra cuenta, se revoca su sesión. Si el administrador cambia el propio, su sesión sigue.
- **Desactivar** (RF-29): `activo = false` y se revoca la sesión.
- **Reactivar** (RF-30): exige email asignado y contraseña temporal; `activo = true`, `debeCambiarContrasena = true`.
- **Restablecer** (RF-33): guarda el hash de la temporal, `debeCambiarContrasena = true` y revoca la sesión.
- **Liberar email** (RF-24): solo cuentas desactivadas; `email = NULL`.
- **Auditoría** (RF-4, RF-34): cada alta completa `creadoPorId` y `creadoEn`; cada modificación, `modificadoPorId` y `modificadoEn`. Si dos personas modifican a la vez, gana el último cambio.
- **Listado** (RF-26): 20 por página. Orden por `COALESCE(razonSocial, apellido)` y luego `nombre`. La búsqueda aplica `LIKE` sobre apellido, nombre y razón social; si el texto es numérico, compara también contra DNI y CUIT normalizados.

## Validaciones y contraseñas [RF-5, RF-6, RF-39, RF-40]

- **Normalización** (RF-5): el email se recorta y pasa a minúsculas; del DNI/CUIT se quitan los caracteres que no son dígitos. Se hace con `@Transform` en los DTO, antes de validar.
- **DNI**: `^\d{7,8}$`.
- **CUIT**: 11 dígitos; dígito verificador con los pesos `5,4,3,2,7,6,5,4,3,2` y módulo 11.
- **Email**: `^[^\s@]+@[^\s@]+\.[^\s@]+$`, de hasta 254 caracteres.
- **Longitudes**: 55 caracteres para nombre, apellido, razón social y domicilio; 15 para teléfono.
- **Contraseña**: entre 10 y 64 caracteres, solo ASCII imprimible (`^[\x20-\x7E]{10,64}$`): letras sin tilde, números, espacio y símbolos del teclado. Se validan primero los caracteres y después el largo, para dar el mensaje correcto de RF-39.
- **Hash**: bcrypt con costo 12. Como la contraseña es ASCII de hasta 64 caracteres, ocupa como mucho 64 bytes y nunca alcanza el límite de 72 bytes de bcrypt.
- **Registros**: las contraseñas y sus hashes nunca se escriben en logs. `UsuarioPropio` y `UsuarioDetalle` se arman explícitamente, nunca a partir de la entidad completa.

## Comando de consola [RF-41, RF-42]

- **Ejecución**: `pnpm --filter api admin:principal` en desarrollo; en Easypanel, `node dist/consola/administrador-principal.js` desde la consola del servicio.
- **Implementación**: abre el contexto de NestJS sin servidor HTTP (`NestFactory.createApplicationContext`) y pide los datos con `node:readline`, sin mostrar la contraseña en pantalla.
- **Si no hay principal**: pide nombre, apellido, email y contraseña, aplica las mismas validaciones y crea el administrador con `esPrincipal = true` y `debeCambiarContrasena = false`.
- **Si ya hay principal**: solo ofrece restablecer su contraseña (queda pendiente el cambio y se revoca su sesión). No crea otros administradores.

## Frontend

### Rutas [RF-8, RF-11, RF-17, RF-20]

| Ruta | Página | Acceso |
|---|---|---|
| `/ingresar` | `PaginaIngreso` | Público; con sesión, redirige a `resolveLandingRoute` |
| `/cambiar-contrasena` | `PaginaCambiarContrasena` | Con sesión |
| `/panel` | `PanelInicio` | admin, abogado |
| `/panel/usuarios` | `PanelUsuarios` (lista, buscador, filtros, paginado) | admin, abogado |
| `/panel/usuarios/nuevo` | `PanelUsuarioNuevo` | admin, abogado |
| `/panel/usuarios/:id` | `PanelUsuarioDetalle` (datos, auditoría y acciones) | admin, abogado |
| `/panel/mi-cuenta` y `/portal/mi-cuenta` | `MiCuenta` | El rol de la sección |
| `/portal` | `PortalInicio` (por ahora vacío; su contenido es de la spec 004) | cliente |

`RutaProtegida` recibe los roles permitidos y decide en este orden:
1. Cargando: indicador de carga.
2. Sin sesión: `/ingresar`.
3. Cambio pendiente: `/cambiar-contrasena`.
4. Rol de la otra sección: inicio de su sección (RF-20).
5. Si no, muestra la página.

Después de un nuevo ingreso siempre se va a `resolveLandingRoute`, nunca a la pantalla anterior (RF-17). La interfaz oculta las acciones que el rol no permite, pero el control real lo hace la API (RF-19).

### Estado de sesión [RNF de seguridad]
`ProveedorSesion` pide `GET /api/sesion/usuario` al cargar y guarda el resultado solo en memoria. No se usa `localStorage` ni `sessionStorage`.

### Cliente HTTP [RF-15, RF-17]
```
request(ruta, opciones):
  respuesta = fetch(VITE_API_URL + '/api' + ruta, { ...opciones, credentials: 'include' })
  si respuesta.status == 401 y la ruta no es /sesion/ingresar ni /sesion/renovar:
    ok = await renovarUnaVez()        // una sola promesa compartida por todas las peticiones de la pestaña
    si ok: reintentar una vez
    si no: avisarSesionCerrada()      // ProveedorSesion limpia el estado y navega a /ingresar
  devolver respuesta
```
Compartir la promesa de renovación evita que varias peticiones simultáneas de una misma pestaña presenten el token viejo y disparen la detección de reúso (RF-15).

## Dependencias nuevas

| Paquete | Para qué | Alternativa descartada |
|---|---|---|
| `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript` | Base del frontend (principio 1). | — |
| `@types/react`, `@types/react-dom`, `@types/node` | Definiciones de tipos para compilar React y `vite.config.ts` con TypeScript estricto. No llegan al sitio publicado. | — |
| `tailwindcss@3`, `postcss`, `autoprefixer` | Estilos (principio 1). | CSS propio: más trabajo y menos consistencia. |
| `react-router-dom` | Rutas protegidas y redirecciones. | Router propio: reinventar navegación e historial. |
| `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event` | Tests de servicios, componentes y rutas. | Jest en web: Vitest se integra con Vite sin configuración extra. |
| `@testing-library/dom` | Base de Testing Library; `@testing-library/react` y `user-event` la exigen instalada aparte. Solo se usa en tests. | — |
| `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/cli`, `reflect-metadata`, `rxjs` | Base del backend (principio 1). | — |
| `@nestjs/config` | Variables de entorno validadas al arrancar. | Leer `process.env` a mano: sin validación ni tipado. |
| `@nestjs/typeorm`, `typeorm`, `mysql2` | ORM y driver de MySQL (principio 1). | Driver `mysql`: sin mantenimiento activo. |
| `@nestjs/jwt` | Firmar y verificar el token de acceso. | Passport + passport-jwt: dos dependencias más para lo que resuelve un guard propio. Token opaco único: la rotación dentro de peticiones simultáneas produce falsos reúsos. |
| `bcrypt` | Hash de contraseñas (costo 12). | `argon2`: no tiene límite de bytes, pero con contraseñas ASCII de hasta 64 caracteres ese límite no se alcanza, y bcrypt es la elección del estudio. `bcryptjs`: más lento, al estar escrito en JavaScript puro. |
| `@types/bcrypt` | Tipos de `bcrypt` para TypeScript estricto. | — |
| `cookie-parser` | Leer las cookies de sesión. | Parsear el encabezado a mano. |
| `@types/cookie-parser` | Tipos de `cookie-parser` para TypeScript estricto. | — |
| `class-validator`, `class-transformer` | DTO validados con el `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`). | Zod: requiere un pipe propio y duplica lo que Nest ya integra. |
| `vitest`, `@nestjs/testing`, `supertest` | Tests unitarios y e2e de la API. | Jest: NestJS 12 es solo ESM y Jest lo soporta de forma experimental; Vitest es lo que trae NestJS 12 y es el mismo motor que web. |
| `@types/node`, `@types/express`, `@types/supertest` | Definiciones de tipos para compilar la API y los e2e con TypeScript estricto. | — |
| `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `prettier`, `eslint-config-prettier` | Lint y formato. | `oxlint`, que trae la plantilla actual de Vite: no tiene las reglas de typescript-eslint ni de react-hooks que pide el plan. |

No se usa `@nestjs/throttler`. Su bloqueo se mide desde que se supera el límite, no desde el primer intento como pide RF-10, y además requeriría un rastreador propio. El limitador propio son unas pocas líneas y cumple la regla exacta.

## Otras decisiones técnicas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| API en un subdominio del dominio del estudio | Proxy inverso en Hostinger que reenvíe `/api` al VPS | El hosting compartido de Hostinger no permite proxys inversos de forma confiable. Con el subdominio, frontend y API siguen siendo del mismo sitio y las cookies funcionan. |
| CORS restringido a `FRONTEND_ORIGINS` con credenciales | CORS abierto | Solo el frontend del estudio puede hacer peticiones con las cookies de sesión. Protección contra CSRF: `SameSite=Lax`, CORS restringido y cuerpos solo JSON (una petición JSON desde otro origen requiere preflight, que se rechaza). |
| API en otro dominio (por ejemplo, el de Easypanel) | — | Descartada: frontend y API serían de sitios distintos y los navegadores bloquearían las cookies de sesión. |
| Rol leído de la base en cada petición | Rol dentro del JWT | Un cambio de rol rige en la siguiente acción sin cerrar la sesión (RF-14). |
| Sesión única revocando las anteriores al ingresar | Límite de sesiones por dispositivo | Es lo que pide RF-13 y es lo más simple. |
| Contador de RF-38 dentro de la sesión | Tabla de intentos aparte | Al quinto error se revoca esa sesión, así que el contador vive y muere con ella. |
| Limpieza de sesiones viejas al ingresar | Tarea programada | No suma infraestructura; las sesiones de cada usuario se limpian en su próximo ingreso. |
| IDs autoincrementales | UUID | Más simple. Todos los accesos pasan por autorización, así que adivinar un id no da acceso. |
| Validadores duplicados en web y api | Paquete compartido en el monorepo | Son pocas funciones; un tercer paquete agrega configuración. La API es la fuente de verdad. |

## Variables de entorno (`api/.env.example`)
`PORT`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `JWT_SECRET` (mínimo 32 caracteres), `TRUST_PROXY_HOPS`, `FRONTEND_ORIGINS` (orígenes permitidos separados por comas). Los tests e2e usan `api/.env.test` con la base de tests.

En `web/.env.example`: `VITE_API_URL` (vacía en desarrollo; URL de la API en producción).

## Estrategia de tests

### api — unitarios (Vitest)
- Validadores: DNI, CUIT (dígito verificador válido e inválido, con puntos y guiones), email, longitudes, y contraseñas con tildes, ñ y emojis rechazadas [RF-5, RF-6, RF-39].
- `contrasenas.service`: hash y verificación; el hash nunca aparece en los DTO de salida [RF-40].
- `limitador-intentos.service`: 5 por email e IP, 30 por IP, ventana fija y que los rechazos no extiendan la ventana [RF-10].
- `usuarios.service` con repositorios simulados: permisos del abogado, protección y transferencia del principal, cambios de rol permitidos, reglas de email, DNI y CUIT, reactivación y liberación de email [RF-21 a RF-34].

### api — e2e (Vitest + Supertest, base de tests)
Cada suite corre las migraciones sobre la base de tests y vacía las tablas antes de empezar. Se ejecutan en serie (`fileParallelism: false`).
- Ingreso correcto, credenciales incorrectas, cuenta desactivada y 429, simulando IPs con `X-Forwarded-For` [RF-8 a RF-10].
- Restricciones con cambio pendiente [RF-11].
- Sesión única: un segundo ingreso invalida el primero [RF-13].
- Rotación de la renovación y detección de reúso [RF-12, RF-15].
- Cierre de sesión, incluso con el token de acceso vencido [RF-16].
- Desactivación con sesión abierta y cambio de rol con sesión abierta [RF-14, RF-29].
- Rutas sin sesión (401) y sin permiso (403), incluido un cliente contra `/api/panel/*` [RF-18, RF-19].
- Recorrido completo de gestión con un administrador, un abogado y el principal [RF-21 a RF-34].
- Cambio de contraseña: actual incorrecta, cierre de sesión al quinto error y restablecimiento simultáneo [RF-33, RF-36 a RF-38].
- CORS: un origen de `FRONTEND_ORIGINS` recibe los encabezados con credenciales y cualquier otro no [RNF de seguridad].
- Migración: `up` sobre base vacía y `down` sin errores.

### web — Vitest
- `servicios/sesion.ts`: `resolveLandingRoute` y `canAccess` para cada rol y para el cambio pendiente [RF-8, RF-11, RF-20].
- `servicios/cliente-http.ts` con `fetch` simulado: una sola renovación para varias 401 simultáneas, un solo reintento y aviso de sesión cerrada si la renovación falla [RF-15, RF-17].
- `servicios/validaciones.ts` [RF-6, RF-39].
- `RutaProtegida`: el orden de decisiones de la tabla de rutas [RF-17, RF-20].
- `PaginaIngreso` y `PaginaCambiarContrasena` con servicios simulados: mensajes de error y redirecciones [RF-8, RF-9, RF-37, RF-39].
- Ninguna escritura en `localStorage` ni `sessionStorage` durante el flujo de sesión [RNF de seguridad].

## Cobertura de RF

| RF | Dónde se implementa | Test |
|---|---|---|
| RF-1 a RF-4 | Entidades y migración | e2e de gestión |
| RF-5, RF-6 | `usuarios/validadores`, DTO, `servicios/validaciones.ts` | Unitarios de api y web |
| RF-7 | DTO de `PATCH` sin DNI, CUIT ni tipo de persona | e2e de gestión |
| RF-8, RF-9 | `autenticacion.service` (ingresar), `PaginaIngreso` | e2e de ingreso, Vitest |
| RF-10 | `limitador-intentos.service`, `trust proxy` | Unitario y e2e 429 |
| RF-11 | Guard de cambio pendiente, `RutaProtegida` | e2e, Vitest |
| RF-12, RF-15 | `autenticacion.service` (renovar), `cliente-http.ts` | e2e de renovación, Vitest |
| RF-13 | Ingreso con revocación de sesiones | e2e de sesión única |
| RF-14 | Guard de autenticación que lee el usuario de la base | e2e de desactivación y rol |
| RF-16 | `POST /api/sesion/cerrar` | e2e de cierre |
| RF-17 | `cliente-http.ts`, `ProveedorSesion`, `RutaProtegida` | Vitest |
| RF-18, RF-19 | Guard global con `@Publico`, guard de roles | e2e 401 y 403 |
| RF-20 | `RutaProtegida`, `canAccess` | Vitest |
| RF-21 a RF-34 | `usuarios.service`, `usuarios.controller`, páginas de `/panel/usuarios` | Unitarios y e2e de gestión |
| RF-35 | `GET /api/sesion/usuario`, `MiCuenta` | e2e, Vitest |
| RF-36 a RF-39 | `PUT /api/sesion/contrasena`, `PaginaCambiarContrasena` | e2e, unitarios, Vitest |
| RF-40 | `contrasenas.service`, armado explícito de las respuestas | Unitario |
| RF-41, RF-42 | `consola/administrador-principal.ts` | Unitario de la lógica (sin `readline`) y demo manual |
