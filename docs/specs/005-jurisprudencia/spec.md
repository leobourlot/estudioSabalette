# Spec 005 — Jurisprudencia

## Contexto y objetivo
Los integrantes del estudio usan fallos de los tribunales para fundar sus escritos y su estrategia, pero hoy los guarda cada uno por su cuenta (en carpetas, correos o apuntes), y encontrar un fallo que otro integrante ya había leído depende de acordarse de que existe y preguntarlo. Esta spec define un registro de jurisprudencia común para todo el estudio: cada integrante carga los fallos que le resultan útiles, con su carátula, tribunal, fuero, fecha, número, un sumario (el resumen del fallo) y palabras clave, y cualquier integrante los encuentra después con un buscador y filtros. Las palabras clave forman un catálogo compartido que el sistema sugiere al cargar, para que todos clasifiquen con las mismas palabras y la búsqueda funcione. Como los textos suelen copiarse de bases jurídicas, el sistema convierte los caracteres tipográficos que traen en sus equivalentes permitidos, sin aceptar nunca signos que permitan inyectar código. Aunque los fallos son públicos, la selección y los sumarios son trabajo interno del estudio, así que la jurisprudencia es solo del panel: nadie que no sea administrador o abogado accede a ella. El registro es independiente de las causas (depende solo de la spec 001). Relacionar fallos con causas y citarlos en los modelos de escritos (spec 006) queda para más adelante.

## Usuarios / actores
- **Integrante del estudio** (administrador o abogado, según la spec 001): carga, consulta, busca, modifica, desactiva y reactiva cualquier fallo. Todos los integrantes trabajan sobre toda la jurisprudencia, igual que sobre todas las causas (spec 002, RF-35).
- **Cliente** y **visitante** (spec 001): no acceden a la jurisprudencia.

## Historias de usuario
- H1: Como integrante del estudio quiero cargar un fallo con su carátula, tribunal, fuero, fecha, número, sumario y enlace a la fuente, para tenerlo a mano y compartirlo con el resto del estudio.
- H2: Como integrante del estudio quiero pegar el sumario tal como lo copio de una base jurídica, sin tener que corregir a mano comillas, guiones ni otros caracteres tipográficos.
- H3: Como integrante del estudio quiero que, al escribir una palabra clave, el sistema me sugiera las que ya se usan, para clasificar los fallos con las mismas palabras que mis colegas.
- H4: Como integrante del estudio quiero buscar fallos por un fragmento de texto y filtrarlos por palabras clave, fuero y fechas, para encontrar rápido el que necesito para una causa.
- H5: Como integrante del estudio quiero ver primero los fallos más recientes, porque suelen ser los que más pesan.
- H6: Como integrante del estudio quiero abrir la fuente original de un fallo desde su ficha, viendo antes a qué sitio lleva, para leerlo completo sin caer en un sitio engañoso.
- H7: Como integrante del estudio quiero corregir los datos y las palabras clave de un fallo mal cargado.
- H8: Como integrante del estudio quiero que el sistema me avise si el fallo que cargo ya parece estar cargado, para no duplicarlo.
- H9: Como integrante del estudio quiero quitar del registro un fallo cargado por error sin borrarlo, y poder recuperarlo si me equivoqué.
- H10: Como integrante del estudio quiero saber quién cargó y quién modificó por última vez un fallo, para saber a quién consultar.
- H11: Como integrante del estudio quiero que mi sesión no venza mientras redacto un sumario largo, para no perder lo escrito.
- H12: Como integrante del estudio quiero que nadie fuera del estudio vea la jurisprudencia, porque la selección y los sumarios son parte de nuestro trabajo interno.

## Requisitos funcionales (criterios de aceptación en EARS)

### Datos del fallo
- RF-1: EL SISTEMA registra de cada fallo:
  - Carátula: obligatoria, hasta 255 caracteres.
  - Tribunal: obligatorio, texto libre, hasta 150 caracteres (por ejemplo, "CNCiv., Sala A" o "Juzgado Civil y Comercial Nº 3 de Rosario").
  - Fuero: obligatorio, de la lista cerrada de la spec 002 (RF-1): Civil, Penal, Familia, Laboral, Federal y Otro.
  - Fecha: obligatoria. Es la fecha del fallo, no la de carga. Solo día, mes y año, sin hora.
  - Número de expediente o de registro: opcional, hasta 50 caracteres.
  - Sumario: obligatorio, hasta 5.000 caracteres. Es el resumen del fallo.
  - Palabras clave: entre 1 y 10 (RF-10 a RF-15).
  - Enlace a la fuente: opcional, hasta 500 caracteres.
  - Si está activo o desactivado.
