# Plan 007 — Sitio público

Implementa `spec.md` de esta carpeta. Respeta `docs/constitution.md` y se apoya en lo construido en las specs 001 a 006: el guard global de autenticación, las cookies de sesión, `RutaProtegida` y `canAccess`, `datos-estudio.ts`, `BotonWhatsapp`, `BloqueContactoEstudio`, `DisenoSeccion` y el `.htaccess` de Hostinger. Cada sección indica entre corchetes los RF que cubre.

Lo central del plan es cómo se publica el sitio: cada página pública se genera como HTML completo al construir el frontend (prerenderizado), para que los buscadores y las vistas previas lean su texto sin ejecutar código (RF-35). Se hace con lo que ya está instalado (Vite y `react-dom/server`), sin dependencias nuevas. Se suma un endpoint público y de solo lectura para saber si hay sesión, que no la extiende ni la renueva (RF-31).

No hay entidades ni migraciones nuevas. Se agrega una variable de entorno del frontend, `VITE_URL_SITIO`.

## Arquitectura

### Cómo se publica el sitio [RF-8 a RF-10, RF-35 a RF-38, RF-43]
`pnpm --filter web build` pasa a tener tres pasos:
1. `vite build`: la aplicación como hoy, con sus archivos con hash.
2. `vite build --ssr src/entrada-servidor.tsx --outDir dist-ssr`: una versión del sitio público que corre en Node.
3. `node scripts/prerender.ts`: con esa versión, escribe en `dist/` un HTML completo por página pública, más `404.html`, `app.html`, `sitemap.xml` y `robots.txt`, y borra `dist-ssr/`.

Resultado en `dist/` (lo que se sube a Hostinger):

| Archivo | Qué es | Se sirve en |
|---|---|---|
| `index.html` | Inicio prerenderizado | `/` |
| `servicios/derecho-laboral/empresas.html`, `…/trabajadores.html` | Pestañas de Derecho Laboral | `/servicios/derecho-laboral/empresas`, `…/trabajadores` |
| `servicios/accidentes-de-trabajo.html`, `servicios/derecho-de-danos.html`, `servicios/sucesiones.html` | Páginas de servicio | Su dirección sin `.html` |
| `abogadas/vanesa-sabalette-rabello.html` | Página de la abogada (y la de Carolina Pertusatti cuando tenga sus textos) | Su dirección sin `.html` |
| `404.html` | "No encontramos esa página", con código 404 | Toda dirección pública que no existe |
| `app.html` | La aplicación de siempre, vacía, sin índice para buscadores | `/ingresar`, `/cambiar-contrasena`, `/panel/…`, `/portal/…` |
| `sitemap.xml`, `robots.txt` | Para los buscadores | Su nombre |
| `assets/…`, `marca/…`, `fotos/…` | Código, estilos, logo, imagen para compartir y fotos | Su nombre |

En desarrollo (`pnpm dev`) no hay prerenderizado: Vite sirve `index.html` en todas las direcciones y `main.tsx` decide qué mostrar (ver "Entrada").

### Módulos de NestJS (`api/src/`)

| Archivo | Cambio | RF |
|---|---|---|
| `autenticacion/sesion-valida.ts` (nuevo) | `findValidSession(sesiones, jwt, token)`: verifica el token de acceso y devuelve la sesión con su usuario si es válida, o `null`. Es la validación que hoy hace el guard, sin cambios de comportamiento. | RF-31 |
| `autenticacion/autenticacion.guard.ts` | Usa `findValidSession`; si es `null`, 401 como hoy. Después sigue extendiendo `venceEn` como hasta ahora. | spec 001, RF-12 a RF-14 |
| `autenticacion/autenticacion.service.ts` | Nuevo `sessionSection(token)`: `'portal'`, `'panel'` o `null`. No escribe nada. | RF-31 |
| `autenticacion/sesion.controller.ts` | Nueva ruta `GET /sesion/estado`, `@Public()`. Solo delega. | RF-29 a RF-31 |

### Carpetas de `web/src/`

| Carpeta o archivo | Contenido | RF |
|---|---|---|
| `servicios/datos-estudio.ts` | Datos de contacto completos: nombre, nombre en dos líneas, WhatsApp, dirección, horarios, email y redes, con `null` o lista vacía para lo no informado. `whatsappUrl(mensaje?)` y `mapsUrl(direccion)`. | RF-3, RF-22 a RF-24, RF-27 |
| `servicios/contenido-sitio.ts` (nuevo) | Los textos T-1 a T-15 y T-17 como datos: apertura, servicios, pestañas, destacados, abogadas, mensajes de WhatsApp y textos de la interfaz. | RF-2, RF-11 a RF-20, RF-27 |
| `servicios/rutas-sitio.ts` (nuevo) | Catálogo de páginas públicas (dirección, archivo, título, descripción, mensaje de WhatsApp, si se indexa), `normalizePublicPath`, `isAppPath` y las redirecciones del sitio. | RF-8 a RF-10, RF-34 |
| `servicios/cabecera-pagina.ts` (nuevo) | `buildHead(pagina, urlSitio)`: título, descripción, dirección principal, vista previa, robots y datos del estudio para buscadores, con todo escapado. | RF-34, RF-36 a RF-38 |
| `servicios/archivos-sitio.ts` (nuevo) | `buildSiteFiles(plantilla, urlSitio, render)`: arma el contenido de cada archivo de `dist/` (páginas, `404.html`, `app.html`, `sitemap.xml`, `robots.txt`). Función pura; el script solo escribe. | RF-35, RF-37, RF-38 |
| `servicios/estado-sesion.ts` (nuevo) | `fetchSessionSection()`: consulta `GET /api/sesion/estado` con `fetch` directo, sin el cliente HTTP. `sessionAccessLink(seccion)`: texto y destino del acceso del encabezado. | RF-29 a RF-31 |
| `servicios/presentacion-sitio.ts` (nuevo) | `initialsOf(nombre)`, `pageTitle(nombre)` y `formatWhatsapp`. | RF-21, RF-34 |
| `componentes/` | Nuevos: `DisenoSitio`, `EncabezadoSitio`, `MenuSitio`, `AccesoIngreso`, `NombreEstudio`, `TarjetaServicio`, `TarjetaAbogada`, `FotoAbogada`, `BloquesTexto`, `ContactoSitio`, `IconosRedes`, `useTituloDocumento` y `useFocoEnAncla`. Cambian `BotonWhatsapp` (mensaje opcional), `BloqueContactoEstudio` (sin dirección si es `null`, nombre en dos líneas), `DisenoSeccion` (nombre en dos líneas), `DisenoPanel` y `DisenoPortal` (título del documento). | RF-3 a RF-7, RF-11 a RF-33 |
| `paginas/` | Nuevas: `SitioInicio`, `SitioServicio`, `SitioDerechoLaboral`, `SitioAbogada` y `SitioNoEncontrada`. Cambian `PaginaIngreso` (logo, nombre, WhatsApp, título) y `PaginaCambiarContrasena` (nombre y título). Se quitan `PaginaInicio` y `PaginaNoEncontrada`, que eran marcadores de posición. | RF-1, RF-9, RF-11 a RF-21, RF-26, RF-33, RF-34 |
| `RutasSitio.tsx` y `SitioPublico.tsx` (nuevos) | Rutas del sitio público y su árbol, sin `ProveedorSesion`. | RF-1, RF-8, RF-9 |
| `entrada-sitio.tsx` (nuevo) | Arranque del sitio público en el navegador: hidrata el HTML prerenderizado. | RF-35 |
| `entrada-servidor.tsx` (nuevo) | `renderPublicPage(ruta)` con `StaticRouter`, y reexporta `buildSiteFiles`, para el prerenderizado. | RF-35 |
| `main.tsx` | Normaliza la dirección y carga el sitio público o la aplicación (ver "Entrada"). | RF-8 |
| `RutasAplicacion.tsx` | Quita `/` y `*`. Suma `/panel/*` y `/portal/*`, que llevan al inicio de su sección. | RF-10 |

