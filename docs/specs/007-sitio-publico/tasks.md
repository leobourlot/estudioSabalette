# Tareas 007 — Sitio público

Derivadas de `spec.md` y `plan.md` de esta carpeta. Cada tarea dura entre 20 y 30 minutos y se hace en orden.

Reglas para todas las tareas:
- Primero se escriben los tests, después el código.
- Una tarea está terminada solo si, además de su "Hecho cuando", `pnpm test` y `pnpm lint` pasan sin errores.
- Ninguna tarea crea ni modifica archivos `.env`, `.env.test` ni ningún otro con credenciales, y ninguna se conecta a la base de producción. Los e2e usan la base de tests de la spec 001. `web/.env.example` solo documenta variables y no lleva valores reales.
- No se agregan dependencias: el plan no prevé ninguna.
- Antes de modificar o borrar un archivo existente se pide aprobación (AGENTS.md). Las tareas que lo hacen lo indican con **(modifica existente)**.
- Cuando una tarea cambia algo que describe el plan de la spec 001 o de la 004, actualiza ese plan en la misma tarea (principio 2), como indica el plan, "Planes de las specs 001 y 004".
- No se hacen commits sin pedido explícito.

## api

- [x] **T1 — Validación compartida de la sesión** [RF-31] **(modifica existente: `autenticacion/autenticacion.guard.ts`, `docs/specs/001-autenticacion-y-roles/plan.md`)**
  `autenticacion/sesion-valida.ts`: `findValidSession(sesiones, jwt, token)`, con la validación que hoy hace el guard. El guard la usa y sigue extendiendo `venceEn` como hasta ahora. El plan 001 ("Cada petición protegida") menciona la función.
  Hecho cuando:
  - Los tests unitarios verifican `null` sin token, con un token mal firmado, con `sub` o `sid` no enteros, y con una sesión inexistente, revocada, vencida, de otro usuario o de una cuenta desactivada; y la sesión con su usuario cuando es válida.
  - `autenticacion.guard.spec.ts`, `sesion.e2e-spec.ts` y `renovacion.e2e-spec.ts` siguen en verde sin cambiar sus casos.

- [x] **T2 — Sección de la sesión** [RF-31, RF-41] **(modifica existente: `autenticacion/autenticacion.service.ts` y `autenticacion.service.spec.ts`)**
  `sessionSection(token)`: `'portal'`, `'panel'` o `null`, con `findValidSession` y sin escribir nada.
  Hecho cuando: los tests unitarios verifican `'portal'` para un cliente (también con cambio de contraseña pendiente), `'panel'` para un administrador y un abogado, `null` sin sesión válida, y que nunca se llama a `update` del repositorio de sesiones.

- [x] **T3 — Estado de la sesión** [RF-29 a RF-31, RF-41] **(modifica existente: `autenticacion/sesion.controller.ts`, `docs/specs/001-autenticacion-y-roles/plan.md`)**
  `GET /api/sesion/estado`, `@Public()`, que solo delega en `sessionSection`. El contrato del plan 001 suma el endpoint.
  Hecho cuando: `sesion-estado.e2e-spec.ts` verifica:
  - 200 `{ seccion: null }` sin cookie, con un token inválido, con la sesión cerrada, reemplazada por un ingreso desde otro dispositivo o vencida, y con la cuenta desactivada.
  - 200 `{ seccion: 'portal' }` para un cliente, también con cambio pendiente, y `{ seccion: 'panel' }` para un abogado y un administrador.
  - Que la respuesta tiene exactamente la clave `seccion`.
  - Que `venceEn` no cambia y que la respuesta no trae `Set-Cookie`.
  - `Cache-Control: no-store`, y CORS con credenciales solo para un origen permitido.

## web — servicios

- [x] **T4 — Datos de contacto reales** [RF-3, RF-22, RF-24, RF-27; spec 004, RF-18] **(modifica existente: `servicios/datos-estudio.ts` y su test, `componentes/BloqueContactoEstudio.tsx`, `componentes/Disenos.test.tsx`, `docs/specs/004-portal-del-cliente/plan.md`)**
  `STUDIO_CONTACT` con el nombre, el nombre en dos líneas, el WhatsApp real (para el enlace y para mostrar), `direccion: null`, `horarios: []`, `email: null` y `redes: []`. `whatsappUrl(mensaje?)` y `mapsUrl(direccion)`. `BloqueContactoEstudio` omite la dirección si es `null`. El plan 004 ("Datos de contacto") deja de hablar de datos genéricos.
  Hecho cuando: los tests verifican:
  - El nombre "Pertusatti | Sabalette - Abogadas", sus dos líneas y el número `5493455414147` y `+54 9 3455 41-4147`.
  - `whatsappUrl()` sin `?text`, y `whatsappUrl(mensaje)` con el mensaje codificado, incluidas tildes, ñ, comas y espacios.
  - `mapsUrl` con la dirección codificada.
  - Que no queda ningún dato genérico (`Ejemplo`, `5491100000000`).
  - Que el bloque de contacto del portal no muestra dirección ni un renglón vacío.

