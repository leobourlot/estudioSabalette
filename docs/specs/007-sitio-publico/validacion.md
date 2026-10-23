# Validación 007 — Sitio público

Recorrido de `spec.md` requisito por requisito (tarea T32, actualizado en T40 con los cambios de la demo manual). Corrida del 2026-10-15, después de T41: `pnpm test` y `pnpm lint` sin errores, y Prettier sin diferencias.

| Paquete | Suite | Archivos | Tests |
|---|---|---|---|
| api | Unitarios (Vitest) | 50 | 1263 |
| api | e2e contra la base de tests (Vitest + Supertest) | 75 | 829 |
| web | Vitest + Testing Library | 110 | 1653 |
| | **Total** | **235** | **3745** |

Las cifras incluyen los tests de las specs 001 a 006, que siguen en verde. De esta spec son 23 unitarios y 14 e2e en la API, y 295 de la web. La API no cambió después de T3: su corrida completa es la de ese commit.

Rutas abreviadas:
- **U**: tests unitarios de `api/src/autenticacion/...`.
- **E**: tests e2e de `api/test/...`.
- **W**: tests de `web/src/...`.

## Requisitos funcionales

| RF | Qué se verifica | Tests | Resultado |
|---|---|---|---|
| RF-1 | Las páginas del sitio: inicio, cuatro servicios (Derecho Laboral con una página por pestaña), la abogada con textos y la página inexistente, sin pedir datos | W `RutasSitio.test.tsx`, `rutas-sitio.test.ts`, `archivos-sitio.test.ts` | ✅ |
| RF-2 | Los textos T-1 a T-17, carácter por carácter contra el anexo de la spec, con caso de control | W `contenido-sitio.test.ts`, `rutas-sitio.test.ts` (T-16), `TarjetaServicio.test.tsx` (`BloquesTexto`) | ✅ |
| RF-3 | Nombre en todo el sistema, en dos líneas en pantalla y en una en los títulos; logo completo y colores en el sitio y el ingreso; títulos con Cormorant Garamond desde archivos propios | W `datos-estudio.test.ts`, `NombreEstudio.test.tsx`, `Disenos.test.tsx`, `PaginaIngreso.test.tsx`, `PaginaCambiarContrasena.test.tsx`, `EncabezadoSitio.test.tsx`, `fuentes.test.ts` | ✅ (colores y tipografía: demo manual) |
| RF-4 | Encabezado con el logo apaisado (`logo2.svg`), menú y acceso de ingreso en una línea; debajo de 768 px, mientras el menú está plegado, el acceso va dentro del menú, con una sola consulta de sesión | W `EncabezadoSitio.test.tsx`, `AccesoIngreso.test.tsx`, `DisenoSitio.test.tsx` | ✅ (anchos: demo manual, paso 13) |
| RF-5 | "Servicios" y "Abogadas" a las secciones del inicio, "Contacto" al bloque de la página | W `EncabezadoSitio.test.tsx`, `DisenoSitio.test.tsx` (foco en la sección) | ✅ |
| RF-6 | Menú plegado con "Menú": abre, cierra, indica si está abierto, se cierra al elegir y con Escape, funciona sin código, y se despliega a lo ancho debajo del encabezado | W `EncabezadoSitio.test.tsx` | ✅ (anchos de 420 y 768 px: demo manual) |
| RF-7 | "Volver a servicios", "Otros servicios" y "Volver a abogadas" | W `SitioServicio.test.tsx`, `SitioAbogada.test.tsx` | ✅ |
| RF-8 | Direcciones propias; mayúsculas y barra final llevan a la principal; redirecciones; atrás y adelante | W `rutas-sitio.test.ts` (`normalizePublicPath`, `decideEntry`), `RutasSitio.test.tsx`, `SitioDerechoLaboral.test.tsx`, `htaccess.test.ts` | ✅ (en Hostinger: T33) |
| RF-9 | "No encontramos esa página" con sus accesos, sin mostrar la dirección | W `SitioAbogada.test.tsx` (`SitioNoEncontrada`), `RutasSitio.test.tsx`, `archivos-sitio.test.ts` | ✅ |
| RF-10 | Panel y portal: sin sesión toda dirección lleva al ingreso; con sesión, la inexistente al inicio de su sección | W `RutaProtegida.test.tsx`, `htaccess.test.ts` | ✅ |
| RF-11, RF-12 | Inicio: apertura con la balanza de fondo, "Nuestros servicios" con T-2 y cuatro tarjetas, "Abogadas" y contacto | W `SitioInicio.test.tsx`, `TarjetaServicio.test.tsx` | ✅ |
| RF-13, RF-14 | Nombres de tarjeta y títulos de página; texto completo de cada servicio | W `contenido-sitio.test.ts`, `SitioServicio.test.tsx` | ✅ |
| RF-15 a RF-17 | Pestañas como enlaces con `aria-current`; cambio sin moverse, con el foco en la pestaña; destacados antes del texto de Empresas | W `SitioDerechoLaboral.test.tsx`, `archivos-sitio.test.ts` | ✅ |
| RF-18 a RF-20 | Tarjetas en el orden del logo; página de la abogada; la regla de RF-20 con una integrante de prueba sin textos | W `TarjetaAbogada.test.tsx`, `SitioAbogada.test.tsx`, `SitioInicio.test.tsx`, `contenido-sitio.test.ts`, `RutasSitio.test.tsx` | ✅ |
| RF-21 | Foto en círculo o iniciales (CMP, VSR) sin foto, mientras carga y si falla; sin datos de cámara | W `TarjetaAbogada.test.tsx` (`FotoAbogada`), `presentacion-sitio.test.ts`, `fotos.test.ts` | ✅ |
| RF-46 | "Dra." delante del nombre en la tarjeta, la página, su título, el texto alternativo de la foto, "Más información" y cada WhatsApp; las iniciales sin "Dra." | W `contenido-sitio.test.ts`, `TarjetaAbogada.test.tsx`, `SitioAbogada.test.tsx`, `SitioInicio.test.tsx`, `datos-estudio.test.ts`, `BotonWhatsapp.test.tsx`, `ContactoSitio.test.tsx`, `PieSitio.test.tsx`, `Disenos.test.tsx`, `DisenoMarca.test.tsx` | ✅ |
| RF-22 a RF-24 | Fuente única con el nombre y el WhatsApp de cada abogada, con su nombre; bloque de contacto con el formato del modelo (título, línea, texto y un renglón por dato con su ícono, a color y con contorno blanco en Ubicación, WhatsApp y las redes), solo con los datos informados, una red con varias cuentas en su renglón | W `datos-estudio.test.ts`, `contenido-sitio.test.ts` (T-17), `ContactoSitio.test.tsx`, `Disenos.test.tsx` (portal sin dirección, los dos WhatsApp) | ✅ |
| RF-25 | Enlaces externos aparte, con `noopener noreferrer`; `Referrer-Policy` | W `ContactoSitio.test.tsx`, `BotonWhatsapp.test.tsx`, `htaccess.test.ts` | ✅ |
| RF-26 | Botón de WhatsApp en las páginas públicas y en el ingreso, con un menú con el nombre y el número de cada abogada que se cierra al elegir, al tocar fuera y con Escape, y que funciona sin el código de la página | W `DisenoSitio.test.tsx`, `PaginaIngreso.test.tsx`, `BotonWhatsapp.test.tsx` | ✅ |
| RF-27 | Mensaje de cada página y de cada pestaña; sin mensaje en el ingreso y el portal | W `datos-estudio.test.ts`, `rutas-sitio.test.ts`, `SitioInicio.test.tsx`, `SitioServicio.test.tsx`, `SitioDerechoLaboral.test.tsx`, `SitioAbogada.test.tsx`, `PaginaIngreso.test.tsx`, `Disenos.test.tsx` | ✅ |
| RF-28 | El botón no tapa contenido: el pie termina con `pb-10` y, desde 640 px, su última fila deja a la derecha el lugar del botón | W `DisenoSitio.test.tsx` y `PaginaIngreso.test.tsx` (margen inferior) | ⏳ Demo manual (pasos 5 y 7) |
| RF-29, RF-30 | "Ingresar" mientras no hay sesión, mientras se consulta o si falla; "Ir a mi portal" o "Ir al panel" sin datos de la cuenta | W `AccesoIngreso.test.tsx`, `estado-sesion.test.ts`, `archivos-sitio.test.ts` | ✅ |
| RF-31 | `GET /sesion/estado`: siempre 200, solo la sección, sin extender ni renovar; el sitio no usa el cliente HTTP ni `ProveedorSesion` | U `sesion-valida.spec.ts`, `autenticacion.service.spec.ts`; E `sesion-estado`; W `estado-sesion.test.ts`, `RutasSitio.test.tsx`, `aislamiento-sitio.test.ts` | ✅ |
| RF-32 | Sesión cerrada en el sitio público: sin avisos; el acceso lleva al ingreso | W `AccesoIngreso.test.tsx`, `RutaProtegida.test.tsx`, `aislamiento-sitio.test.ts` | ✅ (demo manual, paso 8) |
| RF-33 | Ingreso con logo al inicio y WhatsApp | W `PaginaIngreso.test.tsx` | ✅ |
| RF-34 | Títulos y descripciones de cada página y pestaña, y títulos de ingreso, cambio de contraseña, portal y panel | W `rutas-sitio.test.ts`, `cabecera-pagina.test.ts`, `useTituloDocumento.test.tsx`, `Disenos.test.tsx`, páginas | ✅ |
| RF-35 | Cada página pública con su texto, título, descripción y enlaces sin ejecutar código; hidratación sin diferencias | W `archivos-sitio.test.ts`, `entrada-sitio.test.tsx`, `EncabezadoSitio.test.tsx`; build de T28 | ✅ (buscadores: T33) |
| RF-36 | Vista previa: `og:*` y `twitter:card`, con `compartir.png` (el logo completo en 1200 × 630) | W `cabecera-pagina.test.ts` | ✅ (al compartir: T33) |
| RF-37 | Dirección principal, `sitemap.xml` y datos del estudio como `LegalService` | W `cabecera-pagina.test.ts`, `archivos-sitio.test.ts` | ✅ (buscadores: T33) |
| RF-38 | `noindex` en 404 y aplicación, `robots.txt`, 404 real | W `cabecera-pagina.test.ts`, `archivos-sitio.test.ts`, `htaccess.test.ts` | ✅ (en Hostinger: T33) |
| RF-39, RF-40 | Sin almacenamiento, cookies, campos ni recursos de terceros | W `aislamiento-sitio.test.ts` | ✅ |
| RF-41 | Ningún dato de causas, clientes, cuentas, jurisprudencia, modelos ni escritos | E `sesion-estado` (solo la clave `seccion`); W `aislamiento-sitio.test.ts` | ✅ |
| RF-42 | Lo que trae la dirección no se muestra ni se usa | W `SitioAbogada.test.tsx` (`SitioNoEncontrada`), `rutas-sitio.test.ts` (`decideEntry`), `DisenoSitio.test.tsx` | ✅ |
| RF-43 | Ninguna pantalla dentro de otro sitio | W `htaccess.test.ts` | ✅ (en Hostinger: T33) |
| RF-44 | Pie de página: logo y nombre, accesos, el WhatsApp de cada abogada con su nombre y el mensaje de la página, y cada red con su ícono a color y con contorno blanco, y su nombre; debajo, el email y la dirección con sus enlaces (con la cuenta si la red tiene varias), leyenda con el año de publicación y "Diseñado por" Bourder Web aparte | W `PieSitio.test.tsx`, `contenido-sitio.test.ts` (T-18), `DisenoSitio.test.tsx` | ✅ |
| RF-45 | Animaciones: aparición al entrar en pantalla, menú, pestañas, foto y respuesta al puntero; sin movimiento con la reducción pedida; nada oculto sin código; apertura del inicio sin animar; hasta 0,6 s | W `animaciones.test.tsx`, `entrada-sitio.test.tsx` (hidratación sin diferencias), `SitioDerechoLaboral.test.tsx` | ✅ (cómo se ven: demo manual, paso 14) |

