# Spec 004 — Portal del cliente

## Contexto y objetivo
Hoy un cliente que quiere saber en qué está su causa tiene que llamar o escribir al estudio, y alguien tiene que buscar el expediente y contarle. Las specs anteriores ya dejaron todo listo para que pueda consultarlo solo: el cliente ingresa con su cuenta (spec 001), queda vinculado a las causas en las que es parte vigente (spec 002, RF-26 a RF-28) y los integrantes deciden qué movimientos puede ver y con qué texto (spec 003, RF-30 a RF-33). Esta spec define el portal: la lista de causas del cliente, los datos de cada una que puede ver, el historial de los movimientos visibles para él, el contacto con el estudio y la duración de su sesión. El portal es solo de consulta. Como la información está amparada por el secreto profesional, el portal no inventa reglas propias de acceso: usa siempre el vínculo de la spec 002 y la regla de visibilidad de la spec 003, y el cliente nunca recibe datos internos del estudio, de otras causas ni de las otras partes más allá de lo que esta spec enumera.

## Usuarios / actores
- **Cliente** (spec 001): persona física o jurídica con una cuenta activa. Consulta en el portal las causas a las que está vinculado. No carga ni modifica nada, salvo su contraseña (spec 001).
- **Integrante del estudio** (administrador o abogado, spec 001): no usa el portal; si intenta entrar, se lo lleva al panel (spec 001, RF-20). Desde el panel decide, con lo definido en las specs 002 y 003, qué ve cada cliente.

## Historias de usuario
- H1: Como cliente quiero ver la lista de mis causas, con las que siguen en curso primero, para encontrar rápido la que me interesa.
- H2: Como cliente quiero seguir viendo mis causas archivadas o finalizadas para consultar cómo terminaron.
- H3: Como cliente quiero ver los datos de mi causa (carátula, número de expediente, juzgado, fuero y estado) para identificarla cuando hablo con el estudio o con el juzgado.
- H4: Como cliente quiero ver quiénes son las partes de la causa y con qué rol, y cuál soy yo, para entender el expediente.
- H5: Como cliente quiero saber quién es el abogado responsable de mi causa y tener siempre a mano el WhatsApp del estudio, para consultar cuando lo necesito.
- H6: Como cliente quiero ver el historial de movimientos de mi causa, en un lenguaje que entienda, para saber qué pasó sin tener que llamar al estudio.
- H7: Como cliente quiero distinguir los movimientos anulados para no tomar como válido algo que ya no vale.
- H8: Como cliente quiero distinguir los movimientos con fecha futura, como una audiencia ya fijada, para saber qué viene.
- H9: Como cliente quiero usar el portal cómodamente desde el celular.
- H10: Como integrante del estudio quiero que el cliente nunca vea información interna, de otras causas ni datos personales de las otras partes, para cumplir con el secreto profesional y la ley de protección de datos personales.
- H11: Como integrante del estudio quiero que la sesión de un cliente se cierre sola si deja de usarla y que nadie pueda ver sus datos después, porque los clientes suelen entrar desde equipos compartidos.

## Requisitos funcionales (criterios de aceptación en EARS)

### Acceso y alcance
- RF-1: EL SISTEMA solo permite usar el portal a clientes con la cuenta activa y sin cambio de contraseña pendiente, tanto el inicial como el que sigue a un restablecimiento (spec 001, RF-11 y RF-33). Visitantes e integrantes se tratan según la spec 001 (RF-14, RF-18 y RF-20), y este control se hace siempre en el servidor.
- RF-2: EL SISTEMA no permite al cliente cargar, modificar ni borrar ningún dato desde el portal. En el portal, el cliente solo puede consultar sus causas, ir a cambiar su contraseña con el botón "Cambiar contraseña" y cerrar sesión (spec 001, RF-16 y RF-36). La consulta de sus propios datos sigue como la define la spec 001 (RF-35). Cualquier otro intento se rechaza según la spec 001 (RF-19).
- RF-3: EL SISTEMA decide qué causas puede consultar un cliente solo con el vínculo de la spec 002 (RF-26 a RF-28), y qué movimientos puede ver solo con la regla de la spec 003 (RF-30). Los evalúa en el servidor en cada acción del cliente. Una **acción** es cada consulta nueva al servidor: abrir una pantalla, cambiar de página, desplegar un texto que no estaba cargado o actualizar la página. Un cambio en el vínculo, en la causa, en sus movimientos o en la cuenta del cliente rige desde su siguiente acción.

