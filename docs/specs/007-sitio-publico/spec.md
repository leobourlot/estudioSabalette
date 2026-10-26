# Spec 007 — Sitio público

## Contexto y objetivo
Hasta ahora el sistema solo sirve a quien ya tiene una cuenta: el panel para las integrantes y el portal para los clientes. Quien busca un estudio jurídico y llega a la dirección del estudio no encuentra quiénes son, qué hacen ni cómo consultarlas. Esta spec define el sitio público: lo que ve cualquier visitante, sin cuenta. Presenta al estudio "Pertusatti | Sabalette - Abogadas", sus cuatro servicios y a sus abogadas, publica sus datos de contacto y deja siempre a mano el WhatsApp, que es el canal por el que el estudio recibe las consultas. Es además la puerta de entrada al ingreso de clientes e integrantes (spec 001). Tiene que resultar claro para alguien que entra por primera vez, sobre todo desde el celular, y tiene que poder encontrarse en los buscadores. Todo su contenido es público y fijo, como admite el principio 5 de la constitución: el sitio no pide ni guarda ningún dato de quien lo visita y nunca muestra información de causas, clientes, jurisprudencia, modelos ni escritos (spec 005, RF-36; spec 006, RF-52). Lo único que cambia si quien navega tiene la sesión abierta es el acceso a su portal o a su panel.

## Usuarios / actores
- **Visitante** (spec 001): cualquier persona sin sesión. Puede ser un trabajador, un empleador o un familiar que busca asesoramiento, muchas veces desde el celular y sin conocer al estudio.
- **Cliente e integrante con la sesión abierta** (spec 001): ven el mismo sitio que un visitante, con un acceso para ir a su portal o a su panel.
- **El estudio**: sus dos integrantes, Carolina Marisa Pertusatti y Vanesa Sabalette Rabello, ambas abogadas, aportan los textos, las fotos y los datos de contacto. No los cargan ni los editan desde el panel: son contenido fijo del sitio.

## Historias de usuario
- H1: Como visitante quiero entender en la primera pantalla quiénes son y a qué se dedican, para saber si me pueden ayudar.
- H2: Como visitante quiero ver los servicios del estudio y entrar al detalle del que me interesa, para saber si mi problema está entre los que atienden.
- H3: Como empleador o como trabajador quiero ver el contenido de Derecho Laboral pensado para mi situación, para no leer lo que no me corresponde.
- H4: Como visitante quiero conocer a las abogadas del estudio, para saber quién me va a atender.
- H5: Como visitante quiero escribirle al estudio por WhatsApp desde cualquier página, con el tema de mi consulta ya escrito, para contactarme sin vueltas.
- H6: Como visitante quiero ver dónde queda el estudio, cuándo atiende y por qué otros medios lo puedo contactar.
- H7: Como visitante quiero usar el sitio cómodamente desde el celular.
- H8: Como visitante quiero compartir la página de un servicio o de una abogada, y que quien la reciba vea exactamente esa página.
- H9: Como cliente o integrante quiero llegar desde el sitio a la pantalla de ingreso y, si ya ingresé, ir a mi portal o a mi panel.
- H10: Como persona que navega con teclado o con lector de pantalla quiero recorrer todo el sitio sin obstáculos.
- H11: Como visitante quiero que el sitio no guarde mis datos ni me siga.
- H12: Como integrante del estudio quiero que el sitio aparezca bien presentado en los buscadores y al compartirlo, para que nos encuentren.
- H13: Como integrante del estudio quiero que el sitio público nunca muestre información de causas, clientes, jurisprudencia, modelos ni escritos, para cumplir con el secreto profesional.

## Requisitos funcionales (criterios de aceptación en EARS)

### Alcance y contenido
- RF-1: EL SISTEMA muestra el sitio público a cualquier persona, con o sin sesión, sin pedirle ningún dato. El sitio se compone de:
  - El inicio.
  - Una página por cada uno de los cuatro servicios; la de Derecho Laboral, con una página por pestaña (RF-15).
  - Una página por cada abogada que tenga su resumen y su texto completo (RF-19, RF-20).
  - La página de dirección inexistente (RF-9).
- RF-2: EL SISTEMA muestra los textos del anexo "Textos aprobados" palabra por palabra, con sus párrafos y sus listas. Todo el contenido del sitio público es fijo y no se edita desde el panel. Cambiar un texto, un dato de contacto o una integrante exige actualizar primero esta spec.
- RF-3: EL SISTEMA muestra el nombre del estudio, "Pertusatti | Sabalette - Abogadas", en todo el sistema: el sitio público, la pantalla de ingreso, la de cambio de contraseña, el portal y el panel. En pantalla (encabezados, apertura del inicio y bloque de contacto) lo muestra en dos líneas: "Pertusatti | Sabalette" en la primera, sin cortarse, y "Abogadas" debajo. En los títulos de T-16 va en una sola línea. En el sitio público y en la pantalla de ingreso usa además el logo que entregó el estudio y sus colores. Es el logo completo en todos los lugares, con la "P" y la "S" enlazadas y el texto, también en la vista previa al compartir (RF-36) y en los datos para buscadores (RF-37):
  - Azul oscuro #2C3256 y azul #415789, en degradado hacia la derecha, como en el logo.
  - Blanco #FCFFFF.

  Los títulos del sitio público usan una tipografía con serifa de licencia libre (Cormorant Garamond), con sus archivos dentro del propio sitio (RF-40).

### Navegación
- RF-4: EL SISTEMA muestra en todas las páginas públicas un encabezado con:
  - El logo del estudio, que lleva al inicio.
  - Un menú con "Servicios", "Abogadas" y "Contacto".
  - El acceso de ingreso (RF-29, RF-30). MIENTRAS el menú está plegado (pantallas de menos de 768 px de ancho, RF-6), el acceso va dentro del menú, como su última opción, para que el logo, el nombre y "Menú" entren en una sola línea. Desde 768 px va al lado del menú.
- RF-5: CUANDO un visitante elige "Servicios" o "Abogadas" en el menú, desde cualquier página, EL SISTEMA lo lleva a esa sección del inicio. CUANDO elige "Contacto", lo lleva al bloque de contacto del final de la página en la que está (RF-23).
- RF-6: MIENTRAS la pantalla mide menos de 768 px de ancho, EL SISTEMA muestra el menú plegado detrás de un botón "Menú", que lo abre y lo cierra e indica si está abierto. Al elegir una opción, el menú se cierra. El logo, el nombre y el botón "Menú" quedan siempre a la vista, en una misma línea. Abierto, el menú se despliega debajo del encabezado a lo ancho de la pantalla, con todas sus opciones a la vista: nunca queda cortado ni fuera de la pantalla.
- RF-7: EL SISTEMA muestra en cada página de servicio el acceso "Volver a servicios", que lleva a la sección Servicios del inicio, y bajo el título "Otros servicios" los accesos a los otros tres servicios. En cada página de abogada muestra el acceso "Volver a abogadas", que lleva a la sección Abogadas del inicio.
- RF-8: EL SISTEMA da a cada página pública, a cada pestaña de Derecho Laboral y a cada sección del inicio estas direcciones, en minúsculas, sin tildes y con las palabras separadas por guiones:
  - Inicio: `/`
  - Secciones del inicio: `/#servicios`, `/#abogadas` y `/#contacto`. `/servicios` y `/abogadas` llevan a su sección del inicio.
  - Derecho Laboral: `/servicios/derecho-laboral/empresas` y `/servicios/derecho-laboral/trabajadores`. `/servicios/derecho-laboral` lleva a la de Empresas.
  - Accidentes: `/servicios/accidentes-de-trabajo`
  - Derecho de Daños: `/servicios/derecho-de-danos`
  - Sucesiones: `/servicios/sucesiones`
  - Abogadas: `/abogadas/carolina-pertusatti` y `/abogadas/vanesa-sabalette-rabello`.

  CUANDO alguien abre una de esas direcciones directamente, la vuelve a cargar o la recibe compartida, EL SISTEMA muestra esa misma página, pestaña o sección. La misma dirección escrita con mayúsculas o con una barra al final muestra la misma página. Los botones de atrás y adelante del navegador recorren las páginas y las pestañas visitadas, en orden, y al volver atrás la página aparece en la posición en la que se dejó.
