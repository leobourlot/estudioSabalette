# Spec 008 — Identidad visual del portal, el panel y el ingreso

## Contexto y objetivo
El sitio público ya tiene la identidad del estudio: el logo, el degradado de sus dos azules, la tipografía de los títulos y las animaciones (spec 007, RF-3 y RF-45). El resto del sistema, que es lo que más usan los clientes y las integrantes, conserva un diseño provisorio en grises: el portal de clientes, el panel del estudio, la pantalla de ingreso y la de cambio de contraseña no muestran el logo, la navegación es una fila de enlaces arriba y, en las listas, no se nota dónde termina una causa o un movimiento y dónde empieza el siguiente. Esta spec lleva la identidad del estudio a esas pantallas: el logo, los colores, un menú al costado, tarjetas y filas bien separadas, una línea de tiempo para los movimientos que ve el cliente y animaciones suaves con Motion. Es solo un cambio de presentación: no agrega datos, no cambia qué ve cada usuario ni cómo se guarda nada. Todo lo que hoy se muestra se sigue mostrando, con las mismas reglas de las specs 001 a 006.

## Usuarios / actores
- **Cliente** (spec 004): consulta sus causas y sus movimientos, muchas veces desde el celular.
- **Administrador y abogado** (spec 001): usan el panel, sobre todo desde la computadora.
- **Cualquier persona** que llega a la pantalla de ingreso.

## Historias de usuario
- H1: Como cliente quiero reconocer al estudio apenas entro, por su logo y sus colores, para saber que estoy en el lugar correcto.
- H2: Como cliente quiero distinguir de un vistazo cada una de mis causas y cada movimiento, para no confundir uno con otro.
- H3: Como cliente quiero leer los movimientos de mi causa como una línea de tiempo, para seguir lo que fue pasando.
- H4: Como integrante del estudio quiero el menú siempre a la vista al costado, para pasar de una sección a otra sin buscarlo.
- H5: Como integrante del estudio quiero ver con claridad dónde termina cada fila del listado de causas y de los demás listados, para no abrir la causa equivocada.
- H6: Como persona que ingresa quiero una pantalla de ingreso clara y con la identidad del estudio, para confiar en que es la oficial.
- H7: Como usuario del celular quiero que el menú lateral se pliegue y no me quite lugar.
- H8: Como persona que pidió a su dispositivo reducir las animaciones quiero que nada se mueva.

## Requisitos funcionales (criterios de aceptación en EARS)

### Alcance
- RF-1: EL SISTEMA aplica esta spec a la pantalla de ingreso, a la de cambio de contraseña y a todas las pantallas del portal de clientes y del panel. El sitio público sigue como lo define la spec 007.
- RF-2: EL SISTEMA muestra en cada pantalla los mismos datos, textos, avisos, controles y reglas que definen las specs 001 a 006. Esta spec solo cambia cómo se presentan: no agrega ni quita datos, no cambia qué ve cada rol ni hace consultas nuevas al servidor. Las únicas excepciones son los textos nuevos del anexo (T-1 a T-4) y el cambio de nombre de "Modelos" a "Modelos de escritos" en el menú del panel (RF-6).

### Identidad del estudio
- RF-3: EL SISTEMA usa en estas pantallas la identidad del estudio de la spec 007 (RF-3):
  - El logo completo, que entregó el estudio.
  - El azul oscuro #2C3256 y el azul #415789, en degradado hacia la derecha o hacia abajo, como fondo del menú lateral y del panel de la marca del ingreso.
  - El blanco #FCFFFF para el texto sobre los azules.
  - La tipografía con serifa de los títulos (Cormorant Garamond) en el título principal de cada pantalla, en la carátula de cada causa de las listas y en el título del ingreso.
  - El azul oscuro en los botones principales y el azul en los enlaces y en el foco del teclado.
- RF-4: EL SISTEMA muestra el contenido de cada pantalla sobre un fondo claro y neutro, y lo agrupa en tarjetas blancas con borde y sombra suave: cada tarjeta se distingue del fondo y de la tarjeta de al lado por el borde, no solo por el color.