### Sesión del cliente
- RF-4: MIENTRAS el usuario es un cliente, EL SISTEMA cierra su sesión tras 20 minutos sin acciones (RF-3), como establece la spec 001 (RF-12). Para administradores y abogados, la misma spec fija 1 hora.
- RF-5: CUANDO la sesión de un cliente se cierra, por cualquier motivo (cierre, vencimiento, ingreso desde otro dispositivo, desactivación o restablecimiento de contraseña, según la spec 001), EL SISTEMA descarta todos los datos del portal que estaban en pantalla. Ni volviendo atrás con el navegador, ni reabriendo una dirección del portal, ni ingresando con otra cuenta en el mismo navegador se pueden ver datos de esa sesión.
- RF-6: EL SISTEMA no permite que el navegador guarde copias de las pantallas ni de las respuestas del portal. Sin una sesión válida, toda dirección del portal lleva a la pantalla de ingreso.

### Lista de causas
- RF-7: CUANDO un cliente ingresa al portal, EL SISTEMA le muestra como pantalla de inicio la lista de las causas a las que está vinculado, cualquiera sea su estado (incluidas Archivada y Finalizada), de a 20 por página.
- RF-8: EL SISTEMA llama **fecha del último movimiento** de una causa, para un cliente, a la fecha más reciente entre sus movimientos que ese cliente puede ver (spec 003, RF-30), sin contar los anulados ni los que tienen una fecha posterior al día actual en Buenos Aires. Si no hay ninguno, la causa no tiene fecha del último movimiento.
- RF-9: EL SISTEMA muestra de cada causa de la lista:
  - Carátula, en hasta dos líneas, terminada en "…" si no entra completa.
  - Número de expediente, o "Sin asignar" si no está informado.
  - Estado.
  - Fecha del último movimiento (RF-8), con el formato dd/mm/aaaa, si la tiene.
- RF-10: EL SISTEMA divide la lista en dos grupos, cada uno con su título: "En curso" (En trámite y Paralizada) primero, y "Archivadas y finalizadas" (Archivada y Finalizada) después. Un grupo sin causas no muestra su título. Si un grupo continúa en la página siguiente, su título se repite al principio de esa página.
- RF-11: EL SISTEMA ordena las causas dentro de cada grupo así:
  - Por fecha del último movimiento, primero la más reciente.
  - A igual fecha, o si no tienen fecha del último movimiento, por carátula en orden alfabético, sin distinguir mayúsculas, minúsculas ni tildes. Las que no tienen fecha del último movimiento van al final de su grupo.
  - A igual carátula, primero la última registrada en el sistema.

  Mientras los datos no cambian, el orden es siempre el mismo, de modo que al pasar de página ninguna causa se repite ni se omite.
- RF-12: SI el cliente no está vinculado a ninguna causa, ENTONCES EL SISTEMA muestra el mensaje "No tenés causas para consultar".

### Detalle de la causa
- RF-13: CUANDO un cliente consulta una causa a la que está vinculado, EL SISTEMA muestra:
  - Carátula completa.
  - Número de expediente, o "Sin asignar" si no está informado.
  - Juzgado, o "Sin asignar" si no está informado.
  - Fuero.
  - Estado.
  - Si es incidente, la leyenda "Vinculado al expte. principal Nº <número>" (spec 002, RF-1).
- RF-14: EL SISTEMA muestra en la causa sus partes vigentes, cada una con su nombre y apellido, o su razón social, y su rol procesal (spec 002, RF-13). Las ordena por rol procesal (Actor, Demandado, Tercero y Otro) y, dentro de cada rol, alfabéticamente por apellido y después por nombre; las razones sociales se ordenan junto con los apellidos. La parte que corresponde al cliente que consulta lleva la leyenda "Vos". En una parte cliente se muestran los datos actuales de su cuenta (spec 002, RF-14) y, si es persona jurídica, solo su razón social.
- RF-15: EL SISTEMA nunca muestra al cliente de las partes: si son personas físicas o jurídicas (más allá de lo que sugiera su nombre), el DNI ni el CUIT, si son clientes del estudio, los datos de sus cuentas (email, teléfono, domicilio, persona de contacto) ni las partes desvinculadas.
- RF-16: MIENTRAS el abogado responsable de la causa tiene la cuenta activa, EL SISTEMA muestra su nombre y apellido como "Responsable de la causa". Si su cuenta está desactivada, no muestra ningún abogado ni ningún aviso. EL SISTEMA nunca muestra al cliente los colaboradores, ni el email u otro dato de ningún integrante.
- RF-17: EL SISTEMA nunca muestra al cliente quién creó o modificó la causa ni cuándo, si está activa o desactivada, ni el aviso de responsable desactivado (spec 002, RF-2 y RF-33).