- RF-2: EL SISTEMA registra en cada fallo quién lo cargó y cuándo, y quién lo modificó por última vez y cuándo. Cuentan como modificación cualquier cambio de sus datos o de sus palabras clave, la desactivación y la reactivación.
- RF-3: Antes de validar, comparar o guardar la carátula, el tribunal, el número, el sumario y las palabras clave, y antes de usar el texto del buscador, EL SISTEMA convierte, sin aviso, los caracteres que suelen traer los textos copiados de otras fuentes:
  - Comillas dobles tipográficas (`“ ” „ ‟ « » ″`): `"`.
  - Comillas simples, apóstrofos y signos parecidos (`‘ ’ ‚ ‛ ‹ › ′ ´`): `'`.
  - Guiones y signo menos (`‐ ‑ ‒ – — ― −`): `-`.
  - Viñetas (`• ◦ ‣ ▪`): `-`.
  - Puntos suspensivos de un solo carácter (`…`): `...`.
  - Signo de número (`№`): `Nº`.
  - Signo de párrafo: `§§` pasa a `párrs.` y `§` pasa a `párr.`. Si lo sigue un carácter que no es un espacio, se agrega un espacio ("§3" queda "párr. 3").
  - Corchetes (`[ ]`): paréntesis (`( )`).
  - Espacio de no separación, demás espacios especiales y tabulación: un espacio.
  - Caracteres invisibles (espacio de ancho cero, unión y no unión de ancho cero, guion de corte opcional, marca de orden de bytes): se eliminan.
  - Separadores de línea y de párrafo Unicode: un salto de línea.
  - En la carátula, el tribunal, el número, las palabras clave y el texto del buscador, que son de una sola línea, cada salto de línea pasa a ser un espacio.

  Después de convertir, EL SISTEMA quita los espacios al inicio y al final y reduce a uno los espacios repetidos en todos esos textos. En el sumario quita también los saltos de línea al inicio y al final, y reduce los espacios repetidos dentro de cada línea sin tocar los saltos de línea ni las líneas en blanco. El largo se cuenta después de todo esto. Son las únicas conversiones: cualquier otro carácter no permitido se rechaza, y el texto guardado nunca contiene signos que permitan inyectar código (`< > { } [ ] \ | =` y el acento grave, entre otros). Los corchetes nunca se guardan: solo se aceptan convertidos en paréntesis.
- RF-4: EL SISTEMA solo acepta en la carátula, el tribunal y el número, después de RF-3, los caracteres permitidos por la spec 002 (RF-4): letras (incluidas las que llevan tilde, la ñ y la ü), números, espacios y los símbolos `. , ; : / - _ ( ) " ' $ & # ° º ª`, sin emojis. Un número que queda vacío se guarda como no informado.
- RF-5: EL SISTEMA solo acepta en el sumario, después de RF-3, los caracteres permitidos en la descripción de un movimiento (spec 003, RF-4): los de RF-4, más saltos de línea y `¿ ? ¡ ! %`. Conserva los saltos de línea intermedios tal como se cargaron, incluidas las líneas en blanco. Cada salto de línea cuenta como un carácter. Las tabulaciones ya llegan convertidas en espacios (RF-3).
- RF-6: EL SISTEMA solo acepta como enlace a la fuente una dirección que cumpla todas estas reglas. Antes de validarla quita los espacios al inicio y al final. No le aplica las conversiones de RF-3.
  - Empieza exactamente con `https://`, en minúsculas.
  - Sigue un dominio formado solo por letras minúsculas sin tildes, números, guiones y puntos, con al menos un punto. No acepta una dirección IP en lugar del dominio, ni dominios en punycode (ninguna de sus partes empieza con `xn--`).
  - No lleva usuario ni contraseña (no acepta `@` en ningún lugar) ni puerto (no acepta `:` después del dominio).
  - Después del dominio solo acepta letras sin tildes, números y `- . _ ~ / ? # & = % + ! $ ( ) * , ; :`. `=` y `&` se aceptan solo en el enlace, porque los parámetros de la dirección los necesitan.
  - Nunca acepta espacios, comillas simples ni dobles, `< > { } [ ] | \ ^`, el acento grave, emojis ni letras con tilde o ñ (las direcciones las llevan codificadas con `%`).

  Un enlace que queda vacío se guarda como no informado.
- RF-7: EL SISTEMA acepta fechas del fallo desde el 01/01/1800 hasta el día actual en Buenos Aires, inclusive. No acepta fechas futuras. Una fecha ya guardada no cambia con el paso de los días.
- RF-8: SI algún dato del fallo no cumple su formato, ENTONCES EL SISTEMA lo rechaza con un mensaje que indique el campo y la regla, sin repetir el texto recibido. En particular:
  - Sin fecha: "Indicá la fecha del fallo".
  - Fecha inexistente (por ejemplo, 31/02): "La fecha no es válida".
  - Fecha anterior al 01/01/1800: "La fecha no puede ser anterior al 01/01/1800".
  - Fecha posterior al día actual: "La fecha del fallo no puede ser posterior a hoy".
  - Sumario vacío: "Indicá el sumario del fallo".
  - Enlace que no empieza con `https://`: "El enlace debe empezar con https://".
  - Enlace que no cumple alguna otra regla de RF-6: "El enlace tiene un formato o caracteres no permitidos".
- RF-9: EL SISTEMA llama **comparación flexible** a comparar dos textos, después de RF-3, sin distinguir mayúsculas, minúsculas, tildes ni diéresis, y tomando la ñ como n. Con la comparación flexible, "Daño Moral", "dano moral" y "DANO MORAL" son iguales, y también "año" y "ano", y "pingüino" y "pinguino".