Nada en `src/servicios/` importa React (principio 3). Los componentes solo muestran los datos de `contenido-sitio.ts` y `datos-estudio.ts`.

### Otros archivos de `web/`
- `index.html`: el `<title>` se reemplaza por la marca `<!--cabecera-->`, y `#root` lleva la marca `<!--app-->`. En desarrollo son comentarios inertes.
- `scripts/prerender.ts` (nuevo): lee `dist/index.html` y `VITE_URL_SITIO`, llama a `buildSiteFiles` y escribe los archivos. Corre con Node 24, que ejecuta TypeScript sin compilar (solo sintaxis borrable, como ya exige `erasableSyntaxOnly`).
- `package.json`: el script `build` suma los pasos 2 y 3. `.gitignore`: `dist-ssr`.
- `tsconfig.node.json`: incluye `scripts/`.
- `tailwind.config.js`: colores del estudio (ver "Identidad visual").
- `public/.htaccess`: ver ".htaccess".
- `public/marca/`: logo, `compartir.png` (1200 × 630, para las vistas previas) y favicon, cuando el estudio entregue el logo en buena calidad.
- `public/fotos/`: una foto cuadrada por abogada, cuando las entreguen.
- `.env.example`: documenta `VITE_URL_SITIO`.

### Archivos existentes que se modifican
- `api/src/autenticacion/autenticacion.guard.ts`, `autenticacion.service.ts` y `sesion.controller.ts`, con sus tests.
- `web/index.html`, `web/package.json`, `web/tsconfig.node.json`, `web/tailwind.config.js`, `web/.env.example`, `web/.gitignore` y `web/public/.htaccess`.
- `web/src/main.tsx`, `RutasAplicacion.tsx`, `servicios/datos-estudio.ts`, `componentes/BotonWhatsapp.tsx`, `BloqueContactoEstudio.tsx`, `DisenoSeccion.tsx`, `DisenoPanel.tsx`, `DisenoPortal.tsx`, `paginas/PaginaIngreso.tsx` y `PaginaCambiarContrasena.tsx`, con sus tests: `datos-estudio.test.ts` (nombre y número nuevos, dirección `null`), `Disenos.test.tsx` (nombre en dos líneas, sin dirección), `RutaProtegida.test.tsx` (la ruta `/` ya no es de la aplicación) y los de las dos páginas.
- `web/src/paginas/PaginaInicio.tsx` y `PaginaNoEncontrada.tsx` se borran.
- `docs/specs/001-autenticacion-y-roles/plan.md` y `docs/specs/004-portal-del-cliente/plan.md`. Ver "Planes de las specs 001 y 004".

## Entidades de TypeORM y migración

No hay entidades ni migración nuevas, y ninguna tabla cambia. El contenido del sitio y los datos de contacto viven en el código (principio 5). `GET /sesion/estado` lee `sesiones` y `usuarios` sin escribir.

## Contrato de la API

### Estado de la sesión — `GET /api/sesion/estado` (público) [RF-29 a RF-31, RF-41]

| Pedido | Respuesta | Códigos |
|---|---|---|
| Sin cuerpo. Usa la cookie `access_token` si viene. | `{ "seccion": "portal" \| "panel" \| null }` | Siempre 200 |

- `seccion` es `"portal"` para un cliente y `"panel"` para un administrador o abogado, también con el cambio de contraseña pendiente: el acceso lleva a `/portal` o `/panel`, y `RutaProtegida` lo manda al cambio (spec 001, RF-11).
- `null` sin cookie, con un token inválido o vencido, o con la sesión revocada, vencida, de otro usuario o de una cuenta desactivada. Todos esos casos responden igual.
- Nunca responde 401: así el navegador no intenta renovar la sesión.
- No extiende `venceEn`, no renueva y no envía `Set-Cookie` [RF-31].
- La respuesta tiene solo la clave `seccion`: ni id, ni nombre, ni rol exacto, ni ningún otro dato [RF-41].
- Como toda la API, lleva `Cache-Control: no-store` y CORS solo para los orígenes permitidos, con credenciales.

```
sesion.controller.ts:
  @Public() @Get('estado')
  status(request) → { seccion: authentication.sessionSection(request.cookies[ACCESS_TOKEN_COOKIE]) }

autenticacion.service.ts:
  sessionSection(token):
    sesión = findValidSession(sesiones, jwt, token)       // solo lectura
    si no hay sesión: null
    si no: sesión.usuario.rol == 'cliente' ? 'portal' : 'panel'

sesion-valida.ts:
  findValidSession(sesiones, jwt, token):
    payload = verificar token HS256 con sub y sid enteros; si falla: null
    sesión = buscar por payload.sid con su usuario
    válida si existe, revocadaEn es null, venceEn > ahora, usuarioId == payload.sub y usuario.activo
    devolver sesión o null

guard de autenticación:
  sesión = findValidSession(...); si es null: 401 INVALID_SESSION_MESSAGE      // igual que hoy
  UPDATE sesiones SET venceEn = ... WHERE id = sesión.id AND revocadaEn IS NULL // igual que hoy
```

Si el token de acceso venció (dura 15 minutos) pero la sesión sigue viva, el estado es `null` y el sitio muestra "Ingresar". Al elegirlo, `/ingresar` renueva la sesión y lleva a su sección (spec 001, RF-8). Es el caso límite aceptado en la spec.

Ningún otro endpoint cambia. El sitio público no llama a ningún otro endpoint.

## Estado de la sesión en el sitio público [RF-29 a RF-32]