### Contacto con el estudio
- RF-18: EL SISTEMA muestra en todas las pantallas del portal, salvo la de cambio de contraseña, los datos de contacto del estudio:
  - Nombre del estudio.
  - Dirección, como texto.
  - WhatsApp, como enlace que abre una conversación con el estudio, sin mensaje precargado.

  Son los mismos datos del sitio web del estudio, fijos en el sistema, y no se editan desde el panel. Hasta que el estudio informe los reales, se usan datos genéricos de ejemplo.
- RF-19: EL SISTEMA muestra en todas las pantallas que ve el cliente, incluida la de cambio de contraseña, un botón de WhatsApp siempre visible abajo a la derecha, que abre una conversación con el estudio sin mensaje precargado. El botón nunca tapa contenido ni controles: al llegar al final de la pantalla, todo lo que queda debajo se puede ver y usar.

### Movimientos
- RF-20: CUANDO un cliente consulta una causa a la que está vinculado, EL SISTEMA muestra además los movimientos de esa causa que el cliente puede ver (spec 003, RF-30), anulados incluidos (spec 003, RF-17), de a 20 por página, en el mismo orden que el historial del panel (spec 003, RF-23):
  - Por fecha del movimiento, primero el más reciente.
  - A igual fecha, primero el último cargado.
  - A igual fecha e igual momento de carga, primero el último registrado en el sistema.

  Mientras los datos no cambian, el orden es siempre el mismo, de modo que al pasar de página ningún movimiento se repite ni se omite.
- RF-21: EL SISTEMA muestra de cada movimiento:
  - Su fecha, con el formato dd/mm/aaaa.
  - Su tipo.
  - El texto visible para el cliente (spec 003, RF-7), con sus saltos de línea y sin indicar si es el texto para el cliente o la descripción. Si tiene hasta 300 caracteres, completo; si es más largo, sus primeros 300 caracteres y la opción "Ver más", que lo despliega completo en el mismo lugar.
  - La leyenda "Anulado", si lo está.
  - La leyenda "Fecha futura", si su fecha es posterior al día actual en Buenos Aires y no está anulado. Un movimiento anulado muestra solo la leyenda "Anulado".
- RF-22: CUANDO un cliente abre un movimiento que puede ver, EL SISTEMA lo muestra solo, con los mismos datos de RF-21 y el texto completo, junto con la carátula de su causa y un acceso para volver a ella, en la misma página de movimientos en la que estaba.
- RF-23: SI una causa a la que el cliente está vinculado no tiene ningún movimiento que él pueda ver, ENTONCES EL SISTEMA muestra el mensaje "Todavía no hay movimientos para mostrar".

### Paginación
- RF-24: EL SISTEMA pagina la lista de causas y los movimientos solo con las opciones "Anterior" y "Siguiente". Nunca muestra totales de causas, de movimientos ni de páginas.
- RF-25: SI el cliente pide una página que no existe, ENTONCES EL SISTEMA no muestra ninguna causa ni movimiento, ni los mensajes de RF-12 o RF-23.
- RF-26: EL SISTEMA no deja al cliente ningún indicio de la existencia de movimientos que no puede ver: la paginación y los mensajes se calculan solo sobre los movimientos que puede ver.