### Palabras clave
- RF-10: EL SISTEMA mantiene un catálogo de palabras clave compartido por todos los fallos. Cada palabra clave tiene hasta 50 caracteres, después de RF-3, con los caracteres permitidos de RF-4.
- RF-11: EL SISTEMA considera iguales dos palabras clave si lo son con la comparación flexible (RF-9).
- RF-12: CUANDO se guarda un fallo con una palabra clave igual (RF-11) a una del catálogo, EL SISTEMA usa la del catálogo. Si el integrante la escribió con otra forma (por ejemplo, "daño moral" cuando en el catálogo figura "dano moral"), el catálogo pasa a tener la forma escrita, ya convertida (RF-3), y todos los fallos que la usan la muestran así. Elegir una sugerencia no cambia su forma. El cambio de forma no cuenta como modificación de los otros fallos (RF-2). Si la palabra no existe en el catálogo, la agrega con la forma escrita. Una palabra clave nueva solo se agrega al catálogo cuando el fallo se guarda: si la carga o la modificación se rechaza, o el integrante no confirma el aviso de RF-18, no se agrega.
- RF-13: CUANDO un integrante escribe al menos 2 caracteres en una palabra clave al cargar o modificar un fallo, EL SISTEMA le sugiere hasta 10 palabras del catálogo que contienen lo escrito como fragmento, con la comparación flexible (RF-9), cada una con la cantidad de fallos activos que la usan. Solo sugiere las que usa al menos un fallo activo, ordenadas por esa cantidad, de mayor a menor, y a igual cantidad alfabéticamente. Elegir una sugerencia es opcional: siempre se puede escribir una nueva.
- RF-14: SI un fallo queda sin palabras clave, con más de 10, o con una palabra clave vacía después de RF-3, de más de 50 caracteres o con caracteres no permitidos, ENTONCES EL SISTEMA lo rechaza con el mensaje "Indicá al menos una palabra clave", "Un fallo puede tener hasta 10 palabras clave", "La palabra clave no puede quedar vacía", "Cada palabra clave puede tener hasta 50 caracteres" o el de la regla incumplida, según corresponda. SI se asigna dos veces la misma palabra clave (RF-11) a un fallo, EL SISTEMA la guarda una sola vez, y cuenta una sola vez para el máximo.
- RF-15: EL SISTEMA no permite cambiar una palabra clave del catálogo por otra distinta, unirlas ni borrarlas. Su forma solo cambia según RF-12. Una palabra clave que ningún fallo activo usa deja de sugerirse al cargar (RF-13), y vuelve a sugerirse si un fallo activo la usa de nuevo.

### Carga y modificación
- RF-16: CUANDO un integrante carga un fallo con sus datos obligatorios y al menos una palabra clave, EL SISTEMA lo guarda activo y registra quién lo cargó y cuándo.
- RF-17: CUANDO un integrante modifica un fallo activo, EL SISTEMA guarda los cambios y registra quién lo modificó y cuándo (RF-2). Se pueden modificar todos los datos de RF-1 y agregar o quitar palabras clave, con las mismas validaciones que en la carga, salvo si está activo o desactivado: eso solo cambia con las acciones de RF-29 y RF-31.
- RF-18: SI al cargar un fallo, al modificar su carátula, su tribunal, su número o su fecha, o al reactivarlo, coincide con otro fallo activo, ENTONCES EL SISTEMA avisa, muestra uno de los fallos con los que coincide (el primero según el orden de RF-21) y permite guardar si el integrante lo confirma:
  - Mismo tribunal y mismo número, si los dos tienen número: "Ya existe un fallo con ese número en ese tribunal".
  - Si no coincide por número: misma carátula, mismo tribunal y misma fecha, tengan o no número y aunque sus números sean distintos: "Ya existe un fallo con esa carátula, tribunal y fecha".

  La carátula, el tribunal y el número se comparan con la comparación flexible (RF-9). El fallo que se modifica o se reactiva nunca se compara consigo mismo.
- RF-19: CUANDO se consulta un fallo, EL SISTEMA muestra:
  - Todos sus datos y sus palabras clave.
  - El sumario completo, con sus saltos de línea.
  - Si tiene enlace a la fuente: la dirección completa como texto literal y, destacado junto a ella, el dominio al que lleva (por ejemplo, "csjn.gov.ar"). El enlace se abre en una pestaña nueva, sin que el sitio de destino reciba la dirección del panel ni pueda controlar su pestaña.
  - Quién lo cargó, quién lo modificó por última vez y cuándo.
  - Si está desactivado, identificado como tal.
- RF-20: MIENTRAS un integrante escribe en el formulario de carga o modificación de un fallo, EL SISTEMA cuenta esa escritura como uso de su sesión (spec 001, RF-12), para que no venza mientras redacta. Si deja el formulario abierto sin escribir, la sesión vence como siempre, y lo que no guardó se pierde.

### Listado y búsqueda
- RF-21: CUANDO un integrante consulta la jurisprudencia, EL SISTEMA muestra los fallos activos de a 20 por página, ordenados así:
  - Por fecha del fallo, primero el más reciente.
  - A igual fecha, primero el último cargado.
  - A igual fecha e igual momento de carga, primero el último registrado en el sistema.

  Mientras los datos no cambian, el orden es siempre el mismo, de modo que al pasar de página ningún fallo se repite ni se omite.