### Menú lateral
- RF-5: EL SISTEMA muestra en el portal y en el panel un menú al costado izquierdo, sobre el azul oscuro del estudio, con:
  - Arriba, el logo y el nombre del estudio en dos líneas (spec 007, RF-3), y debajo, en mayúsculas y más chico, el nombre de la sección: "Portal de clientes" o "Panel del estudio".
  - Las opciones de la sección, cada una con un ícono y su nombre (RF-6).
  - Abajo, el nombre y apellido del usuario y el botón "Cerrar sesión" (spec 001, RF-16).
- RF-6: EL SISTEMA muestra en el menú estas opciones, en este orden:
  - Portal: "Mis causas", "Mi cuenta" y "Cambiar contraseña" (spec 004, RF-2).
  - Panel: "Inicio", "Causas", "Jurisprudencia", "Modelos de escritos", "Cuentas" y "Mi cuenta".
- RF-7: EL SISTEMA marca en el menú la opción de la pantalla en la que está el usuario, también dentro de sus pantallas de detalle (por ejemplo, "Causas" en el detalle de una causa o de un movimiento), con un fondo más claro, una barra a la izquierda y el texto en negrita, y la anuncia como la página actual. La marca no depende solo del color.
- RF-8: CUANDO el usuario elige el logo o el nombre del estudio en el menú, EL SISTEMA lo lleva al inicio de su sección: "Mis causas" en el portal e "Inicio" en el panel.
- RF-9: MIENTRAS la pantalla mide menos de 1024 px de ancho, EL SISTEMA reemplaza el menú lateral por una barra arriba, sobre el azul oscuro, con el logo, el nombre del estudio y el botón "Menú". El botón abre el menú lateral por encima del contenido, desde la izquierda, con las mismas opciones, el nombre del usuario y "Cerrar sesión", e indica si está abierto. CUANDO el usuario elige una opción, toca fuera del menú, elige "Cerrar menú" o aprieta Escape, EL SISTEMA cierra el menú y, si lo cerró con el teclado o con "Cerrar menú", deja el foco en "Menú". Mientras está abierto, el contenido de atrás no se puede usar ni desplazar.
- RF-10: EL SISTEMA no guarda en el navegador si el menú estuvo abierto o cerrado (constitución, principio 5).

### Pantalla de ingreso
- RF-11: EL SISTEMA muestra la pantalla de ingreso dividida en dos mitades:
  - A la izquierda, el panel de la marca, sobre el degradado del estudio: arriba, el logo y el nombre del estudio, que llevan al inicio del sitio público (spec 007, RF-33); en el medio, el título T-1; abajo, la dirección del estudio, como texto, y el WhatsApp, escrito, con el ícono de WhatsApp en verde y con borde blanco antes del número (spec 007, RF-23), como enlace que abre una conversación sin mensaje (spec 007, RF-27), separados por " · ". La dirección solo aparece si el estudio la informó (spec 007, RF-24), y nunca una de ejemplo.
  - A la derecha, sobre el fondo claro, una tarjeta con el título "Ingresar", el texto T-2, los campos "Email" y "Contraseña", el botón "Ingresar" y, debajo, el texto T-3.
- RF-12: MIENTRAS la pantalla mide menos de 1024 px de ancho, EL SISTEMA muestra el panel de la marca arriba, más bajo, con el logo, el nombre y el título T-1, y la tarjeta debajo. La dirección y el WhatsApp pasan al final, debajo de la tarjeta. El formulario se ve sin desplazarse en un celular de 360 × 640 px con el teclado cerrado, y el botón de WhatsApp no tapa los campos ni "Ingresar", tampoco con el teclado abierto (spec 007, RF-28).
- RF-13: EL SISTEMA conserva en la pantalla de ingreso los mensajes, las validaciones y el comportamiento de la spec 001 (RF-8 a RF-10) y de la spec 007 (RF-26 y RF-33): el aviso de error va dentro de la tarjeta, arriba de los campos.
- RF-14: EL SISTEMA muestra la pantalla de cambio de contraseña con el mismo diseño de dos mitades: en el panel de la marca, el logo y el nombre del estudio, sin el título T-1 ni los datos de contacto; en la tarjeta, el formulario de la spec 001 (RF-36 a RF-39). Es una pantalla aparte, sin el menú lateral, porque puede ser obligatoria antes de entrar (spec 001, RF-11).