- RF-9: SI un visitante abre una dirección del sitio público que no existe, ENTONCES EL SISTEMA muestra la página "No encontramos esa página", con el encabezado, el bloque de contacto, el botón de WhatsApp y accesos al inicio y a los cuatro servicios. Esa página nunca muestra la dirección pedida.
- RF-10: EL SISTEMA trata toda dirección del panel o del portal, exista o no, así:
  - Sin sesión: lleva a la pantalla de ingreso (spec 001, RF-18; spec 004, RF-6).
  - Con sesión, si la dirección no existe: lleva al inicio de su sección, el portal o el panel, salvo lo que establece la spec 001 para el cambio de contraseña pendiente (RF-11) y para quien entra a la sección de otro rol (RF-20).

  Así, sin sesión, nadie puede distinguir las direcciones del panel o del portal que existen de las que no.

### Inicio
- RF-11: EL SISTEMA muestra el inicio con estas secciones, en este orden:
  - Apertura: el nombre del estudio y el texto T-1, con una balanza de la justicia de fondo, decorativa, integrada con el degradado del logo.
  - Portal de clientes (RF-47).
  - Servicios (RF-12).
  - Abogadas (RF-18).
  - Contacto: es el bloque de contacto del final de la página (RF-23).
- RF-47: EL SISTEMA muestra en la sección Portal de clientes la leyenda "Portal de clientes", el título "Seguí tus casos desde donde estés", una maqueta apaisada del portal, en una ventana, y el botón "Ir al portal de clientes", que lleva a la dirección del portal: sin sesión, esa dirección lleva al ingreso (RF-10). El botón no consulta la sesión ni cambia con ella (RF-30, RF-31).
  - La maqueta empieza con el ingreso de ejemplo de T-22, con las etiquetas de la pantalla de ingreso: el email, la contraseña como puntos y el botón "Ingresar". No tiene campos de verdad: nada se puede escribir ni enviar (RF-39).
  - Después muestra la causa de ejemplo T-22 como la muestra el portal: la carátula y los datos a la izquierda, y a su lado los movimientos en una línea de tiempo, el más reciente arriba (spec 004, RF-13 y RF-21; spec 008, RF-18). Para no ocupar mucho alto, en pantallas anchas el título y el botón van a su izquierda; en el celular, la maqueta va debajo del botón, con los movimientos debajo de los datos. Lleva arriba la leyenda "Portal de clientes" y la marca "Ejemplo". Sus datos son inventados y fijos, están escritos en el sitio y no son de ningún cliente (RF-41).
  - Es una imagen: quien usa lector de pantalla la escucha como una sola imagen con el texto "Ejemplo del portal de clientes: el ingreso con email y contraseña, y una causa con sus datos y sus últimos movimientos." (T-17). No tiene enlaces ni controles y no recibe el foco.
  - CUANDO la maqueta entra en la pantalla, EL SISTEMA la hace aparecer con el ingreso vacío, tipea el email letra por letra y después la contraseña punto por punto, con un cursor de texto quieto en el campo que se está llenando, muestra un puntero que presiona "Ingresar", y el ingreso da paso a la causa, que muestra sus movimientos de a uno, del más antiguo al más reciente. El ingreso y la causa ocupan el mismo lugar y cada movimiento ya tiene el suyo reservado, así la maqueta no cambia de alto y nada se corre. Cada paso dura como mucho 0,6 segundos y cada pasada, menos de 5 segundos. Después la causa completa queda quieta 4 segundos y la maqueta vuelve al ingreso vacío con un fundido, sin que la ventana desaparezca, y repite la secuencia, en bucle. MIENTRAS la maqueta está fuera de la pantalla, la secuencia se detiene, y al volver sigue donde estaba. No tiene un control para pausarla: el estudio lo decidió el 24/10/2026, sabiendo que la pauta 2.2.2 de WCAG lo pide para lo que se mueve solo más de 5 segundos. Con la reducción de movimiento pedida, o sin el código de la página, se ve completa desde el principio (RF-45).
- RF-12: EL SISTEMA muestra en la sección Servicios el título "Nuestros servicios", el texto T-2 y cuatro tarjetas, en este orden: Derecho Laboral, Accidentes y Enfermedades Laborales, Derecho de Daños y Sucesiones. Cada tarjeta muestra arriba un ícono del tema, en el azul del logo y sin anunciarse para quien usa lector de pantalla (un maletín para Derecho Laboral, un casco de obra para Accidentes, una mano con monedas para Daños y un pergamino con texto para Sucesiones), el nombre del servicio, su frase (T-3 a T-6) y el botón "Conocer más", que lleva a la página de ese servicio. Al pasar el puntero por la tarjeta o al enfocar su botón, el ícono se mueve una vez (RF-45).

### Servicios
- RF-13: EL SISTEMA nombra cada servicio así:
  - Derecho Laboral: "Derecho Laboral" en la tarjeta, en los accesos y como título de su página.
  - Accidentes: "Accidentes y Enfermedades Laborales" en la tarjeta y en los accesos; "Accidentes de trabajo y enfermedades profesionales" como título de su página.
  - Daños: "Derecho de Daños" en la tarjeta, en los accesos y como título de su página.
  - Sucesiones: "Sucesiones" en la tarjeta, en los accesos y como título de su página.
- RF-14: CUANDO un visitante abre la página de un servicio, EL SISTEMA muestra su título (RF-13) y su texto completo: T-10 para Accidentes, T-11 para Derecho de Daños y T-12 para Sucesiones. Los puntos de cada lista se muestran como lista, uno por línea.
- RF-15: CUANDO un visitante abre Derecho Laboral, EL SISTEMA muestra su título, la frase T-3 y dos pestañas, "Empresas" y "Trabajadores", en ese orden. Cada pestaña es una página con su propia dirección (RF-8): se ve como pestaña y se usa como un enlace. Siempre hay exactamente una pestaña elegida, que se distingue de la otra por algo más que el color y se anuncia como la página actual.
- RF-16: CUANDO un visitante elige una pestaña, EL SISTEMA muestra su contenido sin volver al principio de la página: las pestañas quedan a la vista, en el mismo lugar, y el foco queda en la pestaña elegida.
- RF-17: EL SISTEMA muestra en la pestaña "Empresas" los tres destacados de T-7, como texto, antes del texto T-8 completo. En la pestaña "Trabajadores" muestra el texto T-9 completo.

### Abogadas
- RF-18: EL SISTEMA muestra en la sección Abogadas el título "Equipo de abogadas" y una tarjeta por cada integrante, en el orden del logo: Carolina Marisa Pertusatti y Vanesa Sabalette Rabello. Cada tarjeta muestra:
  - La foto (RF-21).
  - El nombre, con "Dra." adelante (por ejemplo, "Dra. Vanesa Sabalette Rabello").
  - Su título profesional, "Abogada | Mediadora | Diplomada en Derecho Laboral" (T-21).
  - El resumen (T-19 para Carolina Marisa Pertusatti y T-13 para Vanesa Sabalette Rabello).
  - El acceso "Más información", que lleva a la página de esa abogada.
- RF-19: CUANDO un visitante abre la página de una abogada, EL SISTEMA muestra su foto (RF-21), su nombre con "Dra." adelante, su título profesional (T-21) y su texto completo (T-20 para Carolina Marisa Pertusatti y T-14 para Vanesa Sabalette Rabello).
- RF-20: MIENTRAS falte el resumen o el texto completo de una abogada, EL SISTEMA muestra su tarjeta solo con la foto (RF-21), el nombre y su título profesional, sin resumen y sin "Más información", y esa abogada no tiene página propia. Hoy las dos integrantes tienen sus textos; la regla vale para una integrante que se sume sin ellos.
- RF-21: EL SISTEMA muestra la foto de cada abogada en un círculo, la misma en la tarjeta y en su página, con distinto tamaño. MIENTRAS la foto no exista, no haya terminado de cargar o no se pueda cargar, EL SISTEMA muestra en su lugar las iniciales de todas las palabras de su nombre (CMP, VSR), en blanco sobre el azul del logo, con la misma forma y el mismo tamaño que la foto, sin ícono de imagen rota y sin que el resto de la página se mueva al aparecer la foto. Las fotos se publican sin los datos que guarda la cámara (ubicación, dispositivo, fecha). Su texto alternativo es "Foto de la" seguido del nombre de la abogada con "Dra." adelante ("Foto de la Dra. Vanesa Sabalette Rabello").
- RF-46: EL SISTEMA muestra o anuncia el nombre de una abogada siempre con "Dra." adelante: en su tarjeta y en su página, en el título de su página (T-16), en el texto alternativo de su foto, en "Más información" para quien usa lector de pantalla ("Más información sobre la Dra. …") y en cada WhatsApp (RF-22). Las iniciales (RF-21) y la dirección de su página (RF-8) se arman con el nombre sin "Dra.".