- [x] **T5 — Textos del sitio** [RF-2, RF-12 a RF-20]
  `servicios/contenido-sitio.ts` con T-1 a T-14 como datos (`APERTURA`, `INTRO_SERVICIOS`, `SERVICIOS`, `PESTANAS_LABORAL`, `ABOGADAS`) y `hasOwnPage`. `contenido-sitio.test.ts` lee el anexo de `docs/specs/007-sitio-publico/spec.md` y compara.
  Hecho cuando: los tests verifican:
  - Que cada texto de T-1 a T-14 coincide carácter por carácter con el anexo, párrafo por párrafo y punto por punto.
  - Los nombres de tarjeta y los títulos de página de RF-13.
  - El orden de los servicios, de las pestañas y de las abogadas (Carolina Pertusatti primero).
  - Que `hasOwnPage` es falso para Carolina Pertusatti y verdadero para Vanesa Sabalette Rabello, y falso si falta solo el resumen o solo el texto.
  - Que el test falla si se cambia una letra de un texto (caso de control).

- [x] **T6 — Mensajes de WhatsApp y textos de la interfaz** [RF-2, RF-27]
  En `contenido-sitio.ts`: `MENSAJES_WHATSAPP` (T-15) y `TEXTOS` (T-17).
  Hecho cuando: los tests verifican que cada mensaje y cada texto coincide con el anexo, y que hay un mensaje para el inicio, para cada pestaña y para cada servicio.

- [x] **T7 — Direcciones y títulos** [RF-8, RF-10, RF-34]
  `servicios/rutas-sitio.ts`: `PUBLIC_PAGES` (dirección, archivo, título y descripción de T-16, mensaje de WhatsApp, si se indexa), `REDIRECTS`, `isAppPath`, `normalizePublicPath` y `decideEntry(ruta)` (`redirigir`, `aplicacion` o `sitio`). `servicios/presentacion-sitio.ts`: `pageTitle(nombre)`.
  Hecho cuando: los tests verifican:
  - Que cada título y descripción coincide con T-16, y los títulos de ingreso, cambio de contraseña, portal y panel.
  - Que hay una página por servicio, por pestaña y solo por las abogadas con página.
  - `normalizePublicPath` con mayúsculas, barras finales, `/servicios`, `/abogadas`, `/servicios/derecho-laboral`, rutas de la aplicación y direcciones inexistentes (`null`).
  - `isAppPath`: `/ingresar`, `/cambiar-contrasena`, `/panel`, `/panel/x`, `/portal/x` sí; `/ingresar/x`, `/panelx` y `/` no.
  - `decideEntry` para una dirección normal, una con mayúsculas, una de la aplicación y una inexistente.

- [x] **T8 — Cabecera de cada página** [RF-34, RF-36 a RF-38]
  `servicios/cabecera-pagina.ts`: `buildHead(pagina, urlSitio)`.
  Hecho cuando: los tests verifican:
  - `<title>`, descripción, `canonical` con la dirección principal y las etiquetas de vista previa (`og:*` y `twitter:card`) de cada página.
  - `LegalService` solo en el inicio, con nombre, dirección del sitio, teléfono y logo, y sin dirección, horarios, email ni redes mientras sean `null` o estén vacíos; con datos de prueba, que se suman.
  - Que `<`, `&` y comillas se escapan, y que ningún texto puede cerrar la etiqueta del `ld+json`.
  - `noindex` en la página inexistente y en la aplicación, y no en las demás.

- [x] **T9 — Estado de la sesión en la web** [RF-29 a RF-31]
  `servicios/estado-sesion.ts`: `fetchSessionSection()` con `fetch` directo y límite de 5 segundos, y `sessionAccessLink(seccion)`.
  Hecho cuando: los tests, con `fetch` simulado, verifican:
  - `'portal'` y `'panel'` con la respuesta correspondiente, y que el pedido lleva `credentials: 'include'`.
  - `null` ante un código distinto de 200, un cuerpo inesperado, un error de red y una demora mayor al límite.
  - Que no usa el cliente HTTP: no hay renovación, ni aviso de sesión cerrada, ni actividad.
  - `sessionAccessLink` para `'portal'`, `'panel'` y `null`.

