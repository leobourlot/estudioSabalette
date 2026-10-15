# Validación 007 — Sitio público

Recorrido de `spec.md` requisito por requisito (tarea T32). Corrida del 2026-10-14, después de T31: `pnpm test` y `pnpm lint` sin errores, y Prettier sin diferencias.

| Paquete | Suite | Archivos | Tests |
|---|---|---|---|
| api | Unitarios (Vitest) | 50 | 1263 |
| api | e2e contra la base de tests (Vitest + Supertest) | 75 | 829 |
| web | Vitest + Testing Library | 107 | 1616 |
| | **Total** | **232** | **3708** |

Las cifras incluyen los tests de las specs 001 a 006, que siguen en verde. De esta spec son 23 unitarios y 14 e2e en la API, y 258 de la web. La API no cambió después de T3: su corrida completa es la de ese commit.

Rutas abreviadas:
- **U**: tests unitarios de `api/src/autenticacion/...`.
- **E**: tests e2e de `api/test/...`.
- **W**: tests de `web/src/...`.

## Requisitos funcionales

| RF | Qué se verifica | Tests | Resultado |
|---|---|---|---|
| RF-1 | Las páginas del sitio: inicio, cuatro servicios (Derecho Laboral con una página por pestaña), la abogada con textos y la página inexistente, sin pedir datos | W `RutasSitio.test.tsx`, `rutas-sitio.test.ts`, `archivos-sitio.test.ts` | ✅ |
| RF-2 | Los textos T-1 a T-17, carácter por carácter contra el anexo de la spec, con caso de control | W `contenido-sitio.test.ts`, `rutas-sitio.test.ts` (T-16), `TarjetaServicio.test.tsx` (`BloquesTexto`) | ✅ |
| RF-3 | Nombre en todo el sistema, en dos líneas en pantalla y en una en los títulos; logo y colores en el sitio y el ingreso | W `datos-estudio.test.ts`, `NombreEstudio.test.tsx`, `Disenos.test.tsx`, `PaginaIngreso.test.tsx`, `PaginaCambiarContrasena.test.tsx`, `EncabezadoSitio.test.tsx` | ✅ (colores: demo manual) |
| RF-4 | Encabezado con logo, menú y acceso de ingreso | W `EncabezadoSitio.test.tsx`, `DisenoSitio.test.tsx` | ✅ |
| RF-5 | "Servicios" y "Abogadas" a las secciones del inicio, "Contacto" al bloque de la página | W `EncabezadoSitio.test.tsx`, `DisenoSitio.test.tsx` (foco en la sección) | ✅ |
| RF-6 | Menú plegado con "Menú": abre, cierra, indica si está abierto, se cierra al elegir y con Escape, funciona sin código | W `EncabezadoSitio.test.tsx` | ✅ (ancho de 768 px: demo manual) |
| RF-7 | "Volver a servicios", "Otros servicios" y "Volver a abogadas" | W `SitioServicio.test.tsx`, `SitioAbogada.test.tsx` | ✅ |
| RF-8 | Direcciones propias; mayúsculas y barra final llevan a la principal; redirecciones; atrás y adelante | W `rutas-sitio.test.ts` (`normalizePublicPath`, `decideEntry`), `RutasSitio.test.tsx`, `SitioDerechoLaboral.test.tsx`, `htaccess.test.ts` | ✅ (en Hostinger: T33) |
| RF-9 | "No encontramos esa página" con sus accesos, sin mostrar la dirección | W `SitioAbogada.test.tsx` (`SitioNoEncontrada`), `RutasSitio.test.tsx`, `archivos-sitio.test.ts` | ✅ |
| RF-10 | Panel y portal: sin sesión toda dirección lleva al ingreso; con sesión, la inexistente al inicio de su sección | W `RutaProtegida.test.tsx`, `htaccess.test.ts` | ✅ |
| RF-11, RF-12 | Inicio: apertura, "Nuestros servicios" con T-2 y cuatro tarjetas, "Abogadas" y contacto | W `SitioInicio.test.tsx`, `TarjetaServicio.test.tsx` | ✅ |
| RF-13, RF-14 | Nombres de tarjeta y títulos de página; texto completo de cada servicio | W `contenido-sitio.test.ts`, `SitioServicio.test.tsx` | ✅ |
| RF-15 a RF-17 | Pestañas como enlaces con `aria-current`; cambio sin moverse, con el foco en la pestaña; destacados antes del texto de Empresas | W `SitioDerechoLaboral.test.tsx`, `archivos-sitio.test.ts` | ✅ |
| RF-18 a RF-20 | Tarjetas en el orden del logo; página de la abogada; Carolina Pertusatti sin resumen ni página | W `TarjetaAbogada.test.tsx`, `SitioAbogada.test.tsx`, `SitioInicio.test.tsx`, `contenido-sitio.test.ts`, `RutasSitio.test.tsx` | ✅ |
| RF-21 | Foto en círculo o iniciales (CP, VSR) sin foto, mientras carga y si falla; sin datos de cámara | W `TarjetaAbogada.test.tsx` (`FotoAbogada`), `presentacion-sitio.test.ts`, `fotos.test.ts` | ✅ |
| RF-22 a RF-24 | Fuente única con el nombre y el WhatsApp reales; bloque de contacto solo con los datos informados, sin datos genéricos | W `datos-estudio.test.ts`, `ContactoSitio.test.tsx`, `Disenos.test.tsx` (portal sin dirección) | ✅ |
| RF-25 | Enlaces externos aparte, con `noopener noreferrer`; `Referrer-Policy` | W `ContactoSitio.test.tsx`, `BotonWhatsapp.test.tsx`, `htaccess.test.ts` | ✅ |
| RF-26 | Botón de WhatsApp en las páginas públicas y en el ingreso | W `DisenoSitio.test.tsx`, `PaginaIngreso.test.tsx`, `BotonWhatsapp.test.tsx` | ✅ |
| RF-27 | Mensaje de cada página y de cada pestaña; sin mensaje en el ingreso y el portal | W `datos-estudio.test.ts`, `rutas-sitio.test.ts`, `SitioInicio.test.tsx`, `SitioServicio.test.tsx`, `SitioDerechoLaboral.test.tsx`, `SitioAbogada.test.tsx`, `PaginaIngreso.test.tsx`, `Disenos.test.tsx` | ✅ |
| RF-28 | El botón no tapa contenido | W `DisenoSitio.test.tsx` y `PaginaIngreso.test.tsx` (margen inferior) | ⏳ Demo manual (pasos 5 y 7) |
| RF-29, RF-30 | "Ingresar" mientras no hay sesión, mientras se consulta o si falla; "Ir a mi portal" o "Ir al panel" sin datos de la cuenta | W `AccesoIngreso.test.tsx`, `estado-sesion.test.ts`, `archivos-sitio.test.ts` | ✅ |
| RF-31 | `GET /sesion/estado`: siempre 200, solo la sección, sin extender ni renovar; el sitio no usa el cliente HTTP ni `ProveedorSesion` | U `sesion-valida.spec.ts`, `autenticacion.service.spec.ts`; E `sesion-estado`; W `estado-sesion.test.ts`, `RutasSitio.test.tsx`, `aislamiento-sitio.test.ts` | ✅ |
| RF-32 | Sesión cerrada en el sitio público: sin avisos; el acceso lleva al ingreso | W `AccesoIngreso.test.tsx`, `RutaProtegida.test.tsx`, `aislamiento-sitio.test.ts` | ✅ (demo manual, paso 8) |
| RF-33 | Ingreso con logo al inicio y WhatsApp | W `PaginaIngreso.test.tsx` | ✅ |
| RF-34 | Títulos y descripciones de cada página y pestaña, y títulos de ingreso, cambio de contraseña, portal y panel | W `rutas-sitio.test.ts`, `cabecera-pagina.test.ts`, `useTituloDocumento.test.tsx`, `Disenos.test.tsx`, páginas | ✅ |
| RF-35 | Cada página pública con su texto, título, descripción y enlaces sin ejecutar código; hidratación sin diferencias | W `archivos-sitio.test.ts`, `entrada-sitio.test.tsx`, `EncabezadoSitio.test.tsx`; build de T28 | ✅ (buscadores: T33) |
| RF-36 | Vista previa: `og:*` y `twitter:card` | W `cabecera-pagina.test.ts` | ✅ (al compartir: T33) |
| RF-37 | Dirección principal, `sitemap.xml` y datos del estudio como `LegalService` | W `cabecera-pagina.test.ts`, `archivos-sitio.test.ts` | ✅ (buscadores: T33) |
| RF-38 | `noindex` en 404 y aplicación, `robots.txt`, 404 real | W `cabecera-pagina.test.ts`, `archivos-sitio.test.ts`, `htaccess.test.ts` | ✅ (en Hostinger: T33) |
| RF-39, RF-40 | Sin almacenamiento, cookies, campos ni recursos de terceros | W `aislamiento-sitio.test.ts` | ✅ |
| RF-41 | Ningún dato de causas, clientes, cuentas, jurisprudencia, modelos ni escritos | E `sesion-estado` (solo la clave `seccion`); W `aislamiento-sitio.test.ts` | ✅ |
| RF-42 | Lo que trae la dirección no se muestra ni se usa | W `SitioAbogada.test.tsx` (`SitioNoEncontrada`), `rutas-sitio.test.ts` (`decideEntry`), `DisenoSitio.test.tsx` | ✅ |
| RF-43 | Ninguna pantalla dentro de otro sitio | W `htaccess.test.ts` | ✅ (en Hostinger: T33) |