### Portal: causas
- RF-15: EL SISTEMA muestra cada causa de la lista del portal (spec 004, RF-9 y RF-10) en su propia tarjeta, separada de la siguiente por un espacio y con borde propio:
  - Arriba, la carátula en la tipografía de los títulos, en hasta dos líneas, y a la derecha, el estado en una etiqueta.
  - Debajo, "Expte." y el número de expediente, o "Sin asignar".
  - Si tiene fecha del último movimiento, un recuadro de fondo tenue con "Último movimiento" y la fecha.
  - El botón "Ver detalle", que lleva al detalle de la causa. Para el lector de pantalla, el botón suma la carátula ("Ver detalle de …"), para que los botones no se lean todos iguales.
- RF-16: EL SISTEMA muestra los títulos de los grupos "En curso" y "Archivadas y finalizadas" (spec 004, RF-10) con una línea debajo que los separa de sus tarjetas.
- RF-17: EL SISTEMA muestra el detalle de la causa del portal (spec 004, RF-13 a RF-17) en tarjetas separadas: una con la carátula y los datos de la causa, una con las partes y el responsable, y una con los movimientos (RF-18).

### Portal: movimientos
- RF-18: EL SISTEMA muestra los movimientos que ve el cliente (spec 004, RF-20 a RF-24) como una línea de tiempo vertical, en el mismo orden que hoy: una línea a la izquierda que une un punto por movimiento y, al lado de cada punto, la fecha en negrita, el tipo, las leyendas "Anulado" o "Fecha futura" y el texto, con "Ver más", "Ver menos" y "Abrir" como hoy. Cada movimiento queda separado del siguiente por un espacio y una línea fina, de modo que se ve dónde termina uno y empieza otro.
- RF-19: EL SISTEMA marca un movimiento anulado en la línea de tiempo con un punto hueco, además de la leyenda "Anulado" y el texto tachado (spec 004, RF-21).
- RF-20: EL SISTEMA muestra la pantalla de un movimiento del portal (spec 004) en una tarjeta, con la misma presentación de la fecha, el tipo y las leyendas que en la línea de tiempo.

### Panel: listados y movimientos
- RF-21: EL SISTEMA muestra el listado de causas del panel (spec 002, RF-36 a RF-39) así:
  - Arriba, el título "Causas" en la tipografía de los títulos y, a la derecha, el botón principal "+ Nueva causa".
  - El buscador, los filtros y las casillas, dentro de una tarjeta.
  - La tabla, dentro de una tarjeta, con la fila de títulos sobre un fondo tenue, cada fila separada de la siguiente por una línea visible y resaltada al pasar el puntero, la carátula como enlace en negrita y el estado en una etiqueta. Una causa desactivada conserva su etiqueta "Desactivada" y su fondo distinto.
  - El paginado, debajo de la tabla.
- RF-22: EL SISTEMA aplica la presentación de RF-21 (tabla en tarjeta, títulos con fondo tenue, filas separadas por una línea visible y resaltadas al pasar el puntero) al listado de cuentas. En los listados de jurisprudencia y de modelos de escritos, que no son tablas, muestra cada fallo y cada modelo en su propia tarjeta con borde, separada de la siguiente por un espacio y que responde al pasar el puntero.
- RF-23: EL SISTEMA muestra cada movimiento del historial del panel (spec 003, RF-24) en su propia tarjeta con borde, separada de la siguiente por un espacio, con una barra de color a la izquierda: azul si es visible para el cliente y gris si está oculto. La barra acompaña a la etiqueta "Visible" u "Oculto", que se sigue mostrando: la información no depende solo del color.
- RF-24: EL SISTEMA muestra los formularios, los detalles y las preguntas de confirmación del panel dentro de tarjetas, con los botones principales en el azul oscuro del estudio y los secundarios con borde.
- RF-25: EL SISTEMA muestra la pantalla "Inicio" del panel con su saludo actual (spec 001) y, debajo, un acceso por cada opción del menú, salvo "Inicio", en tarjetas con su ícono y su nombre. No muestra contadores ni resúmenes: quedan fuera de alcance.