## web — componentes

- [x] **T10 — Identidad visual y nombre en dos líneas** [RF-3] **(modifica existente: `tailwind.config.js`, `componentes/DisenoSeccion.tsx`, `componentes/BloqueContactoEstudio.tsx`, `componentes/Disenos.test.tsx`)**
  Colores `estudio` en Tailwind. `NombreEstudio`: "Pertusatti | Sabalette" sin cortarse y "Abogadas" debajo. `DisenoSeccion` y `BloqueContactoEstudio` lo usan.
  Hecho cuando: los tests verifican que el encabezado del panel y del portal y el bloque de contacto del portal muestran el nombre en dos líneas, y que la primera línea no se puede cortar.

- [x] **T11 — Títulos del documento** [RF-3, RF-34] **(modifica existente: `componentes/DisenoPanel.tsx`, `componentes/DisenoPortal.tsx`, `paginas/PaginaCambiarContrasena.tsx` y sus tests)**
  `useTituloDocumento(titulo)`. El panel, el portal y el cambio de contraseña ponen su título de T-16. `PaginaCambiarContrasena` suma `NombreEstudio`.
  Hecho cuando: los tests verifican el título del documento en el panel, en el portal y en el cambio de contraseña, que cambia al cambiar el título pedido, y el nombre del estudio en el cambio de contraseña.

- [x] **T12 — Botón de WhatsApp con mensaje** [RF-26, RF-27] **(modifica existente: `componentes/BotonWhatsapp.tsx` y sus tests)**
  Propiedad opcional `mensaje`.
  Hecho cuando: los tests verifican el enlace sin mensaje (el portal y el cambio de contraseña siguen igual) y con mensaje, el nombre "Escribinos por WhatsApp", `target="_blank"` y `rel="noopener noreferrer"`.

- [x] **T13 — Pantalla de ingreso** [RF-3, RF-26, RF-28, RF-33, RF-34] **(modifica existente: `paginas/PaginaIngreso.tsx` y su test)**
  Arriba del formulario, el logo provisorio de `public/marca/` y `NombreEstudio`, como enlace común a `/`. `BotonWhatsapp` sin mensaje, margen inferior mayor que el botón y el título "Ingresar · Pertusatti | Sabalette - Abogadas". Necesita la imagen del logo que entregó el estudio, para copiarla a `public/marca/`.
  Hecho cuando: los tests verifican el enlace a `/` con el nombre del estudio, el botón de WhatsApp sin mensaje, el título del documento y que el formulario sigue funcionando como en la spec 001.

- [x] **T14 — Direcciones inexistentes del panel y del portal** [RF-10] **(modifica existente: `RutasAplicacion.tsx`, `componentes/RutaProtegida.test.tsx`, `docs/specs/001-autenticacion-y-roles/plan.md`)**
  `/panel/*` y `/portal/*` dentro de `RutaProtegida`, que llevan al inicio de su sección. "Rutas" del plan 001 las suma.
  Hecho cuando: los tests verifican que `/panel/no-existe` y `/portal/no-existe` llevan al ingreso sin sesión; al inicio de su sección con sesión; a la sección del otro rol si corresponde; y al cambio de contraseña si está pendiente. Las rutas existentes del panel y del portal siguen funcionando.

- [x] **T15 — Bloques de texto y tarjetas de servicio** [RF-12, RF-14]
  `BloquesTexto` (un `<p>` por párrafo, un `<ul>` por lista) y `TarjetaServicio` (`<h3>`, frase y "Conocer más" con el nombre del servicio como texto oculto).
  Hecho cuando: los tests verifican los párrafos y los puntos de una lista, que un texto con `<b>` se muestra literal, y que cada "Conocer más" lleva a su dirección y se anuncia con el nombre del servicio.

- [x] **T16 — Foto y tarjeta de abogada** [RF-18, RF-20, RF-21]
  `presentacion-sitio.ts`: `initialsOf(nombre)`. `FotoAbogada` y `TarjetaAbogada`.
  Hecho cuando: los tests verifican:
  - `initialsOf`: "CP" y "VSR".
  - Las iniciales sin foto, mientras carga, después de `onError` y con una imagen ya rota al montarse; la foto con `alt="Foto de <nombre>"`, `width` y `height` fijos; y que las iniciales no se anuncian.
  - La tarjeta completa de Vanesa Sabalette Rabello, con "Más información" a su página, y la de Carolina Pertusatti solo con foto, nombre y "Abogada".