- RF-22: EL SISTEMA muestra de cada fallo del listado su fecha, tribunal, carátula, fuero, número (si lo tiene), sus palabras clave y su sumario. Si el sumario tiene hasta 300 caracteres, se muestra completo; si es más largo, sus primeros 300 caracteres y la opción "Ver más", que lo despliega completo en el mismo lugar. Desplegado, la opción "Ver menos" lo vuelve a recortar (como en la spec 004, RF-21).
- RF-23: CUANDO un integrante escribe en el buscador, EL SISTEMA muestra los fallos en los que el texto buscado aparece, aunque sea como fragmento ("ere" encuentra "Pérez"), en su carátula, su tribunal, su número, su sumario o alguna de sus palabras clave, con la comparación flexible (RF-9). En el número ignora los separadores, como en la spec 002 (RF-37): "1234/2024" encuentra "1234/2024" y "1234-2024".
- RF-24: EL SISTEMA aplica al texto del buscador las conversiones de RF-3 y después estas reglas:
  - Solo acepta los caracteres permitidos en el sumario (RF-5), salvo los saltos de línea, que ya llegan convertidos en espacios. SI tiene otro carácter, en particular un signo que permita inyectar código, ENTONCES EL SISTEMA rechaza la búsqueda con el mensaje "La búsqueda tiene caracteres no permitidos".
  - Acepta hasta 100 caracteres. SI tiene más, ENTONCES EL SISTEMA la rechaza con el mensaje "La búsqueda puede tener hasta 100 caracteres".
  - Un texto vacío o con solo espacios se trata como si no se hubiera escrito nada.
  - `%` y `_` se buscan como texto literal.
- RF-25: EL SISTEMA permite filtrar el listado por:
  - Palabras clave: una o varias, elegidas del catálogo. Al escribir, sugiere como en RF-13, pero entre todas las palabras del catálogo, aunque solo las usen fallos desactivados o ninguno. Con varias, solo aparecen los fallos que tienen todas.
  - Fuero.
  - Rango de fechas del fallo (desde y hasta, ambas inclusive y opcionales).
  - "Mostrar desactivados": incluye los fallos desactivados, identificados como tales.

  Los filtros se combinan entre sí y con el buscador, y no cambian el orden de RF-21.
- RF-26: EL SISTEMA valida las fechas del filtro como en el historial de movimientos de una causa (spec 003, RF-25 y RF-26), con el rango de la fecha del fallo:
  - SI una fecha no existe, ENTONCES rechaza el filtro con el mensaje "La fecha no es válida".
  - SI una fecha es anterior al 01/01/1800 o posterior al día actual, ENTONCES lo rechaza con el mensaje de RF-8 que corresponda.
  - SI la fecha desde es posterior a la fecha hasta, ENTONCES lo rechaza con el mensaje "La fecha desde no puede ser posterior a la fecha hasta".
- RF-27: SI no hay ningún fallo que pueda aparecer en el listado sin buscador ni filtros (ningún fallo activo o, con "Mostrar desactivados", ningún fallo), ENTONCES EL SISTEMA muestra el mensaje "Todavía no hay fallos cargados", aunque se haya escrito una búsqueda o elegido filtros. SI hay alguno, pero ninguno coincide con la búsqueda y los filtros, ENTONCES muestra "No hay fallos que coincidan con la búsqueda".
- RF-28: SI se pide una página del listado que no existe, ENTONCES EL SISTEMA no muestra ningún fallo ni los mensajes de RF-27, y ofrece volver a la primera página.

### Desactivación y reactivación
- RF-29: CUANDO un integrante desactiva un fallo, EL SISTEMA lo marca como desactivado, registra quién lo hizo y cuándo (RF-2) y lo quita del listado normal. La desactivación reemplaza al borrado: se usa para quitar del registro un fallo cargado por error, duplicado o que ya no se quiere usar. Nunca se borran fallos.
- RF-30: MIENTRAS un fallo está desactivado, EL SISTEMA solo permite consultarlo y reactivarlo. SI se intenta modificarlo, ENTONCES EL SISTEMA lo rechaza con el mensaje "El fallo está desactivado. Reactivalo para modificarlo". Sus palabras clave se conservan, pero no cuentan para las sugerencias de la carga (RF-13).
- RF-31: CUANDO un integrante reactiva un fallo, EL SISTEMA lo marca como activo y registra quién lo hizo y cuándo (RF-2), con el aviso de RF-18 si coincide con otro fallo activo.
- RF-32: SI se intenta desactivar un fallo ya desactivado o reactivar uno activo, ENTONCES EL SISTEMA lo rechaza con el mensaje "El fallo ya está desactivado" o "El fallo ya está activo", según corresponda.