```
servicios/estado-sesion.ts:
  fetchSessionSection({ baseUrl = VITE_API_URL, fetch, timeoutMs = 5000 }):
    try:
      respuesta = fetch(baseUrl + '/api/sesion/estado',
                        { credentials: 'include', signal: AbortSignal.timeout(timeoutMs) })
      si !respuesta.ok: null
      seccion = (await respuesta.json()).seccion
      devolver seccion si es 'portal' o 'panel'; si no, null
    catch: null                                   // sin conexión, demora o error: "Ingresar" [RF-29]

  sessionAccessLink(seccion):
    'portal' → { href: '/portal', label: 'Ir a mi portal' }
    'panel'  → { href: '/panel',  label: 'Ir al panel' }
    null     → { href: '/ingresar', label: 'Ingresar' }

componentes/AccesoIngreso.tsx:
  seccion = null al empezar (también en el HTML prerenderizado)  // "Ingresar" mientras no se sabe
  al montarse: seccion = await fetchSessionSection()
  en 'pageshow' con event.persisted (volver atrás): consultar de nuevo
  muestra <a href={link.href}>{link.label}</a>
```
- Usa `fetch` directo y no `httpClient`, para no disparar la renovación ante un 401, no avisar "sesión cerrada" y no contar como actividad del control de inactividad [RF-31, RF-32].
- La consulta se hace al abrir o volver a cargar una página pública, que es cuando se monta el encabezado. Cambiar de pestaña en Derecho Laboral no la repite.
- El árbol del sitio público no monta `ProveedorSesion`: no llama a `GET /sesion/usuario`, que extiende la sesión y devuelve los datos de la cuenta, y no tiene control de inactividad ni avisos [RF-31, RF-32, RF-41].
- El acceso es un enlace común: al elegirlo se carga la aplicación, y `RutaProtegida` decide. Si la sesión ya no existe, lleva a `/ingresar` [RF-30, RF-32].

## Contenido [RF-2, RF-11 a RF-21; anexo T-1 a T-17]

`servicios/contenido-sitio.ts` exporta los textos como datos, sin formato:
```
type Bloque = { tipo: 'parrafo'; texto: string } | { tipo: 'lista'; items: readonly string[] }

APERTURA = T-1
INTRO_SERVICIOS = T-2
SERVICIOS = [
  { clave: 'derecho-laboral', nombre: 'Derecho Laboral', titulo: 'Derecho Laboral', frase: T-3, ruta },
  { clave: 'accidentes', nombre: 'Accidentes y Enfermedades Laborales',
    titulo: 'Accidentes de trabajo y enfermedades profesionales', frase: T-4, bloques: T-10, ruta },
  { clave: 'danos', …, frase: T-5, bloques: T-11 },
  { clave: 'sucesiones', …, frase: T-6, bloques: T-12 },
]                                                                       // RF-12, RF-13
PESTANAS_LABORAL = [
  { clave: 'empresas', etiqueta: 'Empresas', destacados: T-7, bloques: T-8, ruta },
  { clave: 'trabajadores', etiqueta: 'Trabajadores', bloques: T-9, ruta },
]
ABOGADAS = [                                                            // orden del logo [RF-18]
  { slug: 'carolina-pertusatti', nombre: 'Carolina Pertusatti', foto: null, resumen: null, texto: null },
  { slug: 'vanesa-sabalette-rabello', nombre: 'Vanesa Sabalette Rabello', foto: null,
    resumen: T-13, texto: T-14 (párrafos) },
]
MENSAJES_WHATSAPP = T-15
TEXTOS = T-17
```
- `hasOwnPage(abogada)` es `resumen !== null && texto !== null` [RF-20]. Cuando el estudio entregue algo, se cambia esta spec (RF-2) y este archivo.
- `foto` es la ruta del archivo en `public/fotos/` o `null` [RF-21].
- Los títulos y descripciones de T-16 viven en `rutas-sitio.ts`, junto a cada página.

## Direcciones [RF-8 a RF-10]

`servicios/rutas-sitio.ts`:
```
PUBLIC_PAGES = [
  { ruta: '/', archivo: 'index.html', titulo, descripcion, mensaje, indexable: true },
  { ruta: '/servicios/derecho-laboral/empresas', archivo: 'servicios/derecho-laboral/empresas.html', … },
  { ruta: '/servicios/derecho-laboral/trabajadores', … },
  { ruta: '/servicios/accidentes-de-trabajo', … },
  { ruta: '/servicios/derecho-de-danos', … },
  { ruta: '/servicios/sucesiones', … },
  …una por abogada con hasOwnPage
]
REDIRECTS = { '/servicios': '/#servicios', '/abogadas': '/#abogadas',
              '/servicios/derecho-laboral': '/servicios/derecho-laboral/empresas' }

isAppPath(ruta) = ruta es '/ingresar' o '/cambiar-contrasena', o empieza con '/panel' o '/portal'
                  (la sección entera o seguida de '/')

normalizePublicPath(ruta):                         // '/Servicios/Sucesiones/' → '/servicios/sucesiones'
  r = minúsculas(ruta) sin barras finales ('/' queda '/')
  si r está en REDIRECTS: devolver su destino
  si r es una ruta de PUBLIC_PAGES o isAppPath(r): devolver r
  si no: null                                      // no existe: se queda en la página 404
```

En producción, el `.htaccess` resuelve la barra final y las redirecciones con el servidor. Las mayúsculas las resuelve el navegador, porque el `.htaccess` no puede pasar una dirección a minúsculas (ver "Otras decisiones técnicas"): una dirección con mayúsculas no existe como archivo, Hostinger responde `404.html`, y `main.tsx` la reemplaza por la dirección normalizada antes de mostrar nada [RF-8].

`RutasAplicacion.tsx` suma, dentro de `RutaProtegida` y fuera de los diseños [RF-10]:
```
<Route path="/panel/*" element={<Navigate to="/panel" replace />} />
<Route path="/portal/*" element={<Navigate to="/portal" replace />} />
```
`RutaProtegida` aplica primero `canAccess`: sin sesión, `/ingresar`; con cambio pendiente, `/cambiar-contrasena`; con el rol de la otra sección, la suya (spec 001, RF-20). Recién después, una dirección inexistente lleva al inicio de su sección. Las rutas existentes del panel y del portal siguen siendo más específicas que `/*`, así que no cambian.

## Prerenderizado y cabecera de cada página [RF-34 a RF-38]

```
scripts/prerender.ts:
  urlSitio = process.env.VITE_URL_SITIO; si falta o no empieza con https://: error "Falta VITE_URL_SITIO"
  plantilla = leer dist/index.html
  { renderPublicPage, buildSiteFiles } = import dist-ssr/entrada-servidor.js
  para cada [archivo, contenido] de buildSiteFiles(plantilla, urlSitio, renderPublicPage):
    escribir dist/<archivo>
  borrar dist-ssr/

servicios/archivos-sitio.ts:
  buildSiteFiles(plantilla, urlSitio, render):
    para cada página de PUBLIC_PAGES:
      archivo = plantilla con <!--cabecera--> = buildHead(página, urlSitio)
                          y <!--app--> = render(página.ruta)
    '404.html'  = plantilla con buildHead(NO_ENCONTRADA, noindex) y render('/__no-existe')
    'app.html'  = plantilla con buildHead(APLICACION, noindex) y #root vacío
    'sitemap.xml' = urlSitio + ruta de cada página indexable
    'robots.txt'  = Disallow: /ingresar, /cambiar-contrasena, /panel, /portal, /app.html, /404.html
                    y Sitemap: urlSitio/sitemap.xml

entrada-servidor.tsx:
  renderPublicPage(ruta) = renderToString(<StaticRouter location={ruta}><SitioPublico /></StaticRouter>)
```