### Causas y movimientos que el cliente no puede ver
- RF-27: EL SISTEMA solo permite al cliente pedir un movimiento dentro de su causa. Primero verifica la causa (RF-28) y después el movimiento (RF-29).
- RF-28: SI un cliente pide una causa a la que no está vinculado, una causa desactivada, una causa que no existe o un identificador de causa mal formado, ENTONCES EL SISTEMA responde siempre lo mismo, con el mensaje "No existe esa causa", sin revelar de cuál de esos casos se trata. Lo mismo vale al pedir los movimientos o un movimiento de esa causa.
- RF-29: SI un cliente pide, dentro de una causa a la que está vinculado, un movimiento que no puede ver porque está oculto, que no existe, que no pertenece a esa causa o con un identificador mal formado, ENTONCES EL SISTEMA responde siempre lo mismo, con el mensaje "No existe ese movimiento", sin revelar de cuál de esos casos se trata (spec 003, RF-33 y RF-34).

### Datos que recibe el cliente
- RF-30: EL SISTEMA solo envía al cliente los datos que esta spec indica que puede ver (RF-9, RF-13, RF-14, RF-16, RF-18 y RF-21), además de los identificadores de sus causas y de los movimientos que puede ver. Nunca le envía datos que la interfaz después oculte. En particular, nunca recibe:
  - De los movimientos, lo que excluye la spec 003 (RF-31): la descripción cuando hay texto para el cliente, quién cargó, modificó, anuló o restauró cada movimiento ni cuándo, y su historial de cambios.
  - De las partes, lo que excluye RF-15, ni sus identificadores.
  - De los integrantes, sus identificadores, emails, el estado de sus cuentas y los colaboradores (RF-16).
  - De la causa, lo que excluye RF-17.

## Requisitos no funcionales
- Aislamiento: toda consulta del portal se filtra en el servidor por el id del cliente que la hace, usando el vínculo de la spec 002 y la regla de visibilidad de la spec 003. Un cliente nunca recibe causas ajenas, movimientos que no puede ver ni datos fuera de los de RF-30 (principio 5).
- Respuestas indistinguibles: en RF-28 y RF-29, los casos que se responden igual devuelven el mismo resultado y el mismo mensaje, para que un cliente no pueda deducir que existen causas o movimientos que no ve. El tiempo de respuesta queda fuera de esta exigencia.
- Textos seguros: el texto visible para el cliente se muestra siempre como texto literal, nunca interpretado como código ni como formato (spec 003).
- Registros del servidor: el texto de los movimientos nunca se escribe en los registros del servidor ni en mensajes de error (spec 003).
- Persistencia: ningún dato de causas, partes ni movimientos se guarda en el almacenamiento local del navegador ni en su caché (principio 5, RF-6). Los únicos datos del portal fijos en el código, fuera de la base, son los de contacto del estudio (RF-18), que son públicos y fijos, como admite el principio 5.
- Rendimiento: con hasta 100 causas vinculadas a un cliente y hasta 5.000 movimientos en una causa, cada página del portal responde en menos de 2 segundos.
- Plataformas: el portal se usa desde el celular tanto como desde la computadora. En una pantalla de 360 px de ancho, todo se ve y se usa sin desplazamiento horizontal: los textos largos (carátulas, nombres de las partes, textos de los movimientos) pasan a la línea siguiente en lugar de salirse de la pantalla.
- Fechas: todas las fechas del portal se muestran como dd/mm/aaaa, sin corrimientos por zona horaria. El "día actual" de RF-8 y de la leyenda "Fecha futura" es el de Buenos Aires (UTC−3).
- Idioma: todos los mensajes y textos del portal en español.

## Casos límite
- **Lista de causas:**
  - Cliente sin causas vinculadas, porque todavía no es parte de ninguna o porque lo desvincularon de todas: ve "No tenés causas para consultar" (RF-12).
  - Causa Archivada o Finalizada: aparece en el grupo "Archivadas y finalizadas" y se puede consultar con sus movimientos (RF-7, RF-10).
  - Causa Paralizada: aparece en el grupo "En curso" (RF-10).
  - Cliente con causas de un solo grupo: se muestra solo el título de ese grupo (RF-10).
  - Causa que cambia de estado: en la siguiente acción del cliente pasa al grupo que le corresponde (RF-3, RF-10).
  - Causa cuyos únicos movimientos visibles son anulados o de fecha futura: no tiene fecha del último movimiento y va al final de su grupo, por carátula (RF-8, RF-11).
  - Movimiento visible que se oculta o se anula: puede cambiar la fecha del último movimiento y el orden de la lista en la siguiente acción del cliente (RF-3, RF-8).
  - Cambio de día en Buenos Aires: un movimiento con fecha futura pierde la leyenda "Fecha futura", pasa a contar como fecha del último movimiento y puede reordenar la lista, sin que nadie haya cambiado nada. Se acepta (RF-8, RF-21).
  - Varias causas con la misma fecha del último movimiento: se ordenan por carátula y, a igual carátula, primero la última registrada (RF-11).
  - La lista cambia mientras el cliente pasa de página (por ejemplo, una causa cambia de grupo o de fecha del último movimiento): puede ver una causa repetida o no ver una hasta volver a cargar. Se acepta (RF-11).
  - Carátula de 255 caracteres: en la lista se muestra en dos líneas con "…"; en el detalle, completa (RF-9, RF-13).