- [x] **T17 — Bloque de contacto del sitio** [RF-23 a RF-25, RF-27]
  `ContactoSitio` (`id="contacto"`) e `IconosRedes`.
  Hecho cuando: los tests verifican:
  - Con los datos de hoy: el título "Contacto", el nombre y el WhatsApp escrito con su enlace y el mensaje recibido; ningún otro título.
  - Con datos de prueba completos: dirección, "Cómo llegar" a Google Maps, horarios renglón por renglón, email escrito con `mailto:` y cada red con su nombre.
  - Que "Cómo llegar" no aparece sin dirección.
  - Que todos los enlaces externos llevan `target="_blank"` y `rel="noopener noreferrer"`.

- [x] **T18 — Acceso de ingreso** [RF-29, RF-30, RF-32]
  `AccesoIngreso`, con `fetchSessionSection` inyectable.
  Hecho cuando: los tests verifican "Ingresar" mientras se consulta, con `null` y ante un error; "Ir a mi portal" a `/portal` y "Ir al panel" a `/panel`; que son enlaces comunes y no muestran ningún dato de la cuenta; y que se vuelve a consultar en `pageshow` con `persisted`.

- [x] **T19 — Encabezado y menú** [RF-4 a RF-6]
  `EncabezadoSitio` (logo y nombre como enlace a `/`, menú y acceso) y `MenuSitio` (fila de enlaces y `<details>` "Menú").
  Hecho cuando: los tests verifican los enlaces "Servicios" (`/#servicios`), "Abogadas" (`/#abogadas`) y "Contacto" (`#contacto`); que el menú plegado abre y cierra, se cierra al elegir una opción y con Escape, y devuelve el foco a "Menú"; y que sin interacción los enlaces están en el HTML.

- [x] **T20 — Diseño del sitio** [RF-4, RF-23, RF-26, RF-28; RNF de accesibilidad]
  `DisenoSitio` ("Saltar al contenido", encabezado, `<main id="contenido">`, contacto, botón de WhatsApp con el mensaje de la página, margen inferior) y `useFocoEnAncla`.
  Hecho cuando: los tests verifican el orden de las partes, que "Saltar al contenido" lleva a `#contenido`, el mensaje de WhatsApp recibido en el botón y en el contacto, y que con `#servicios` en la dirección el foco queda en el título de esa sección.

## web — páginas

- [x] **T21 — Inicio** [RF-11, RF-12, RF-18]
  `SitioInicio`.
  Hecho cuando: los tests verifican un único `<h1>` con el nombre del estudio, T-1, la sección "Nuestros servicios" con T-2 y las cuatro tarjetas en orden, la sección "Abogadas" con sus dos tarjetas, el contacto al final, los `id` de las secciones y el mensaje de WhatsApp del inicio.

- [x] **T22 — Páginas de servicio** [RF-7, RF-13, RF-14, RF-27, RF-34]
  `SitioServicio` para Accidentes, Derecho de Daños y Sucesiones.
  Hecho cuando: los tests verifican, en cada una, "Volver a servicios", el `<h1>` (en Accidentes, el título largo), el texto completo, "Otros servicios" con los otros tres (Derecho Laboral a Empresas), su mensaje de WhatsApp y su título del documento.

- [x] **T23 — Derecho Laboral** [RF-15 a RF-17, RF-27, RF-34]
  `SitioDerechoLaboral`.
  Hecho cuando: los tests verifican:
  - El `<h1>`, T-3 y las dos pestañas en orden, con `aria-current="page"` solo en la elegida.
  - Empresas con los tres destacados antes de T-8, y Trabajadores con T-9, cada una con su `<h2>`.
  - Que elegir "Trabajadores" con el teclado cambia la dirección, el contenido, el título del documento y el mensaje de WhatsApp, y deja el foco en esa pestaña.
  - Que volver atrás muestra Empresas.

- [x] **T24 — Abogada y página inexistente** [RF-9, RF-19, RF-20, RF-42]
  `SitioAbogada` y `SitioNoEncontrada`.
  Hecho cuando: los tests verifican la página de Vanesa Sabalette Rabello ("Volver a abogadas", foto, `<h1>`, "Abogada" y cada párrafo de T-14), y "No encontramos esa página" con su texto, "Ir al inicio" y los cuatro servicios, sin mostrar la dirección pedida ni lo que venga después del `?`.

- [x] **T25 — Rutas del sitio público** [RF-1, RF-8, RF-9, RF-20]
  `RutasSitio.tsx` y `SitioPublico.tsx`, sin `ProveedorSesion`.
  Hecho cuando: los tests verifican que cada dirección de `PUBLIC_PAGES` muestra su página; que `/abogadas/carolina-pertusatti`, `/servicios/derecho-laboral/otra` y una dirección cualquiera muestran la página inexistente; y que `/servicios`, `/abogadas` y `/servicios/derecho-laboral` llevan a su destino.

