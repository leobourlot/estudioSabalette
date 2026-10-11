# Spec 006 — Modelos de escritos

## Contexto y objetivo
Buena parte de los escritos que presenta el estudio (demandas, contestaciones, oficios, cédulas, escritos de trámite) repiten una estructura fija y solo cambian los datos del expediente: la carátula, el número, el juzgado, las partes, la fecha. Hoy cada integrante guarda sus propios modelos en su computadora y completa esos datos a mano, copiándolos del expediente, con el riesgo de dejar el nombre o el número de otra causa. Esta spec define una biblioteca de modelos común a todo el estudio: un modelo se carga una vez, como texto plano con variables, y se usa todas las veces que haga falta. Desde una causa, el integrante elige un modelo y el sistema reemplaza cada variable por el dato de esa causa (spec 002), de las cuentas de los clientes que son parte (spec 001) y de la fecha del día. El resultado, el escrito completado, solo se muestra en pantalla para copiarlo: el integrante lo pega en su procesador de textos, le da formato y lo presenta. Como un escrito completado lleva datos de una causa, amparados por el secreto profesional, no se guarda en ningún lado y los modelos son solo del panel: ningún cliente los ve. Los modelos se pegan desde un procesador de textos, así que el sistema convierte los caracteres tipográficos que traen, como en la jurisprudencia (spec 005, RF-3), sin aceptar nunca signos que permitan inyectar código. Por eso las variables se marcan con el signo `#`, que ya está permitido en todos los textos, y no con llaves ni corchetes. Esta spec depende de las specs 001 y 002. No usa datos de los movimientos (spec 003) ni de la jurisprudencia (spec 005): citar fallos en un escrito sigue fuera de alcance.

## Usuarios / actores
- **Integrante del estudio** (administrador o abogado, según la spec 001): carga, consulta, busca, modifica, desactiva y reactiva cualquier modelo, y completa cualquier modelo activo desde cualquier causa activa. Todos los integrantes trabajan sobre todos los modelos, igual que sobre todas las causas (spec 002, RF-35) y toda la jurisprudencia (spec 005).
- **Cliente** y **visitante** (spec 001): no acceden a los modelos ni a los escritos completados.

## Historias de usuario
- H1: Como integrante del estudio quiero cargar un modelo una sola vez, con su título, tipo de escrito, fuero, descripción y texto, para que todo el estudio lo use en cualquier causa.
- H2: Como integrante del estudio quiero pegar el texto del modelo tal como lo tengo en mi procesador de textos, sin corregir a mano comillas, guiones ni otros caracteres tipográficos.
- H3: Como integrante del estudio quiero marcar en el texto dónde van los datos de la causa, y ver mientras escribo qué variables existen y qué pone cada una, para no tener que recordarlas.
- H4: Como integrante del estudio quiero que el sistema me avise si escribí mal una variable, para que no quede sin reemplazar en un escrito.
- H5: Como integrante del estudio quiero buscar y filtrar los modelos, en su sección y al elegirlos desde una causa, para encontrar rápido el que necesito.
- H6: Como integrante del estudio quiero abrir una causa, elegir un modelo y obtener el escrito con los datos de esa causa ya puestos, para no copiarlos a mano ni equivocarme de expediente.
- H7: Como integrante del estudio quiero que, si a la causa le falta un dato, el escrito me lo marque bien visible, para no presentar un escrito con un hueco.
- H8: Como integrante del estudio quiero que, si hay varias partes con el mismo rol, el escrito las nombre a todas, para no omitir a nadie.
- H9: Como integrante del estudio quiero copiar el escrito completado con un clic, para pegarlo en mi procesador de textos y terminarlo ahí.
- H10: Como integrante del estudio quiero corregir un modelo, y quitar de la biblioteca uno que ya no se usa sin borrarlo.
- H11: Como integrante del estudio quiero saber quién cargó y quién modificó por última vez un modelo, para saber a quién consultar.
- H12: Como integrante del estudio quiero que mi sesión no venza mientras redacto un modelo largo, para no perder lo escrito.
- H13: Como integrante del estudio quiero que ningún escrito completado quede guardado y que ningún cliente vea los modelos ni los escritos, para cumplir con el secreto profesional.

## Requisitos funcionales (criterios de aceptación en EARS)

### Datos del modelo
- RF-1: EL SISTEMA registra de cada modelo:
  - Título: obligatorio, hasta 150 caracteres.
  - Tipo de escrito: obligatorio, de la lista cerrada Demanda, Contestación de demanda, Escrito de trámite, Recurso, Oficio, Cédula y Otro.
  - Fuero: de la lista cerrada de la spec 002 (RF-1): Civil, Penal, Familia, Laboral, Federal y Otro. Si no se indica, el modelo queda con el fuero Otro. El fuero Otro agrupa a los modelos que no son de un fuero específico y sirven para cualquier causa.
  - Descripción: opcional, hasta 500 caracteres. Explica para qué sirve el modelo.
  - Texto: obligatorio, hasta 50.000 caracteres. Es el escrito, con sus variables (RF-7).
  - Si está activo o desactivado.
- RF-2: EL SISTEMA registra en cada modelo quién lo cargó y cuándo, y quién lo modificó por última vez y cuándo. Cuentan como modificación cualquier cambio de sus datos, la desactivación y la reactivación. Completar un modelo desde una causa no cuenta como modificación del modelo.
- RF-3: Antes de validar, comparar o guardar el título, la descripción y el texto de un modelo, y antes de usar el texto del buscador, EL SISTEMA aplica, sin aviso, las conversiones de la spec 005 (RF-3) para los textos copiados de otras fuentes: comillas, guiones, viñetas, puntos suspensivos, `№` y `§` tipográficos a sus equivalentes permitidos; corchetes a paréntesis; espacios especiales y tabulaciones a un espacio; caracteres invisibles eliminados; y separadores de línea y de párrafo Unicode a un salto de línea. Después:
  - En el título, la descripción y el texto del buscador, que son de una sola línea, cada salto de línea pasa a ser un espacio, se quitan los espacios al inicio y al final, y los espacios repetidos se reducen a uno.
  - En el texto se quitan los espacios al inicio y al final de cada línea, se reducen a uno los espacios repetidos dentro de cada línea, y se quitan los saltos de línea al inicio y al final. Los saltos de línea intermedios se conservan tal como se cargaron, incluidas las líneas en blanco.

  El largo se cuenta después de todo esto, y cada salto de línea cuenta como un carácter. Una descripción que queda vacía se guarda como no informada. Son las únicas conversiones: cualquier otro carácter no permitido se rechaza, y el texto guardado nunca contiene signos que permitan inyectar código (`< > { } [ ] \ | =` y el acento grave, entre otros).
- RF-4: EL SISTEMA solo acepta, después de RF-3:
  - En el título, los caracteres permitidos por la spec 002 (RF-4): letras (incluidas las que llevan tilde, la ñ y la ü), números, espacios y los símbolos `. , ; : / - _ ( ) " ' $ & # ° º ª`.
  - En la descripción, los mismos, más `¿ ? ¡ ! %`.
  - En el texto, los permitidos en la descripción de un movimiento (spec 003, RF-4): los de la descripción, más saltos de línea. Además acepta `@`, para poder escribir un email como texto fijo del escrito (por ejemplo, un domicilio electrónico). El `@` solo se acepta en el texto de un modelo y en su buscador (RF-21): en el título y en la descripción se rechaza.

  No acepta emojis en ninguno.