- **Paginación:**
  - Más de 20 causas o movimientos: se pagina con "Anterior" y "Siguiente", sin totales (RF-24).
  - Página inexistente, por ejemplo cambiando la dirección: no se muestra ninguna causa ni movimiento, ni el mensaje de vacío (RF-25).
- **Vínculo:**
  - Causa desactivada: desaparece de la lista. Si el cliente la pide directamente, recibe "No existe esa causa". Si se reactiva, vuelve a aparecer (RF-28; spec 002, RF-27 y RF-42).
  - Cliente desvinculado mientras mira la causa: la sigue viendo en pantalla hasta su siguiente acción, en la que recibe "No existe esa causa". Se acepta (RF-3, RF-28).
  - Cliente desvinculado y vuelto a vincular: vuelve a ver la causa con todos sus movimientos visibles, incluidos los anteriores (spec 003, RF-32).
  - Cuenta del cliente desactivada con la sesión abierta: su sesión se cierra y la pantalla descarta los datos (RF-5; spec 001, RF-14 y RF-29).
  - Contraseña del cliente restablecida: no ve el portal hasta cambiarla (RF-1; spec 001, RF-11).
  - Cliente que pide una causa ajena, por ejemplo cambiando la dirección: recibe la misma respuesta que ante una causa inexistente (RF-28).
  - Identificador de causa o de movimiento mal formado (por ejemplo, con letras): recibe la misma respuesta que uno inexistente (RF-28, RF-29).
  - Integrante que intenta entrar al portal: es llevado al panel (spec 001, RF-20).
- **Sesión:**
  - Cliente que lee un movimiento largo durante más de 20 minutos sin hacer ninguna acción: su sesión se cierra. Al volver a ingresar, vuelve al inicio del portal y no a la causa que estaba mirando (RF-4; spec 001, RF-8 y RF-17).
  - Cliente que cierra sesión y vuelve atrás con el navegador: no ve ningún dato; va a la pantalla de ingreso (RF-5, RF-6).
  - Otro cliente ingresa en el mismo navegador: no ve nada de la sesión anterior (RF-5).
  - Cambio de la persona de contacto de un cliente persona jurídica (otro email en la cuenta): la nueva persona ve todo el historial visible de la empresa. Se acepta por ahora (spec 001).
- **Datos de la causa:**
  - Causa sin número de expediente o sin juzgado: se muestra "Sin asignar" (RF-9, RF-13).
  - Incidente: se muestra "Vinculado al expte. principal Nº …", sin acceso a la causa principal. Si el cliente también está vinculado a la principal, la ve como otra causa de su lista (RF-13; spec 003, casos límite).
- **Partes:**
  - Dos clientes del estudio en la misma causa: cada uno ve al otro por su nombre y rol, sin saber que también es cliente, y la leyenda "Vos" solo en su propia parte (RF-14, RF-15).
  - Parte no cliente homónima del cliente: solo la parte vinculada a la cuenta del cliente lleva "Vos" (RF-14).
  - Cliente persona jurídica: se ve su razón social; la persona de contacto no aparece (RF-14).
  - Parte con razón social y parte con apellido en el mismo rol: se ordenan juntas, alfabéticamente (RF-14).
  - Cambio en la cuenta de un cliente que es parte (por ejemplo, su apellido): todos los clientes de la causa ven el dato actualizado (RF-14; spec 002, RF-14).
  - Otro cliente de la causa con la cuenta desactivada: sigue apareciendo como parte vigente, por su nombre (RF-14; spec 002, RF-28).
  - Parte desvinculada: no aparece (RF-15).