`buildHead(pagina, urlSitio)` devuelve, con todos los valores escapados para HTML:
- `<title>` y `<meta name="description">` de T-16 [RF-34].
- `<link rel="canonical">` con `urlSitio + ruta`: la dirección principal aunque se haya llegado por una variante [RF-37].
- Vista previa: `og:type`, `og:site_name`, `og:locale` (`es_AR`), `og:title`, `og:description`, `og:url`, `og:image` (`urlSitio/marca/compartir.png`) y `twitter:card` (`summary_large_image`) [RF-36].
- En el inicio, los datos del estudio para buscadores como `application/ld+json` de tipo `LegalService`: `name`, `url`, `telephone` (`+5493455414147`), `logo` y, solo si están informados, `address`, `openingHours`, `email` y `sameAs` (redes). Se arma con `JSON.stringify`, reemplazando `<` por `<` para que ningún texto pueda cerrar la etiqueta [RF-37].
- En `404.html` y `app.html`, `<meta name="robots" content="noindex">` [RF-38].

`lang="es"` ya está en `index.html` [RF-34]. Las pantallas de la aplicación y el cambio de pestaña ponen su título con `useTituloDocumento` (ver "Frontend").

## .htaccess [RF-8 a RF-10, RF-25, RF-38, RF-43; spec 004, RF-6]

```
ErrorDocument 404 /404.html                                  # código 404 real [RF-38]
DirectorySlash Off                                           # /servicios no se vuelve /servicios/
Options -Indexes                                             # sin listados de carpetas

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  …dirección única sin www y con HTTPS (plan 004), sin cambios

  RewriteRule ^(.+)/$ /$1 [R=302,L]                          # sin barra final [RF-8]
  RewriteRule ^servicios$ /#servicios [R=302,NE,L]
  RewriteRule ^abogadas$ /#abogadas [R=302,NE,L]
  RewriteRule ^servicios/derecho-laboral$ /servicios/derecho-laboral/empresas [R=302,L]

  RewriteRule ^(index|app|404)\.html$ - [L]                  # archivos internos, sin reescribir
  RewriteRule ^(ingresar|cambiar-contrasena)$ /app.html [L]  # aplicación [RF-10]
  RewriteRule ^(panel|portal)(/.*)?$ /app.html [L]

  RewriteCond %{DOCUMENT_ROOT}/$1.html -f                    # página prerenderizada
  RewriteRule ^(.+)$ /$1.html [L]
  # cualquier otra cosa no existe: 404.html con código 404
</IfModule>

<IfModule mod_headers.c>
  Header always set Content-Security-Policy "frame-ancestors 'none'"   # [RF-43]
  Header always set X-Frame-Options "DENY"
  Header always set Referrer-Policy "same-origin"                       # [RF-25]
  <Files "app.html">
    Header set Cache-Control "no-store"                      # reemplaza la regla de index.html (spec 004, RF-6)
    Header set X-Robots-Tag "noindex"
  </Files>
  <Files "404.html">
    Header set X-Robots-Tag "noindex"
  </Files>
  <FilesMatch "^(?!app\.html$).*\.html$">
    Header set Cache-Control "no-cache"                      # el navegador guarda la página y revisa si cambió [RF-39]
  </FilesMatch>
</IfModule>
```
- Las redirecciones nuevas se publican con `302`, como la de la dirección única del plan 004, y pasan a `301` después de verificarlas en producción.
- `app.html` hereda el `no-store` que antes tenía `index.html`: sigue sin guardarse ninguna pantalla del panel ni del portal (spec 004, RF-6). Las páginas públicas sí se guardan, porque no tienen datos de nadie.
- La protección contra incrustar va para todos los archivos, así cubre el sitio, el ingreso, el cambio de contraseña, el panel y el portal [RF-43]. `X-Frame-Options` es para navegadores viejos que no entienden `frame-ancestors`.
- Hostinger usa LiteSpeed, que lee el `.htaccess`. `DirectorySlash Off` y las reglas se verifican al publicar. Si `DirectorySlash Off` no se respeta, la alternativa es generar cada página como `<ruta>/index.html` y redirigir la barra final al revés.

## Frontend

### Entrada [RF-8, RF-35]
```
main.tsx:
  ruta = location.pathname
  normalizada = normalizePublicPath(ruta)
  si normalizada !== null y normalizada !== ruta:
    location.replace(normalizada + location.hash)            // mayúsculas o barra final; nunca el search [RF-42]
    terminar
  si isAppPath(ruta): import('./App') y createRoot (como hoy)
  si no: import('./entrada-sitio') y start()

entrada-sitio.tsx start():
  raíz = #root
  si raíz tiene contenido (HTML prerenderizado): hydrateRoot(raíz, <BrowserRouter><SitioPublico/></BrowserRouter>)
  si no (desarrollo): createRoot
```
- Los dos árboles van en partes separadas del código: una página pública no descarga el panel ni el portal [RNF de rendimiento].
- El HTML prerenderizado y el primer render en el navegador son idénticos, porque el acceso arranca en "Ingresar" en los dos [RF-29].

### Rutas del sitio público (`RutasSitio.tsx`)

| Ruta | Página |
|---|---|
| `/` | `SitioInicio` |
| `/servicios/derecho-laboral/:pestana` | `SitioDerechoLaboral` (`empresas` o `trabajadores`; otra cosa, `SitioNoEncontrada`) |
| `/servicios/accidentes-de-trabajo`, `/servicios/derecho-de-danos`, `/servicios/sucesiones` | `SitioServicio` con su clave |
| `/abogadas/:slug` | `SitioAbogada` si la abogada tiene página; si no, `SitioNoEncontrada` |
| `/servicios`, `/abogadas`, `/servicios/derecho-laboral` | Redirección de `REDIRECTS` (en desarrollo; en producción la hace el `.htaccess`) |
| `*` | `SitioNoEncontrada` |

Entre páginas públicas, los enlaces son enlaces comunes (`<a href>`): cada página se carga completa, con su cabecera, su título y la consulta de sesión. Solo las pestañas de Derecho Laboral usan `Link` del router (ver "Pestañas"). Los enlaces al ingreso, al portal y al panel también son comunes, porque llevan a `app.html`.