- RF-5: EL SISTEMA trata el texto de un modelo como texto plano. No guarda negrita, cursiva, subrayado, sangría, alineación, tamaños de letra, títulos, tablas ni imágenes: al pegar desde un procesador de textos solo queda el texto, con sus saltos de línea. El formato se da después, fuera del sistema.
- RF-6: SI algún dato del modelo no cumple su formato, ENTONCES EL SISTEMA lo rechaza con un mensaje que indique el campo y la regla, sin repetir el texto recibido. En particular:
  - Título vacío: "Indicá el título del modelo".
  - Sin tipo de escrito: "Indicá el tipo de escrito".
  - Texto vacío: "Indicá el texto del modelo".
  - Texto de más de 50.000 caracteres: "El texto no puede tener más de 50.000 caracteres".

### Variables
- RF-7: EL SISTEMA llama **marca de variable** a un signo `#`, seguido de un nombre, seguido de otro signo `#` (por ejemplo, `#CARATULA#`). El nombre se forma solo con letras, con o sin tilde e incluida la ñ, y guiones bajos, sin espacios. No tiene un largo mínimo, pero tiene que tener al menos una letra. Un `#` que no forma una marca (por ejemplo, "local # 3", "#123#" o "#____#") es texto común. Las marcas van separadas entre sí por al menos un espacio u otro carácter (`#ACTORES# #DEMANDADOS#`). SI dos marcas están pegadas (`#ACTORES##DEMANDADOS#`) o comparten un numeral (`#ACTORES#DEMANDADOS#`), ENTONCES EL SISTEMA rechaza la carga o la modificación con el mensaje "Las variables tienen que estar separadas". Solo el texto de un modelo tiene marcas de variable: en el título y en la descripción, `#CARATULA#` es texto común.
- RF-8: EL SISTEMA reconoce el nombre de una marca con la comparación flexible de la spec 005 (RF-9), y guarda la marca con la forma del catálogo, en mayúsculas y sin tildes: `#carátula#` y `#Caratula#` se guardan como `#CARATULA#`.
- RF-9: EL SISTEMA ofrece un catálogo fijo de variables. No se administra desde el panel. Las variables son:

  | Variable | Qué pone | Si falta |
  |---|---|---|
  | `#CARATULA#` | La carátula de la causa. | Nunca falta. |
  | `#NUMERO_EXPEDIENTE#` | El número de expediente. | `(FALTA NÚMERO DE EXPEDIENTE)` |
  | `#JUZGADO#` | El juzgado. | `(FALTA JUZGADO)` |
  | `#FUERO#` | El nombre del fuero, como se muestra en el panel. | Nunca falta. |
  | `#EXPEDIENTE_PRINCIPAL#` | El número del expediente principal de un incidente. | `(FALTA EXPEDIENTE PRINCIPAL)`, también si la causa no es un incidente. |
  | `#ACTORES#`, `#DEMANDADOS#`, `#TERCEROS#` | Los nombres de las partes vigentes con ese rol procesal (RF-34, RF-36). | `(FALTAN ACTORES)`, `(FALTAN DEMANDADOS)`, `(FALTAN TERCEROS)` |
  | `#ACTORES_CON_DOCUMENTO#`, `#DEMANDADOS_CON_DOCUMENTO#`, `#TERCEROS_CON_DOCUMENTO#` | Las mismas partes, cada una con su DNI o CUIT (RF-35, RF-36). | Sin partes de ese rol, como arriba. Una parte sin documento lleva `(FALTA DNI)` o `(FALTA CUIT)` en su lugar. |
  | `#CLIENTES#` | Los nombres de las partes vigentes que son clientes del estudio, cualquiera sea su rol procesal. | `(FALTAN CLIENTES)` |
  | `#CLIENTES_CON_DOCUMENTO#` | Los mismos clientes, cada uno con su DNI o CUIT. | `(FALTAN CLIENTES)` |
  | `#CLIENTES_DOMICILIO#` | El domicilio de la cuenta de cada uno de esos clientes (RF-37). | `(FALTAN CLIENTES)`. Un cliente sin domicilio lleva `(FALTA DOMICILIO)` en su lugar. |
  | `#ABOGADO_RESPONSABLE#` | Nombre y apellido del responsable de la causa (spec 002, RF-29), sea abogado o administrador. | Nunca falta. |
  | `#FECHA#` | El día actual en Buenos Aires, como dd/mm/aaaa (por ejemplo, "10/10/2026"). | Nunca falta. |
  | `#FECHA_EN_LETRAS#` | El día actual en Buenos Aires, con el día en números sin cero inicial, el mes en letras minúsculas y el año en números (por ejemplo, "1 de marzo de 2026"). | Nunca falta. |

- RF-10: SI el texto de un modelo tiene una marca de variable cuyo nombre no está en el catálogo, ENTONCES EL SISTEMA rechaza la carga o la modificación con el mensaje "El texto tiene variables que no existen". El mensaje no las nombra, para no repetir el texto recibido (RF-6): es el formulario, que tiene el texto a la vista, el que señala cuáles son.
- RF-11: MIENTRAS un integrante carga o modifica un modelo, EL SISTEMA le muestra el catálogo de variables, con lo que pone cada una, y le permite insertar una en el texto sin tener que escribirla.
- RF-12: EL SISTEMA acepta un modelo sin ninguna variable y un modelo que usa la misma variable varias veces.

### Carga, modificación y consulta
- RF-13: CUANDO un integrante carga un modelo con su título, su tipo de escrito y su texto, EL SISTEMA lo guarda activo y registra quién lo cargó y cuándo.
- RF-14: CUANDO un integrante modifica un modelo activo, EL SISTEMA guarda los cambios y registra quién lo modificó y cuándo (RF-2). Se pueden modificar todos los datos de RF-1, con las mismas validaciones que en la carga, salvo si está activo o desactivado: eso solo cambia con las acciones de RF-25 y RF-27. La modificación rige para los escritos que se completen después. Guardar un modelo sin cambiar ningún dato no cuenta como modificación: no cambia quién lo modificó por última vez ni cuándo.
- RF-15: SI al cargar un modelo, al modificar su título o al reactivarlo, su título coincide con el de otro modelo activo, ENTONCES EL SISTEMA avisa "Ya existe un modelo con ese título", muestra todos los modelos activos con los que coincide y permite guardar si el integrante lo confirma. Los títulos se comparan con la comparación flexible (spec 005, RF-9). El modelo que se modifica o se reactiva nunca se compara consigo mismo.
- RF-16: CUANDO un integrante consulta un modelo, EL SISTEMA muestra:
  - Todos sus datos.
  - El texto completo, con sus saltos de línea y sus marcas de variable sin reemplazar.
  - La lista de las variables que usa, o la leyenda "Este modelo no usa variables".
  - Quién lo cargó, quién lo modificó por última vez y cuándo.
  - Si está desactivado, identificado como tal.
- RF-17: MIENTRAS un integrante escribe en el formulario de carga o modificación de un modelo, EL SISTEMA cuenta esa escritura como uso de su sesión, como en la spec 005 (RF-20), para que no venza mientras redacta. Si deja el formulario abierto sin escribir, la sesión vence como siempre (spec 001, RF-12) y lo que no guardó se pierde.