## Requisitos no funcionales

| RNF | Verificación | Resultado |
|---|---|---|
| Plataformas (360 px, horizontal, 44 px) | Clases de las tarjetas, del menú y de las pestañas; `min-h-11` en los controles | ⏳ Demo manual (pasos 1 y 9) |
| Accesibilidad | W: un único h1 y títulos en orden en cada página, "Saltar al contenido", foco en la sección del "#", pestañas con `aria-current`, nombre accesible completo del estudio, iniciales sin anunciar, "Conocer más" y "Más información" con el nombre | ✅; contraste, teclado y lector de pantalla: demo manual (paso 10) |
| Rendimiento | El sitio va en su propia parte del código: el inicio descarga unos 97 KB comprimidos con los estilos, sin el panel ni el portal (build de T28) | ⏳ Al publicar (T33) |
| Disponibilidad | W `estado-sesion.test.ts`: sin respuesta en 5 segundos, "Ingresar" | ✅ |
| Persistencia y aislamiento | E `sesion-estado`; W `aislamiento-sitio.test.ts` | ✅ |
| Textos seguros | W `TarjetaServicio.test.tsx` (texto con etiquetas), `cabecera-pagina.test.ts` (escapes), `SitioAbogada.test.tsx` | ✅ |
| Stack | Sin dependencias nuevas: SSR de Vite, `react-dom/server` y un script con Node 24 | ✅ |
| Idioma | Todos los textos en español; `lang="es"` | ✅ |