## web — publicación

- [x] **T26 — Entrada: sitio o aplicación** [RF-8, RF-35, RF-42] **(modifica existente: `main.tsx`, `RutasAplicacion.tsx`, `componentes/RutaProtegida.test.tsx`; borra `paginas/PaginaInicio.tsx` y `paginas/PaginaNoEncontrada.tsx`)**
  `main.tsx` usa `decideEntry`: reemplaza la dirección si hace falta, carga `App` para las rutas de la aplicación y `entrada-sitio.tsx` para las demás. `entrada-sitio.tsx` hidrata si `#root` tiene contenido. `RutasAplicacion` deja `/` y `*`.
  Hecho cuando: los tests verifican que `entrada-sitio` hidrata un `#root` con el HTML de `renderPublicPage` sin avisos de diferencias, y que monta desde cero un `#root` vacío. Con `pnpm --filter web dev`, `/`, una página de servicio, `/ingresar` y `/panel` muestran lo que corresponde, y `/Servicios/Sucesiones` lleva a `/servicios/sucesiones`.

- [x] **T27 — Render del servidor y archivos del sitio** [RF-35, RF-37, RF-38]
  `entrada-servidor.tsx` (`renderPublicPage` con `StaticRouter`) y `servicios/archivos-sitio.ts` (`buildSiteFiles`).
  Hecho cuando: los tests verifican:
  - Un archivo por página pública, con su `<h1>`, su texto y sus enlaces dentro de `#root`, su cabecera, "Ingresar" y ningún "Ir a mi portal".
  - `404.html` con la página inexistente y `noindex`.
  - `app.html` con `#root` vacío y `noindex`.
  - `sitemap.xml` solo con las páginas indexables y la dirección del sitio.
  - `robots.txt` con las rutas privadas y el `Sitemap`.

- [x] **T28 — Prerenderizado en el build** [RF-35] **(modifica existente: `web/index.html`, `web/package.json`, `web/tsconfig.node.json`, `web/.gitignore`, `web/.env.example`)**
  Marcas `<!--cabecera-->` y `<!--app-->` en `index.html`. `scripts/prerender.ts`. El script `build` suma el build SSR y el prerenderizado. `VITE_URL_SITIO` documentada en `.env.example`.
  Hecho cuando:
  - `VITE_URL_SITIO=https://ejemplo.test pnpm --filter web build` deja en `dist/` los archivos de la tabla del plan, sin `dist-ssr/`.
  - Sin `VITE_URL_SITIO`, el build falla con "Falta VITE_URL_SITIO".
  - Abrir `dist/servicios/sucesiones.html` con el código de la página desactivado muestra el texto completo y los enlaces.

- [x] **T29 — .htaccess** [RF-8 a RF-10, RF-25, RF-38, RF-43; spec 004, RF-6] **(modifica existente: `web/public/.htaccess`, `docs/specs/004-portal-del-cliente/plan.md`)**
  Las reglas del plan: 404 real, sin listados, barra final, redirecciones con 302, `app.html` para la aplicación, páginas prerenderizadas, encabezados de seguridad y caché. El plan 004 ("Caché del navegador" y "Dirección única del sitio") pasa la regla `no-store` a `app.html`.
  Hecho cuando: `htaccess.test.ts` verifica que estén `ErrorDocument 404 /404.html`, `Options -Indexes`, `DirectorySlash Off`, la regla de dirección única del plan 004, cada redirección, las reglas de `app.html`, `frame-ancestors 'none'`, `X-Frame-Options "DENY"`, `Referrer-Policy`, `no-store` y `noindex` en `app.html`, y `noindex` en `404.html`.

- [x] **T30 — Fotos sin datos de cámara** [RF-21]
  `public/fotos/` (vacía por ahora) y `fotos.test.ts`.
  Hecho cuando: el test recorre `public/fotos/` y falla si un archivo tiene un bloque EXIF o XMP. Incluye un caso de control con una imagen de prueba con EXIF, fuera de `public/`.