### Listado y búsqueda
- RF-18: CUANDO un integrante consulta la sección de modelos, EL SISTEMA muestra los modelos activos de a 20 por página, ordenados alfabéticamente por título con la comparación flexible (spec 005, RF-9) y, a igual título, primero el último registrado en el sistema. Mientras los datos no cambian, el orden es siempre el mismo, de modo que al pasar de página ningún modelo se repite ni se omite.
- RF-19: EL SISTEMA muestra de cada modelo del listado su título, su tipo de escrito, su fuero y su descripción, si la tiene. No muestra el texto.
- RF-20: CUANDO un integrante escribe en el buscador, EL SISTEMA muestra los modelos en los que el texto buscado aparece, aunque sea como fragmento ("ere" encuentra "Pérez"), en su título, su descripción o su texto, con la comparación flexible (spec 005, RF-9).
- RF-21: EL SISTEMA aplica al texto del buscador las conversiones de RF-3 y después las reglas del buscador de la spec 005 (RF-24):
  - Solo acepta los caracteres permitidos en el texto de un modelo (RF-4), salvo los saltos de línea. SI tiene otro carácter, ENTONCES EL SISTEMA rechaza la búsqueda con el mensaje "La búsqueda tiene caracteres no permitidos".
  - Acepta hasta 100 caracteres. SI tiene más, ENTONCES EL SISTEMA la rechaza con el mensaje "La búsqueda puede tener hasta 100 caracteres".
  - Un texto vacío o con solo espacios se trata como si no se hubiera escrito nada.
  - `%` y `_` se buscan como texto literal.
- RF-22: EL SISTEMA permite filtrar el listado por:
  - Tipo de escrito.
  - Fuero: uno de los fueros de la lista. Con Civil, Penal, Familia, Laboral o Federal, muestra los modelos de ese fuero y también los de fuero Otro, que no son de un fuero específico y se ven siempre. Con Otro, muestra solo los de fuero Otro.
  - "Mostrar desactivados": incluye los modelos desactivados, identificados como tales.

  El listado se abre sin ningún filtro elegido: se ven todos los modelos activos, de cualquier fuero. Los filtros se combinan entre sí y con el buscador, y no cambian el orden de RF-18.
- RF-23: SI no hay ningún modelo que pueda aparecer en el listado sin buscador ni filtros (ningún modelo activo o, con "Mostrar desactivados", ningún modelo), ENTONCES EL SISTEMA muestra el mensaje "Todavía no hay modelos cargados", aunque se haya escrito una búsqueda o elegido filtros. SI hay alguno, pero ninguno coincide con la búsqueda y los filtros, ENTONCES muestra "No hay modelos que coincidan con la búsqueda".
- RF-24: SI se pide una página del listado que no existe, ENTONCES EL SISTEMA no muestra ningún modelo ni los mensajes de RF-23, y ofrece volver a la primera página.

### Desactivación y reactivación
- RF-25: CUANDO un integrante desactiva un modelo, EL SISTEMA lo marca como desactivado, registra quién lo hizo y cuándo (RF-2), lo quita del listado normal y deja de ofrecerlo en las causas (RF-29). La desactivación reemplaza al borrado: se usa para quitar de la biblioteca un modelo cargado por error, repetido o que ya no se usa. Nunca se borran modelos.
- RF-26: MIENTRAS un modelo está desactivado, EL SISTEMA solo permite consultarlo y reactivarlo. SI se intenta modificarlo, ENTONCES EL SISTEMA lo rechaza con el mensaje "El modelo está desactivado. Reactivalo para modificarlo". SI se intenta completarlo desde una causa, ENTONCES lo rechaza con el mensaje "El modelo está desactivado".
- RF-27: CUANDO un integrante reactiva un modelo, EL SISTEMA lo marca como activo y registra quién lo hizo y cuándo (RF-2), con el aviso de RF-15 si su título coincide con el de otro modelo activo.
- RF-28: SI se intenta desactivar un modelo ya desactivado o reactivar uno activo, ENTONCES EL SISTEMA lo rechaza con el mensaje "El modelo ya está desactivado" o "El modelo ya está activo", según corresponda.

### Elegir un modelo desde una causa
- RF-29: CUANDO un integrante consulta una causa activa (spec 002, RF-12), EL SISTEMA le ofrece la opción "Completar un modelo", que muestra todos los modelos activos, sea cual sea el fuero de la causa y el del modelo, con el mismo orden, los mismos datos, el mismo buscador y los mismos mensajes que la sección de modelos (RF-18 a RF-21, RF-23 y RF-24), y con los filtros por tipo de escrito y por fuero (RF-22). Ningún filtro viene elegido de antemano. Los modelos desactivados nunca se ofrecen.
- RF-30: EL SISTEMA solo permite completar un modelo desde una causa. No hay una pantalla para elegir la causa a partir de un modelo.

### Completar un modelo
- RF-31: EL SISTEMA llama **escrito completado** al texto de un modelo en el que cada marca de variable fue reemplazada por el dato que le corresponde en una causa, según RF-9 y RF-33 a RF-39. El resto del texto queda igual, con sus saltos de línea.
- RF-32: CUANDO un integrante elige un modelo activo desde una causa activa, EL SISTEMA muestra el escrito completado, junto con la carátula de la causa, el título del modelo, los avisos de RF-39 y RF-40 y dos accesos: uno para volver a la lista de modelos de esa causa, en la misma página y con la misma búsqueda y los mismos filtros que tenía, y otro para volver a la causa.
- RF-33: EL SISTEMA arma el escrito completado con los datos que la causa, sus partes, las cuentas de sus clientes y el modelo tienen en el momento de completarlo, y con el día actual en Buenos Aires. Cada vez que se completa un modelo se arma de nuevo. Reemplaza las marcas en una sola pasada: un dato insertado nunca se vuelve a examinar, así que una carátula que contenga `#FECHA#` queda escrita tal cual. El escrito completado tiene una dirección propia, que identifica la causa y el modelo: abrirla o recargarla es completar el modelo de nuevo, con los datos y la fecha de ese momento y con los mismos controles (RF-26, RF-41 y RF-50). EL SISTEMA arma el escrito en el servidor y envía al navegador solo el escrito ya completado, sus avisos, la carátula de la causa y el título del modelo: no envía por separado otros datos de la causa, de sus partes ni de las cuentas de los clientes.
- RF-34: EL SISTEMA escribe el nombre de una persona física como nombre y apellido, en ese orden ("Luis Gómez"), y el de una persona jurídica con su razón social. En una parte que es cliente usa los datos actuales de su cuenta (spec 002, RF-14), y si es persona jurídica nunca incluye a su persona de contacto.
- RF-35: EL SISTEMA escribe el documento de una persona física como "DNI" seguido del número con puntos de miles ("DNI 20.111.222"), y el de una persona jurídica como "CUIT" seguido del número con guiones ("CUIT 30-71234567-8"). El número se escribe con todos los dígitos con los que está guardado, incluido un cero inicial ("DNI 05.123.456"). En las variables con documento, cada persona se escribe con su nombre, una coma y su documento ("Luis Gómez, DNI 20.111.222").
- RF-36: CUANDO una variable de partes o de clientes corresponde a varias personas, EL SISTEMA las pone a todas:
  - Ordenadas alfabéticamente por apellido y después por nombre, sin distinguir mayúsculas, minúsculas ni tildes, con las razones sociales ordenadas junto con los apellidos, como en la spec 004 (RF-14). A igual nombre, primero la parte que se cargó antes en la causa.
  - Si son dos, unidas solo por "y", en todas las variables: "Luis Gómez y María López", o "Luis Gómez, DNI 20.111.222 y María López, DNI 27.333.444".
  - Si son tres o más, en las variables de nombres van separadas por comas y con "y" antes de la última: "Acme S.A., Luis Gómez y María López".
  - Si son tres o más, en las variables con documento y en la de domicilio van separadas por punto y coma y con "y" antes de la última: "Acme S.A., CUIT 30-71234567-8; Luis Gómez, DNI 20.111.222; y María López, DNI 27.333.444".

  Solo cuentan las partes vigentes. Las partes desvinculadas nunca aparecen en un escrito completado.