### Comportamiento de la interfaz
- **Diseño** (`DisenoSitio`) [RF-4, RF-23, RF-26, RF-28]: acceso "Saltar al contenido" (oculto hasta recibir el foco), `EncabezadoSitio`, `<main id="contenido" tabIndex={-1}>` con la página, `ContactoSitio` y `BotonWhatsapp` con el mensaje de la página. El contenido termina con un margen inferior mayor que el botón (`pb-24`), así que al final todo se puede ver y usar.
- **Encabezado** (`EncabezadoSitio`) [RF-3, RF-4]: enlace al inicio con el logo y `NombreEstudio`, `MenuSitio` y `AccesoIngreso`. No queda fijo al desplazar, para no ocupar la pantalla con el celular en horizontal.
- **Nombre** (`NombreEstudio`) [RF-3]: dos líneas, "Pertusatti | Sabalette" (`whitespace-nowrap`, para que no se corte) y "Abogadas". Se usa en `EncabezadoSitio`, en la apertura del inicio, en `ContactoSitio`, en `BloqueContactoEstudio`, en `DisenoSeccion`, en `PaginaIngreso` y en `PaginaCambiarContrasena`.
- **Menú** (`MenuSitio`) [RF-5, RF-6]:
  - Enlaces: "Servicios" (`/#servicios`), "Abogadas" (`/#abogadas`) y "Contacto" (`#contacto`, el bloque de la página actual).
  - Desde 768 px, una fila de enlaces. Debajo de 768 px, un `<details>` con `<summary>Menú</summary>`: abre y cierra sin código, anuncia si está abierto, y funciona aunque el navegador no ejecute el código de la página [RF-35].
  - Con el código cargado: al elegir una opción, o con Escape, se cierra el `<details>` y el foco vuelve a "Menú".
- **Secciones** (`useFocoEnAncla`) [RF-5, accesibilidad]: al cargar con `#servicios`, `#abogadas` o `#contacto`, o al cambiar el `#`, lleva el foco al título de esa sección (`tabIndex={-1}`).
- **Inicio** (`SitioInicio`) [RF-11, RF-12, RF-18]:
  - Apertura: `<h1>` con `NombreEstudio` y el texto T-1, sobre el degradado del logo.
  - Servicios (`id="servicios"`): `<h2>` "Nuestros servicios", T-2 y cuatro `TarjetaServicio`, en una columna en el celular y en dos o cuatro columnas en pantallas más anchas. Cada tarjeta: `<h3>` con el nombre, la frase y el enlace "Conocer más", con un texto oculto para el lector de pantalla ("sobre Derecho Laboral") para que los cuatro enlaces no se lean iguales.
  - Abogadas (`id="abogadas"`): `<h2>` "Abogadas" y una `TarjetaAbogada` por integrante.
  - Contacto: el `ContactoSitio` del diseño.
- **Servicio** (`SitioServicio`) [RF-7, RF-13, RF-14]: "Volver a servicios" (`/#servicios`), `<h1>` con el título, `BloquesTexto` y, al final, `<h2>` "Otros servicios" con los otros tres.
- **Textos** (`BloquesTexto`) [RF-2, RF-14]: cada párrafo es un `<p>` y cada lista un `<ul>` con un `<li>` por punto. El texto se muestra siempre como texto (sin `dangerouslySetInnerHTML`, como ya exige ESLint).
- **Pestañas** (`SitioDerechoLaboral`) [RF-15 a RF-17]:
  - `<h1>` "Derecho Laboral" y T-3. Debajo, un `<nav aria-label="Destinatarios">` con dos `Link` con aspecto de pestaña ("Empresas" y "Trabajadores"). La elegida lleva `aria-current="page"`, borde inferior y texto en negrita (no solo color).
  - Las dos se renderizan siempre en el mismo orden y con la misma clave, así que al elegir una el enlace sigue siendo el mismo elemento: el foco queda en la pestaña elegida y la página no se mueve, porque `BrowserRouter` no cambia la posición al navegar [RF-16].
  - El contenido de la pestaña lleva un `<h2>` oculto a la vista con su nombre, para que los títulos sigan en orden. En Empresas, los tres destacados (T-7) en una lista resaltada y después `BloquesTexto` de T-8. En Trabajadores, T-9 [RF-17].
  - `useTituloDocumento` cambia el título del documento al de la pestaña, y `BotonWhatsapp` toma su mensaje [RF-27, RF-34].
  - Sin el código de la página, cada pestaña es un enlace común a su página prerenderizada.
- **Abogadas** [RF-18 a RF-21]:
  - `TarjetaAbogada`: `FotoAbogada` mediana, `<h3>` con el nombre, "Abogada" y, si `hasOwnPage`, el resumen y "Más información" (con el nombre como texto oculto). Si no, solo foto, nombre y "Abogada". Las tarjetas tienen el mismo ancho y el contenido arriba, para que se vean ordenadas con distinta cantidad de texto.
  - `SitioAbogada`: "Volver a abogadas" (`/#abogadas`), `FotoAbogada` grande, `<h1>` con el nombre, "Abogada" y un `<p>` por párrafo de T-14.
  - `FotoAbogada`: un círculo de tamaño fijo con las iniciales (`initialsOf(nombre)`: CP, VSR) en blanco sobre `estudio-oscuro`, con `aria-hidden`. Si hay foto, un `<img>` encima, del mismo tamaño, con `alt="Foto de <nombre>"`, `width` y `height` fijos (la página no se mueve) y `loading="lazy"` en las tarjetas. Arranca transparente y se muestra en `onLoad`; en `onError` se quita. Como un error puede ocurrir antes de que se ejecute el código, al montarse revisa `img.complete && img.naturalWidth === 0`.
- **Contacto** (`ContactoSitio`, `id="contacto"`) [RF-22 a RF-25, RF-27]:
  - `<h2>` "Contacto", `NombreEstudio`, y cada dato solo si está informado, con su título de T-17.
  - WhatsApp: el número (`+54 9 3455 41-4147`) como enlace con el mensaje de la página.
  - Dirección como texto y "Cómo llegar" (`mapsUrl`).
  - Horarios, un renglón por línea.
  - Email escrito, como enlace `mailto:`.
  - Redes con su ícono SVG propio (`IconosRedes`) y el nombre de la red escrito.
  - Todo enlace externo lleva `target="_blank"` y `rel="noopener noreferrer"` [RF-25]. `break-words` en la dirección y el email.
- **WhatsApp** (`BotonWhatsapp`) [RF-26, RF-27]: suma la propiedad opcional `mensaje`. `whatsappUrl(mensaje)` arma `https://wa.me/5493455414147?text=<mensaje codificado>`, o sin `?text` si no hay mensaje. Mismo aspecto y posición que en el portal. El ingreso y el portal lo siguen usando sin mensaje.
- **Página inexistente** (`SitioNoEncontrada`) [RF-9]: `<h1>` "No encontramos esa página", el texto de T-17, "Ir al inicio" y los cuatro servicios. Nunca lee ni muestra la dirección.
- **Ingreso** (`PaginaIngreso`) [RF-3, RF-26, RF-28, RF-33]: arriba del formulario, el logo y `NombreEstudio` como enlace común a `/`. `BotonWhatsapp` sin mensaje. Margen inferior mayor que el botón, para que con el teclado del celular abierto los campos y "Ingresar" se puedan llevar por encima del botón.
- **Títulos** (`useTituloDocumento`) [RF-34]: pone `document.title` al montarse y al cambiar el título. Lo usan las páginas públicas, `PaginaIngreso`, `PaginaCambiarContrasena`, `DisenoPanel` y `DisenoPortal`, con los títulos de T-16 armados por `pageTitle`.
- **Panel y portal** [RF-3]: `DisenoSeccion` muestra `NombreEstudio` en lugar del nombre en una línea. `BloqueContactoEstudio` muestra el nombre en dos líneas y omite la dirección si es `null` (spec 004, RF-18).