- [x] **T31 — Aislamiento del sitio público** [RF-36, RF-39 a RF-41]
  `aislamiento-sitio.test.ts`, como los de las specs 005 y 006.
  Hecho cuando: el test lee el código del sitio público y falla si:
  - Importa `cliente-http`, `sesion`, `ProveedorSesion`, `ProveedorServicios` o algún servicio de causas, movimientos, portal, usuarios, jurisprudencia o modelos.
  - Usa `localStorage`, `sessionStorage`, `indexedDB` o `document.cookie`.
  - Tiene `<input`, `<textarea` o `<select`.
  - Carga recursos de otros sitios, fuera de los enlaces de contacto.

  Incluye un caso de control que confirma que la regla detecta un archivo que sí importa un servicio prohibido.

## Cierre

- [ ] **T32 — Validación de la spec** **(modifica existente: `README.md`)**
  Recorrer `spec.md` requisito por requisito con su test y hacer la demo manual de los criterios de finalización, con el build prerenderizado servido localmente.
  Hecho cuando:
  - Cada RF tiene al menos un test en verde identificado, salvo los que la spec deja para la verificación al publicar.
  - `pnpm test` y `pnpm lint` pasan.
  - La demo manual se completó sin errores.
  - `validacion.md` registra el resultado y deja como pendientes la verificación al publicar (T33) y los datos que faltan del estudio.
  - El README marca la spec 007 como terminada, con la verificación al publicar pendiente.

- [ ] **T33 — Verificación al publicar** **(modifica existente: `web/public/.htaccess`, `validacion.md`)**
  Se hace cuando el sitio esté publicado en su dirección definitiva.
  Hecho cuando:
  - La vista previa al compartir por WhatsApp el inicio y Sucesiones muestra título, descripción y logo.
  - Las herramientas de los buscadores leen el texto de cada página, el `sitemap.xml` y los datos del estudio, y no listan las pantallas privadas.
  - En Hostinger: una dirección inexistente responde 404; la barra final y `/servicios/derecho-laboral` redirigen; el panel y el portal cargan desde `app.html`; los encabezados de seguridad están presentes; y el texto de cada página se lee en menos de 3 segundos desde un celular con 4G.
  - Las redirecciones nuevas pasan de 302 a 301.
  - `validacion.md` registra el resultado.

## Cambios de la demo manual

Pedidos por el estudio durante la demo manual (spec: RF-3, RF-4, RF-6, RF-23, RF-44 y RF-45; plan: "Cambios de la demo manual"). Se hacen antes de cerrar T32. Estas tareas sí agregan una dependencia, `motion`, prevista en el plan.

- [x] **T34 — Textos nuevos y cuentas de las redes** [RF-2, RF-23, RF-44] **(modifica existente: `servicios/contenido-sitio.ts`, `servicios/datos-estudio.ts` y sus tests)**
  `TEXTOS.contacto` con los textos nuevos de T-17, `TEXTOS.pie` con T-18, y `RedSocial` con `usuario`.
  Hecho cuando: los tests comparan T-17 y T-18 con el anexo, carácter por carácter, y verifican el año en la leyenda.

- [x] **T35 — Tipografía de los títulos** [RF-3, RF-40] **(modifica existente: `index.css`, `index.html`, `tailwind.config.js`)**
  Cormorant Garamond en `public/fuentes/` con su licencia, `@font-face` con `font-display: swap`, precarga y `font-titulos`.
  Hecho cuando: un test verifica que los archivos de la tipografía y su licencia están en el sitio, y que `index.css` y `index.html` solo apuntan a archivos propios.

- [x] **T36 — Bloque de contacto con el formato nuevo** [RF-23 a RF-25, RF-27] **(modifica existente: `componentes/ContactoSitio.tsx` y su test)**
  Título, línea, texto y un renglón por dato con su ícono en un recuadro; íconos propios.
  Hecho cuando: los tests verifican el título y el texto, que con los datos de hoy solo está "Teléfono / WhatsApp", que con datos completos están los cinco renglones en orden, "Cómo llegar" y una red con dos cuentas, y que los enlaces se abren aparte.

- [x] **T37 — Encabezado en pantallas chicas** [RF-4, RF-6] **(modifica existente: `componentes/EncabezadoSitio.tsx`, `componentes/MenuSitio.tsx`, `componentes/AccesoIngreso.tsx` y sus tests)**
  Una sola consulta de sesión para el encabezado y el menú, el acceso dentro del menú debajo de 420 px y el menú desplegado a lo ancho.
  Hecho cuando: los tests verifican que el acceso está en el menú y en el encabezado con las clases de cada ancho, que la sesión se consulta una vez, que el panel del menú se ubica respecto del encabezado (`inset-x-0`), y que el acceso del menú cambia con la sesión.