- RF-37: EL SISTEMA reemplaza `#CLIENTES_DOMICILIO#` así: si la causa tiene un solo cliente, por su domicilio; si tiene varios, por el nombre de cada uno, dos puntos y su domicilio, con el orden y los separadores de RF-36 ("Luis Gómez: San Martín 100 y María López: Urquiza 250").
- RF-38: EL SISTEMA no usa en ninguna variable los datos de los movimientos de la causa (spec 003), los colaboradores, el integrante que completa el modelo, el estado de la causa, ni el email, el teléfono o la persona de contacto de los clientes.
- RF-39: SI a la causa le falta un dato que el modelo usa, ENTONCES EL SISTEMA igual completa el modelo, pone en el lugar del dato la marca de RF-9 que corresponde, en mayúsculas y entre paréntesis, y muestra arriba del escrito el aviso "A esta causa le faltan datos que el modelo usa", con la lista de lo que falta, cada dato una sola vez. Si el dato es de una persona, la lista indica de quién ("DNI de Luis Gómez", "domicilio de María López"). El aviso es informativo: no exige confirmación ni impide copiar.
- RF-40: EL SISTEMA muestra además, arriba del escrito, estos avisos informativos, que no exigen confirmación ni impiden copiar:
  - Si el modelo usa una variable de clientes y alguno de ellos tiene la cuenta desactivada (spec 002, RF-28): "Hay clientes con la cuenta desactivada", con sus nombres. El cliente figura en el escrito igual, porque sigue siendo parte.
  - Si el modelo usa `#ABOGADO_RESPONSABLE#` y el responsable tiene la cuenta desactivada (spec 002, RF-32): "El responsable de esta causa está desactivado". Su nombre figura en el escrito igual.
- RF-41: MIENTRAS una causa está desactivada, EL SISTEMA no ofrece la opción "Completar un modelo" (spec 002, RF-41). SI se intenta completar un modelo en una causa desactivada, ENTONCES EL SISTEMA lo rechaza con el mensaje "La causa está desactivada".
- RF-42: MIENTRAS una causa activa tiene el estado Archivada o Finalizada, EL SISTEMA permite completar modelos en ella como en cualquier otra causa activa.
- RF-43: EL SISTEMA no considera completar un modelo como modificación de la causa: no cambia quién la modificó por última vez ni su orden en el listado de causas (spec 002, RF-2 y RF-36).

### Copiar y no guardar
- RF-44: CUANDO un integrante elige "Copiar" en un escrito completado, EL SISTEMA copia al portapapeles el texto completo del escrito, como texto plano y con sus saltos de línea, sin el título del modelo, la carátula ni los avisos, y confirma con el mensaje "Escrito copiado". Junto a la opción "Copiar", EL SISTEMA muestra siempre la leyenda "El escrito copiado queda en este equipo hasta que copies otra cosa o cierres sesión". CUANDO un integrante elige "Cerrar sesión" (spec 001, RF-16), EL SISTEMA vacía el portapapeles, si el navegador lo permite, para que un escrito copiado no quede en el equipo.
- RF-45: SI el navegador no permite copiar, ENTONCES EL SISTEMA muestra el mensaje "No se pudo copiar. Seleccioná el texto y copialo a mano". El texto del escrito completado siempre se puede seleccionar.
- RF-46: EL SISTEMA nunca guarda un escrito completado: ni en la base, ni en el almacenamiento del navegador, ni en su caché. Tampoco lleva un registro propio de qué modelo se completó, en qué causa ni quién lo hizo: no hay un historial de escritos. Los registros técnicos de acceso del servidor quedan fuera de este requisito, y nunca incluyen el texto de un escrito (requisitos no funcionales). La única salida que el sistema le da a un escrito completado es la pantalla y el portapapeles, por una acción expresa del integrante.
- RF-47: EL SISTEMA no ofrece ninguna opción para descargar, imprimir, exportar ni enviar un escrito completado, ni para modificarlo en pantalla. Las funciones propias del navegador, como imprimir o guardar la página, quedan fuera del control del sistema.
- RF-48: MIENTRAS un integrante usa la pantalla de un escrito completado (la recorre, selecciona texto o copia), EL SISTEMA cuenta ese uso como uso de su sesión, igual que la escritura en RF-17, para que no venza mientras lo lee. Si deja la pantalla abierta sin usarla, la sesión vence como siempre (spec 001, RF-12). CUANDO la sesión vence por falta de uso, EL SISTEMA deja de mostrar el escrito en ese momento, sin esperar otra acción. CUANDO la sesión se cierra por otro motivo (cierre, ingreso desde otro dispositivo, desactivación o restablecimiento de contraseña, según la spec 001), deja de mostrarlo en su siguiente consulta al servidor. Ni volviendo atrás con el navegador ni reabriendo su dirección se lo puede ver sin una sesión válida.

### Integridad, permisos y aislamiento
- RF-49: SI el modelo indicado en una operación no existe o tiene un identificador mal formado, ENTONCES EL SISTEMA la rechaza con el mensaje "No existe ese modelo". SI la causa indicada no existe o tiene un identificador mal formado, ENTONCES la rechaza con el mensaje "No existe esa causa" (spec 003, RF-34).
- RF-50: EL SISTEMA solo permite a administradores y abogados cargar, consultar, buscar, modificar, desactivar, reactivar y completar modelos, solo desde el panel. Cualquier intento de un cliente o de un visitante se rechaza según la spec 001 (RF-18 a RF-20), y este control se hace siempre en el servidor. Un integrante con cambio de contraseña pendiente tampoco accede (spec 001, RF-11).
- RF-51: CUANDO se desactiva la cuenta de un integrante (spec 001), EL SISTEMA conserva su autoría en los modelos que cargó o modificó y lo muestra como desactivado.
- RF-52: EL SISTEMA nunca expone un modelo ni un escrito completado (títulos, descripciones, textos ni variables) a nadie que no sea administrador o abogado: ni en el portal del cliente (spec 004) ni en el sitio público (spec 007).
- RF-53: EL SISTEMA no usa ningún dato de la jurisprudencia en los modelos ni en los escritos completados: ninguna variable toma datos de un fallo, y el RF-36 de la spec 005 sigue vigente sin cambios.