## Requisitos no funcionales

| RNF | Verificación | Resultado |
|---|---|---|
| Plataformas (360 px, horizontal, 44 px) | Clases de las tarjetas, del menú y de las pestañas; `min-h-11` en los controles | ⏳ Demo manual (pasos 1 y 9) |
| Accesibilidad | W: un único h1 y títulos en orden en cada página, "Saltar al contenido", foco en la sección del "#", pestañas con `aria-current`, nombre accesible completo del estudio, iniciales sin anunciar, "Conocer más" y "Más información" con el nombre | ✅; contraste, teclado y lector de pantalla: demo manual (paso 10) |
| Rendimiento | El sitio va en su propia parte del código: el inicio descarga unos 128 KB comprimidos con los estilos y las animaciones, más 23 KB de la tipografía, sin el panel ni el portal (build de T39) | ⏳ Al publicar (T33) |
| Disponibilidad | W `estado-sesion.test.ts`: sin respuesta en 5 segundos, "Ingresar" | ✅ |
| Persistencia y aislamiento | E `sesion-estado`; W `aislamiento-sitio.test.ts` | ✅ |
| Textos seguros | W `TarjetaServicio.test.tsx` (texto con etiquetas), `cabecera-pagina.test.ts` (escapes), `SitioAbogada.test.tsx` | ✅ |
| Stack | Una dependencia nueva, `motion`, justificada en el plan; el prerenderizado usa el SSR de Vite, `react-dom/server` y un script con Node 24; la tipografía se copió al sitio sin sumar paquetes | ✅ |
| Idioma | Todos los textos en español; `lang="es"` | ✅ |