## Observaciones
- **Logo provisorio.** El logo es la imagen de 150 px que entregó el estudio. Se usa también para la vista previa al compartir (`servicios/marca.ts`), hasta que llegue el logo en buena calidad y una imagen de 1200 × 630.
- **Texto alternativo del logo.** Junto al nombre escrito, el logo lleva `alt=""` y el enlace se anuncia con el nombre del estudio, como dice el plan. Donde el logo va solo (la vista previa), su texto alternativo es el nombre.
- **Fotos sin el código de la página.** La foto aparece cuando termina de cargar, con el código ya ejecutándose. Sin él, se ven las iniciales.
- **Mayúsculas sin el código de la página.** Una dirección con mayúsculas la corrige el navegador; sin el código, Hostinger responde la página inexistente. Lo acepta el plan.
- **`vite preview`.** Sirve cada página generada en su dirección limpia. Una dirección inexistente le cae al inicio en lugar de `404.html` (eso lo resuelve el `.htaccess` en Hostinger), y React la corrige al cargar, con un aviso en la consola.
- **Desvíos menores del plan.** `dist-ssr/` se ignora en el `.gitignore` de la raíz, que ya ignora `dist/`, en lugar de un `web/.gitignore`. El arranque de la aplicación pasó a `entrada-aplicacion.tsx`, para que `main.tsx` cargue cada parte por separado. Se sumaron `OtrosServicios`, `VolverA` y `estilos-sitio.ts` como componentes compartidos.
- **Pendiente de la spec 004.** Su `validacion.md` anotaba reemplazar los datos genéricos del contacto: quedó hecho en T4.