## Requisitos no funcionales
- Validación: el servidor valida todos los datos recibidos y rechaza los campos desconocidos, sin confiar en las validaciones de la interfaz (como en las specs 001 a 005). La interfaz aplica las mismas conversiones y reglas que el servidor.
- Reglas de textos: esta spec extiende a los modelos las conversiones de la spec 005 (RF-3), que hasta ahora valían solo para la jurisprudencia, y suma, solo para el texto de un modelo, quitar los espacios al inicio y al final de cada línea (RF-3) y aceptar `@` (RF-4). Las causas (spec 002), los movimientos (spec 003) y la jurisprudencia (spec 005) siguen con sus reglas sin cambios: siguen rechazando `@`.
- Caracteres: las variables se marcan con `#`, que ya estaba permitido, así que no hacen falta llaves ni corchetes. El único carácter que esta spec suma a los permitidos es `@`, y solo en el texto de un modelo y en su buscador. Ningún signo que permita inyectar código (`< > { } [ ] \ | =` y el acento grave, entre otros) se acepta en ningún texto.
- Textos seguros: el título, la descripción y el texto de un modelo, y el escrito completado, se muestran siempre como texto literal, nunca interpretados como código ni como formato (como en la spec 003). Un email escrito en un modelo se muestra como texto: nunca se convierte en un enlace. Esto vale en especial para el escrito completado, que incluye datos de las cuentas de los clientes, cuyos caracteres la spec 001 no limita.
- Registros del servidor: ni el título, la descripción o el texto de un modelo, ni un escrito completado o los datos que lo forman, ni el texto buscado, se escriben en los registros del servidor ni en los mensajes de error. Los mensajes de error indican el campo y la regla, sin repetir lo recibido. Al desplegar se verifica que los registros de acceso del servidor no guarden las direcciones completas de las consultas, que pueden llevar el texto buscado.
- Aislamiento: ningún dato de los modelos ni de los escritos completados se envía a clientes ni a visitantes (RF-52, principio 5).
- Persistencia: los modelos se guardan solo en la base. Ni un modelo, ni un formulario a medio completar, ni un escrito completado se guardan en el almacenamiento local del navegador ni en su caché (principio 5, RF-46).
- Rendimiento: con hasta 500 modelos de hasta 50.000 caracteres, el listado, con cualquier combinación de buscador y filtros, responde en menos de 2 segundos. Completar un modelo de 50.000 caracteres en una causa con hasta 50 partes responde en menos de 2 segundos.
- Fechas: todas las fechas y horas se registran y muestran en hora de Buenos Aires (UTC−3), incluido el "día actual" de `#FECHA#` y `#FECHA_EN_LETRAS#`.
- Idioma: todos los mensajes y textos de la interfaz en español.

## Casos límite
- **Textos pegados:**
  - Texto pegado desde un procesador de textos con comillas tipográficas, guiones largos, "…", viñetas o tabulaciones: se convierte sin aviso y se acepta (RF-3).
  - Texto pegado con negrita, sangría, títulos o una tabla: solo queda el texto. Las celdas de una tabla quedan separadas por un espacio (RF-3, RF-5).
  - Líneas con sangría hecha con espacios o tabulaciones: la sangría se quita (RF-3).
  - Líneas en blanco entre párrafos: se conservan tal como se cargaron (RF-3).
  - Línea para completar a mano hecha con guiones bajos ("__________"): se acepta y queda igual (RF-4, RF-7).
  - Texto de exactamente 50.000 caracteres: se acepta; con 50.001, se rechaza. Los saltos de línea cuentan, y el largo se mide después de convertir (RF-3, RF-6).
  - Texto con emojis o signos como `<`, `>`, `{`, `|`, `=`, `*` o `+`: se rechaza; no se convierte (RF-3, RF-4).
  - Texto con un email como texto fijo ("estudio@ejemplo.com"): se acepta, y en el escrito completado figura como texto, no como enlace (RF-4).
  - `@` en el título o en la descripción de un modelo: se rechaza (RF-4).
  - Texto con solo espacios y saltos de línea: queda vacío y se rechaza (RF-3, RF-6).
  - Texto con "§ 3" o "[sic]": queda "párr. 3" y "(sic)", sin aviso. El texto convertido se ve en la ficha del modelo después de guardar (RF-3, RF-16).
  - Texto con una sola palabra y muchas líneas en blanco: se acepta. Se acepta por ahora.
- **Variables:**
  - Modelo que en el procesador de textos marcaba los datos con corchetes ("[carátula]") o con llaves: los corchetes pasan a paréntesis y las llaves se rechazan. En ningún caso son variables: hay que escribirlas con `#` (RF-3, RF-7).
  - `#caratula#`, `#Carátula#` o `#CARATULA#`: es la misma variable y se guarda como `#CARATULA#` (RF-8).
  - `#CARATUAL#` o `#DEMANDADO#`: no existen y el modelo se rechaza, con el formulario señalando cuáles son (RF-10).
  - `# CARATULA #`, con espacios: no es una marca de variable. Queda como texto común y aparece así en el escrito completado. Se acepta por ahora; la lista de variables de la ficha del modelo ayuda a detectarlo (RF-7, RF-16).
  - "local # 3", "#123#" o "#____#" (solo guiones bajos, sin ninguna letra): texto común (RF-7).
  - `#CARATULA#` en el título o en la descripción: texto común (RF-7).
  - Dos marcas pegadas (`#ACTORES##DEMANDADOS#`) o que comparten un numeral (`#ACTORES#DEMANDADOS#`): el modelo se rechaza. Con un espacio u otro carácter en el medio (`#ACTORES# #DEMANDADOS#`, `#ACTORES#, #DEMANDADOS#`) se acepta (RF-7).
  - Marca partida por un salto de línea (`#NUMERO_` en una línea y `EXPEDIENTE#` en la siguiente): no es una marca y queda como texto común, sin aviso. Se acepta por ahora (RF-7).
  - Texto fijo que por casualidad tiene letras entre dos `#` ("#A#"): se toma como una variable que no existe y se rechaza. Hay que escribirlo de otra forma. Se acepta (RF-10).
  - Modelo sin ninguna variable: se acepta, y su ficha indica "Este modelo no usa variables". Al completarlo se muestra el texto tal cual (RF-12, RF-16).
  - La misma variable varias veces: se reemplaza en todos los lugares (RF-12).
- **Datos que faltan:**
  - Causa sin número de expediente o sin juzgado (por ejemplo, una demanda sin presentar): el escrito se completa con `(FALTA NÚMERO DE EXPEDIENTE)` y `(FALTA JUZGADO)`, y con el aviso arriba (RF-39).
  - `#EXPEDIENTE_PRINCIPAL#` en una causa que no es un incidente: `(FALTA EXPEDIENTE PRINCIPAL)` (RF-9).
  - Causa sin demandados cargados: `(FALTAN DEMANDADOS)` (RF-9).
  - Causa sin ningún cliente entre sus partes vigentes: `(FALTAN CLIENTES)` en las tres variables de clientes (RF-9).
  - Parte que no es cliente, sin DNI ni CUIT: en la variable con documento figura su nombre seguido de `(FALTA DNI)` o `(FALTA CUIT)`, y el aviso indica de quién (RF-9, RF-39).
  - Cliente sin domicilio en su cuenta: `(FALTA DOMICILIO)` en su lugar (RF-9).
  - Un dato que falta y se usa varias veces en el modelo: la marca aparece en cada lugar y el aviso lo nombra una sola vez (RF-39).
  - Modelo que no usa ningún dato faltante: no se muestra el aviso, aunque a la causa le falten otros datos (RF-39).
  - El integrante copia un escrito con marcas de datos faltantes: se permite. Las marcas, en mayúsculas y entre paréntesis, se encuentran fácil en el procesador de textos (RF-39, RF-44).
- **Varias partes:**
  - Tres demandados: figuran los tres, ordenados y enumerados (RF-36).
  - Dos demandados: unidos solo por "y", también en la variable con documento y en la de domicilio (RF-36, RF-37).
  - Un solo actor: figura solo, sin "y" (RF-36).
  - Razón social o domicilio con comas, "y" o punto y coma ("Pérez, Gómez y Asociados S.R.L."): se inserta tal cual, y la enumeración puede leerse ambigua. Se corrige en el procesador de textos. Se acepta por ahora.
  - Un nombre que empieza con "I" o "Hi" después de la "y" ("Luis Gómez y Inés Paz"): no se cambia la "y" por "e". Se corrige en el procesador de textos. Se acepta por ahora.
  - Dos clientes del estudio en la misma causa: las variables de clientes ponen a los dos, y `#CLIENTES_DOMICILIO#` pone el nombre de cada uno con su domicilio (RF-36, RF-37).
  - Cliente que es demandado: figura en `#DEMANDADOS#` y también en `#CLIENTES#` (RF-9).
  - Parte con rol procesal Otro: no figura en ninguna variable de rol. Si es cliente, figura en las de clientes (RF-9).
  - Partes homónimas: figuran las dos, primero la que se cargó antes en la causa (RF-36).
  - Hace falta nombrar solo a algunas partes (por ejemplo, un oficio por un solo demandado): se borran las que sobran en el procesador de textos.
  - Parte desvinculada: no figura (RF-36).