### Integridad, permisos y aislamiento
- RF-33: SI el fallo indicado en una operación no existe o tiene un identificador mal formado, ENTONCES EL SISTEMA la rechaza con el mensaje "No existe ese fallo".
- RF-34: EL SISTEMA solo permite a administradores y abogados cargar, consultar, buscar, modificar, desactivar y reactivar fallos, y consultar las sugerencias de palabras clave, solo desde el panel. Cualquier intento de un cliente o de un visitante se rechaza según la spec 001 (RF-18 a RF-20), y este control se hace siempre en el servidor. Un integrante con cambio de contraseña pendiente tampoco accede, porque solo puede cambiar su contraseña, consultar sus datos y cerrar sesión (spec 001, RF-11).
- RF-35: CUANDO se desactiva la cuenta de un integrante (spec 001), EL SISTEMA conserva su autoría en los fallos que cargó o modificó y lo muestra como desactivado.
- RF-36: EL SISTEMA nunca expone datos de jurisprudencia (fallos, sumarios, palabras clave, enlaces ni sugerencias) a nadie que no sea administrador o abogado: ni en el portal del cliente (spec 004), ni en el sitio público (spec 007), ni en los modelos de escritos (spec 006), ni en ninguna funcionalidad posterior, salvo que una spec futura lo cambie expresamente.

## Requisitos no funcionales
- Validación: el servidor valida todos los datos recibidos y rechaza los campos desconocidos, sin confiar en las validaciones de la interfaz (como en las specs 001 a 003). La interfaz aplica las mismas conversiones y reglas que el servidor.
- Reglas propias de la jurisprudencia: las reglas del enlace de RF-6 solo valen para esta spec. Las conversiones de RF-3 valen para esta spec y para los modelos de escritos (spec 006, RF-3), que las usan sin cambiarlas. Las causas (spec 002) y los movimientos (spec 003) siguen con sus reglas sin cambios: rechazan esos caracteres en lugar de convertirlos.
- Textos seguros: la carátula, el tribunal, el número, el sumario, las palabras clave y la dirección del enlace se muestran siempre como texto literal, nunca interpretados como código ni como formato (como en la spec 003). El enlace solo funciona como enlace si cumple RF-6.
- Registros del servidor: ningún dato de los fallos (textos, palabras clave, enlaces), ni el texto buscado ni los filtros, se escribe en los registros del servidor ni en los mensajes de error. Los mensajes de error indican el campo y la regla, sin repetir lo recibido.
- Aislamiento: ningún dato de jurisprudencia se envía a clientes ni a visitantes (RF-36, principio 5).
- Persistencia: ningún dato de jurisprudencia, ni siquiera un formulario a medio completar, se guarda en el almacenamiento local del navegador (principio 5).
- Rendimiento: con hasta 10.000 fallos, el listado, con cualquier combinación de buscador y filtros, y las sugerencias de palabras clave responden en menos de 2 segundos.
- Fechas: todas las fechas y horas se registran, comparan y muestran en hora de Buenos Aires (UTC−3), incluido el "día actual" de RF-7 y RF-26. La fecha del fallo es un día del calendario y se muestra siempre como dd/mm/aaaa, sin corrimientos por zona horaria.
- Idioma: todos los mensajes y textos de la interfaz en español.

## Casos límite
- **Fechas:**
  - Fallo histórico de la Corte Suprema (por ejemplo, de 1887): se acepta (RF-7).
  - Fallo de hoy: se acepta. Uno de mañana o un error de tipeo como 2062: se rechaza (RF-7, RF-8).
  - Fecha anterior al 01/01/1800 o un error de tipeo como 1024: se rechaza (RF-8).
  - 31/02 o 29/02 de un año no bisiesto: se rechaza como fecha inexistente (RF-8).
  - Error de tipeo dentro del rango (por ejemplo, 2016 en lugar de 2019): se acepta y se corrige modificando el fallo (RF-17).
  - Fallo cargado con la fecha de hoy y modificado otro día: conserva su fecha original (RF-7).
- **Textos pegados:**
  - Sumario copiado de una base jurídica con comillas tipográficas, guiones largos, "…", "№", "§", viñetas, tabulaciones o una cita recortada "[...]": se convierte sin aviso ("[...]" queda "(...)") y se acepta (RF-3).
  - "§3" queda "párr. 3"; "§§ 4 y 5" queda "párrs. 4 y 5" (RF-3).
  - Texto con caracteres invisibles (por ejemplo, un espacio de ancho cero copiado de una página web): se eliminan y el texto se acepta (RF-3).
  - Carátula o tribunal pegados en dos líneas: el salto de línea pasa a ser un espacio (RF-3).
  - Dobles espacios en cualquier texto: se reducen a uno. "CNCiv.  Sala A" y "CNCiv. Sala A" son el mismo tribunal para el aviso de repetido (RF-3, RF-18).
  - Sumario de exactamente 5.000 caracteres: se acepta; con 5.001, se rechaza. Los saltos de línea cuentan (RF-5).
  - Sumario de 4.999 caracteres con un "…": al convertirlo pasa a 5.001 y se rechaza por largo (RF-3, RF-5).
  - Sumario con líneas en blanco entre párrafos: se conservan tal como se cargaron (RF-5).
  - Sumario con emojis o signos como `<`, `>`, `{`, `|` o `=`: se rechaza; no se convierte (RF-3, RF-5).
  - Las mismas conversiones en una causa o un movimiento: no se aplican; esos textos se siguen rechazando (requisitos no funcionales).