- **Abogado responsable:**
  - Responsable desactivado: no se muestra ningún abogado ni ningún aviso. El cliente puede deducir que el abogado dejó el estudio. Se acepta (RF-16).
  - Responsable reemplazado: en la siguiente acción del cliente se ve el nuevo (RF-3, RF-16).
  - Responsable que pasa de abogado a administrador: se lo sigue mostrando (RF-16).
- **Movimientos:**
  - Causa con movimientos, pero ninguno visible: se muestra "Todavía no hay movimientos para mostrar", sin ningún indicio de los ocultos (RF-23, RF-26).
  - Movimiento visible anulado: aparece en su lugar, con la leyenda "Anulado" y el texto que tenía al anularlo (RF-21; spec 003, RF-17).
  - Movimiento anulado con fecha futura: muestra solo "Anulado" (RF-21).
  - Movimiento con fecha futura (una audiencia fijada): aparece primero, con la leyenda "Fecha futura", hasta que llega ese día en Buenos Aires (RF-20, RF-21).
  - Fecha futura por un error de tipeo (por ejemplo, 2062): el cliente lo ve como "Fecha futura" hasta que un integrante lo corrige. Se acepta (spec 003, casos límite).
  - Movimiento visible que se oculta mientras el cliente lo tiene abierto: lo sigue viendo en pantalla hasta su siguiente acción, en la que recibe "No existe ese movimiento". Se acepta (RF-3, RF-29).
  - Texto visible modificado después de que el cliente lo leyó: ve el texto nuevo, sin indicación de que cambió ni acceso a la versión anterior (RF-21, RF-30; spec 003, RF-31).
  - Movimiento sin texto para el cliente: ve la descripción, sin saber que es la descripción interna (RF-21; spec 003, RF-7).
  - Texto de 2.000 caracteres con líneas en blanco: en la lista se ven los primeros 300 con "Ver más"; desplegado o abierto, completo y con sus saltos de línea (RF-21, RF-22).
  - Movimiento de otra causa vinculada pedido dentro de una causa a la que no pertenece: "No existe ese movimiento" (RF-29).
  - Un movimiento se hace visible u oculto mientras el cliente pasa de página: puede ver uno repetido o no ver uno hasta volver a cargar. Se acepta (RF-20).
  - Cliente que abre un movimiento desde la página 3 y vuelve: regresa a la página 3 de movimientos (RF-22).
- **Respuestas indistinguibles:** una causa ajena y una inexistente pueden tardar distinto en responder. Se acepta (requisitos no funcionales).
- **Identificadores correlativos:** si los identificadores de causas y movimientos que recibe el cliente son números correlativos, puede deducir aproximadamente cuántas causas y movimientos carga el estudio y cuándo. No revela datos de otros clientes. Se acepta (RF-30).
- **Contacto del estudio:**
  - Mientras el estudio no informe sus datos reales, se muestran los datos genéricos de ejemplo (RF-18).
  - En el celular, el botón de WhatsApp no tapa la paginación, el botón "Ver más" ni el final del último texto (RF-19).

## Fuera de alcance
- Cualquier carga o modificación por parte del cliente, salvo su contraseña (spec 001). Tampoco puede editar sus propios datos.
- Avisos al cliente por email o WhatsApp de movimientos nuevos o de cambios en sus causas.
- Marcas de novedades ("Nuevo" o "No leído") y registro de qué vio el cliente y cuándo.
- Aviso al cliente antes de que su sesión se cierre por inactividad.
- Documentos adjuntos.
- Mensajes, consultas o chat con el estudio desde el portal, y WhatsApp con un mensaje precargado con los datos de la causa.
- Buscador y filtros en la lista de causas y en los movimientos.
- Totales de causas, movimientos o páginas.
- Descarga, impresión o exportación de causas o movimientos.
- Ver colaboradores, el email u otros datos de contacto de los abogados.
- Ver DNI o CUIT de las partes, si son personas físicas o jurídicas, si son clientes del estudio, o las partes desvinculadas.
- Visibilidad distinta para cada cliente de una misma causa y ocultar el tipo o la fecha de un movimiento visible (spec 003).
- Vista del portal "como cliente" para los integrantes.
- Edición de los datos de contacto del estudio desde el panel.
- Botón de WhatsApp en las páginas públicas y en la pantalla de ingreso: se define en la spec 007, con la misma ubicación y los mismos datos que en el portal.
- Agenda o calendario de los movimientos con fecha futura.
- Acceso al portal de personas que no son parte (familiares, apoderados) y varios accesos para un mismo cliente (specs 001 y 002).
- Jurisprudencia (spec 005), modelos de escritos (spec 006) y sitio público (spec 007).