## Observaciones
- **Ajustes del estudio (T47).** El 23/10/2026 se alinearon la spec y los tests con los cambios que hizo el estudio: el logo apaisado en el encabezado, el acceso dentro del menú en toda pantalla de menos de 768 px, la cuenta de Instagram "@persaestudiojuridico", la leyenda "© <año> - …" y el pie con `pb-10`. Con `pb-10` el botón de WhatsApp tapaba "Bourder Web" entre 640 y unos 1170 px; la última fila del pie deja ahora a la derecha el lugar del botón (RF-28). Además, el nombre de cada abogada va siempre con "Dra." adelante (RF-46).
- **Cambios de la demo manual.** El estudio pidió durante la demo el bloque de contacto con otro formato, el acceso dentro del menú en pantallas chicas (y el arreglo del menú que se cortaba a la izquierda), un pie de página, la tipografía con serifa y animaciones con Motion. La spec, el plan y las tareas (T34 a T40) los incluyen; la demo se retoma desde el principio.
- **Tests lentos con la máquina cargada.** Durante T38 fallaron, una vez cada uno, dos tests del cambio de contraseña (tipean contraseñas largas y pasaron los 5 segundos) y uno de jurisprudencia. Solos pasan, y la suite completa pasó en las corridas siguientes. No son de esta spec; si vuelven a fallar, conviene darles más tiempo.
- **Redes de muestra (T41).** A pedido del estudio, con `pnpm dev` el contacto y el pie muestran Instagram, Facebook, X y LinkedIn con "@cuenta-de-muestra" y el enlace a la página principal de cada red, para ver cómo quedan. Es la única excepción a RF-24 y vale solo en desarrollo: se verificó que el build para publicar no contiene "cuenta-de-muestra" y que un build en modo desarrollo sí. En el sitio publicado, mientras el estudio no informe sus redes ni su email, el pie solo muestra los WhatsApp de las abogadas.
- **Logo de Bourder Web.** Se recortó el `viewBox` del SVG al dibujo, para que se vea a la altura del texto.
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
1. Sin sesión, abrir `/` desde un celular (o con el navegador a 360 px): la apertura con el nombre en dos líneas, las cuatro tarjetas con su frase, las dos tarjetas de las abogadas (CP sin resumen ni "Más información", VSR completa) el bloque "Contactate con nosotros" solo con el renglón "Teléfono / WhatsApp" y el pie de página. Nada se desplaza de costado; el logo, el nombre y "Menú" van en una línea.
2. Entrar con "Conocer más" a cada servicio: título, texto contra el anexo, "Volver a servicios" y "Otros servicios".
3. En Derecho Laboral: se ve Empresas con los tres destacados antes del texto; pasar a Trabajadores (la página no se mueve), volver atrás con el navegador, y abrir en otra pestaña `/servicios/derecho-laboral/trabajadores`.
4. "Más información" de la Dra. Vanesa Sabalette Rabello y de la Dra. Carolina Marisa Pertusatti: el nombre con "Dra." en la tarjeta, en la página y en la pestaña del navegador, el texto completo y "Volver a abogadas".
5. En el inicio, en cada servicio y en cada pestaña, el botón de WhatsApp abre el menú con "Dra. Carolina Pertusatti" (+54 9 3454 01-8174) y "Dra. Vanesa Sabalette" (+54 9 3455 41-4147), y cada opción abre la conversación con ese número y el mensaje de esa página. Los dos números del contacto y del pie hacen lo mismo. Al final de cada página, en vertical y en horizontal, el botón no tapa nada.
6. Abrir `/no-existe` y `/Servicios/Sucesiones`: la primera muestra "No encontramos esa página" sin la dirección; la segunda lleva a `/servicios/sucesiones`. Sin sesión, `/portal/no-existe` lleva al ingreso.
7. "Ingresar": el botón de WhatsApp abre sin mensaje y no tapa el formulario con el teclado del celular abierto; el logo vuelve al inicio. Ingresar como cliente, volver a `/` y ver "Ir a mi portal". Repetir como abogado: "Ir al panel".
8. Con la sesión de cliente abierta, cerrar sesión desde otra pestaña, volver a la del sitio público: no hay ningún aviso; "Ir a mi portal" lleva al ingreso.
9. En el portal y en el panel, desde un celular: el nombre en dos líneas; en el portal, el WhatsApp de cada abogada con su nombre, el botón con su menú y ninguna dirección de ejemplo.
10. Recorrer el inicio y Derecho Laboral solo con el teclado (incluidos "Saltar al contenido", el menú y las pestañas): el foco siempre se ve. Con un lector de pantalla, cada página nueva se anuncia y el nombre del estudio se lee completo.
11. Con el build del paso 3 de la preparación y el código de la página desactivado en el navegador, abrir `/servicios/sucesiones`: el texto completo y los enlaces se ven y funcionan, y el acceso dice "Ingresar".
12. Repetir los pasos 1 a 6 desde una computadora.
13. Achicar la ventana de a poco desde 1024 px hasta 360 px: desde 768 px el menú es una fila con el acceso al lado; debajo, "Menú", y el acceso pasa a ser la última opción del menú abierto, que se ve completo, a lo ancho y sin cortarse. En ningún ancho el encabezado se parte en dos líneas.
14. Recorrer el inicio y Derecho Laboral mirando las animaciones (aparición de secciones y tarjetas, menú, cambio de pestaña, tarjetas al pasar el puntero). Activar la reducción de movimiento en el dispositivo, volver a cargar y verificar que todo aparece sin movimiento. En el pie, "Bourder Web" abre https://bourderweb.com.ar aparte, y la leyenda dice "© 2026 - Pertusatti | Sabalette - Abogadas. Todos los derechos reservados." Entre 640 y 1200 px, al final de la página, el botón de WhatsApp no tapa "Bourder Web".