- **Enlace:**
  - Enlace con parámetros, como `https://sjconsulta.csjn.gov.ar/sjconsulta/documentos/verDocumentoById.html?idDocumento=7867721`: se acepta (RF-6).
  - Enlace con `http://`, `HTTPS://`, `javascript:` u otro esquema: se rechaza (RF-6, RF-8). Un sitio que solo funciona con `http://` no se puede enlazar; se acepta por ahora.
  - Enlace con usuario antes del dominio (`https://csjn.gov.ar@sitio-falso.com`), con una dirección IP, con puerto (`https://sitio.com:8443`), con un dominio en punycode o con mayúsculas en el dominio: se rechaza (RF-6).
  - Enlace con espacios, comillas, `<`, `>`, llaves, corchetes o el acento grave: se rechaza (RF-6).
  - Enlace a un sitio engañoso que cumple todas las reglas: el dominio destacado ayuda a detectarlo antes de abrirlo, y queda registrado quién cargó o modificó el fallo (RF-2, RF-19). Se acepta.
  - Enlace que deja de funcionar: el sistema no lo verifica. Se corrige modificando el fallo.
  - Mismo enlace en dos fallos: no genera aviso de repetido. Se acepta por ahora.
- **Otros datos:**
  - Fallo sin número de expediente ni de registro: se acepta. No se controla como repetido por número, solo por carátula, tribunal y fecha (RF-18).
  - Tribunal escrito de formas distintas ("CNCiv. Sala A" y "Cám. Nac. Civ., Sala A"): el sistema no puede detectar que es el mismo, porque es texto libre. El aviso de repetido no salta y la búsqueda por un fragmento puede encontrar uno y no el otro. Se acepta por ahora (como el juzgado en la spec 002).
  - Fallo revocado o confirmado por un tribunal superior: no hay una marca propia. Se indica en el sumario o con una palabra clave, o se carga el fallo superior aparte.
- **Palabras clave:**
  - "daño moral" cuando en el catálogo figura "dano moral": es la misma palabra, y el catálogo y todos los fallos que la usan pasan a mostrar "daño moral" (RF-12).
  - Alguien escribe "DAÑO MORAL" sobre "daño moral": todos los fallos pasan a mostrarla en mayúsculas. Se corrige escribiéndola de nuevo con la forma correcta en cualquier fallo (RF-12).
  - Elegir "daño moral" de las sugerencias: no cambia su forma (RF-12).
  - "año" y "ano", o "pingüino" y "pinguino": son la misma palabra clave. Se acepta (RF-9, RF-11).
  - "daño-moral" y "daño moral": son distintas. Se acepta; las sugerencias ayudan a evitarlo (RF-13).
  - La misma palabra clave dos veces en un fallo: se guarda una sola vez (RF-14).
  - Palabra clave que supera los 50 caracteres después de convertir (por ejemplo, por un "…"): se rechaza. Se acepta por ahora (RF-14).
  - Palabra clave formada solo por símbolos ("-", "()"): se acepta por ahora. Si queda vacía después de convertir, se rechaza (RF-14).
  - Palabra clave mal escrita de forma que no es igual a la correcta ("daño moarl"): se la quita y se agrega la correcta, fallo por fallo. Deja de sugerirse al cargar en cuanto ningún fallo activo la usa (RF-15).
  - Palabra clave nueva en una carga que se rechaza o en un aviso de repetido que no se confirma: no se agrega al catálogo (RF-12).
  - Palabra clave que solo usan fallos desactivados: no se sugiere al cargar, pero sí en el filtro. Si se la vuelve a escribir, se usa la del catálogo (RF-12, RF-13, RF-25).
  - Quitar la última palabra clave de un fallo: se rechaza (RF-14).
  - Sugerencias con un solo carácter escrito: no se muestran (RF-13).
- **Repetidos:**
  - Mismo número y mismo tribunal, con distinto uso de mayúsculas, tildes o espacios: se avisa y se permite guardar si se confirma (RF-18).
  - Números distintos, pero la misma carátula, el mismo tribunal y la misma fecha: se avisa, por las dudas (RF-18).
  - Mismo número en otro tribunal: no se avisa, porque son fallos distintos.
  - Mismo número con distintos separadores ("1234/2024" y "1234-2024"): la búsqueda encuentra los dos (RF-23), pero el aviso de repetido no los considera iguales, como en la spec 002.
  - Coincidencia con varios fallos: se muestra solo uno. Se acepta por ahora (RF-18).
  - Modificar un fallo sin cambiar carátula, tribunal, número ni fecha: no se avisa. Un fallo nunca se avisa como repetido de sí mismo (RF-18).
  - Repetido de un fallo desactivado: no se avisa. Al reactivar uno de los dos, sí (RF-18, RF-31).