- **Datos de la causa y de las personas:**
  - Cliente persona jurídica: figura con su razón social y su CUIT; la persona de contacto no aparece (RF-34).
  - Cambio en la cuenta de un cliente (por ejemplo, su domicilio): el siguiente escrito que se complete usa el dato nuevo (RF-33, RF-34).
  - Carátula u otro dato que contiene una marca de variable (por ejemplo, "#FECHA#"): se inserta tal cual y no se reemplaza (RF-33).
  - Domicilio o nombre de un cliente con caracteres que los modelos no aceptan (por ejemplo, `<`): se inserta tal cual y se muestra como texto literal (RF-33, requisitos no funcionales).
  - Fuero Otro: `#FUERO#` pone "Otro". Se corrige en el procesador de textos (RF-9).
  - Nombre, razón social o domicilio con saltos de línea, tabulaciones o caracteres invisibles (las specs 001 y 002 no limitan sus caracteres): se insertan tal cual. Se acepta por ahora (RF-33).
  - DNI de 7 dígitos: "DNI 5.123.456". DNI guardado con un cero inicial: "DNI 05.123.456" (RF-35).
  - Responsable que es administrador y no abogado: `#ABOGADO_RESPONSABLE#` pone su nombre igual (RF-9).
  - Integrante que completa el modelo sin ser el responsable de la causa: su nombre no figura en el escrito (RF-38).
  - Matrícula y domicilio constituido de los abogados, y domicilio de las partes que no son clientes: el sistema no los guarda, así que no son variables. Se escriben como texto fijo del modelo o se completan en el procesador de textos.
- **Fecha:**
  - Modelo completado a las 23:59 y otra vez a las 00:01 de Buenos Aires: cada escrito lleva la fecha de su momento (RF-33).
  - Día 1 del mes: `#FECHA_EN_LETRAS#` pone "1 de marzo de 2026", sin "1º". Se acepta por ahora (RF-9).
  - Escrito que se presenta otro día: la fecha se corrige en el procesador de textos.
- **Cuentas y causas desactivadas:**
  - Cliente con la cuenta desactivada que sigue siendo parte vigente: figura en el escrito, con el aviso informativo (RF-40).
  - Cliente con la cuenta desactivada que figura solo por una variable de rol (por ejemplo, `#ACTORES#`), en un modelo que no usa variables de clientes: figura sin aviso. Se acepta por ahora (RF-40).
  - Responsable desactivado: su nombre figura en el escrito, con el aviso informativo (RF-40).
  - Causa desactivada: no ofrece "Completar un modelo" y, si se lo intenta directamente, se rechaza. Al reactivarla, vuelve a ofrecerlo (RF-41).
  - Causa Archivada o Finalizada: se pueden completar modelos, por ejemplo para pedir un desarchivo (RF-42).
  - Completar un modelo no mueve la causa en el listado ni cambia quién la modificó (RF-43).
- **Elegir un modelo desde una causa:**
  - Causa laboral: se ofrecen también los modelos de los otros fueros. El filtro por fuero es opcional (RF-29).
  - Modelo cargado sin indicar fuero: queda con el fuero Otro (RF-1).
  - Filtro por fuero Laboral: aparecen los modelos laborales y los de fuero Otro. Filtro por fuero Otro: aparecen solo los de fuero Otro (RF-22).
  - El integrante completa un modelo y vuelve a la lista para elegir otro: la lista está en la misma página y con la misma búsqueda y los mismos filtros (RF-32).
  - Ningún modelo activo: se muestra "Todavía no hay modelos cargados" (RF-23, RF-29).
  - Modelo desactivado pedido directamente desde una causa, por ejemplo cambiando la dirección: "El modelo está desactivado" (RF-26).
  - Modelo o causa inexistente, o con un identificador mal formado: "No existe ese modelo" o "No existe esa causa" (RF-49).
- **Escrito completado:**
  - Nunca queda guardado. Si el integrante sale de la pantalla y lo necesita de nuevo, completa el modelo otra vez (RF-46).
  - La causa o el modelo cambian mientras el escrito está en pantalla: el escrito no cambia hasta que se lo completa de nuevo. Se acepta (RF-33).
  - El navegador no permite copiar: se muestra el mensaje y el texto se selecciona a mano (RF-45).
  - El texto copiado queda en el portapapeles del equipo. Es la salida prevista del escrito, y la leyenda junto a "Copiar" lo avisa (RF-44, RF-46).
  - El integrante cierra sesión con un escrito copiado: el portapapeles se vacía, aunque lo último copiado no fuera un escrito (RF-44).
  - La sesión vence por falta de uso, o se cierra desde otro dispositivo, con un escrito copiado: el portapapeles no se vacía, porque el navegador solo lo permite ante una acción del usuario. Se acepta.
  - Equipo con historial del portapapeles o con el portapapeles sincronizado con otros dispositivos: el sistema solo vacía lo último copiado; las copias anteriores quedan fuera de su control. Se acepta.
  - La dirección del escrito queda en el historial del navegador: solo identifica la causa y el modelo, y sin una sesión válida no muestra nada. Se acepta (RF-33, RF-48).
  - Una sesión robada permite completar modelos en muchas causas sin dejar rastro, igual que consultar las causas (spec 002). Se acepta por ahora: el registro de accesos del panel queda fuera de alcance (RF-46).
  - El integrante recarga la pantalla del escrito, o la abre de nuevo desde su dirección: el modelo se completa otra vez, con los datos y la fecha de ese momento (RF-33).
  - Integrante que lee y corrige contra el expediente un escrito largo durante más de 1 hora, recorriéndolo: la sesión no vence (RF-48).
  - Escrito en pantalla sin uso durante más de 1 hora: la sesión vence y el escrito deja de mostrarse en ese momento. Tras ingresar, se completa de nuevo (RF-48).
  - Sesión cerrada desde otro dispositivo con un escrito en pantalla: el escrito sigue a la vista hasta la siguiente consulta al servidor. Se acepta (RF-48).
  - Modelo con muchas marcas de partes en una causa con muchas partes: el escrito completado no tiene un largo máximo y puede ser muy extenso. Se acepta por ahora.
  - Causa con dos clientes: el escrito puede llevar el DNI y el domicilio de los dos. Si se le entrega a uno, ve los datos del otro, que el portal no le muestra (spec 004, RF-15). Queda a criterio del integrante, que revisa el escrito antes de entregarlo. Se acepta.
  - Imprimir o guardar la página con las funciones del navegador: el sistema no lo impide ni lo ofrece (RF-47).
  - Dos pestañas con escritos de causas distintas: cada una muestra el suyo, con la carátula de su causa arriba para no confundirlos (RF-32).