### Animaciones
- RF-26: EL SISTEMA anima estas pantallas con la biblioteca Motion, la misma del sitio público (spec 007, RF-45), y con transiciones de CSS donde alcanzan, como en el sitio público:
  - El contenido de cada pantalla aparece con un movimiento suave al abrirla.
  - Las tarjetas de causas, los movimientos de la línea de tiempo y del historial y las filas de los listados aparecen escalonados al cargarse.
  - El menú lateral plegado entra y sale desde la izquierda, y el fondo que oscurece el contenido aparece y desaparece.
  - En el ingreso, la tarjeta aparece con un movimiento suave; el panel de la marca se ve desde el primer momento.
  - Las tarjetas, los botones, las filas y las opciones del menú responden al pasar el puntero o al recibir el foco.
- RF-27: EL SISTEMA cumple en todas las animaciones de RF-26 las mismas condiciones de la spec 007 (RF-45):
  - MIENTRAS el usuario pidió a su dispositivo reducir las animaciones, todo aparece directamente, sin movimiento.
  - Cada animación dura como mucho 0,6 segundos, no hace parpadear nada, no mueve el contenido que ya está en su lugar y no impide usar ningún control mientras ocurre.
  - Cambiar de página en una lista, filtrar o buscar no vuelve a animar lo que ya estaba a la vista: solo aparece con movimiento lo nuevo.
  - Los avisos de error y de "Cargando…" aparecen sin demora, y el lector de pantalla los anuncia igual que hoy.

## Requisitos no funcionales
- Plataformas:
  - En una pantalla de 360 px de ancho, el portal, el panel y el ingreso se ven y se usan sin desplazamiento horizontal de la página. Las tablas del panel que no entran se desplazan dentro de su tarjeta.
  - En la barra de arriba (RF-9), el logo, "Pertusatti | Sabalette" sin cortarse, "Abogadas" debajo y "Menú" entran en una línea en 360 px.
  - Los controles táctiles del menú, de la barra y de las tarjetas del portal miden al menos 44 px de lado.
  - Con el celular en horizontal, la barra de arriba no ocupa la mayor parte de la pantalla.
- Accesibilidad:
  - Cada pantalla empieza con el acceso "Saltar al contenido", que lleva al contenido principal, salteando el menú.
  - El menú lateral es una navegación con nombre ("Portal" o "Panel") y el contenido, la región principal. Cada pantalla mantiene un único título principal.
  - Todo se recorre y se usa con el teclado, con el foco siempre visible en el azul del estudio, también sobre el azul oscuro del menú, donde el foco va en blanco.
  - El menú plegado se recorre con Tab sin salir de él mientras está abierto y se cierra con Escape (RF-9).
  - El texto contrasta con su fondo al menos 4,5 a 1, y 3 a 1 en títulos grandes, íconos y bordes de controles: el blanco sobre los dos azules, el texto del menú y de sus opciones marcadas, las etiquetas de estado y los bordes de las tarjetas y de los campos.
  - Ninguna información depende solo del color: la opción marcada del menú (RF-7), la barra de los movimientos del panel (RF-23) y el punto de un movimiento anulado (RF-19) van siempre con su texto.
  - El texto se puede agrandar hasta el 200 % sin que se corte ni se superponga.
  - El logo junto al nombre escrito no se anuncia dos veces, como en el sitio público (plan 007, "Identidad visual"). Los íconos del menú no se anuncian: el nombre de la opción va al lado.
- Rendimiento: las animaciones no demoran la carga de los datos ni su lectura, y la parte del código que las hace se carga una sola vez para el portal y el panel.
- Seguridad y aislamiento: esta spec no cambia la API, las sesiones, las cabeceras ni las reglas de acceso. No guarda nada en el navegador (constitución, principio 5).
- Stack: usa la biblioteca Motion, que ya está en el proyecto para el sitio público (spec 007), a pedido del estudio; el plan justifica sumarla al portal y al panel. No agrega dependencias. Los íconos se dibujan dentro del proyecto, sin bibliotecas de íconos.
- Idioma: todos los textos en español.