- [x] **T38 — Pie de página** [RF-44] **(modifica existente: `componentes/DisenoSitio.tsx`, `vite.config.ts` y los tests de las páginas)**
  `PieSitio` y `public/marca/bourder-web.svg`; el año de publicación desde `vite.config.ts`.
  Hecho cuando: los tests verifican el logo y el nombre al inicio, los accesos, el WhatsApp con el mensaje de la página, que sin redes ni email no hay íconos ni email, que con datos de prueba hay un ícono por cuenta con su nombre, las dos leyendas y el enlace a https://bourderweb.com.ar aparte.

- [x] **T39 — Animaciones** [RF-35, RF-45] **(modifica existente: `package.json`, `index.html`, `configuracion-tests.ts`, componentes y páginas del sitio, `aislamiento-sitio.test.ts`)**
  `motion` con `LazyMotion`, `Aparecer`, el menú y las pestañas con `AnimatePresence`, el `<noscript>` de `index.html` y el `IntersectionObserver` de prueba.
  Hecho cuando: los tests verifican que con la reducción de movimiento las transiciones duran 0, que la apertura del inicio no se anima, que el HTML prerenderizado marca con `data-aparecer` lo que se anima y que `index.html` lo muestra sin código; la suite de la web y el build pasan.

- [x] **T40 — Revalidación** **(modifica existente: `validacion.md`)**
  Actualizar `validacion.md` con los RF nuevos y cambiados y la guía de la demo (pasos 12 y 13).
  Hecho cuando: `pnpm test` y `pnpm lint` pasan y la validación queda lista para retomar la demo manual.

- [x] **T41 — Redes con ícono y nombre, y redes de muestra en desarrollo** [RF-23, RF-24, RF-44] **(modifica existente: `servicios/datos-estudio.ts`, `componentes/ContactoSitio.tsx`, `componentes/PieSitio.tsx`, `componentes/IconosRedes.tsx` y sus tests, `validacion.md`)**
  Las redes de muestra solo en desarrollo, el ícono de WhatsApp en el contacto y las redes del pie con ícono y nombre.
  Hecho cuando: los tests verifican que `pickNetworks` usa las de muestra solo si se piden y no hay reales; que en los tests no aparecen; que el contacto lleva el ícono de WhatsApp; que el pie muestra "WhatsApp" y cada red con su nombre, sumando la cuenta cuando una red tiene varias; y que el build para publicar no contiene "cuenta-de-muestra".

- [x] **T42 — Íconos a color en el contacto** [RF-23] **(modifica existente: `componentes/ContactoSitio.tsx`, `componentes/IconosRedes.tsx`, `componentes/IconosContacto.tsx`, `componentes/PieSitio.tsx`, los tests del contacto y del pie, y `aislamiento-sitio.test.ts`)**
  `IconoRedColor`, `IconoUbicacionColor`, `useIdSvg` y `CONTORNO`; el recuadro sin borde ni fondo.
  Hecho cuando: los tests verifican que los íconos no llevan fondo ni borde y los que no tienen colores propios van en blanco, que cada ícono a color tiene detrás su contorno blanco con el mismo dibujo, que WhatsApp lleva su verde, la ubicación los cuatro colores de Maps, Instagram su degradado y LinkedIn su azul, que el pie usa los mismos íconos, con sus colores y el contorno, y que los ids de los SVG no se repiten entre dos bloques y solo llevan letras, números, "-" y "_".

- [x] **T43 — Balanza de fondo en la apertura** [RF-11] **(modifica existente: `paginas/SitioInicio.tsx` y su test, `aislamiento-sitio.test.ts`)**
  `BalanzaDecorativa`, de fondo en la apertura del inicio.
  Hecho cuando: los tests verifican que la apertura lleva la balanza, que no se anuncia ni recibe el puntero, y que va detrás del texto.

- [x] **T44 — Logo en buena calidad** [RF-3, RF-36, RF-37] **(modifica existente: `servicios/marca.ts`, `servicios/cabecera-pagina.ts`, `index.html`, `public/marca/` y los tests de la cabecera, el encabezado y las fotos)**
  `logo.svg` con la máscara corregida, `logo.png` y `compartir.png`; el favicon y el `apple-touch-icon` con el logo; se quita `logo.jpg`.
  Hecho cuando: los tests verifican que el encabezado usa `logo.svg`, que la vista previa usa `compartir.png` y `LegalService` el `logo.png`, y que los PNG nuevos no tienen datos de cámara.

- [x] **T45 — Email y dirección en el pie** [RF-24, RF-25, RF-44] **(modifica existente: `componentes/PieSitio.tsx` y su test)**
  La lista "Email y dirección" debajo de las redes, con sus íconos y sus enlaces.
  Hecho cuando: los tests verifican el email con `mailto:` y la dirección con el enlace a Google Maps, los dos aparte; que la lista va debajo de las redes; que sin los dos datos no está, y que con uno solo muestra ese.