### Contacto
- RF-22: EL SISTEMA toma los datos de contacto del estudio de una única fuente, la misma que usa el portal (spec 004, RF-18). Son públicos y fijos, y no se editan desde el panel:
  - Nombre: "Pertusatti | Sabalette - Abogadas".
  - WhatsApp de cada abogada, en el orden del nombre del estudio: "Dra. Carolina Pertusatti", +54 9 3454 08-7098, y "Dra. Vanesa Sabalette", +54 9 3455 41-4147. Donde se muestra un número, va con el nombre de su abogada ("Dra. Carolina Pertusatti: +54 9 3454 08-7098").
  - Dirección: "Pueyrredón Nº 47, Concordia".
  - Email de cada abogada, en el orden del nombre del estudio: "Dra. Carolina Pertusatti", carolina@persaestudiojuridico.com.ar, y "Dra. Vanesa Sabalette", vanesa@persaestudiojuridico.com.ar.
  - Redes sociales: Instagram, con la cuenta "@persaestudiojuridico" (https://www.instagram.com/persaestudiojuridico/).
  - Días y horarios de atención: los que informe el estudio (ver Dudas abiertas).
- RF-23: EL SISTEMA muestra al final de todas las páginas públicas, antes del pie de página (RF-44), un bloque de contacto sobre el degradado del logo, con el título "Contactate con nosotros", una línea corta debajo del título y el texto "Estamos disponibles para escucharte. La primera consulta es el primer paso para resolver tu problema legal." (T-17). Debajo, cada dato en su renglón, con un ícono, una etiqueta corta en mayúsculas y el dato. Los íconos de Ubicación (el pin de Google Maps), de WhatsApp y de cada red llevan los colores de su marca, sin fondo, con un borde blanco que sigue el dibujo; los demás van en blanco:
  - "Ubicación": la dirección, como texto, y el enlace "Cómo llegar", que abre esa dirección en Google Maps.
  - "Teléfono / WhatsApp": con el ícono de WhatsApp, el número de cada abogada, escrito con su nombre, cada uno en su renglón y como enlace que abre una conversación con esa abogada (RF-27).
  - "Disponibilidad": los días y horarios de atención.
  - "Email": el email de cada abogada, escrito con su nombre ("Dra. Carolina Pertusatti: carolina@persaestudiojuridico.com.ar"), cada uno en su renglón y como enlace para escribirle a esa abogada.
  - Cada red social, con el nombre de la red como etiqueta (por ejemplo, "Instagram") y sus cuentas (por ejemplo, "@estudio"), cada una como enlace a su perfil.
- RF-24: MIENTRAS el estudio no haya informado un dato de contacto, EL SISTEMA no muestra ese dato, ni su título, ni un espacio vacío en su lugar. Nunca muestra un dato de ejemplo o inventado. El enlace "Cómo llegar" solo se muestra cuando hay dirección. Única excepción: en la versión de desarrollo, la que se usa para construir y probar el sitio antes de publicarlo, mientras el estudio no haya informado sus redes se muestran redes de muestra (Instagram, Facebook, X y LinkedIn, con una cuenta de muestra y el enlace a la página principal de cada red), para ver cómo quedan el bloque de contacto y el pie de página. El sitio publicado nunca las incluye.
- RF-25: CUANDO un visitante elige un enlace que lo lleva fuera del sitio (WhatsApp, "Cómo llegar", el email o una red social), EL SISTEMA lo abre aparte, sin reemplazar la página que estaba viendo. El sitio abierto no recibe ningún control sobre la página de origen ni la dirección desde la que se llegó.

### WhatsApp
- RF-26: EL SISTEMA muestra en todas las páginas públicas y en la pantalla de ingreso un botón de WhatsApp siempre visible abajo a la derecha, con la misma ubicación y el mismo aspecto que en el portal (spec 004, RF-19), y con el nombre "Escribinos por WhatsApp" para quien usa lector de pantalla. Al elegirlo, abre arriba del botón un menú con una opción por abogada, con su nombre y su número (RF-22). El menú se cierra al elegir una opción, al volver a elegir el botón, al tocar fuera de él o con Escape, y sin el código de la página sigue abriéndose y sus enlaces funcionan (RF-35).
- RF-27: CUANDO un visitante elige una opción del botón de WhatsApp o un enlace de WhatsApp del bloque de contacto o del pie de página en una página pública, EL SISTEMA abre una conversación con la abogada elegida con el mensaje de esa página ya escrito (T-15), que el visitante puede cambiar o borrar antes de enviarlo. En Derecho Laboral, el mensaje es el de la pestaña elegida. En la pantalla de ingreso y en el portal, la conversación se abre sin mensaje (spec 004, RF-18 y RF-19). El sitio nunca envía un mensaje por su cuenta.
- RF-28: EL SISTEMA nunca deja que el botón de WhatsApp tape contenido ni controles, con el celular en vertical o en horizontal:
  - Al llegar al final de cada página, todo lo que queda debajo del botón se puede ver y usar.
  - No tapa el menú abierto, las pestañas ni los botones "Conocer más" y "Más información".
  - En la pantalla de ingreso no tapa los campos ni el botón "Ingresar", tampoco con el teclado del celular abierto.

### Ingreso desde el sitio
- RF-29: MIENTRAS quien navega no tiene sesión, o todavía no se sabe si la tiene, o no se puede saber, EL SISTEMA muestra en el encabezado el acceso "Ingresar", que lleva a la pantalla de ingreso (spec 001). Si en ese momento tenía la sesión abierta, la pantalla de ingreso lo lleva a su sección (spec 001, RF-8).
- RF-30: CUANDO se confirma que quien navega tiene la sesión abierta, EL SISTEMA muestra en lugar de "Ingresar" el acceso "Ir a mi portal", si es cliente, o "Ir al panel", si es administrador o abogado. Es lo único que cambia en el sitio público por tener sesión: no muestra su nombre ni ningún otro dato de su cuenta. El acceso lo lleva adonde indica la spec 001 (RF-8 y RF-11); si para entonces la sesión ya no existe, lo lleva a la pantalla de ingreso.
- RF-31: EL SISTEMA consulta si hay sesión al abrir o volver a cargar una página pública, y de esa consulta el sitio público solo recibe si hay sesión y si va al portal o al panel. Esa consulta, como excepción a la spec 001 (RF-12), no cuenta como uso: no extiende ni renueva la sesión. Recorrer el sitio público nunca mantiene abierta una sesión.
- RF-32: SI la sesión se cierra mientras quien navega está en el sitio público (por vencimiento, ingreso desde otro dispositivo, desactivación o cierre en otra pestaña), ENTONCES EL SISTEMA lo deja seguir viendo el sitio, sin avisos y, como excepción a la spec 001 (RF-17), sin llevarlo a la pantalla de ingreso. El acceso puede seguir diciendo "Ir a mi portal" o "Ir al panel" hasta que vuelva a cargar la página; al elegirlo, va a la pantalla de ingreso (RF-30).
- RF-33: EL SISTEMA muestra en la pantalla de ingreso el logo del estudio, que lleva al inicio del sitio público, y el botón de WhatsApp (RF-26).

### Buscadores y compartir
- RF-34: EL SISTEMA da a cada página pública, a cada pestaña de Derecho Laboral y a las pantallas de ingreso, cambio de contraseña, portal y panel un título propio, y a las páginas públicas además una descripción propia (T-16). El título es el que muestran la pestaña del navegador y los buscadores. El idioma declarado de todas las páginas es el español.
- RF-35: EL SISTEMA entrega cada página pública con su texto, su título, su descripción y sus enlaces ya incluidos, de modo que los buscadores, los generadores de vista previa y los navegadores que no ejecutan el código de la página pueden leerlos y seguirlos. Sin ese código se ven todos los textos, funcionan todos los enlaces y el acceso de ingreso dice "Ingresar".
- RF-36: CUANDO alguien comparte la dirección de una página pública por WhatsApp, por una red social o por otro medio que arma una vista previa, EL SISTEMA ofrece para esa vista previa el título y la descripción de esa página (T-16) y el logo del estudio.
- RF-37: EL SISTEMA ofrece a los buscadores:
  - La lista de las direcciones de las páginas públicas.
  - La dirección principal de cada página, la de RF-8, aunque se haya llegado por una variante con mayúsculas o barra final.
  - Los datos del estudio como estudio jurídico: nombre, los WhatsApp de las abogadas y, cuando el estudio los informe, dirección, horarios, los emails de las abogadas y redes.
- RF-38: EL SISTEMA indica a los buscadores que no listen la pantalla de ingreso, la de cambio de contraseña, el panel, el portal ni la página de dirección inexistente, y les informa que una dirección inexistente no existe.

### Privacidad, seguridad y aislamiento
- RF-39: EL SISTEMA no pide ni guarda ningún dato de quien visita el sitio público. Las páginas públicas no tienen ningún campo para escribir. A un visitante sin sesión el sitio no le guarda nada en el navegador, salvo las copias de los archivos del propio sitio que el navegador conserva para cargarlo más rápido. Los registros técnicos del servidor y del alojamiento, que pueden incluir la dirección IP, no se usan para identificar ni medir a los visitantes.
- RF-40: EL SISTEMA no mide las visitas ni identifica a los visitantes. Las páginas públicas solo usan recursos de terceros (por ejemplo, tipografías o íconos) que no hacen seguimiento ni registran la dirección IP para reconocer al visitante, y no incluyen mapas incrustados, botones de redes con seguimiento ni contadores.
- RF-41: EL SISTEMA nunca muestra ni solicita en el sitio público datos de causas, partes, movimientos, clientes, cuentas, jurisprudencia, modelos ni escritos (spec 005, RF-36; spec 006, RF-52), haya o no una sesión abierta. La única excepción es la causa de ejemplo de la maqueta del portal (RF-47, T-22): sus datos son inventados, están escritos en el sitio y no son de ningún cliente. La única información de la sesión que llega a las páginas públicas es la de RF-31.
- RF-42: SI una dirección trae datos agregados que el sitio no espera, ENTONCES EL SISTEMA los ignora: nunca los muestra en pantalla ni los usa para armar el mensaje de WhatsApp, un enlace o el destino después de ingresar.
- RF-43: EL SISTEMA no permite que ninguna de sus pantallas (el sitio público, la pantalla de ingreso, la de cambio de contraseña, el portal ni el panel) se muestre dentro de otro sitio, para que nadie pueda disfrazarlas y engañar a quien las usa.

### Pie de página
- RF-44: EL SISTEMA muestra al final de todas las páginas públicas, después del bloque de contacto, un pie de página con:
  - El logo y el nombre del estudio, que llevan al inicio.
  - Los accesos "Servicios", "Abogadas" y "Contacto", como en el menú (RF-5).
  - Las redes: el WhatsApp de cada abogada, con su nombre y su número, como enlace con el mensaje de la página (RF-27), y cada cuenta de las redes informadas, cada una con el mismo ícono del bloque de contacto, a color y con borde blanco (RF-23), y el nombre de la red (por ejemplo, "Instagram"), como enlace a su perfil. Si una red tiene más de una cuenta, cada enlace suma la cuenta al nombre. Sin redes informadas, solo se muestran los WhatsApp (RF-24).
  - Debajo de las redes, el email de cada abogada, sin su nombre, como enlace para escribirle a esa abogada, y la dirección, como enlace que la abre en Google Maps, cada uno con el mismo ícono del bloque de contacto (RF-23). Cada uno se muestra solo si el estudio lo informó (RF-24).
  - La leyenda "© <año> - Pertusatti | Sabalette - Abogadas. Todos los derechos reservados.", con el año en que se publicó el sitio (T-18).
  - La leyenda "Diseñado por" con el logo y el nombre "Bourder Web", que llevan a https://bourderweb.com.ar (T-18). Como todo enlace externo, se abre aparte (RF-25).

### Animaciones
- RF-45: EL SISTEMA anima las páginas públicas: las secciones, las tarjetas y los bloques de texto aparecen con un movimiento suave al entrar en la pantalla; el menú plegado se despliega y se repliega; el contenido de las pestañas de Derecho Laboral cambia con una transición; la foto de una abogada aparece sobre sus iniciales; la maqueta del portal muestra, en bucle, un ingreso y después los movimientos de una causa, de a uno (RF-47); y las tarjetas, los botones y los enlaces responden al pasar el puntero o al recibir el foco. En todos los casos:
  - MIENTRAS el visitante pidió a su dispositivo reducir las animaciones, todo aparece directamente, sin movimiento.
  - Sin el código de la página, todo el contenido se ve, sin animaciones (RF-35).
  - La apertura del inicio (el nombre del estudio y T-1) se ve desde el primer momento, sin esperar a ninguna animación.
  - Cada animación dura como mucho 0,6 segundos (la secuencia de la maqueta del portal encadena varias, de a una, como indica RF-47), no hace parpadear nada, no mueve el contenido que ya está en su lugar y no impide usar ningún control mientras ocurre.

## Requisitos no funcionales
- Plataformas: el sitio se usa desde el celular tanto como desde la computadora.
  - En una pantalla de 360 px de ancho, todo se ve y se usa sin desplazamiento horizontal: el menú, las cuatro tarjetas, las tarjetas de las abogadas y las dos pestañas de Derecho Laboral, que entran una al lado de la otra.
  - En los encabezados del sitio, del portal y del panel, "Pertusatti | Sabalette" entra en una línea y "Abogadas" va debajo (RF-3).
  - Los textos largos, como la dirección o el email, pasan a la línea siguiente en lugar de salirse de la pantalla.
  - Con el celular en horizontal, todo se ve y se usa igual que en vertical, y el encabezado no ocupa la mayor parte de la pantalla.
  - Los controles táctiles (botones, pestañas, accesos del menú) miden al menos 44 px de lado.
- Accesibilidad:
  - Todo se puede recorrer y usar solo con el teclado, en un orden lógico y con el foco siempre visible. El menú plegado se abre, se recorre y se cierra con el teclado, y con Escape se cierra.
  - Cada página empieza con el acceso "Saltar al contenido" y tiene un único título principal, con los subtítulos en orden, sin saltear niveles.
  - Al pasar a otra página, el lector de pantalla anuncia su título y el foco queda al principio de su contenido. Al ir a una sección del inicio desde el menú, el foco queda en el título de esa sección.
  - Las pestañas de Derecho Laboral se recorren con Tab, se eligen con Enter y anuncian cuál es la página actual (RF-15).
  - El texto contrasta con su fondo al menos 4,5 a 1 (3 a 1 en títulos grandes, íconos y bordes de controles). El blanco #FCFFFF sobre cualquiera de los dos azules del logo cumple ese contraste. En los íconos con los colores de su marca del bloque de contacto (RF-23), lo cumple el borde blanco que rodea el dibujo; los colores de adentro quedan exceptuados, porque son decorativos (no se anuncian y la etiqueta va escrita al lado) y no pueden cumplirlo todos sobre ningún fondo.
  - Ninguna información depende solo del color.
  - El texto se puede agrandar hasta el 200 % sin que se corte ni se superponga. Agrandado, las pestañas pueden pasar una debajo de la otra.
  - El logo y las fotos tienen texto alternativo. Las iniciales que reemplazan a una foto no se anuncian, porque el nombre está al lado.
  - Si el visitante pidió a su dispositivo reducir las animaciones, el sitio no las muestra (RF-45).
- Rendimiento: en un celular con conexión 4G, el texto de cada página se puede leer en menos de 3 segundos. El logo y las fotos que tardan en cargar no mueven el texto ya mostrado.
- Disponibilidad: el contenido público es fijo, así que se ve completo aunque el servidor del panel y del portal no responda (RF-29).
- Persistencia: el contenido del sitio público y los datos de contacto son públicos y fijos, y viven fuera de la base, como admite el principio 5. La única consulta del sitio público al servidor es la de RF-31, que no modifica la sesión.
- Aislamiento: las páginas públicas no reciben del servidor ningún dato de causas, clientes, jurisprudencia, modelos ni escritos, ni de la cuenta de quien navega, más allá de lo que indica RF-31.
- Textos seguros: los textos del sitio son fijos. Nada de lo que venga en una dirección se muestra en pantalla ni se interpreta como código (RF-9, RF-42).
- Stack: si cumplir con RF-35 a RF-38 o con RF-43 exige sumar algo al stack o cambiar cómo se publica el sitio, el plan lo justifica (principio 1). Las animaciones de RF-45 se hacen con la biblioteca Motion, a pedido del estudio; el plan justifica la dependencia.
- Idioma: todos los textos del sitio en español.

## Casos límite
- **Navegación:**
  - Visitante que llega desde un buscador directamente a la página de un servicio, sin pasar por el inicio: tiene el encabezado, "Volver a servicios", los otros servicios, el bloque de contacto y el pie de página (RF-4, RF-7, RF-23, RF-44).
  - Pantalla de 360 px: el logo, el nombre y "Menú" van en una línea; el acceso de ingreso ("Ingresar", "Ir a mi portal" o "Ir al panel") es la última opción del menú plegado, y el menú abierto se ve completo, a lo ancho de la pantalla (RF-4, RF-6).
  - Pantalla de 768 px o más: el menú es una fila y el acceso de ingreso va a su lado, en el encabezado (RF-4).
  - "Servicios" o "Abogadas" elegidos desde una página de detalle: llevan al inicio, ya ubicado en esa sección (RF-5).
  - "Contacto" elegido en la página de dirección inexistente: lleva a su propio bloque de contacto (RF-5, RF-9).
  - Menú abierto en el celular y el visitante elige una opción: el menú se cierra y se ve el destino (RF-6).
  - Dirección pública que no existe o está mal escrita: "No encontramos esa página" (RF-9).
  - Dirección pública con mayúsculas o con barra final: muestra la misma página, y los buscadores reciben la dirección principal (RF-8, RF-37).
  - Dirección de la página de una abogada sin sus textos: "No encontramos esa página" (RF-9, RF-20).
  - Dirección de Derecho Laboral con una pestaña que no existe: "No encontramos esa página" (RF-9).
  - Dirección de una página que se quitó o cambió de nombre, compartida antes: "No encontramos esa página". Se acepta (RF-9).
  - Dirección con datos agregados, por ejemplo los que suman las redes al compartir: se muestra la página normal y los datos se ignoran (RF-42).
  - Dirección inexistente del panel o del portal: sin sesión lleva a la pantalla de ingreso, igual que una existente; con sesión, al inicio de su sección (RF-10).
  - Visitante que vuelve atrás desde un servicio al inicio: el inicio aparece en la posición en la que lo dejó (RF-8).
- **Derecho Laboral:**
  - `/servicios/derecho-laboral` sin pestaña: lleva a la dirección de Empresas, y volver atrás no regresa a la dirección sin pestaña (RF-8).
  - Visitante que pasa de "Empresas" a "Trabajadores" y vuelve atrás con el navegador: vuelve a "Empresas" (RF-8, RF-16).
  - Dirección de "Trabajadores" compartida: quien la abre ve la pestaña "Trabajadores" ya elegida, con su título y su descripción en la vista previa (RF-8, RF-34, RF-36).
  - "Intercambios telegráficos" aparece en las dos listas: es correcto, cada pestaña muestra la suya completa (RF-17).
  - Pantalla de 360 px: las dos pestañas entran una al lado de la otra; con el texto agrandado al 200 %, pueden pasar una debajo de la otra (requisitos no funcionales).
- **Abogadas:**
  - Ninguna abogada con foto: las dos tarjetas muestran iniciales y la sección se ve terminada, no a medio cargar (RF-21).
  - Una abogada con foto y la otra sin: las dos tarjetas conservan el mismo tamaño y la misma alineación (RF-21).
  - Foto que tarda o no carga, por ejemplo por mala conexión: se ven las iniciales hasta que carga, o en su lugar si no carga, sin ícono de imagen rota (RF-21).
  - Resúmenes de distinto largo: las dos tarjetas se ven ordenadas aunque tengan distinta cantidad de texto (RF-18).
  - Una integrante nueva con solo el resumen o solo el texto: su tarjeta sigue sin resumen ni página hasta tener los dos (RF-20).
- **Contacto:**
  - Hoy faltan solo los días y horarios de atención: el bloque de contacto muestra los renglones "Ubicación", "Teléfono / WhatsApp", "Email" e "Instagram", sin "Disponibilidad" (RF-24, RF-44).
  - Una red con dos cuentas (por ejemplo, la del estudio y la de una abogada): las dos van en el mismo renglón, bajo el nombre de la red (RF-23).
  - Hay dirección pero no horarios, o al revés: se muestra solo lo informado (RF-24).
  - El estudio informa una sola red social: se muestra solo esa (RF-23, RF-24).
  - La dirección genérica y el número genérico que tenía el portal dejan de existir: ni el sitio ni el portal los muestran (RF-22, RF-24; spec 004, RF-18).
  - Email largo o dirección larga en 360 px: pasan a la línea siguiente (requisitos no funcionales).
  - Feria judicial, vacaciones o un cambio de número: se publican cambiando esta spec y el sitio. No hay avisos temporales (RF-2, Fuera de alcance).
  - Alguien se hace pasar por el estudio desde otro número o email (por ejemplo, con el logo y el nombre en su perfil de WhatsApp) y le escribe a un cliente: el sistema no puede impedirlo. El sistema solo muestra los WhatsApp y los emails de las abogadas, nunca otros números ni casillas, para que los clientes puedan comprobar cuáles son los oficiales. Se acepta.
- **WhatsApp:**
  - Visitante sin WhatsApp instalado: el enlace abre la página de WhatsApp, que le ofrece instalarlo o usarlo desde el navegador. El sitio no interviene.
  - El visitante borra o cambia el mensaje antes de enviarlo: es su decisión (RF-27).
  - Cliente con sesión que elige el botón desde una página pública: el mensaje es el de esa página, sin ningún dato suyo ni de sus causas (RF-27, RF-41).
  - Página larga en el celular: al llegar al final, el bloque de contacto y sus enlaces quedan a la vista y se pueden usar, sin que el botón los tape (RF-28).
  - Pantalla de ingreso en el celular con el teclado abierto: el botón no tapa los campos ni "Ingresar" (RF-28).
  - Cada WhatsApp es el celular de su abogada: es una decisión del estudio. El visitante elige a quién escribirle; el sitio no reparte las consultas por tema (RF-26).
- **Ingreso y sesión:**
  - Mientras se consulta si hay sesión, el encabezado muestra "Ingresar"; si se confirma que la hay, cambia a "Ir a mi portal" o "Ir al panel" (RF-29, RF-30).
  - El servidor no responde: el sitio se ve completo, con "Ingresar" (RF-29).
  - La sesión sigue abierta pero el sitio no puede confirmarlo sin renovarla: muestra "Ingresar" y, al elegirlo, la pantalla de ingreso lo lleva a su sección (RF-29, RF-31).
  - Cliente con la sesión abierta que abre el inicio: ve el sitio público con "Ir a mi portal". No se lo lleva al portal por su cuenta (RF-30).
  - Usuario con cambio de contraseña pendiente que elige "Ir a mi portal" o "Ir al panel": llega a la pantalla de cambio de contraseña (RF-30; spec 001, RF-11).
  - La sesión vence o se cierra mientras alguien recorre el sitio público: sigue viendo el sitio, sin aviso. Al elegir "Ir a mi portal" o ir a cualquier dirección del portal o del panel, llega a la pantalla de ingreso (RF-32).
  - Cliente que pasa del portal al sitio público y deja el equipo: el sitio público no extiende su sesión, así que vence a los 20 minutos de su última acción en el portal (RF-31; spec 004, RF-4). Mientras tanto, quien use ese navegador llega al portal con un clic, igual que si el portal hubiera quedado abierto. Se acepta.
  - El encabezado muestra a quien use ese navegador que hay una sesión abierta y si es de cliente o de integrante, sin ningún nombre. Se acepta (RF-30).
  - Sitio público en una pestaña y portal en otra: la consulta del sitio público no renueva la sesión, así que no compite con la renovación del portal (RF-31; spec 001, casos límite).
  - Visitante que entra a la pantalla de ingreso por error: vuelve al sitio con el logo (RF-33).
- **Buscadores y compartir:**
  - Buscador o generador de vista previa que no ejecuta el código de la página: lee el texto, el título, la descripción y los enlaces (RF-35).
  - Robots que recorren el sitio: si no ejecutan el código de la página, no consultan la sesión. Los que sí, hacen la consulta de RF-31, que se acepta sin un límite propio.
  - Enlace del inicio compartido por WhatsApp: se ve el nombre del estudio, la descripción y el logo (RF-36).
  - Pantalla de ingreso o dirección inexistente: los buscadores no las listan (RF-38).
- **Privacidad y seguridad:**
  - El sitio no muestra ningún aviso de cookies, porque a un visitante sin sesión no le guarda nada (RF-39, RF-40).
  - Al abrir WhatsApp, Google Maps, el email o una red social, el visitante pasa a un servicio de otra empresa, con sus propias reglas. El sitio solo lo enlaza (RF-25, RF-40).
  - Otro sitio intenta mostrar una página del sistema dentro de las suyas: no se muestra (RF-43).
- **Pie de página y animaciones:**
  - El año de la leyenda es el de la última publicación del sitio: cambia al volver a publicarlo (RF-44).
  - Visitante que pidió reducir las animaciones: ve todo en su lugar desde el principio (RF-45).
  - En la versión de desarrollo, sin redes informadas: el contacto y el pie muestran las redes de muestra; el sitio publicado, construido con los mismos datos, no muestra ninguna (RF-24).
  - Navegador que no ejecuta el código de la página: ve todo el contenido, sin animaciones (RF-35, RF-45).
  - Visitante que baja rápido hasta el final: las secciones que pasaron por la pantalla ya aparecieron, y ninguna queda oculta (RF-45).
- **Portal de clientes en el inicio:**
  - Visitante que confunde la causa de ejemplo con una real: la maqueta lleva la marca "Ejemplo" y sus datos son claramente inventados ("Empresa Ejemplo S.A."); no son de ningún cliente (RF-41, RF-47).
  - Visitante que toca el ingreso de la maqueta para escribir: no pasa nada, porque es una imagen sin campos; para ingresar están "Ir al portal de clientes" y el acceso del encabezado (RF-39, RF-47).
  - Visitante sin sesión que elige "Ir al portal de clientes": llega a la pantalla de ingreso (RF-10, RF-47).
  - Cliente o integrante con la sesión abierta que elige "Ir al portal de clientes": el cliente llega a su portal; el integrante, a su panel, como indica la spec 001 para quien entra a la sección de otro rol (RF-10; spec 001, RF-20).
  - Quien usa lector de pantalla: escucha la maqueta como una sola imagen, con su descripción, sin recorrer cada dato inventado (RF-47).
  - Quien sale de la pantalla mientras corre la secuencia y vuelve: la secuencia estuvo detenida y sigue donde estaba (RF-47).
  - Quien se queda mirando la sección: la secuencia se repite, con la causa completa quieta 4 segundos entre una pasada y la otra; no hay control para pausarla (RF-47).
- **Sin conexión:** la página ya abierta sigue visible. Abrir otra depende de la conexión; no hay modo sin conexión (Fuera de alcance).

## Fuera de alcance
- Edición de textos, servicios, integrantes, fotos o datos de contacto desde el panel.
- Formulario de contacto, de consulta o de suscripción, y cualquier otro campo para que el visitante escriba.
- Cerrar sesión desde el sitio público: se hace desde el portal o el panel (spec 001).
- Turnos o reserva de entrevistas en línea.
- Blog, novedades, artículos o preguntas frecuentes.
- Avisos temporales (feria judicial, vacaciones, cambios de horario).
- Avisos legales y profesionales: matrícula, colegio profesional, aviso legal y política de privacidad.
- Jurisprudencia, modelos o escritos a la vista del público (spec 005, RF-36; spec 006, RF-52).
- Otros idiomas.
- Mapa incrustado en la página.
- Teléfono fijo u otros números además del WhatsApp.
- Testimonios, casos de éxito y honorarios.
- Chat en línea y respuestas automáticas.
- Mediciones de visitas, cookies de terceros y publicidad.
- Buscador dentro del sitio.
- Uso sin conexión y una versión pensada para imprimir.
- Servicios nuevos o páginas para cada punto de las listas.
- Integrantes nuevas: sumar una exige actualizar esta spec (RF-2).
- Mensaje de WhatsApp precargado en la pantalla de ingreso y en el portal (spec 004).
- Registro público de usuarios y recuperación de contraseña (spec 001).

## Criterios de finalización
- Todos los RF que se pueden verificar antes de publicar, con al menos un test en verde. Los que dependen del sitio publicado se verifican al publicar (ver abajo).
- Tests que verifiquen:
  - Que cada texto del sitio coincide palabra por palabra con el anexo "Textos aprobados" (RF-2).
  - Que el nombre del estudio es "Pertusatti | Sabalette - Abogadas" en el sitio público, la pantalla de ingreso, el portal y el panel, en dos líneas en pantalla y en una en los títulos, y que el portal toma el nombre y el WhatsApp de la misma fuente que el sitio, sin dirección de ejemplo (RF-3, RF-22, RF-24).
  - Que cada dirección de RF-8 muestra su página, pestaña o sección, también con mayúsculas o barra final; que `/servicios/derecho-laboral` lleva a Empresas; y que una dirección inexistente, la de una abogada sin textos y la de una pestaña que no existe muestran "No encontramos esa página" sin mostrar la dirección pedida (RF-8, RF-9, RF-20, RF-42).
  - Que sin sesión toda dirección del panel o del portal, exista o no, lleva al ingreso, y que con sesión una inexistente lleva al inicio de su sección (RF-10).
  - Las pestañas de Derecho Laboral: cuál se ve al entrar, el cambio de pestaña, su dirección, el foco y su manejo con el teclado (RF-15, RF-16, RF-17).
  - La tarjeta con datos completos, la tarjeta sin resumen ni "Más información", y las iniciales cuando falta la foto, mientras carga y cuando no carga (RF-18, RF-20, RF-21).
  - Que el bloque de contacto muestra solo los datos informados, sin títulos vacíos (RF-23, RF-24).
  - El mensaje de WhatsApp de cada página y de cada pestaña, y que en la pantalla de ingreso y en el portal no hay mensaje (RF-27).
  - El acceso del encabezado sin sesión, mientras se consulta, con sesión de cliente, con sesión de integrante y cuando el servidor no responde; y que con la sesión cerrada el acceso lleva al ingreso (RF-29, RF-30, RF-32).
  - Que la consulta de sesión del sitio público solo devuelve si hay sesión y a qué sección va, y que no extiende ni renueva la sesión (RF-31).
  - El título y la descripción de cada página y pestaña, y el título de las pantallas de ingreso, cambio de contraseña, portal y panel (RF-34).
  - Que cada página pública incluye su texto, su título, su descripción y sus enlaces sin ejecutar el código de la página (RF-35).
  - La lista de direcciones para buscadores, la dirección principal de cada página, los datos del estudio para buscadores y la indicación de no listar las pantallas privadas (RF-37, RF-38).
  - Que las páginas públicas no tienen ningún campo para escribir, no guardan nada en el navegador de un visitante sin sesión y no piden al servidor ningún dato de causas, clientes, jurisprudencia, modelos ni escritos (RF-39, RF-41).
  - Que las pantallas del sistema indican que no se pueden mostrar dentro de otro sitio, y que los enlaces externos se abren aparte sin control sobre la página de origen (RF-25, RF-43).
  - El acceso de ingreso dentro del menú en pantallas chicas y el menú desplegado a lo ancho (RF-4, RF-6).
  - El bloque de contacto con sus textos y sus renglones, y el pie de página con sus datos, sus leyendas y el enlace a Bourder Web (RF-23, RF-44).
  - Que con la reducción de movimiento no hay animaciones, y que sin el código de la página todo el contenido se ve (RF-35, RF-45).
  - La sección Portal de clientes entre la apertura y Servicios, con su título, su botón al portal y la maqueta de T-22 como una sola imagen sin enlaces ni controles, y que la secuencia de la maqueta va del ingreso (email, contraseña y clic) a la causa, y del movimiento más antiguo al más reciente, con pasos de hasta 0,6 segundos, la causa completa quieta 4 segundos y la vuelta al ingreso sin que desaparezca la ventana, en bucle (RF-11, RF-45, RF-47).
- `pnpm test` y `pnpm lint` sin errores.
- Demo manual:
  1. Sin sesión, abrir el inicio desde un celular y verificar la apertura, las cuatro tarjetas con su frase, las dos tarjetas de las abogadas, con su foto, su título profesional, su resumen y "Más información" y el bloque de contacto solo con los datos informados.
  2. Entrar con "Conocer más" a cada servicio y verificar el título, el texto contra el anexo, "Volver a servicios" y los otros servicios.
  3. En Derecho Laboral, verificar que se ve "Empresas" con los tres destacados antes del texto, pasar a "Trabajadores", volver atrás con el navegador, y abrir en otra pestaña del navegador la dirección de "Trabajadores".
  4. Entrar con "Más información" a la página de Vanesa Sabalette Rabello y verificar su texto completo y "Volver a abogadas".
  5. En el inicio, en cada servicio y en cada pestaña, elegir el botón de WhatsApp, verificar que abre el menú con las dos abogadas y que cada opción abre la conversación con su número y el mensaje de esa página. Llegar al final de cada página, en vertical y en horizontal, y verificar que el botón no tapa nada.
  6. Abrir una dirección inexistente del sitio y verificar "No encontramos esa página", sin la dirección pedida y con sus accesos. Sin sesión, abrir una dirección inexistente del portal y verificar que lleva al ingreso.
  7. Elegir "Ingresar", verificar el botón de WhatsApp sin mensaje, que no tapa el formulario con el teclado abierto, y volver al sitio con el logo. Ingresar como cliente, volver al inicio y verificar "Ir a mi portal". Repetir como abogado y verificar "Ir al panel".
  8. Con la sesión de cliente abierta, cerrar sesión desde otra pestaña, volver al sitio público, verificar que no hay ningún aviso, elegir "Ir a mi portal" y verificar que lleva al ingreso.
  9. En el portal y en el panel, desde un celular, verificar el nombre en dos líneas ("Pertusatti | Sabalette" y debajo "Abogadas") y, en el portal, el WhatsApp de cada abogada sin ninguna dirección de ejemplo.
  10. Recorrer el inicio y la página de Derecho Laboral solo con el teclado, incluidos el menú y las pestañas, y verificar que el foco siempre se ve. Repetir con un lector de pantalla y verificar que anuncia cada página nueva.
  11. Repetir los pasos 1 a 6 desde una computadora.
  12. En una pantalla de 360 px, verificar que el logo, el nombre y "Menú" van en una línea, que el menú abierto se ve completo con el acceso de ingreso como última opción, y que el pie de página muestra sus datos, la leyenda y "Diseñado por Bourder Web" con su enlace.
  13. Recorrer el inicio y verificar las animaciones; repetir con la reducción de movimiento activada en el dispositivo y verificar que todo aparece sin movimiento.
  14. En el inicio, desde un celular y desde una computadora, bajar hasta la sección Portal de clientes y verificar que la maqueta aparece, tipea el ingreso, muestra sus movimientos de a uno desde el más antiguo, queda quieta 4 segundos y vuelve a empezar; elegir "Ir al portal de clientes" sin sesión y verificar que lleva al ingreso.
- Al publicar el sitio en su dirección definitiva:
  1. Compartir por WhatsApp la dirección del inicio y la de Sucesiones, y verificar el título, la descripción y el logo en la vista previa (RF-36).
  2. Verificar con las herramientas de los buscadores que leen el texto de cada página, la lista de direcciones, los datos del estudio y que no listan las pantallas privadas (RF-35, RF-37, RF-38).
  3. Medir desde un celular con conexión 4G que el texto de cada página se lee en menos de 3 segundos (requisitos no funcionales).

## Dudas abiertas
Ninguna impide planificar: cada dato pendiente tiene definido qué se muestra mientras falta (RF-20, RF-21, RF-24). Al recibir cada dato se actualiza esta spec (RF-2).
- [NECESITA ACLARACIÓN] Días y horarios de atención.
- Resuelta el 19/10/2026: el estudio entregó las fotos de las dos abogadas y los textos de Carolina Marisa Pertusatti (T-19 y T-20), y se aprobó el título profesional de las dos (T-21).
- Resuelta el 16/10/2026: el estudio entregó el logo vectorizado en buena calidad (fondo azul).
- Resuelta el 17/10/2026: el estudio informó su dirección ("Pueyrredón Nº 47, Concordia"), su email (estudiojuridicovsr@gmail.com) y su red social (Instagram, "@pertusattisabaletteabogadas") (RF-22). El 23/10/2026 la cuenta de Instagram pasó a ser "@persaestudiojuridico". El 26/10/2026 el email pasó a ser uno por abogada: carolina@persaestudiojuridico.com.ar y vanesa@persaestudiojuridico.com.ar. Ese mismo día cambió el WhatsApp de Carolina Pertusatti a +54 9 3454 08-7098.

## Anexo — Textos aprobados
Los textos de los servicios y de la abogada son los de la clienta. Las frases de las tarjetas y el resumen son recortes de esos textos, aprobados el 12/10/2026. Los mensajes de WhatsApp, los títulos, las descripciones y los textos de la interfaz se redactaron para esta spec. Los textos del bloque de contacto (T-17) y del pie de página (T-18) se tomaron del modelo que eligió el estudio y se aprobaron el 15/10/2026. El estudio pidió cambiar T-1, T-13 y el título de la sección de abogadas (T-17) el 24/10/2026, y acortar T-2 el 26/10/2026. Ese mismo día pidió la sección Portal de clientes (RF-47): la frase del título es suya, y los demás textos de esa sección y la causa de ejemplo (T-22) se redactaron para esta spec y se aprobaron.

### T-1 — Apertura del inicio
> Asesoramiento legal estratégico, con especial dedicación al Derecho Laboral.

### T-2 — Encabezado de la sección Servicios
> Nuestro trabajo parte del análisis particular de cada situación, priorizando soluciones estratégicas.

### T-3 a T-6 — Frases de las tarjetas
- T-3, Derecho Laboral:
  > Acompañamos tanto a empresas como a trabajadores en la prevención, gestión y resolución de conflictos.
- T-4, Accidentes y Enfermedades Laborales:
  > Brindamos asesoramiento y representación integral frente a accidentes de trabajo y enfermedades vinculadas con la actividad laboral.
- T-5, Derecho de Daños:
  > Intervenimos en reclamos destinados a obtener la reparación integral de los daños sufridos.
- T-6, Sucesiones:
  > Acompañamos a nuestros clientes durante todo el proceso sucesorio, procurando simplificar el trámite.

### T-7 — Destacados de la pestaña Empresas
- Asesoramiento laboral preventivo
- Gestión de contingencias
- Acompañamiento permanente

### T-8 — Derecho Laboral, pestaña Empresas
> Asesoramos a empresas y empleadores en la gestión cotidiana de las relaciones laborales, procurando anticipar contingencias y brindar respuestas claras frente a situaciones que requieren decisiones rápidas y jurídicamente seguras.
>
> Nuestro asesoramiento comprende, entre otros aspectos:
>
> - Contratación, registración y modalidades de trabajo.
> - Remuneraciones, jornada, licencias y condiciones laborales.
> - Aplicación e interpretación de convenios colectivos de trabajo.
> - Sanciones disciplinarias y conflictos durante la relación laboral.
> - Desvinculaciones y estrategias de negociación.
> - Intercambios telegráficos.
> - Conciliaciones y acuerdos laborales.
> - Prevención de contingencias y planificación de estrategias.
> - Representación y defensa en procesos judiciales laborales.

### T-9 — Derecho Laboral, pestaña Trabajadores
> Asesoramos y representamos a trabajadores frente a conflictos individuales derivados de la relación laboral, desde la primera consulta y el intercambio telegráfico hasta la negociación o eventual instancia judicial.
>
> Intervenimos especialmente en:
>
> - Despidos y diferencias indemnizatorias.
> - Trabajo no registrado o deficientemente registrado.
> - Diferencias salariales y de categoría.
> - Modificaciones de las condiciones de trabajo.
> - Licencias y enfermedades inculpables.
> - Situaciones de discriminación y conflictos laborales.
> - Intercambios telegráficos.
> - Negociaciones y acuerdos.
> - Reclamos y procesos judiciales laborales.

### T-10 — Accidentes de trabajo y enfermedades profesionales
> Brindamos asesoramiento y representación integral frente a accidentes de trabajo y enfermedades vinculadas con la actividad laboral, acompañando al trabajador durante las distintas etapas del reclamo.
>
> Intervenimos en trámites ante ART y Comisiones Médicas, rechazo de contingencias, determinación y revisión de incapacidades, divergencias en las prestaciones y reclamos indemnizatorios, tanto en instancia administrativa como judicial.

### T-11 — Derecho de Daños
> Intervenimos en reclamos destinados a obtener la reparación integral de los daños sufridos como consecuencia de hechos que generan responsabilidad.
>
> Asesoramos y representamos en casos de:
>
> - Accidentes de tránsito.
> - Daños personales y patrimoniales.
> - Responsabilidad civil.
> - Reclamos frente a compañías aseguradoras.
> - Negociaciones extrajudiciales y acciones indemnizatorias.

### T-12 — Sucesiones
> Acompañamos a nuestros clientes durante todo el proceso sucesorio, procurando simplificar el trámite y facilitar los acuerdos necesarios entre los interesados.
>
> Nuestro asesoramiento comprende:
>
> - Sucesiones testamentarias y ab intestato.
> - Declaratoria de herederos.
> - Denuncia y administración de bienes.
> - Acuerdos entre herederos.
> - Cesiones de derechos hereditarios.
> - Partición y adjudicación de bienes.
> - Inscripción de inmuebles y demás bienes registrables.

### T-13 — Resumen de Vanesa Sabalette Rabello (tarjeta)
> Cada caso representa para mí un nuevo desafío. Busco que quienes confían en nuestro Estudio se sientan acompañados durante todo el proceso, y encuentren en nosotros una respuesta profesional, clara y responsable.

### T-14 — Texto completo de Vanesa Sabalette Rabello (su página)
> Me gradué como abogada en 2012 en la Universidad Nacional del Litoral y, desde entonces, ejerzo una profesión que también es mi vocación.
>
> Me especialicé en Derecho Procesal Civil, me formé como mediadora y me diplomé en Derecho Laboral, áreas en las que desarrollo principalmente mi práctica profesional.
>
> Entiendo el ejercicio de la abogacía como la búsqueda de soluciones. Estoy convencida de que detrás de cada conflicto existe una estrategia posible: en algunos casos, el mejor resultado se alcanza mediante una negociación inteligente y oportuna; en otros, es necesario recurrir a una decisión judicial que reconozca y proteja los derechos de nuestros clientes.
>
> Cada caso representa para mí un nuevo desafío. Por eso, procuro abordarlo de manera empática y personalizada, anticipando escenarios y definiendo junto al cliente el camino más adecuado para alcanzar el mejor resultado posible.
>
> Mi compromiso no se limita a la defensa jurídica. Busco que quienes confían en nuestro Estudio se sientan acompañados durante todo el proceso, comprendan las decisiones que se toman y encuentren en nosotros una respuesta profesional, clara y responsable, que les brinde tranquilidad y seguridad.

### T-15 — Mensajes de WhatsApp
- Inicio, páginas de las abogadas y página de dirección inexistente:
  > Hola, me contacto desde el sitio web del estudio.
- Derecho Laboral, pestaña Empresas:
  > Hola, me contacto desde el sitio web por una consulta de Derecho Laboral para empresas.
- Derecho Laboral, pestaña Trabajadores:
  > Hola, me contacto desde el sitio web por una consulta de Derecho Laboral para trabajadores.
- Accidentes de trabajo y enfermedades profesionales:
  > Hola, me contacto desde el sitio web por una consulta sobre accidentes de trabajo y enfermedades profesionales.
- Derecho de Daños:
  > Hola, me contacto desde el sitio web por una consulta sobre Derecho de Daños.
- Sucesiones:
  > Hola, me contacto desde el sitio web por una consulta sobre sucesiones.
- Pantalla de ingreso y portal: sin mensaje.

### T-16 — Títulos y descripciones
El título del inicio es el nombre del estudio. El de las demás páginas y pantallas es su nombre, seguido de " · " y del nombre del estudio.
- Inicio
  - Título: Pertusatti | Sabalette - Abogadas
  - Descripción: el texto T-1.
- Derecho Laboral, pestaña Empresas
  - Título: Derecho Laboral para empresas · Pertusatti | Sabalette - Abogadas
  - Descripción: Asesoramos a empresas y empleadores en la gestión cotidiana de las relaciones laborales.
- Derecho Laboral, pestaña Trabajadores
  - Título: Derecho Laboral para trabajadores · Pertusatti | Sabalette - Abogadas
  - Descripción: Asesoramos y representamos a trabajadores frente a conflictos individuales derivados de la relación laboral.
- Accidentes
  - Título: Accidentes de trabajo y enfermedades profesionales · Pertusatti | Sabalette - Abogadas
  - Descripción: el texto T-4.
- Derecho de Daños
  - Título: Derecho de Daños · Pertusatti | Sabalette - Abogadas
  - Descripción: el texto T-5.
- Sucesiones
  - Título: Sucesiones · Pertusatti | Sabalette - Abogadas
  - Descripción: el texto T-6.
- Página de Carolina Marisa Pertusatti
  - Título: Dra. Carolina Marisa Pertusatti · Pertusatti | Sabalette - Abogadas
  - Descripción: el texto T-19.
- Página de Vanesa Sabalette Rabello
  - Título: Dra. Vanesa Sabalette Rabello · Pertusatti | Sabalette - Abogadas
  - Descripción: el texto T-13.
- Página de dirección inexistente
  - Título: Página no encontrada · Pertusatti | Sabalette - Abogadas
  - Sin descripción.
- Pantallas fuera del sitio público, sin descripción:
  - Ingreso: Ingresar · Pertusatti | Sabalette - Abogadas
  - Cambio de contraseña: Cambiar contraseña · Pertusatti | Sabalette - Abogadas
  - Portal: Portal de clientes · Pertusatti | Sabalette - Abogadas
  - Panel: Panel · Pertusatti | Sabalette - Abogadas

### T-17 — Textos de la interfaz
- Menú y encabezado: "Servicios", "Abogadas", "Contacto", "Menú", "Ingresar", "Ir a mi portal", "Ir al panel", "Saltar al contenido".
- Inicio: "Nuestros servicios", "Conocer más", "Equipo de abogadas", "Más información".
- Portal de clientes: "Portal de clientes", "Seguí tus casos desde donde estés", "Ir al portal de clientes", "Ejemplo", "Movimientos", "Ejemplo del portal de clientes: el ingreso con email y contraseña, y una causa con sus datos y sus últimos movimientos.".
- Páginas de detalle: "Volver a servicios", "Otros servicios", "Volver a abogadas", "Empresas", "Trabajadores".
- Contacto: "Contactate con nosotros", "Estamos disponibles para escucharte. La primera consulta es el primer paso para resolver tu problema legal.", "Ubicación", "Cómo llegar", "Teléfono / WhatsApp", "Disponibilidad", "Email".
- Botón de WhatsApp: "Escribinos por WhatsApp".
- Dirección inexistente: "No encontramos esa página", "Puede que la dirección esté mal escrita o que la página ya no exista.", "Ir al inicio".

### T-18 — Pie de página
- Derechos: "© <año> - Pertusatti | Sabalette - Abogadas. Todos los derechos reservados.", donde <año> es el año en que se publicó el sitio.
- Diseño: "Diseñado por", seguido del logo y el nombre "Bourder Web", que llevan a https://bourderweb.com.ar.

### T-19 — Resumen de Carolina Marisa Pertusatti (tarjeta)
Su primera y su última oración, aprobadas el 19/10/2026.
> Elegí estudiar Abogacía impulsada por un profundo sentido de justicia y una vocación genuina de ayudar a los demás. Estoy convencida de que la excelencia profesional y la calidad humana deben ir siempre de la mano.

### T-20 — Texto completo de Carolina Marisa Pertusatti (su página)
> Elegí estudiar Abogacía impulsada por un profundo sentido de justicia y una vocación genuina de ayudar a los demás. Encontré en el Derecho la posibilidad de transformar esas convicciones en una profesión.
>
> Me gradué el 21 de diciembre de 2011 en la Universidad Nacional del Litoral. Posteriormente, continué mi formación como mediadora y diplomada en Derecho Laboral, disciplina a la que dedico gran parte de mi actividad profesional.
>
> Me considero una persona empática, perseverante y de convicciones firmes. Ejerzo mi profesión con pasión, honestidad y compromiso, convencida de que cada caso merece una defensa responsable, dedicada y jurídicamente sólida.
>
> Entiendo que detrás de cada conflicto hay derechos que proteger y personas que depositan su confianza en nuestro trabajo.
>
> Estoy convencida de que la excelencia profesional y la calidad humana deben ir siempre de la mano.

### T-21 — Título profesional de las abogadas
El de Carolina Marisa Pertusatti es el de su texto; el de Vanesa Sabalette Rabello se armó con su texto (T-14: "me formé como mediadora y me diplomé en Derecho Laboral") y se aprobó el 19/10/2026. Va debajo del nombre, en la tarjeta y en la página.
> Abogada | Mediadora | Diplomada en Derecho Laboral

### T-22 — Causa de ejemplo del portal (maqueta del inicio)
Datos inventados, de ningún cliente, para la maqueta del portal (RF-47), aprobados el 24/10/2026. El ingreso va con su título, la etiqueta y el valor del email, la etiqueta de la contraseña y el botón, con las etiquetas de la pantalla de ingreso. Los datos van como pares de etiqueta y valor, y los movimientos, del más reciente al más antiguo, con su fecha, su tipo y su texto.
- Ingreso: "Ingresar", "Email", "ana.gomez@ejemplo.com", "Contraseña", "Ingresar"; la contraseña no se escribe: se muestra como 8 puntos.
- Carátula: "Gómez, Ana c/ Empresa Ejemplo S.A. s/ despido"
- Datos: "Expediente", "1234/2026", "Juzgado", "Juzgado Laboral N.º 1", "Fuero", "Laboral", "Estado", "En trámite"
- Movimiento: "20/10/2026", "Audiencia", "Se fijó la audiencia de conciliación para el 12 de noviembre a las 9 h. Te vamos a avisar antes para prepararla."
- Movimiento: "06/10/2026", "Escrito presentado", "Presentamos la demanda en el juzgado."
- Movimiento: "18/09/2026", "Notificación", "La empresa recibió el telegrama con el reclamo."