- **Búsqueda y listado:**
  - Con un fragmento, en mayúsculas o sin tildes ("CEDULA", "ere"): encuentra "Cédula" o "Pérez" (RF-20).
  - Búsqueda de "#JUZGADO#": encuentra los modelos que usan esa variable (RF-20).
  - Búsqueda de "fecha", "actores" o "juzgado": encuentra también los modelos que solo tienen esas palabras en el nombre de una variable. Se acepta (RF-20).
  - Modelo que coincide con la búsqueda solo por su texto: aparece en el listado, que no muestra el texto ni dónde coincide. Se acepta (RF-19, RF-20).
  - Búsqueda de "@ejemplo.com": encuentra los modelos que tienen ese email en su texto (RF-20, RF-21).
  - Búsqueda con `<`, `{` o `=`: se rechaza (RF-21).
  - Búsqueda con solo espacios: se muestra el listado como si no se hubiera buscado nada (RF-21).
  - Todos los modelos desactivados y "Mostrar desactivados" apagado: se muestra "Todavía no hay modelos cargados", aunque haya una búsqueda escrita (RF-23).
  - Página inexistente, por ejemplo cambiando la dirección: no se muestra ningún modelo ni mensaje de vacío, y se ofrece volver a la primera página (RF-24).
  - Otro integrante carga o modifica un modelo mientras se pasa de página: puede verse un modelo repetido o no verse uno hasta volver a cargar. Se acepta.
- **Títulos repetidos:**
  - Mismo título con distinto uso de mayúsculas, tildes o espacios: se avisa y se permite guardar si se confirma (RF-15).
  - Título igual al de un modelo desactivado: no se avisa. Al reactivar uno de los dos, sí (RF-15, RF-27).
  - Modificar un modelo sin cambiar su título: no se avisa (RF-15).
  - Título igual al de varios modelos activos: el aviso los muestra a todos (RF-15).
  - Guardar un modelo sin cambiar ningún dato: no cuenta como modificación (RF-14).
- **Sesión:**
  - Integrante que redacta un modelo durante más de 1 hora: la sesión no vence mientras escribe (RF-17).
  - Integrante que deja el formulario abierto sin escribir más de 1 hora: la sesión vence y lo no guardado se pierde. Se acepta (RF-17).
- **Desactivación:**
  - Intento de modificar un modelo desactivado: se rechaza hasta reactivarlo (RF-26).
  - Modelo desactivado: no aparece en el listado normal ni en las causas, y sí con "Mostrar desactivados" (RF-22, RF-25).
- **Integrantes:**
  - Integrante que cargó modelos y deja el estudio: conserva su autoría, mostrado como desactivado, y sus modelos se siguen usando (RF-51).
  - Cualquier integrante puede modificar o desactivar un modelo que cargó otro, y solo queda registrada la última modificación. El cambio rige para todos los que usan el modelo, sin versiones anteriores y sin aviso. Se acepta (RF-2, RF-14).
  - Integrante que carga como modelo un escrito real, con nombres o documentos de una causa: el sistema no lo detecta, y el modelo queda guardado y a la vista de todos los integrantes. Queda a criterio de quien lo carga. Se acepta.
  - Integrante con cambio de contraseña pendiente: no accede a los modelos hasta cambiarla (RF-50).
- **Accesos no permitidos:**
  - Cliente que intenta entrar a los modelos o a un escrito completado cambiando la dirección: es llevado al portal (spec 001, RF-20). Si lo pide directamente al servidor, se rechaza (RF-50).
  - Visitante sin sesión: es llevado a la pantalla de ingreso (spec 001, RF-18).
- **Jurisprudencia:** un integrante puede escribir la cita de un fallo como texto fijo de un modelo, copiándola a mano. El sistema no la relaciona con la jurisprudencia (RF-53).
- **Concurrencia:**
  - Dos integrantes modifican el mismo modelo al mismo tiempo: se guarda el último cambio y queda registrado quién lo hizo (como en la spec 001).
  - Un modelo se modifica mientras otro integrante lo completa: el escrito sale con la versión que el modelo tenía en ese momento (RF-33).
  - Un modelo se modifica mientras otro integrante lo desactiva: si la desactivación queda primero, la modificación se rechaza (RF-26).
  - Dos integrantes cargan al mismo tiempo modelos con el mismo título: puede que ninguno vea el aviso de RF-15. Se acepta; el repetido se desactiva.

## Fuera de alcance
- Guardar los escritos completados, su historial o un registro de qué modelo se usó en qué causa.
- Registro de accesos del panel y límite de escritos completados por integrante.
- Vaciar el portapapeles al pegar el escrito, al vencer la sesión o en el historial del portapapeles del equipo: el navegador no lo permite.
- Descargar, imprimir o exportar el escrito a Word, PDF u otro formato, y enviarlo por email.
- Modificar el escrito completado en pantalla antes de copiarlo.
- Formato en los modelos: negrita, cursiva, subrayado, sangría, alineación, títulos, tablas, imágenes, encabezados y pies de página.
- Elegir la causa a partir de un modelo, y completar un modelo sin una causa.
- Ocultar modelos según el fuero de la causa.
- Elegir, al completar, cuáles de las partes de un mismo rol entran en el escrito.
- Variables con datos de los movimientos (spec 003), de los colaboradores, del integrante que completa el modelo, del estado de la causa, o con el email, el teléfono o la persona de contacto de los clientes.
- Variables con datos que el sistema no guarda: matrícula y domicilio constituido de los abogados, y domicilio de las partes que no son clientes.
- Variables propias de cada modelo y variables cuyo valor se pide al completar (por ejemplo, un monto).
- Variables condicionales, repeticiones y ajustes gramaticales automáticos: singular y plural, género, o "e" en lugar de "y".
- Administrar el catálogo de variables desde el panel.
- Citar o insertar fallos de la jurisprudencia en un modelo o en un escrito (spec 005, RF-36).
- Versiones de un modelo e historial completo de sus cambios: solo se guardan la carga y la última modificación.
- Duplicar un modelo para crear otro, e importar modelos desde archivos.
- Catálogo administrable de tipos de escrito, y palabras clave en los modelos.
- Favoritos, modelos personales de un integrante y permisos por modelo: todos los integrantes ven y editan todos.
- Otros órdenes del listado (por fecha de carga o por uso) y contador de usos de cada modelo.
- Borradores de modelos sin terminar de cargar.
- Firma digital, presentación electrónica y envío al sistema del poder judicial.
- Cargar el escrito presentado como movimiento de la causa (spec 003): se carga a mano.
- Acceso de los clientes o de los visitantes a los modelos o a los escritos (specs 004 y 007).
- Borrado definitivo de modelos.