- [x] **T42 — Textos de Carolina Marisa Pertusatti y fotos de las abogadas** [RF-2, RF-8, RF-18 a RF-21, RF-34] **(modifica existente: `servicios/contenido-sitio.ts`, `componentes/TarjetaAbogada.tsx`, `paginas/SitioAbogada.tsx` y sus tests)**
  Los textos T-19 a T-21, el nombre completo de Carolina, el título profesional de las dos y sus fotos en `public/fotos/`, recortadas cuadradas, sin datos de cámara.
  Hecho cuando: los tests comparan T-19, T-20 y T-21 con el anexo; las dos tarjetas muestran foto, título profesional, resumen y "Más información"; la página de Carolina existe con su título y su descripción; las iniciales son CMP y VSR; y la regla de RF-20 se sigue probando con una integrante de prueba sin textos.

- [x] **T46 — WhatsApp de cada abogada** [RF-22, RF-23, RF-26, RF-27, RF-37, RF-44; spec 004, RF-18 y RF-19; spec 008, RF-11] **(modifica existente: `servicios/datos-estudio.ts`, `servicios/cabecera-pagina.ts`, `componentes/BotonWhatsapp.tsx`, `componentes/ContactoSitio.tsx`, `componentes/PieSitio.tsx`, `componentes/BloqueContactoEstudio.tsx`, `componentes/DisenoMarca.tsx` y sus tests, los tests de las páginas, `validacion.md`; nuevo: `pruebas/whatsapp-de-prueba.ts`)**
  `whatsapps` con el nombre, el número y el número escrito de Carolina Pertusatti y Vanesa Sabalette; `whatsappUrl(whatsapp, mensaje)`; el botón flotante como `<details>` con un menú de las dos abogadas.
  Hecho cuando: los tests verifican que el número de cada abogada coincide con su número escrito; que el botón abre un menú con las dos, en el orden del nombre del estudio, cada opción con el mensaje de la página (o sin mensaje en el ingreso y el portal) y aparte; que el menú se cierra al elegir, al tocar fuera y con Escape, con el foco de vuelta en el botón, y que sin el código de la página ya está en el HTML; que el contacto, el pie, el portal y el ingreso muestran los dos números con el nombre de su abogada; y que `LegalService` lleva los dos teléfonos.

- [x] **T47 — Ajustes del estudio y "Dra." delante de cada abogada** [RF-4, RF-18, RF-19, RF-21, RF-22, RF-28, RF-44, RF-46; spec 004, RF-18; spec 008, RF-11] **(modifica existente: `servicios/contenido-sitio.ts`, `servicios/datos-estudio.ts`, `servicios/rutas-sitio.ts`, `componentes/EncabezadoSitio.tsx`, `componentes/MenuSitio.tsx`, `componentes/PieSitio.tsx`, `componentes/TarjetaAbogada.tsx`, `componentes/FotoAbogada.tsx`, `paginas/SitioAbogada.tsx` y sus tests, `plan.md`, `validacion.md`)**
  La spec y los tests siguen los cambios del estudio: `logo2.svg` en el encabezado, el acceso en el menú debajo de 768 px, Instagram "@persaestudiojuridico", "© <año> - …" y `pb-10` en el pie, con `sm:pr-20` en su última fila para que el botón de WhatsApp no tape "Bourder Web". `lawyerName` pone "Dra." delante del nombre de cada abogada.
  Hecho cuando: los tests verifican el logo y los cortes del encabezado, la cuenta de Instagram en los datos y en `LegalService`, la leyenda con el guion, el margen del pie y su última fila, y "Dra." en la tarjeta, la página, su título, la foto, "Más información" y cada WhatsApp, con las iniciales sin "Dra.".

- [x] **T48 — Íconos en las tarjetas de los servicios** [RF-12, RF-45] **(nuevo: `componentes/IconosServicios.tsx`; modifica existente: `componentes/TarjetaServicio.tsx` y su test, `tailwind.config.js`, `aislamiento-sitio.test.ts`, `plan.md`, `validacion.md`)**
  Maletín, casco de obra, mano con monedas y pergamino, dibujos de Lucide con su aviso de licencia, animados con CSS al pasar el puntero o enfocar la tarjeta.
  Hecho cuando: los tests verifican que cada servicio tiene su propio ícono, arriba del nombre y sin anunciarse, y que solo se mueve al pasar el puntero o enfocar la tarjeta, sin la reducción de movimiento.