### Datos de contacto [RF-22 a RF-24]
```
servicios/datos-estudio.ts:
  STUDIO_CONTACT = {
    nombre: 'Pertusatti | Sabalette - Abogadas',
    nombreLineas: ['Pertusatti | Sabalette', 'Abogadas'],
    whatsapp: '5493455414147',               // como lo pide wa.me
    whatsappVisible: '+54 9 3455 41-4147',
    direccion: null,                         // pendiente (spec, dudas abiertas)
    horarios: [],                            // pendiente
    email: null,                             // pendiente
    redes: [],                               // pendiente: { red: 'Instagram', url }
  }
  whatsappUrl(mensaje?) ; mapsUrl(direccion) = 'https://www.google.com/maps/search/?api=1&query=' + codificada
```
Es la única fuente del nombre y del contacto para el sitio, el ingreso, el portal y el panel. No queda ningún dato genérico.

### Identidad visual [RF-3]
- `tailwind.config.js` suma `colors.estudio = { oscuro: '#2C3256', azul: '#415789', blanco: '#FCFFFF' }`. El degradado del logo es `bg-gradient-to-r from-estudio-oscuro to-estudio-azul`.
- El blanco sobre los dos azules contrasta 12,3 a 1 (oscuro) y 7,1 a 1 (azul): cumple el mínimo de 4,5 a 1 en cualquier punto del degradado.
- Tipografía del sistema (la `sans` por defecto de Tailwind), sin tipografías de terceros [RF-40].
- El logo va en `public/marca/`. Mientras el estudio no entregue la versión en buena calidad, se usa como provisoria la imagen que ya entregó. Junto al nombre escrito, el logo lleva `alt=""`: el enlace ya se llama como el estudio y el lector de pantalla no lo lee dos veces. Esto interpreta el RNF de accesibilidad ("el logo tiene texto alternativo"), que se cumple con el texto del enlace. Donde el logo va solo (la vista previa al compartir), su texto alternativo es el nombre del estudio.

### Accesibilidad [RNF de accesibilidad]
- Cada página tiene un único `<h1>` y los títulos en orden, también dentro de las pestañas.
- Foco visible en todo control con `focus-visible:outline` del color del estudio.
- Al cargar cada página pública, el lector de pantalla anuncia su título porque es un documento nuevo. Al cambiar de pestaña, el foco queda en la pestaña elegida y el título cambia [RF-16].
- Controles táctiles de al menos 44 × 44 px (`min-h-11 min-w-11`) [RNF de plataformas].
- `motion-reduce:transition-none` en las transiciones (la aparición de la foto y el menú).
- A 360 px: una columna, márgenes de 16 px y las dos pestañas lado a lado (`flex-1`). Agrandadas al 200 %, las pestañas pasan una debajo de la otra (`flex-wrap`).

## Planes de las specs 001 y 004
En la misma tarea y el mismo commit que el código (principio 2):
- `docs/specs/001-autenticacion-y-roles/plan.md`: el contrato suma `GET /sesion/estado`; "Cada petición protegida" pasa a usar `findValidSession`; "Rutas" del frontend suma `/panel/*` y `/portal/*`, y aclara que `/` ya no es de la aplicación.
- `docs/specs/004-portal-del-cliente/plan.md`: "Datos de contacto" (datos reales, sin dirección genérica, nombre en dos líneas); "Caché del navegador" y "Dirección única del sitio" (la regla `no-store` pasa de `index.html` a `app.html`).

`tasks.md` y `validacion.md` de esas specs no se tocan: registran lo que se hizo y validó en su momento.

## Dependencias nuevas

Ninguna. El prerenderizado usa el modo SSR de Vite y `react-dom/server`, ya instalados; `StaticRouter` viene en `react-router-dom` 7; el script corre con Node 24 sin compilar. Los íconos de las redes son SVG propios, como el de WhatsApp.

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `VITE_URL_SITIO` | `web/.env.example` (documentada) y el entorno donde se construye el frontend | Dirección pública del sitio, con `https://` y sin barra final (por ejemplo, `https://estudio.com`). Arma la dirección principal, la vista previa y el `sitemap.xml`. Sin ella, `pnpm --filter web build` falla con "Falta VITE_URL_SITIO". |

## Otras decisiones técnicas

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Prerenderizado propio con el modo SSR de Vite y un script | `vite-react-ssg`, `vike` o un servicio de prerenderizado externo | Cumple RF-35 sin dependencias (principio 1). Es poco código, y la lógica que importa (`buildSiteFiles`, `buildHead`) queda en funciones puras testeables. |
| Hidratar el HTML prerenderizado con el mismo árbol de React | Páginas públicas en HTML escrito a mano | Un solo código para el texto y los componentes; no hay dos versiones del contenido que mantener iguales. |
| Enlaces comunes entre páginas públicas y `Link` solo en las pestañas | Navegación de todo el sitio con el router | Cada página llega con su título y su cabecera, el navegador anuncia la página nueva y restaura la posición al volver atrás, y la sesión se consulta al abrir cada página (RF-31). Las pestañas usan el router para no moverse de lugar (RF-16). |
| El sitio público sin `ProveedorSesion` | Reusar `ProveedorSesion` y `GET /sesion/usuario` | Esa consulta extiende la sesión y trae todos los datos de la cuenta, y el proveedor tiene control de inactividad y avisos. RF-31, RF-32 y RF-41 lo prohíben en el sitio público. |
| `GET /sesion/estado` que siempre responde 200 | Responder 401 sin sesión | Con 401, el navegador intentaría renovar la sesión. Y un mismo código para todos los casos no deja distinguir por qué no hay sesión. |
| Validación de la sesión compartida entre el guard y el estado | Repetirla en el servicio | Una sola regla de "sesión válida". El guard queda igual y suma solo la extensión. |
| `fetch` directo en `estado-sesion.ts` | El cliente HTTP de la aplicación | El cliente renueva ante un 401, avisa "sesión cerrada" y cuenta actividad. |
| 404 real con `ErrorDocument` y `app.html` solo para las rutas de la aplicación | Servir `index.html` para cualquier dirección | Los buscadores reciben "no existe" (RF-38), y sin sesión toda dirección del panel o del portal lleva al ingreso (RF-10). |
| Mayúsculas resueltas en el navegador | Pasar a minúsculas en el `.htaccess` | Apache solo lo hace con `RewriteMap`, que no se puede usar en un `.htaccess` de Hostinger. Sin el código de la página, una dirección con mayúsculas queda en "No encontramos esa página"; se acepta. |
| Menú del celular con `<details>` | Estado de React | Funciona sin el código de la página (RF-35) y anuncia solo si está abierto. |
| Tipografía del sistema | Google Fonts | Una tipografía de terceros envía la IP del visitante a otra empresa (RF-40). |
| Datos del estudio como `LegalService` en `ld+json` | Microdatos en el HTML | Quedan separados del contenido y se testean como datos. |
| Textos en `contenido-sitio.ts`, con un test que los compara con el anexo de la spec | Textos escritos dentro de los componentes | Separa contenido de interfaz (principio 3) y verifica "palabra por palabra" (RF-2) contra la spec misma. |
| `X-Frame-Options` y `frame-ancestors` | Solo uno | `frame-ancestors` es el estándar actual; `X-Frame-Options` cubre navegadores viejos. |
| Redirecciones nuevas con 302 hasta verificarlas | 301 desde el principio | Los navegadores guardan las 301 indefinidamente. Es la regla del plan 004. |
| Encabezado no fijo | Encabezado fijo al desplazar | Con el celular en horizontal, uno fijo ocupa buena parte de la pantalla. |