## Criterios de finalización
- Todos los RF con al menos un test en verde.
- Tests que verifiquen:
  - Que un cliente solo ve las causas a las que está vinculado, incluidas las Archivadas y Finalizadas, y que un cliente desvinculado, una causa desactivada o una cuenta desactivada cortan el acceso desde la siguiente acción (RF-3, RF-7).
  - Que una causa ajena, desactivada, inexistente o con un identificador mal formado recibe la misma respuesta, en el detalle, en sus movimientos y en un movimiento (RF-28).
  - Que un movimiento oculto, inexistente, de otra causa o con un identificador mal formado recibe la misma respuesta (RF-29).
  - Que las respuestas al cliente solo contienen los datos de RF-30: ni DNI, CUIT, tipo de persona ni identificadores de las partes, ni colaboradores ni datos de integrantes, ni auditoría de la causa, ni la descripción cuando hay texto para el cliente, ni autores o historial de los movimientos.
  - Que los movimientos ocultos no aparecen ni influyen en la paginación, y que no se informan totales (RF-24, RF-26).
  - Los grupos, el orden y la paginación de la lista de causas y de los movimientos, incluidas la fecha del último movimiento, la página inexistente y las leyendas "Anulado" y "Fecha futura" (RF-8, RF-10, RF-11, RF-20, RF-21, RF-25).
  - Que el responsable desactivado no se muestra y la leyenda "Vos" solo marca la parte del cliente que consulta (RF-14, RF-16).
  - Que un visitante, un integrante y un cliente con cambio de contraseña pendiente no acceden al portal, y que el cliente no puede modificar nada (RF-1, RF-2).
  - Que la sesión de un cliente se cierra tras 20 minutos sin acciones, y la de un integrante sigue abierta pasados esos 20 minutos (RF-4).
  - Que las respuestas del portal no quedan guardadas en el caché del navegador y que, al cerrarse la sesión, la pantalla descarta los datos (RF-5, RF-6).
- `pnpm test` y `pnpm lint` sin errores.
- Demo manual:
  1. Con un abogado, preparar dos clientes (A y B) y causas: una En trámite y una Finalizada solo con A; una con A y B como partes, más una parte no cliente; una solo con B; y una desactivada con A.
  2. En la causa compartida, cargar movimientos visibles con y sin texto para el cliente (uno de más de 300 caracteres), uno oculto, uno visible anulado, uno con fecha futura y uno anulado con fecha futura.
  3. Ingresar como A y verificar la lista: solo sus causas, en los grupos "En curso" y "Archivadas y finalizadas", con la fecha del último movimiento correcta, sin la desactivada y sin totales.
  4. Abrir la causa compartida y verificar sus datos, las partes con "Vos" solo en A y sin documentos, el responsable, el contacto del estudio, el botón de WhatsApp y los movimientos: el oculto no aparece, el anulado tiene "Anulado", el futuro tiene "Fecha futura", el anulado futuro solo "Anulado", el largo se despliega con "Ver más" y cada uno muestra el texto que corresponde.
  5. Cambiando la dirección, pedir la causa de B, la desactivada, una inexistente y una con letras en el identificador, y verificar que todas responden "No existe esa causa". Hacer lo mismo con el movimiento oculto, uno inexistente y uno mal formado, y verificar "No existe ese movimiento".
  6. Con el abogado, desactivar al responsable, desvincular a A de una causa y ocultar un movimiento visible. Verificar como A, después de actualizar la página, que el responsable ya no se muestra, que la causa desvinculada desapareció y que el movimiento ya no se ve.
  7. Ingresar como B y verificar que ve la causa compartida igual que A, con "Vos" en su propia parte.
  8. Cerrar sesión, volver atrás con el navegador y verificar que no se ve ningún dato. Ingresar de nuevo, dejar pasar 20 minutos sin acciones y verificar que la sesión se cerró.
  9. Repetir los pasos 3 y 4 desde un celular, verificando que el botón de WhatsApp no tapa nada.

## Dudas abiertas
Ninguna.