## Criterios de finalización
- [x] Todos los RF que se pueden verificar antes de publicar, con al menos un test en verde.
- [x] Tests de cada punto de la lista de la spec.
- [x] `pnpm test` y `pnpm lint` sin errores.
- [ ] Demo manual (ver la guía siguiente).
- [ ] Verificación al publicar (T33), cuando el sitio esté en su dirección definitiva.

Pendiente también, para publicar: `VITE_URL_SITIO` en el entorno donde se construye el frontend, y los datos que faltan del estudio (dirección, horarios, email, redes, fotos, los textos de Carolina Pertusatti y el logo en buena calidad).

## Guía de la demo manual

### Preparación
1. `pnpm dev` (levanta la web y la API). La web queda en `http://localhost:5173`.
2. Tener a mano un cliente y un abogado de la base de desarrollo.
3. Para el paso 11, construir el sitio y servirlo: `VITE_URL_SITIO=https://ejemplo.test pnpm --filter web build` y después `pnpm --filter web preview`.

### Pasos
1. Sin sesión, abrir `/` desde un celular (o con el navegador a 360 px): la apertura con el nombre en dos líneas, las cuatro tarjetas con su frase, las dos tarjetas de las abogadas (CP sin resumen ni "Más información", VSR completa) y el bloque de contacto solo con el nombre y el WhatsApp. Nada se desplaza de costado; el menú está plegado en "Menú".
2. Entrar con "Conocer más" a cada servicio: título, texto contra el anexo, "Volver a servicios" y "Otros servicios".
3. En Derecho Laboral: se ve Empresas con los tres destacados antes del texto; pasar a Trabajadores (la página no se mueve), volver atrás con el navegador, y abrir en otra pestaña `/servicios/derecho-laboral/trabajadores`.
4. "Más información" de Vanesa Sabalette Rabello: texto completo y "Volver a abogadas".
5. En el inicio, en cada servicio y en cada pestaña, el botón de WhatsApp abre la conversación con +54 9 3455 41-4147 y el mensaje de esa página. Al final de cada página, en vertical y en horizontal, el botón no tapa nada.
6. Abrir `/no-existe` y `/Servicios/Sucesiones`: la primera muestra "No encontramos esa página" sin la dirección; la segunda lleva a `/servicios/sucesiones`. Sin sesión, `/portal/no-existe` lleva al ingreso.
7. "Ingresar": el botón de WhatsApp abre sin mensaje y no tapa el formulario con el teclado del celular abierto; el logo vuelve al inicio. Ingresar como cliente, volver a `/` y ver "Ir a mi portal". Repetir como abogado: "Ir al panel".
8. Con la sesión de cliente abierta, cerrar sesión desde otra pestaña, volver a la del sitio público: no hay ningún aviso; "Ir a mi portal" lleva al ingreso.
9. En el portal y en el panel, desde un celular: el nombre en dos líneas; en el portal, el WhatsApp nuevo y ninguna dirección de ejemplo.
10. Recorrer el inicio y Derecho Laboral solo con el teclado (incluidos "Saltar al contenido", el menú y las pestañas): el foco siempre se ve. Con un lector de pantalla, cada página nueva se anuncia y el nombre del estudio se lee completo.
11. Con el build del paso 3 de la preparación y el código de la página desactivado en el navegador, abrir `/servicios/sucesiones`: el texto completo y los enlaces se ven y funcionan, y el acceso dice "Ingresar".
12. Repetir los pasos 1 a 6 desde una computadora.