## Estrategia de tests

### api — unitarios (Vitest)
- `sesion-valida.ts`: `null` sin token, con token mal firmado, con `sub` o `sid` no enteros, con sesión inexistente, revocada, vencida, de otro usuario o de una cuenta desactivada; la sesión con su usuario si es válida.
- `autenticacion.guard.spec.ts` (existente): sigue en verde sin cambios de casos; suma que usa la validación compartida.
- `autenticacion.service.spec.ts`: `sessionSection` da `'portal'` para cliente, `'panel'` para admin y abogado, `null` sin sesión válida, y no llama a `update` [RF-31].

### api — e2e (Vitest + Supertest, base de tests)
- `sesion-estado.e2e-spec.ts` [RF-29 a RF-31, RF-41]:
  - 200 `{ seccion: null }` sin cookie, con un token inválido, con la sesión cerrada, revocada por un ingreso desde otro dispositivo, vencida y con la cuenta desactivada.
  - 200 `{ seccion: 'portal' }` para un cliente (también con cambio pendiente) y `{ seccion: 'panel' }` para un abogado y un administrador.
  - La respuesta tiene exactamente la clave `seccion`.
  - `venceEn` no cambia después de la consulta, y la respuesta no trae `Set-Cookie`.
  - Lleva `Cache-Control: no-store`, y CORS con credenciales solo para un origen permitido.
- `sesion.e2e-spec.ts` y `renovacion.e2e-spec.ts` (existentes) siguen en verde: el guard no cambió de comportamiento.

### web — Vitest
- `contenido-sitio.test.ts` [RF-2]: lee `docs/specs/007-sitio-publico/spec.md`, extrae los textos del anexo (citas de T-1 a T-15, puntos de T-7, títulos y descripciones de T-16, textos entre comillas de T-17) y los compara con `contenido-sitio.ts` y `rutas-sitio.ts`, carácter por carácter.
- `datos-estudio.test.ts` [RF-3, RF-22, RF-27]: nombre, nombre en dos líneas, número; `whatsappUrl()` sin mensaje y con mensaje codificado (tildes, ñ y espacios); `mapsUrl`; ningún dato genérico.
- `rutas-sitio.test.ts` [RF-8, RF-10]: `normalizePublicPath` con mayúsculas, barras finales, redirecciones, rutas de la aplicación e inexistentes; `isAppPath` (`/ingresar/x` y `/panelx` no son de la aplicación).
- `cabecera-pagina.test.ts` [RF-34, RF-36 a RF-38]: título, descripción, dirección principal y vista previa de cada página; `LegalService` solo con los datos informados; escapado de `<`, `&` y comillas; `noindex` en la página inexistente y en la aplicación.
- `archivos-sitio.test.ts` [RF-35, RF-37, RF-38]: con un render real (`renderPublicPage`), cada archivo existe con su `<h1>`, su texto y sus enlaces dentro de `#root`, dice "Ingresar" y no "Ir a mi portal"; `404.html` tiene el `<h1>` de la página inexistente; `app.html` tiene `#root` vacío; `sitemap.xml` solo con las páginas indexables; `robots.txt` con las rutas privadas.
- `estado-sesion.test.ts` [RF-29 a RF-31]: con `fetch` simulado, cada `seccion` válida, `null` ante un código distinto de 200, un cuerpo inesperado, un error de red y una demora mayor al límite; `sessionAccessLink` para los tres casos.
- `presentacion-sitio.test.ts` [RF-21, RF-34]: `initialsOf` (CP, VSR) y `pageTitle`.
- Páginas y componentes, con `MemoryRouter` y `fetch` simulado:
  - Inicio: apertura, cuatro tarjetas en orden con su frase y su enlace, tarjeta de Carolina Pertusatti sin resumen ni "Más información", tarjeta de Vanesa Sabalette Rabello completa [RF-11, RF-12, RF-18, RF-20].
  - Cada servicio: título, bloques, "Volver a servicios" y los otros tres [RF-7, RF-13, RF-14].
  - Derecho Laboral: Empresas con los destacados antes del texto, `aria-current` en la elegida, el cambio de pestaña con el teclado deja el foco en la pestaña y cambia la dirección, el título y el mensaje de WhatsApp; volver atrás vuelve a Empresas [RF-15 a RF-17, RF-27].
  - Abogada: página completa; dirección de una abogada sin textos y pestaña inexistente muestran "No encontramos esa página" [RF-9, RF-19, RF-20].
  - Página inexistente: no muestra la dirección pedida, ni los datos agregados al final [RF-9, RF-42].
  - `FotoAbogada`: iniciales sin foto, mientras carga, ante `onError` y ante una imagen ya rota al montarse; `alt` con el nombre [RF-21].
  - `ContactoSitio`: solo nombre y WhatsApp con los datos de hoy; con datos de prueba completos, cada uno con su título y "Cómo llegar" solo con dirección; enlaces externos con `target` y `rel` [RF-23 a RF-25].
  - `AccesoIngreso`: "Ingresar" mientras se consulta, al responder `null` y ante un error; "Ir a mi portal" y "Ir al panel" con su destino; nueva consulta en `pageshow` [RF-29, RF-30].
  - `MenuSitio`: abre y cierra, se cierra al elegir una opción y con Escape, y el foco vuelve a "Menú" [RF-6].
  - `BotonWhatsapp` con y sin mensaje; `PaginaIngreso` con el botón sin mensaje, el logo enlazado a `/` y su título [RF-26, RF-27, RF-33].
  - `DisenoSeccion` y `BloqueContactoEstudio`: nombre en dos líneas y sin dirección [RF-3; spec 004, RF-18].