## Casos límite
- **Menú:**
  - Pantalla de 360 px: el menú lateral no se ve hasta elegir "Menú"; al elegir una opción se cierra y se ve el destino (RF-9).
  - Pantalla de 1024 px o más: el menú está siempre a la vista y no hay botón "Menú" (RF-5, RF-9).
  - El usuario agranda la ventana con el menú plegado abierto: el menú pasa a ser el lateral fijo y el contenido se puede usar (RF-9).
  - Nombre de usuario muy largo: pasa a la línea siguiente dentro del menú, sin ensancharlo (RF-5).
  - Muchas opciones o texto agrandado al 200 %: el menú se desplaza por dentro y "Cerrar sesión" sigue al alcance (RF-5, accesibilidad).
  - Detalle de una causa, de un movimiento, de un fallo, de un modelo o de una cuenta: queda marcada la opción de su sección (RF-7).
  - Cliente en "Cambiar contraseña" desde el portal: es la pantalla aparte de RF-14, sin el menú.
  - Cierre de sesión con el menú plegado abierto (por vencimiento o desde otra pestaña): se aplica la spec 001 y el menú desaparece con la pantalla.
- **Ingreso:**
  - El estudio todavía no informó la dirección: abajo del panel de la marca solo va el WhatsApp, sin " · " (RF-11).
  - Error de credenciales o demasiados intentos: el aviso va dentro de la tarjeta, como hoy (RF-13).
  - Celular con el teclado abierto: los campos y "Ingresar" quedan a la vista y el botón de WhatsApp no los tapa (RF-12).
  - Cambio de contraseña pendiente al ingresar: la pantalla de cambio de contraseña tiene el mismo diseño, sin el menú (RF-14).
- **Portal:**
  - Carátula muy larga: se corta en dos líneas con "…" en la lista y se ve completa en el detalle (spec 004, RF-9 y RF-13).
  - Causa sin número de expediente: "Expte. Sin asignar" (RF-15).
  - Causa sin fecha del último movimiento: la tarjeta no muestra el recuadro "Último movimiento" ni un espacio vacío en su lugar (RF-15).
  - Un solo grupo con causas: solo se ve ese título (spec 004, RF-10).
  - Causa sin movimientos visibles: el mensaje "Todavía no hay movimientos para mostrar" dentro de la tarjeta de movimientos, sin línea de tiempo (RF-18).
  - Un solo movimiento: la línea de tiempo muestra un punto, sin línea que lo una a otro (RF-18).
  - Movimiento anulado: punto hueco, leyenda y texto tachado (RF-19).
  - Movimiento con texto largo desplegado con "Ver más": la línea de tiempo se alarga con él, sin superponerse con el siguiente (RF-18).
- **Panel:**
  - Tabla más ancha que la pantalla: se desplaza dentro de su tarjeta, sin que la página se desplace a lo ancho (RNF de plataformas).
  - Listado vacío: el mensaje de hoy ("No hay causas que coincidan.") dentro de la tarjeta de la tabla (RF-21).
  - Causa desactivada en el listado: conserva su etiqueta y su fondo, distinto del resaltado al pasar el puntero (RF-21).
  - Movimiento oculto y anulado en el historial: barra gris y las etiquetas "Oculto" y "Anulado" (RF-23).
- **Animaciones:**
  - Reducción de movimiento pedida: todo aparece en su lugar, sin desplazarse ni desvanecerse (RF-27).
  - Pasar de página en la lista de causas o filtrar: las causas nuevas aparecen escalonadas; lo que no cambió, como los filtros, no se vuelve a animar (RF-27).
  - El usuario hace clic mientras algo aparece: el clic funciona (RF-27).

## Fuera de alcance
- Etapas procesales de la causa, su línea de avance y la explicación de cada etapa.
- Estados nuevos de las causas (por ejemplo, "En prueba"): siguen los de la spec 002.
- Contadores, resúmenes o estadísticas en el panel (causas activas, movimientos de la semana, clientes con acceso, fallos cargados).
- El texto del último movimiento en las tarjetas del portal y la columna "Último movimiento" en el listado del panel.
- Una sección "Clientes" en el panel: los clientes siguen en "Cuentas" (spec 001).
- Modo oscuro y temas elegidos por el usuario.
- Recordar el menú abierto o cerrado entre visitas (RF-10).
- Cambios en el sitio público (spec 007).
- Cambios en la API, en la base o en las reglas de acceso.