- **Búsqueda y listado:**
  - Con un fragmento, en mayúsculas o sin tildes ("PEREZ", "ere", "dano", "ano"): encuentra los fallos de "Pérez", "daño" o "año" (RF-23).
  - Búsqueda de "[...]": se convierte a "(...)" y encuentra los sumarios que tenían esa cita (RF-3, RF-24).
  - Búsqueda con `<`, `{` o `=`: se rechaza (RF-24).
  - Búsqueda con solo espacios: se muestra el listado como si no se hubiera buscado nada (RF-24).
  - Búsqueda de "50%": encuentra los textos con "50%"; el `%` no actúa como comodín (RF-24).
  - Búsqueda por tribunal: se escribe en el buscador. También aparecen los fallos cuyo sumario menciona ese tribunal. Se acepta (RF-23).
  - Varias palabras clave en el filtro: solo aparecen los fallos que tienen todas. Si ninguno las tiene, se muestra "No hay fallos que coincidan con la búsqueda" (RF-25, RF-27).
  - Filtro con una fecha inexistente, de 1790, futura o con desde posterior a hasta: se rechaza (RF-26).
  - Todos los fallos desactivados y "Mostrar desactivados" apagado: se muestra "Todavía no hay fallos cargados", aunque haya una búsqueda escrita (RF-27).
  - Página inexistente, por ejemplo cambiando la dirección: no se muestra ningún fallo ni mensaje de vacío, y se ofrece volver a la primera página (RF-28).
  - Varios fallos de la misma fecha: primero los últimos cargados, y el orden no cambia entre páginas (RF-21).
  - Fallo cargado hoy con una fecha vieja: queda ubicado según la fecha del fallo, no según su carga (RF-21).
  - Otro integrante cambia la fecha de un fallo, o carga uno, mientras se pasa de página: puede verse un fallo repetido o no verse uno hasta volver a cargar. Se acepta.
- **Sesión:**
  - Integrante que redacta un sumario largo durante más de 1 hora: la sesión no vence mientras escribe (RF-20).
  - Integrante que deja el formulario abierto sin escribir más de 1 hora: la sesión vence y lo no guardado se pierde. Se acepta (RF-20; spec 001, RF-12).
- **Desactivación:**
  - Intento de modificar un fallo desactivado: se rechaza hasta reactivarlo (RF-30).
  - Fallo desactivado: no aparece en el listado normal, sí con "Mostrar desactivados", y sus palabras clave dejan de contar para las sugerencias de la carga (RF-25, RF-30).
- **Integrantes:**
  - Integrante que cargó fallos y deja el estudio: conserva su autoría, mostrado como desactivado (RF-35).
  - Cambio de rol de un integrante (de abogado a administrador, o al revés): sigue con los mismos permisos sobre la jurisprudencia (RF-34).
  - Integrante con cambio de contraseña pendiente: no accede a la jurisprudencia hasta cambiarla (RF-34).
  - Cualquier integrante puede modificar o desactivar un fallo que cargó otro, y solo queda registrada la última modificación. Se acepta (RF-2).
- **Accesos no permitidos:**
  - Cliente que intenta entrar a la jurisprudencia cambiando la dirección: es llevado al portal (spec 001, RF-20). Si la pide directamente al servidor, se rechaza (RF-34).
  - Visitante sin sesión: es llevado a la pantalla de ingreso (spec 001, RF-18).
  - Fallo inexistente o con identificador mal formado: "No existe ese fallo" (RF-33).
- **Concurrencia:**
  - Dos integrantes modifican el mismo fallo al mismo tiempo: se guarda el último cambio y queda registrado quién lo hizo (como en la spec 001).
  - Dos integrantes cargan al mismo tiempo el mismo fallo: puede que ninguno de los dos vea el aviso de RF-18 y el fallo quede repetido. Se acepta; el repetido se desactiva.
  - Dos integrantes guardan a la vez la misma palabra clave con formas distintas ("Daño moral" y "daño moral"): queda una sola en el catálogo, con la forma del último que guardó (RF-11, RF-12).
  - Un fallo se modifica mientras otro integrante lo desactiva: si la desactivación queda primero, la modificación se rechaza (RF-30).

## Fuera de alcance
- Relacionar fallos con causas del estudio (por ejemplo, "jurisprudencia relacionada" en una causa). Por eso esta spec depende solo de la spec 001.
- Uso de los fallos en los modelos de escritos: citarlos o insertarlos en un escrito se definirá en la spec 006 o en una posterior, respetando RF-36.
- Acceso de los clientes o de los visitantes a la jurisprudencia, en el portal o en el sitio público (specs 004 y 007).
- Texto completo del fallo dentro del sistema: se consulta en la fuente, con el enlace.
- Adjuntos (el fallo en PDF u otros archivos).
- Importación de fallos desde bases jurídicas (SAIJ, Corte Suprema, editoriales) o desde archivos.
- Administración del catálogo de palabras clave: cambiar una palabra por otra distinta, unir, borrar o desactivar palabras clave, sinónimos y jerarquías. Solo cambia su forma, según RF-12.
- Catálogo administrable de tribunales.
- Lista de sitios permitidos para los enlaces a la fuente, y verificación automática de que el enlace funciona.
- Aviso de todos los fallos repetidos a la vez: solo se muestra uno.
- Relación entre fallos (instancias de una misma causa judicial, fallo revocado o confirmado).
- Búsqueda por relevancia, por frase exacta o con operadores (Y, O, NO) en el buscador.
- Otros órdenes del listado (por fecha de carga o alfabético).
- Favoritos o listas personales de fallos por integrante.
- Borradores de fallos sin terminar de cargar.
- Exportación, impresión o generación de la cita del fallo en un formato bibliográfico.
- Historial completo de cambios de cada fallo: solo se guardan la carga y la última modificación.
- Borrado definitivo de fallos o de palabras clave.