- `RutaProtegida.test.tsx` [RF-10]: `/panel/no-existe` y `/portal/no-existe` llevan al ingreso sin sesión, al inicio de su sección con sesión, a la otra sección según el rol y al cambio de contraseña si está pendiente.
- `htaccess.test.ts` [RF-8 a RF-10, RF-38, RF-43]: lee `public/.htaccess` y verifica que estén `ErrorDocument 404`, las redirecciones, las reglas de `app.html`, `frame-ancestors 'none'`, `X-Frame-Options DENY`, `Referrer-Policy` y el `no-store` de `app.html`. No ejecuta Apache: el comportamiento real se verifica al publicar.
- `fotos.test.ts` [RF-21]: recorre `public/fotos/` y falla si algún archivo tiene datos de cámara (bloques EXIF o XMP).
- `aislamiento-sitio.test.ts` [RF-36, RF-39 a RF-41], como los de las specs 005 y 006: lee el código del sitio público (páginas `Sitio*`, sus componentes, `SitioPublico`, `RutasSitio`, `entrada-sitio`, `entrada-servidor` y sus servicios) y falla si importa `cliente-http`, `sesion`, `ProveedorSesion`, `ProveedorServicios` o algún servicio de causas, movimientos, portal, usuarios, jurisprudencia o modelos; si usa `localStorage`, `sessionStorage`, `indexedDB` o `document.cookie`; o si tiene campos para escribir (`<input`, `<textarea`, `<select`) o recursos de otros sitios (`src="http`, `href="http` fuera de los enlaces de contacto).

### Verificación manual (antes de publicar)
Los pasos de la demo manual de la spec. El contraste, el recorrido con teclado y lector de pantalla, la posición del botón de WhatsApp en vertical y en horizontal y la ausencia de desplazamiento horizontal a 360 px se verifican así, porque no hay un test automático confiable para ellos.

### Al publicar
- La vista previa al compartir por WhatsApp [RF-36].
- Con las herramientas de los buscadores: el texto de cada página, el `sitemap.xml`, los datos del estudio, la dirección principal y que las pantallas privadas no se listan [RF-35, RF-37, RF-38].
- En Hostinger: código 404 real, redirecciones de la barra final y de `/servicios/derecho-laboral`, `app.html` para el panel y el portal, los encabezados de seguridad y el tiempo de carga desde un celular con 4G [RF-8 a RF-10, RF-43, RNF de rendimiento].

## Cobertura de RF

| RF | Dónde se implementa | Test |
|---|---|---|
| RF-1 | `SitioPublico`, `RutasSitio`, prerenderizado | Vitest de páginas, `archivos-sitio` |
| RF-2 | `contenido-sitio.ts`, `BloquesTexto` | `contenido-sitio.test.ts` contra el anexo |
| RF-3 | `datos-estudio.ts`, `NombreEstudio`, `tailwind.config.js`, `DisenoSeccion` | Vitest, verificación manual de colores |
| RF-4 a RF-7 | `DisenoSitio`, `EncabezadoSitio`, `MenuSitio`, `SitioServicio`, `SitioAbogada` | Vitest de componentes y páginas |
| RF-8 | `rutas-sitio.ts`, `main.tsx`, `.htaccess`, `BrowserRouter` | `rutas-sitio.test.ts`, `htaccess.test.ts`, al publicar |
| RF-9 | `SitioNoEncontrada`, `404.html`, `ErrorDocument` | Vitest, `archivos-sitio`, al publicar |
| RF-10 | `/panel/*` y `/portal/*` en `RutasAplicacion`, `RutaProtegida`, `.htaccess` | `RutaProtegida.test.tsx`, `htaccess.test.ts` |
| RF-11, RF-12 | `SitioInicio`, `TarjetaServicio` | Vitest de inicio |
| RF-13, RF-14 | `contenido-sitio.ts`, `SitioServicio`, `BloquesTexto` | Vitest de servicios, anexo |
| RF-15 a RF-17 | `SitioDerechoLaboral`, `Link` con `aria-current` | Vitest de pestañas |
| RF-18 a RF-20 | `ABOGADAS`, `hasOwnPage`, `TarjetaAbogada`, `SitioAbogada` | Vitest de inicio y abogada |
| RF-21 | `FotoAbogada`, `initialsOf` | Vitest, `fotos.test.ts` |
| RF-22 a RF-24 | `datos-estudio.ts`, `ContactoSitio`, `BloqueContactoEstudio` | Vitest |
| RF-25 | `target`/`rel` en enlaces externos, `Referrer-Policy` | Vitest, `htaccess.test.ts` |
| RF-26 | `BotonWhatsapp` en `DisenoSitio` y `PaginaIngreso` | Vitest |
| RF-27 | `whatsappUrl(mensaje)`, mensajes de `contenido-sitio.ts` | `datos-estudio.test.ts`, Vitest de páginas |
| RF-28 | Margen inferior en `DisenoSitio` y `PaginaIngreso` | Verificación manual |
| RF-29, RF-30 | `AccesoIngreso`, `estado-sesion.ts` | Vitest |
| RF-31 | `GET /sesion/estado`, `findValidSession`, `fetch` directo, sitio sin `ProveedorSesion` | Unitarios, e2e de estado, aislamiento |
| RF-32 | Sitio sin control de inactividad ni avisos; acceso como enlace común | Vitest, demo manual |
| RF-33 | `PaginaIngreso` | Vitest |
| RF-34 | `buildHead`, `useTituloDocumento`, `pageTitle` | `cabecera-pagina.test.ts`, Vitest |
| RF-35 | Prerenderizado, `<details>`, enlaces comunes | `archivos-sitio.test.ts`, al publicar |
| RF-36 | `og:*` y `twitter:card` en `buildHead` | `cabecera-pagina.test.ts`, al publicar |
| RF-37 | `canonical`, `sitemap.xml`, `LegalService` | `cabecera-pagina` y `archivos-sitio`, al publicar |
| RF-38 | `noindex`, `X-Robots-Tag`, `robots.txt`, `ErrorDocument` | `cabecera-pagina`, `archivos-sitio`, `htaccess`, al publicar |
| RF-39, RF-40 | Sin almacenamiento ni campos, tipografía del sistema, íconos propios, `no-cache` en las páginas públicas | `aislamiento-sitio.test.ts` |
| RF-41 | Respuesta de `GET /sesion/estado` solo con `seccion`; sitio sin servicios de datos | e2e de estado, `aislamiento-sitio.test.ts` |
| RF-42 | Contenido fijo; `main.tsx` descarta el `search`; `SitioNoEncontrada` no lee la dirección | Vitest |
| RF-43 | `frame-ancestors 'none'` y `X-Frame-Options` en el `.htaccess` | `htaccess.test.ts`, al publicar |
| RNF de plataformas y accesibilidad | Columnas, `flex-wrap`, tamaños táctiles, foco, títulos en orden, `useFocoEnAncla` | Vitest de títulos y foco, verificación manual |
| RNF de rendimiento | Sitio separado del panel y del portal, HTML prerenderizado, fotos con tamaño fijo | Al publicar |
| RNF de disponibilidad | Contenido fijo; `fetchSessionSection` con límite de tiempo | `estado-sesion.test.ts` |
| Spec 001, RF-12 y RF-17 (excepciones) | `GET /sesion/estado` sin extensión; sitio sin `ProveedorSesion` | e2e de estado, aislamiento |