## Criterios de finalización
- Todos los RF con al menos un test en verde, salvo lo que solo se puede ver (colores, contraste, anchos y cómo se ven las animaciones), que se verifica en la demo manual.
- Tests que verifiquen:
  - Que el portal y el panel muestran el menú con el logo, el nombre en dos líneas, el nombre de la sección, sus opciones en orden, el usuario y "Cerrar sesión", y que el logo lleva al inicio de la sección (RF-5, RF-6, RF-8).
  - Que la opción de la pantalla actual, también en sus detalles, se anuncia como página actual (RF-7).
  - El menú plegado: "Menú" lo abre e indica si está abierto; se cierra al elegir una opción, con "Cerrar menú" y con Escape, y el foco vuelve a "Menú" (RF-9).
  - Que no se guarda nada en el navegador (RF-10).
  - La pantalla de ingreso: logo al sitio público, T-1, T-2, T-3, el WhatsApp sin mensaje, la dirección solo cuando está informada, y los mismos mensajes y el mismo destino que hoy (RF-11, RF-13). La de cambio de contraseña: el logo y el formulario, sin menú (RF-14).
  - Las tarjetas del portal: carátula, estado, expediente o "Sin asignar", el recuadro del último movimiento solo con fecha y "Ver detalle" con la carátula para el lector de pantalla (RF-15).
  - La línea de tiempo: un elemento por movimiento, en el orden recibido, con su fecha, su tipo, sus leyendas y el punto hueco del anulado (RF-18, RF-19).
  - El historial del panel: la barra de visible u oculto junto a su etiqueta (RF-23).
  - El inicio del panel: el saludo y un acceso por opción del menú (RF-25).
  - Que con la reducción de movimiento las animaciones duran 0 (RF-27).
  - Que siguen en verde los tests existentes de las specs 001 a 006, ajustados solo en lo que cambia de presentación (RF-2).
- `pnpm test` y `pnpm lint` sin errores.
- Demo manual:
  1. En una computadora, ingresar como cliente: verificar la pantalla de ingreso con sus dos mitades, sus textos, la dirección y el WhatsApp.
  2. En el portal, verificar el menú lateral con el logo y la opción marcada, las tarjetas de las causas bien separadas y, en el detalle, la línea de tiempo de los movimientos.
  3. Ingresar como abogado: verificar el menú del panel, el inicio con sus accesos, el listado de causas con sus filas separadas, el historial de movimientos con sus barras, y los listados de jurisprudencia, modelos y cuentas.
  4. Repetir los pasos 1 a 3 en un celular de 360 px: la barra de arriba en una línea, el menú plegado que entra desde la izquierda y se cierra al elegir, las tablas que se desplazan dentro de su tarjeta y el formulario de ingreso sin desplazarse.
  5. Recorrer el ingreso, el portal y el panel solo con el teclado, con "Saltar al contenido", el menú plegado y Escape, y verificar que el foco siempre se ve, también sobre el azul.
  6. Verificar las animaciones y repetir con la reducción de movimiento activada: todo aparece sin movimiento.

## Dudas abiertas
Ninguna. Resuelta el 17/10/2026: la dirección que muestra el ingreso (RF-11) es la que informó el estudio, "Pueyrredón Nº 47, Concordia", y la spec 007 ya la incluye (RF-22).

## Anexo — Textos aprobados
Los textos T-1 a T-3 se tomaron del modelo que eligió el estudio y se aprobaron el 17/10/2026, sin el texto "Clientes e integrantes del estudio ingresan desde acá con la cuenta que les dio el estudio.", que el estudio pidió quitar.

### T-1 — Título del panel de la marca, en el ingreso
> Seguí tus causas desde donde estés.

### T-2 — Texto debajo de "Ingresar"
> Usá el email y la contraseña que te dio el estudio.

### T-3 — Texto debajo del botón "Ingresar"
> ¿Olvidaste tu contraseña? Comunicate con el estudio y te la restablecemos.

### T-4 — Textos de la interfaz
- Menú: "Portal de clientes", "Panel del estudio", "Mis causas", "Mi cuenta", "Cambiar contraseña", "Inicio", "Causas", "Jurisprudencia", "Modelos de escritos", "Cuentas", "Cerrar sesión", "Menú", "Cerrar menú", "Saltar al contenido".
- Portal: "Expte.", "Sin asignar", "Último movimiento", "Ver detalle".
- Panel: "+ Nueva causa".