## Criterios de finalización
- Todos los RF con al menos un test en verde.
- Tests que verifiquen:
  - Que un cliente, un visitante y un integrante con cambio de contraseña pendiente no pueden consultar, buscar ni gestionar fallos, ni pedir sugerencias de palabras clave, y que ninguna respuesta del portal incluye datos de jurisprudencia (RF-34, RF-36).
  - Cada conversión de RF-3, incluidos los caracteres invisibles, los saltos de línea en los textos de una sola línea, "§" y "§§", y la reducción de espacios. Que el largo se cuenta después de convertir y que ningún texto guardado contiene caracteres fuera de los permitidos ni signos que permitan inyectar código (RF-3 a RF-5).
  - Las reglas del enlace: `https://` en minúsculas, dominio válido, sin IP, punycode, `@` ni puerto, sin comillas ni `< > { } [ ] | \ ^` ni acento grave, y con `=` y `&` aceptados (RF-6).
  - Que se rechazan los caracteres no permitidos y las fechas fuera de rango o futuras (RF-4, RF-5, RF-7, RF-8).
  - La comparación flexible (RF-9): mayúsculas, tildes, diéresis y ñ.
  - El catálogo de palabras clave: igualdad, cambio de forma en todos los fallos al escribirla de otra manera, que elegir una sugerencia no la cambia y que una palabra nueva no se agrega si el fallo no se guarda (RF-11, RF-12).
  - Las sugerencias de la carga (desde 2 caracteres, solo de fallos activos, con su cantidad y en el orden de RF-13) y las del filtro (todo el catálogo, RF-25).
  - El buscador por fragmento con la comparación flexible y sus reglas de caracteres, largo, espacios y comodines; el filtro por varias palabras clave (todas); el rango de fechas y su validación, y su combinación (RF-23 a RF-26).
  - El orden y la paginación del listado, sin repetidos ni omitidos entre páginas, la página inexistente y la prioridad de los mensajes de vacío (RF-21, RF-27, RF-28).
  - El recorte del sumario en 300 caracteres con "Ver más" y "Ver menos" (RF-22).
  - Los avisos de repetido al cargar, modificar y reactivar, incluido el caso de números distintos, y que un fallo no se compara consigo mismo (RF-18).
  - Que la escritura en el formulario mantiene la sesión abierta (RF-20).
  - Que un fallo desactivado no se puede modificar y que nunca se borra (RF-29, RF-30).
  - Que ningún texto de los fallos, ni el texto buscado, aparece en los registros del servidor ni en los mensajes de error.
  - Que las causas y los movimientos siguen rechazando los caracteres que esta spec convierte (requisitos no funcionales).
- `pnpm test` y `pnpm lint` sin errores.
- Demo manual:
  1. Con un abogado, cargar tres fallos de distintos fueros y fechas: uno sin número, uno de 1887 y uno con un sumario de varios párrafos pegado de una base jurídica, con comillas tipográficas, guiones largos, "§3" y una cita "[...]". Verificar que esos caracteres quedan convertidos y que se rechazan una fecha de mañana, una de 1790 y un sumario con `<`.
  2. Probar enlaces: verificar que se acepta uno de la Corte Suprema con `?idDocumento=…` y que se rechazan uno con `http://`, uno con `HTTPS://`, uno con `@` antes del dominio, uno con una IP y uno con comillas.
  3. Al cargar el segundo fallo, escribir "dano" y verificar que se sugiere "dano moral" (si así se cargó primero) con su cantidad de fallos. Escribir "Daño moral" y verificar que todos los fallos que la usan pasan a mostrar esa forma.
  4. Cargar un fallo con el mismo tribunal y número que otro, y otro con la misma carátula, tribunal y fecha pero distinto número, y verificar los dos avisos. Confirmar uno y desactivar el repetido.
  5. Con un administrador, buscar por fragmento de carátula, en mayúsculas y sin tildes, por número con otro separador, por palabra clave y por "[...]", y verificar que se rechaza una búsqueda con `<`. Usar el filtro con dos palabras clave, el de fuero y el rango de fechas, y verificar el orden por fecha del fallo.
  6. Abrir un fallo y verificar sus datos, el sumario con sus párrafos, el dominio destacado del enlace, que se abre en una pestaña nueva y quién lo cargó. En el listado, verificar "Ver más" y "Ver menos" en un sumario de más de 300 caracteres.
  7. Modificar el fallo con el administrador y verificar que muestra quién lo modificó por última vez.
  8. Desactivar un fallo y verificar que sale del listado, que aparece con "Mostrar desactivados", que no se puede modificar, que sus palabras clave exclusivas dejan de sugerirse al cargar pero sí en el filtro. Reactivarlo.
  9. Escribir un sumario durante más de 1 hora y verificar que la sesión no vence. Dejar otro formulario abierto sin escribir y verificar que vence.
  10. Ingresar como cliente, intentar entrar a la jurisprudencia cambiando la dirección y verificar que es llevado al portal y que el portal no muestra nada de jurisprudencia.

## Dudas abiertas
Ninguna.