## Criterios de finalización
- Todos los RF con al menos un test en verde.
- Tests que verifiquen:
  - Que un cliente, un visitante y un integrante con cambio de contraseña pendiente no pueden consultar, buscar, gestionar ni completar modelos, y que ninguna respuesta del portal incluye datos de modelos ni de escritos (RF-50, RF-52).
  - Las conversiones de RF-3 en el título, la descripción y el texto, incluida la quita de espacios al inicio y al final de cada línea, que el largo se cuenta después de convertir y que ningún texto guardado contiene caracteres fuera de los permitidos ni signos que permitan inyectar código (RF-3, RF-4).
  - Que `@` se acepta en el texto de un modelo y en su buscador, y se rechaza en el título y en la descripción (RF-4, RF-21).
  - El reconocimiento de las marcas de variable: con minúsculas y tildes, guardadas con la forma del catálogo; un `#` suelto, `#123#`, `#____#` y `# CARATULA #` como texto común; el rechazo de dos marcas pegadas o que comparten un numeral; y el rechazo de una variable que no existe, con un mensaje que no la nombra (RF-7, RF-8, RF-10).
  - Cada variable del catálogo, con su dato y con su marca de dato faltante (RF-9, RF-39).
  - El formato de nombres y documentos, incluido un DNI con cero inicial, y el orden y los separadores con una, dos y tres personas, incluidas las razones sociales, los homónimos y `#CLIENTES_DOMICILIO#` con uno, dos y tres clientes (RF-34 a RF-37).
  - Que la respuesta con un escrito completado solo trae el escrito, sus avisos, la carátula y el título del modelo, y que abrir de nuevo su dirección lo completa otra vez con los datos del momento (RF-33).
  - Que desde el escrito se vuelve a la lista de modelos de la causa en la misma página y con la misma búsqueda y los mismos filtros (RF-32).
  - Que las partes desvinculadas no figuran, que una parte con rol Otro no figura en las variables de rol y que un cliente figura en la variable de su rol y en las de clientes (RF-9, RF-36).
  - Que el reemplazo se hace en una sola pasada: un dato que contiene una marca de variable se inserta tal cual (RF-33).
  - El aviso de datos faltantes, con cada dato una sola vez y con el nombre de la persona, y los avisos de cliente y de responsable desactivados (RF-39, RF-40).
  - `#FECHA#` y `#FECHA_EN_LETRAS#` con el día de Buenos Aires, incluido el cambio de día (RF-9).
  - Que no se puede completar un modelo desactivado ni en una causa desactivada, y sí en una Archivada o Finalizada (RF-26, RF-41, RF-42).
  - Que completar un modelo no modifica la causa ni el modelo, y no deja nada guardado en la base (RF-2, RF-43, RF-46).
  - Que las respuestas con un escrito completado no quedan en el caché del navegador, y que no se escribe nada en su almacenamiento local (RF-46).
  - Que el uso de la pantalla del escrito mantiene la sesión abierta, que sin uso la sesión vence y el escrito deja de mostrarse en ese momento, y que tras un cierre por otro motivo deja de mostrarse en la siguiente consulta al servidor (RF-48).
  - Que la pantalla del escrito no ofrece descargar, imprimir, exportar, enviar ni modificar (RF-47).
  - Que "Copiar" copia solo el texto del escrito, con sus saltos de línea, y el mensaje cuando el navegador no lo permite (RF-44, RF-45).
  - Que la leyenda del portapapeles se muestra junto a "Copiar" y que "Cerrar sesión" vacía el portapapeles (RF-44).
  - El orden y la paginación del listado, sin repetidos ni omitidos entre páginas, la página inexistente y la prioridad de los mensajes de vacío (RF-18, RF-23, RF-24).
  - El buscador por fragmento con la comparación flexible y sus reglas de caracteres, largo, espacios y comodines; el filtro por tipo de escrito; el filtro por fuero, que muestra los modelos de ese fuero y los de fuero Otro, y con Otro solo los de fuero Otro; que un modelo cargado sin fuero queda con el fuero Otro; y la combinación de los filtros (RF-1, RF-20 a RF-22).
  - Que desde una causa se ofrecen todos los modelos activos, de cualquier fuero, sin ningún filtro elegido y sin los desactivados (RF-29).
  - El aviso de título repetido al cargar, modificar y reactivar, con todos los modelos con los que coincide, y que un modelo no se compara consigo mismo (RF-15).
  - Que guardar un modelo sin cambios no cuenta como modificación (RF-14).
  - Que la escritura en el formulario mantiene la sesión abierta (RF-17).
  - Que un modelo desactivado no se puede modificar y que nunca se borra (RF-25, RF-26).
  - Que ni el texto de un modelo, ni un escrito completado, ni el texto buscado aparecen en los registros del servidor ni en los mensajes de error.
  - Que las causas, los movimientos y la jurisprudencia siguen con sus reglas de textos sin cambios, incluido el rechazo de `@`, y que ninguna respuesta de modelos incluye datos de jurisprudencia (RF-53, requisitos no funcionales).
- `pnpm test` y `pnpm lint` sin errores.
- Demo manual:
  1. Con un abogado, cargar un modelo de demanda pegando el texto desde un procesador de textos, con comillas tipográficas, guiones largos, sangría, negrita y una tabla. Verificar que queda como texto plano, convertido y sin sangría, que se acepta un email como texto fijo y que se rechaza un texto con `<` o con llaves.
  2. Escribir variables en minúsculas y con tilde (`#carátula#`), insertar otras desde el catálogo y verificar que se guardan con la forma del catálogo. Escribir `#CARATUAL#` y verificar el rechazo y que el formulario señala cuál es. Escribir `#ACTORES#DEMANDADOS#` y verificar el rechazo por variables sin separar.
  3. Cargar un oficio sin indicar fuero, verificar que queda con el fuero Otro, y cargar una cédula laboral. Cargar otro modelo con el título del primero y verificar el aviso de título repetido.
  4. Con un administrador, buscar por fragmento de título y de texto, en mayúsculas y sin tildes, y por "#JUZGADO#". Verificar que se rechaza una búsqueda con `<`. Usar el filtro por tipo de escrito y el de fuero, y verificar que sin filtro aparecen todos los modelos, que con Laboral aparecen los laborales y los de fuero Otro, y que con Otro aparecen solo los de fuero Otro.
  5. Abrir una causa civil sin número de expediente ni juzgado, con dos actores (uno cliente con domicilio y otro cliente sin domicilio), un demandado persona jurídica con CUIT y otro persona física sin DNI. Elegir "Completar un modelo" y verificar que se ofrecen todos los modelos activos, incluida la cédula laboral.
  6. Completar la demanda y verificar: los datos de la causa, las partes enumeradas y ordenadas, los documentos con su formato, las marcas `(FALTA NÚMERO DE EXPEDIENTE)`, `(FALTA JUZGADO)`, `(FALTA DNI)` y `(FALTA DOMICILIO)`, el aviso con la lista de lo que falta, y la fecha del día en números y en letras.
  7. Copiar el escrito, pegarlo en un procesador de textos y verificar que llega el texto completo, con sus saltos de línea y sin los avisos. Volver a la lista de modelos y verificar que conserva la página, la búsqueda y los filtros.
  8. Cargar el número de expediente y el juzgado en la causa, completar el modelo de nuevo y verificar que salen los datos nuevos y que la causa no cambió su "modificada por" por haber completado el modelo.
  9. Desactivar la cuenta de un cliente de la causa y al responsable, completar un modelo que los use y verificar los dos avisos informativos.
  10. Modificar el modelo y verificar quién lo modificó por última vez. Desactivarlo y verificar que sale del listado, que no se ofrece en la causa, que no se puede modificar y que aparece con "Mostrar desactivados". Reactivarlo.
  11. Desactivar la causa y verificar que no ofrece "Completar un modelo". Reactivarla, marcarla como Archivada y verificar que sí lo ofrece.
  12. Con un escrito completado en pantalla y copiado, cerrar sesión, volver atrás con el navegador y verificar que no se ve. Pegar en un procesador de textos y verificar que el escrito ya no está en el portapapeles. Verificar que no quedó nada en el almacenamiento del navegador.
  13. Escribir un modelo durante más de 1 hora y verificar que la sesión no vence. Recorrer un escrito completado durante más de 1 hora y verificar lo mismo. Dejar otro escrito en pantalla sin usarlo y verificar que la sesión vence y el escrito deja de mostrarse.
  14. Ingresar como cliente, intentar entrar a los modelos y a un escrito completado cambiando la dirección, y verificar que es llevado al portal y que el portal no muestra nada de modelos.

## Dudas abiertas
Ninguna.
